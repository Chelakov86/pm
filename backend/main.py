from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")

from fastapi import FastAPI, Depends, HTTPException
import os
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import models, schemas
from database import engine, get_db
import ai

# Create all database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

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
        initial_state = {"tasks": {}, "columns": {}, "columnOrder": []}
        board = models.Board(user_id=user.id, state=initial_state)
        db.add(board)
        db.commit()

@app.on_event("startup")
def on_startup():
    db = next(get_db())
    create_initial_user(db)
    db.close()

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
def ai_test():
    answer = ai.ask("What is 2+2? Reply with just the number.")
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
        board.state = board_update.state
    db.commit()
    db.refresh(board)
    return board

frontend_build_dir = "/frontend-build"
local_build_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "out")

if os.path.exists(frontend_build_dir):
    app.mount("/", StaticFiles(directory=frontend_build_dir, html=True), name="static")
elif os.path.exists(local_build_dir):
    app.mount("/", StaticFiles(directory=local_build_dir, html=True), name="static")
else:
    @app.get("/")
    def read_root():
        return {"message": "Frontend build not found. Run 'npm run build' in the frontend directory."}

