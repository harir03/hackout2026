import pytest
import httpx
from app.main import app

@pytest.mark.asyncio
async def test_score_estimate_for_demo_profile():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/score", json={
            "user_id": "hari",
            "consented_sources": ["d1_bank"],
            "phone": "9876543210",
            "consent_id": "consent-123"
        })
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "hari"
    assert "score" in data
    assert "risk_band" in data
    assert "tier" in data

@pytest.mark.asyncio
async def test_score_estimate_for_unknown_profile():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/score", json={
            "user_id": "9999999999",
            "consented_sources": ["d1_bank"],
            "phone": "9999999999",
            "consent_id": "consent-999"
        })
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "9999999999"
    assert "score" in data
    assert "risk_band" in data
