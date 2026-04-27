from pydantic import BaseModel, ConfigDict
from typing import Any, Dict

class BoardStateUpdate(BaseModel):
    state: Dict[str, Any]

class BoardResponse(BaseModel):
    id: int
    user_id: int
    state: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)
