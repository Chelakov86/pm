from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_cors_preflight():
    response = client.options(
        "/api/board",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "GET" in response.headers["access-control-allow-methods"]

def test_cors_header_on_get():
    response = client.get(
        "/api/board",
        headers={"Origin": "http://localhost:3000"},
    )
    # Note: get_board might return 404 if user not found or board not found, 
    # but the CORS headers should still be there if it's a valid origin.
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
