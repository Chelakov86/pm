import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import os

# We need to import app AFTER setting environment variables if we want to affect the Limiter's 'enabled' flag at import time.
# But main.py is already imported in other tests.
# Let's try to just use the app as is, but we must ensure TESTING is not "1".

def test_rate_limiting_ai_chat():
    # Ensure TESTING is not "1" for this test
    # This might be tricky if main.py was already imported with TESTING=1.
    # Let's check the current state.
    from main import app, limiter
    
    # Force enable limiter for this test if it was disabled
    limiter.enabled = True
    
    client = TestClient(app)
    
    # Mock AI response to avoid actual API calls
    with patch("ai.chat_with_board") as mock_chat:
        mock_chat.return_value = MagicMock(message="Hi", board_update=None)
        
        # Call 5 times (limit is 5/minute)
        for i in range(5):
            response = client.post("/api/ai/chat", json={"message": f"hi {i}"})
            assert response.status_code == 200
            
        # 6th call should fail with 429
        response = client.post("/api/ai/chat", json={"message": "hi 6"})
        assert response.status_code == 429
        print(f"DEBUG: Rate limit response: {response.json()}")
        # Check if it has 'error' or 'detail'
        json_data = response.json()
        assert "error" in json_data or "detail" in json_data

from unittest.mock import MagicMock
