from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from backend/)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import models, schemas
from database import engine, get_db, SessionLocal
import ai

from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Create all database tables
models.Base.metadata.create_all(bind=engine)

def create_initial_user(db: Session):
    user = db.query(models.User).filter(models.User.username == "user").first()
    if not user:
        user = models.User(username="user")
        db.add(user)
        db.commit()
        db.refresh(user)

    # Initialize an empty board if the user doesn't have one
    board = db.query(models.Board).filter(models.Board.user_id == user.id).first()
    if not board:
        board = models.Board(user_id=user.id, state={"columns": [], "cards": {}})
        db.add(board)
        db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create initial user and AI client
    with SessionLocal() as db:
        create_initial_user(db)
    
    app.state.ai_client = ai.get_ai_client()
    yield
    # Shutdown: cleanup
    await app.state.ai_client.close()

limiter = Limiter(
    key_func=get_remote_address,
    enabled=os.environ.get("TESTING") != "1"
)
app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get current dummy user
def get_current_user(db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == "user").first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/hello")
def read_hello():
    return {"message": "Hello World"}

@app.get("/api/ai/test")
async def ai_test(request: Request):
    answer = await ai.ask(request.app.state.ai_client, "What is 2+2? Reply with just the number.")
    return {"response": answer}

@app.get("/api/board", response_model=schemas.BoardResponse)
def get_board(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    board = db.query(models.Board).filter(models.Board.user_id == user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board

@app.put("/api/board", response_model=schemas.BoardResponse)
def update_board(board_update: schemas.BoardStateUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    board = db.query(models.Board).filter(models.Board.user_id == user.id).first()
    if not board:
        board = models.Board(user_id=user.id, state=board_update.state)
        db.add(board)
    else:
        board.state = board_update.state  # type: ignore
    db.commit()
    db.refresh(board)
    return board

@app.post("/api/ai/chat", response_model=schemas.ChatApiResponse)
@limiter.limit("5/minute")
async def ai_chat(
    request: Request,
    chat_request: schemas.ChatRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Chat with the AI assistant. The AI sees the current board state and can optionally update it."""
    # 1. Load the current board state from the database
    board = db.query(models.Board).filter(models.Board.user_id == user.id).first()
    board_state = board.state if board else {"columns": [], "cards": {}}

    # 2. Call the AI with the board state, user message, and conversation history
    try:
        ai_response = await ai.chat_with_board(
            client=request.app.state.ai_client,
            board_state=board_state,  # type: ignore
            user_message=chat_request.message,
            history=chat_request.history,
        )
    except HTTPException:
        # Re-raise FastAPIs HTTPExceptions directly
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # 3. If the AI returned a board update, persist it to the database
    result = schemas.ChatApiResponse(message=ai_response.message)

    if ai_response.board_update is not None:
        new_state = ai_response.board_update.model_dump()
        if board:
            board.state = new_state  # type: ignore
        else:
            board = models.Board(user_id=user.id, state=new_state)
            db.add(board)
        db.commit()
        db.refresh(board)
        result.board_update = new_state

    return result

# Static file serving - check for frontend build in order of preference
backend_dir = Path(__file__).resolve().parent
build_paths = [
    Path("/frontend-build"),
    backend_dir.parent / "frontend" / "out",
]

static_dir = next((p for p in build_paths if p.exists()), None)

if static_dir:
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
else:
    @app.get("/")
    def read_root():
        return {"message": "Frontend build not found. Run 'npm run build' in the frontend directory."}
