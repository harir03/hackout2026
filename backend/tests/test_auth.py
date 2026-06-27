import pytest
import httpx
from app.main import app

@pytest.mark.asyncio
async def test_google_auth_redirect():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/auth/google?user_id=test-user-123")
    # Should redirect
    assert response.status_code == 307 or response.status_code == 302
    assert "location" in response.headers

@pytest.mark.asyncio
async def test_google_callback_html():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/auth/google/callback?code=mock_oauth_code&state=test-user-123")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Authentication Successful" in response.text
