import pytest
import httpx
from app.main import app

@pytest.mark.asyncio
async def test_verify_pan_valid():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/identity/pan", json={"pan": "ABCDE1234F", "phone": "9876543210"})
    assert response.status_code == 200
    data = response.json()
    assert data["pan"] == "ABCDE1234F"
    assert data["name"] == "Hari Kiran"
    assert data["status"] == "verified"

@pytest.mark.asyncio
async def test_verify_pan_invalid_format():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/identity/pan", json={"pan": "SHORT", "phone": "9876543210"})
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_aadhaar_otp_flow():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        res_otp = await ac.post("/identity/aadhaar/otp", json={"aadhaar": "123456789012"})
        assert res_otp.status_code == 200
        assert res_otp.json()["status"] == "sent"

        res_verify = await ac.post("/identity/aadhaar/verify", json={"aadhaar": "123456789012", "otp": "123456"})
        assert res_verify.status_code == 200
        assert res_verify.json()["status"] == "verified"

        res_verify_fail = await ac.post("/identity/aadhaar/verify", json={"aadhaar": "123456789012", "otp": "999999"})
        assert res_verify_fail.status_code == 400

@pytest.mark.asyncio
async def test_liveness():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/identity/liveness", json={"image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="})
        assert res.status_code == 200
        assert res.json()["face_detected"] is True
        assert res.json()["status"] == "success"
