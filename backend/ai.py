import os
import json
import logging
from fastapi import HTTPException
from openai import AsyncOpenAI
from typing import List, Dict, Any, Optional, NamedTuple
from schemas import AIChatResponse, ChatMessage, BoardData

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenRouter model (free OSS model)
MODEL = "openrouter/free"

class AIError(NamedTuple):
    status_code: int
    detail: str

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


def get_ai_client() -> AsyncOpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is not configured")
    return AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )


async def ask(client: AsyncOpenAI, question: str) -> str:
    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": question}],
        timeout=30.0,
    )
    return response.choices[0].message.content or ""


def strip_markdown_json(text: str) -> str:
    """Strip markdown code block formatting and extract JSON."""
    text = text.strip()

    # Try to find JSON object boundaries
    start = text.find('{')
    end = text.rfind('}')

    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]

    # Fall back to stripping markdown code blocks
    for prefix in ["```json", "```"]:
        if text.startswith(prefix):
            text = text[len(prefix):]
            break
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def _classify_ai_error(error: Exception) -> AIError:
    """Classify AI service errors and return AIError(status_code, detail)."""
    error_msg = str(error).lower()
    if "rate limit" in error_msg:
        return AIError(429, "AI service rate limit exceeded. Please try again later.")
    if "authentication" in error_msg or "api key" in error_msg:
        return AIError(500, "AI service authentication failed.")
    if "timeout" in error_msg or "timed out" in error_msg:
        return AIError(504, "AI service request timed out.")
    return AIError(502, f"AI service error: {error}")


async def chat_with_board(
    client: AsyncOpenAI,
    board_state: Dict[str, Any],
    user_message: str,
    history: List[ChatMessage],
) -> AIChatResponse:
    """Send the board state + conversation to the LLM and get a structured response."""
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        board_json=json.dumps(board_state, indent=2)
    )

    messages: List[Any] = [{"role": "system", "content": system_prompt}]

    # Append conversation history
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    # Append the new user message
    messages.append({"role": "user", "content": user_message})

    # Call AI service with JSON mode for structured output
    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            timeout=30.0,
        )
    except Exception as e:
        err = _classify_ai_error(e)
        logger.error(f"AI service error: {e}")
        raise HTTPException(status_code=err.status_code, detail=err.detail)

    raw_content = response.choices[0].message.content or ""
    logger.info(f"AI raw response length: {len(raw_content)}")
    logger.debug(f"AI raw response: {raw_content}")

    cleaned_content = strip_markdown_json(raw_content)
    logger.info(f"AI cleaned content length: {len(cleaned_content)}")
    try:
        parsed = json.loads(cleaned_content)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI JSON response: {e} - Content: {cleaned_content}")
        return AIChatResponse(
            message="I encountered an error parsing the response from the AI. Please try again.",
            board_update=None,
        )

    # Validate board_update structure
    board_update = parsed.get("board_update")
    if not isinstance(board_update, dict) or "columns" not in board_update or "cards" not in board_update:
        parsed["board_update"] = None

    try:
        return AIChatResponse(
            message=str(parsed.get("message") or "I processed your request."),
            board_update=parsed.get("board_update"),
        )
    except Exception as e:
        logger.error(f"AIChatResponse validation error: {e}")
        return AIChatResponse(
            message="The AI suggested changes that don't fit the board structure. "
                   f"Here was the message: {parsed.get('message') or ''}",
            board_update=None,
        )
