import pytest
import httpx
from app.main import app

@pytest.mark.asyncio
async def test_dashboard_overview():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/dashboard/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_scored" in data
    assert "approval_rate" in data
    assert "band_distribution" in data
    assert len(data["band_distribution"]) > 0

@pytest.mark.asyncio
async def test_dashboard_decision_log():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/dashboard/decision", json={
            "user_id": "test-user-decision",
            "decision": "approved",
            "interest_rate": 10.5,
            "terms": "36 months"
        })
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_dashboard_knowledge_log():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/dashboard/knowledge", json={
            "user_id": "test-user-knowledge",
            "officer_notes": "Mitigated risk via positive merchant cash flow.",
            "chat_history": [{"role": "user", "content": "Explain score factors"}]
        })
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
