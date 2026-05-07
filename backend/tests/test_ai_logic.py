import json
import pytest
from unittest.mock import patch, MagicMock
from ai import strip_markdown_json, chat_with_board
from schemas import ChatMessage
from fastapi import HTTPException

def test_strip_markdown_json_simple():
    text = "```json\n{\"key\": \"value\"}\n```"
    assert strip_markdown_json(text) == "{\"key\": \"value\"}"

def test_strip_markdown_json_no_lang():
    text = "```\n{\"key\": \"value\"}\n```"
    assert strip_markdown_json(text) == "{\"key\": \"value\"}"

def test_strip_markdown_json_with_extra_text():
    text = "Here is the JSON:\n```json\n{\"key\": \"value\"}\n```\nHope it helps!"
    assert strip_markdown_json(text) == "{\"key\": \"value\"}"

def test_strip_markdown_json_plain():
    text = "{\"key\": \"value\"}"
    assert strip_markdown_json(text) == "{\"key\": \"value\"}"

def test_strip_markdown_json_malformed():
    text = "Not a JSON at all"
    # Current implementation returns the whole string if { } not found
    assert strip_markdown_json(text) == "Not a JSON at all"

@patch("ai.get_ai_client")
def test_chat_with_board_success(mock_get_client):
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = json.dumps({
        "message": "Hello",
        "board_update": None
    })
    mock_client.chat.completions.create.return_value = mock_response
    
    resp = chat_with_board({"columns": [], "cards": {}}, "hi", [])
    assert resp.message == "Hello"
    assert resp.board_update is None

@patch("ai.get_ai_client")
def test_chat_with_board_rate_limit(mock_get_client):
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client
    mock_client.chat.completions.create.side_effect = Exception("Rate limit exceeded")
    
    with pytest.raises(HTTPException) as excinfo:
        chat_with_board({"columns": [], "cards": {}}, "hi", [])
    assert excinfo.value.status_code == 429

@patch("ai.get_ai_client")
def test_chat_with_board_timeout(mock_get_client):
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client
    mock_client.chat.completions.create.side_effect = Exception("Request timed out")
    
    with pytest.raises(HTTPException) as excinfo:
        chat_with_board({"columns": [], "cards": {}}, "hi", [])
    assert excinfo.value.status_code == 504

@patch("ai.get_ai_client")
def test_chat_with_board_invalid_json_fallback(mock_get_client):
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Invalid JSON"
    mock_client.chat.completions.create.return_value = mock_response
    
    resp = chat_with_board({"columns": [], "cards": {}}, "hi", [])
    assert "error parsing" in resp.message
    assert resp.board_update is None
