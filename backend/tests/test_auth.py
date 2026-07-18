import pytest
import httpx
from app.main import app

@pytest.mark.asyncio
async def test_google_auth_redirect():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/auth/google?user_id=test-user-123")
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_google_callback_html():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/auth/google/callback?code=mock_oauth_code&state=test-user-123")
    assert response.status_code == 400
