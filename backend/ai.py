import os
import json
from fastapi import HTTPException
from openai import OpenAI
from typing import List, Dict, Any, Optional
from schemas import AIChatResponse, ChatMessage

# OpenRouter's auto model picker (free models only)
MODEL = "openrouter/free"

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
    return response.choices[0].message.content or ""


def strip_markdown_json(text: str) -> str:
    """Strip markdown code block formatting if present."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


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

    messages: List[Any] = [{"role": "system", "content": system_prompt}]

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
        # Distinguish between common error types if possible
        error_msg = str(e)
        if "rate limit" in error_msg.lower():
            print(f"DEBUG: AI Rate limit hit: {error_msg}")
            raise HTTPException(status_code=429, detail="AI service rate limit exceeded. Please try again later.")
        elif "authentication" in error_msg.lower() or "api key" in error_msg.lower():
            print(f"DEBUG: AI Authentication error: {error_msg}")
            raise HTTPException(status_code=500, detail="AI service authentication failed.")
        else:
            print(f"DEBUG: AI call failed: {error_msg}")
            raise HTTPException(status_code=502, detail=f"AI service error: {error_msg}")

    raw_content = response.choices[0].message.content or ""
    print(f"DEBUG: raw_content: {raw_content}")
    
    cleaned_content = strip_markdown_json(raw_content)
    try:
        parsed = json.loads(cleaned_content)
    except json.JSONDecodeError as e:
        print(f"DEBUG: Failed to parse JSON: {e} - Raw content: {cleaned_content}")
        # Fallback to a safe error message if JSON parsing fails completely
        parsed = {
            "message": "I encountered an error parsing the response from the AI. Please try again.",
            "board_update": None
        }
    
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
