import pytest
import httpx
from app.main import app

@pytest.mark.asyncio
async def test_create_consent():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/consent", json={
            "user_id": "test-user-123",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "phone": "9876543210",
            "consented_sources": ["D1 Bank/UPI", "D2 Telecom"]
        })
    assert response.status_code == 200
    data = response.json()
    assert "consent_id" in data
    assert data["status"] in ["granted", "in_memory"]
