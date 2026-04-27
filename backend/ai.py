import os
import json
from openai import OpenAI
from typing import List, Dict, Any, Optional
from schemas import AIChatResponse, ChatMessage

MODEL = "openai/gpt-4o-mini"

SYSTEM_PROMPT_TEMPLATE = """You are a helpful AI assistant for a Kanban board application called "Kanban Studio".
You can help users manage their project by answering questions and optionally updating the board.

Here is the current state of the user's Kanban board:

```json
{board_json}
```

The board has the following structure:
- "columns": a list of columns, each with "id", "title", and "cardIds" (list of card IDs in that column)
- "cards": a dictionary mapping card IDs to card objects with "id", "title", and "details"

When the user asks you to modify the board (add cards, move cards, rename columns, delete cards, etc.),
you MUST include a complete "board_update" in your response with the FULL updated board state.
When the user is just chatting or asking questions that don't require board changes, set "board_update" to null.

Important rules for board updates:
- Always return the COMPLETE board state in board_update, not just the changed parts.
- When adding a new card, generate a unique ID like "card-ai-<random>" for it.
- Always ensure cardIds in columns reference valid card IDs in the cards dictionary.
- Preserve all existing cards and columns that the user didn't ask to change."""


def get_ai_client() -> OpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )


def ask(question: str) -> str:
    client = get_ai_client()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": question}],
    )
    return response.choices[0].message.content


def chat_with_board(
    board_state: Dict[str, Any],
    user_message: str,
    history: List[ChatMessage],
) -> AIChatResponse:
    """Send the board state + conversation to the LLM and get a structured response."""
    client = get_ai_client()

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        board_json=json.dumps(board_state, indent=2)
    )

    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

    # Append conversation history
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    # Append the new user message
    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "ai_chat_response",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Your conversational response to the user."
                        },
                        "board_update": {
                            "description": "The full updated board state, or null if no changes.",
                            "anyOf": [
                                {
                                    "type": "object",
                                    "properties": {
                                        "columns": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "id": {"type": "string"},
                                                    "title": {"type": "string"},
                                                    "cardIds": {
                                                        "type": "array",
                                                        "items": {"type": "string"}
                                                    }
                                                },
                                                "required": ["id", "title", "cardIds"],
                                                "additionalProperties": False
                                            }
                                        },
                                        "cards": {
                                            "type": "object",
                                            "additionalProperties": {
                                                "type": "object",
                                                "properties": {
                                                    "id": {"type": "string"},
                                                    "title": {"type": "string"},
                                                    "details": {"type": "string"}
                                                },
                                                "required": ["id", "title", "details"],
                                                "additionalProperties": False
                                            }
                                        }
                                    },
                                    "required": ["columns", "cards"],
                                    "additionalProperties": False
                                },
                                {"type": "null"}
                            ]
                        }
                    },
                    "required": ["message", "board_update"],
                    "additionalProperties": False
                }
            }
        },
    )

    raw_content = response.choices[0].message.content
    parsed = json.loads(raw_content)
    return AIChatResponse(**parsed)
