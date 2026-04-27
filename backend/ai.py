import os
import json
from openai import OpenAI
from typing import List, Dict, Any, Optional
from schemas import AIChatResponse, ChatMessage

# OpenRouter's auto model picker
MODEL = "openrouter/auto"

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

Your response MUST be a valid JSON object with the following keys:
- "message": (string) Your conversational response to the user.
- "board_update": (object or null) The FULL updated board state, or null if no changes.

Example response:
{{
  "message": "I've added a new card to the Backlog.",
  "board_update": {{
    "columns": [...],
    "cards": {{...}}
  }}
}}

Important rules for board updates:
- Always return the COMPLETE board state in board_update, not just the changed parts.
- When adding a new card, generate a unique ID like "card-ai-<random>" for it.
- Always ensure cardIds in columns reference valid card IDs in the cards dictionary.
- Preserve all existing cards and columns that the user didn't ask to change."""


def get_ai_client() -> OpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY", "EMPTY")
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

    # Use standard JSON object mode for maximum compatibility across providers
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        print(f"DEBUG: AI call failed: {str(e)}")
        raise e

    raw_content = response.choices[0].message.content
    print(f"DEBUG: raw_content: {raw_content}")
    parsed = json.loads(raw_content)
    
    # AIChatResponse pydantic model expects board_update to be a BoardData object or None
    # If the LLM returned null or something else, handle it.
    board_update = parsed.get("board_update")
    
    # If board_update is not a dict with required fields, treat as None
    if not isinstance(board_update, dict) or "columns" not in board_update or "cards" not in board_update:
        parsed["board_update"] = None
    elif not board_update.get("columns") or not board_update.get("cards"):
        # Handle cases where columns or cards might be empty/null but the dict exists
        parsed["board_update"] = None
        
    return AIChatResponse(
        message=parsed.get("message", "I processed your request."),
        board_update=parsed.get("board_update")
    )
