"""Tests for POST /api/ai/chat endpoint.

Covers:
- Chat without board update (simple question)
- Chat with board update (add card, move card, delete card)
- Conversation history is forwarded
- AI service errors return 502
- Board persistence after AI update
"""
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from main import app, get_db
from database import Base
from models import User, Board
from schemas import AIChatResponse, BoardData, ColumnData, CardData

# ---- Test database setup ----
# Use the same test.db as other test files to avoid dependency override conflicts
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


SAMPLE_BOARD_STATE = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1"]},
        {"id": "col-done", "title": "Done", "cardIds": []},
    ],
    "cards": {
        "card-1": {
            "id": "card-1",
            "title": "Existing Task",
            "details": "Some details",
        }
    },
}


@pytest.fixture(autouse=True)
def setup_db():
    """Fresh database and seeded user + board for every test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    user = User(username="user")
    db.add(user)
    db.commit()
    db.refresh(user)
    board = Board(user_id=user.id, state=SAMPLE_BOARD_STATE)
    db.add(board)
    db.commit()
    db.close()
    yield


# ---- Helper to build a mock AI response ----

def _mock_ai_response(message: str, board_update=None) -> AIChatResponse:
    """Build an AIChatResponse with an optional board_update dict."""
    if board_update is not None:
        bd = BoardData(
            columns=[ColumnData(**c) for c in board_update["columns"]],
            cards={k: CardData(**v) for k, v in board_update["cards"].items()},
        )
        return AIChatResponse(message=message, board_update=bd)
    return AIChatResponse(message=message, board_update=None)


# ===========================================================================
# Tests
# ===========================================================================


class TestChatWithoutBoardUpdate:
    """Tests where the AI responds with just a message (no board changes)."""

    def test_simple_question(self):
        ai_resp = _mock_ai_response("The board has 1 card in Backlog.")
        with patch("ai.chat_with_board", return_value=ai_resp) as mock_chat:
            response = client.post(
                "/api/ai/chat",
                json={"message": "How many cards are in Backlog?"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "The board has 1 card in Backlog."
            assert data["board_update"] is None

            # Verify chat_with_board was called with correct args
            mock_chat.assert_called_once()
            call_kwargs = mock_chat.call_args.kwargs
            assert call_kwargs["user_message"] == "How many cards are in Backlog?"
            assert call_kwargs["board_state"] == SAMPLE_BOARD_STATE

    def test_conversation_history_forwarded(self):
        ai_resp = _mock_ai_response("Sure, the Done column is empty.")
        with patch("ai.chat_with_board", return_value=ai_resp) as mock_chat:
            history = [
                {"role": "user", "content": "Hi there"},
                {"role": "assistant", "content": "Hello! How can I help?"},
            ]
            response = client.post(
                "/api/ai/chat",
                json={"message": "What's in the Done column?", "history": history},
            )
            assert response.status_code == 200

            call_kwargs = mock_chat.call_args.kwargs
            assert len(call_kwargs["history"]) == 2
            assert call_kwargs["history"][0].role == "user"
            assert call_kwargs["history"][0].content == "Hi there"


class TestChatWithBoardUpdate:
    """Tests where the AI returns a board_update that should be persisted."""

    def test_add_card(self):
        """AI adds a new card to the Backlog column."""
        updated_board = {
            "columns": [
                {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-ai-123"]},
                {"id": "col-done", "title": "Done", "cardIds": []},
            ],
            "cards": {
                "card-1": {"id": "card-1", "title": "Existing Task", "details": "Some details"},
                "card-ai-123": {"id": "card-ai-123", "title": "Write Docs", "details": "Write documentation for the API."},
            },
        }
        ai_resp = _mock_ai_response(
            "Done! I've added 'Write Docs' to the Backlog.",
            board_update=updated_board,
        )
        with patch("ai.chat_with_board", return_value=ai_resp):
            response = client.post(
                "/api/ai/chat",
                json={"message": "Add a card for 'Write Docs' to the Backlog"},
            )
            assert response.status_code == 200
            data = response.json()
            assert "Write Docs" in data["message"]
            assert data["board_update"] is not None
            assert "card-ai-123" in data["board_update"]["cards"]
            assert data["board_update"]["cards"]["card-ai-123"]["title"] == "Write Docs"

        # Verify the board was persisted to the database
        db_response = client.get("/api/board")
        assert db_response.status_code == 200
        db_state = db_response.json()["state"]
        assert "card-ai-123" in db_state["cards"]
        assert "card-ai-123" in db_state["columns"][0]["cardIds"]

    def test_move_card(self):
        """AI moves a card from Backlog to Done."""
        updated_board = {
            "columns": [
                {"id": "col-backlog", "title": "Backlog", "cardIds": []},
                {"id": "col-done", "title": "Done", "cardIds": ["card-1"]},
            ],
            "cards": {
                "card-1": {"id": "card-1", "title": "Existing Task", "details": "Some details"},
            },
        }
        ai_resp = _mock_ai_response(
            "Moved 'Existing Task' to Done!",
            board_update=updated_board,
        )
        with patch("ai.chat_with_board", return_value=ai_resp):
            response = client.post(
                "/api/ai/chat",
                json={"message": "Move the existing task to Done"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["board_update"]["columns"][0]["cardIds"] == []
            assert data["board_update"]["columns"][1]["cardIds"] == ["card-1"]

        # Verify persistence
        db_state = client.get("/api/board").json()["state"]
        assert db_state["columns"][1]["cardIds"] == ["card-1"]

    def test_delete_card(self):
        """AI removes a card from the board."""
        updated_board = {
            "columns": [
                {"id": "col-backlog", "title": "Backlog", "cardIds": []},
                {"id": "col-done", "title": "Done", "cardIds": []},
            ],
            "cards": {},
        }
        ai_resp = _mock_ai_response(
            "Deleted 'Existing Task' from the board.",
            board_update=updated_board,
        )
        with patch("ai.chat_with_board", return_value=ai_resp):
            response = client.post(
                "/api/ai/chat",
                json={"message": "Delete the existing task"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["board_update"]["cards"] == {}

        db_state = client.get("/api/board").json()["state"]
        assert db_state["cards"] == {}


class TestChatErrorHandling:
    """Tests for error conditions."""

    def test_ai_service_error_returns_502(self):
        with patch("ai.chat_with_board", side_effect=Exception("Connection timeout")):
            response = client.post(
                "/api/ai/chat",
                json={"message": "Hello"},
            )
            assert response.status_code == 502
            assert "AI service error" in response.json()["detail"]

    def test_empty_message(self):
        """An empty message should still work (the AI handles it)."""
        ai_resp = _mock_ai_response("I'm here to help! What would you like to do?")
        with patch("ai.chat_with_board", return_value=ai_resp):
            response = client.post(
                "/api/ai/chat",
                json={"message": ""},
            )
            assert response.status_code == 200

    def test_missing_message_field(self):
        """Missing required 'message' field should return 422."""
        response = client.post("/api/ai/chat", json={})
        assert response.status_code == 422


class TestBoardStatePassedToAI:
    """Verify the current DB board state is what gets sent to the AI."""

    def test_updated_board_is_sent_on_subsequent_calls(self):
        """After a board update via PUT, the next AI chat should see the new state."""
        new_state = {
            "columns": [
                {"id": "col-todo", "title": "To Do", "cardIds": ["card-99"]},
            ],
            "cards": {
                "card-99": {"id": "card-99", "title": "New Card", "details": "Fresh"},
            },
        }
        client.put("/api/board", json={"state": new_state})

        ai_resp = _mock_ai_response("You have 1 card in To Do.")
        with patch("ai.chat_with_board", return_value=ai_resp) as mock_chat:
            client.post(
                "/api/ai/chat",
                json={"message": "What's on my board?"},
            )
            call_kwargs = mock_chat.call_args.kwargs
            assert call_kwargs["board_state"] == new_state
