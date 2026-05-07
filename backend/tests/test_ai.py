from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_ai_test_endpoint():
    mock_message = MagicMock()
    mock_message.content = "4"

    mock_choice = MagicMock()
    mock_choice.message = mock_message

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("ai.get_ai_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_client_fn.return_value = mock_client

        response = client.get("/api/ai/test")
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert data["response"] == "4"

        mock_client.chat.completions.create.assert_called_once()
        call_kwargs = mock_client.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "openai/gpt-oss-120b:free"
        assert "2+2" in call_kwargs.kwargs["messages"][0]["content"]
