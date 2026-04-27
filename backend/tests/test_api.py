from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from main import app, get_db
from database import Base
from models import User, Board

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Create the initial dummy user to simulate startup behavior
    user = User(username="user")
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    yield

def test_read_hello():
    response = client.get("/api/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_get_board_empty():
    response = client.get("/api/board")
    assert response.status_code == 404
    assert response.json() == {"detail": "Board not found"}

def test_put_board_create_and_get():
    new_state = {
        "state": {
            "tasks": {"task-1": {"id": "task-1", "content": "Test Task"}},
            "columns": {"col-1": {"id": "col-1", "title": "To Do", "taskIds": ["task-1"]}},
            "columnOrder": ["col-1"]
        }
    }
    
    # Update board
    response = client.put("/api/board", json=new_state)
    assert response.status_code == 200
    data = response.json()
    assert data["state"]["tasks"]["task-1"]["content"] == "Test Task"
    
    # Get board
    response = client.get("/api/board")
    assert response.status_code == 200
    assert response.json()["state"] == new_state["state"]

def test_put_board_update_existing():
    # Initial creation
    initial_state = {
        "state": {
            "tasks": {}, "columns": {}, "columnOrder": []
        }
    }
    client.put("/api/board", json=initial_state)
    
    # Update
    updated_state = {
        "state": {
            "tasks": {"task-1": {"id": "task-1", "content": "Test Task"}},
            "columns": {}, "columnOrder": []
        }
    }
    response = client.put("/api/board", json=updated_state)
    assert response.status_code == 200
    data = response.json()
    assert "task-1" in data["state"]["tasks"]
