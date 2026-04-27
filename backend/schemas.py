from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, List, Optional


class BoardStateUpdate(BaseModel):
    state: Dict[str, Any]


class BoardResponse(BaseModel):
    id: int
    user_id: int
    state: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


# --------------- AI Chat Schemas ---------------

class ChatMessage(BaseModel):
    """A single message in the conversation history."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Incoming request body for POST /api/ai/chat."""
    message: str
    history: List[ChatMessage] = []


class CardData(BaseModel):
    """A single Kanban card."""
    id: str
    title: str
    details: str


class ColumnData(BaseModel):
    """A single Kanban column."""
    id: str
    title: str
    cardIds: List[str]


class BoardData(BaseModel):
    """Full board state — mirrors the frontend BoardData type."""
    columns: List[ColumnData]
    cards: Dict[str, CardData]


class AIChatResponse(BaseModel):
    """Structured output the LLM must return."""
    message: str
    board_update: Optional[BoardData] = None


class ChatApiResponse(BaseModel):
    """Final response sent back to the frontend from POST /api/ai/chat."""
    message: str
    board_update: Optional[Dict[str, Any]] = None
