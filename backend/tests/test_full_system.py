import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

@pytest.mark.asyncio
async def test_identity_verification_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # PAN Verification
        res_pan = await ac.post("/identity/pan", json={"pan": "ABCDE1234F", "name": "Ramesh Kumar"})
        assert res_pan.status_code == 200
        pan_data = res_pan.json()
        assert pan_data["status"] in ("valid", "verified")

        # Aadhaar OTP send
        res_aadhaar_otp = await ac.post("/identity/aadhaar/otp", json={"aadhaar": "123412341235"})
        assert res_aadhaar_otp.status_code == 200

        # Aadhaar verify
        res_aadhaar_verify = await ac.post("/identity/aadhaar/verify", json={"aadhaar": "123412341235", "otp": "123456"})
        assert res_aadhaar_verify.status_code == 200
        assert res_aadhaar_verify.json()["status"] == "verified"

        # Liveness check
        res_liveness = await ac.post("/identity/liveness", json={"image": "dummy_b64"})
        assert res_liveness.status_code == 200
        assert res_liveness.json()["status"] in ("success", "failed")

@pytest.mark.asyncio
async def test_consent_submission_and_scoring_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Submit consent
        consent_payload = {
            "user_id": "test-farmer-001",
            "name": "Ramesh Kumar",
            "phone": "9876543215",
            "consented_sources": ["d1_bank", "d2_telecom", "d4_location", "d5_questionnaire"]
        }
        res_consent = await ac.post("/consent", json=consent_payload)
        assert res_consent.status_code == 200
        consent_data = res_consent.json()
        assert "consent_id" in consent_data

        # 2. Score calculation with psychometric answers and location history
        score_payload = {
            "user_id": "test-farmer-001",
            "consented_sources": ["d1_bank", "d2_telecom", "d4_location", "d5_questionnaire"],
            "phone": "9876543215",
            "answers": {0: 0, 1: 0, 2: 0, 3: 1, 4: 0, 5: 0, 6: 1, 7: 0, 8: 0, 9: 0},
            "location_history": [{"place": "Kovvur Village, Andhra Pradesh", "fromYear": 1992, "toYear": None}],
            "time_taken_ms": 120000,
            "changes_count": 1
        }
        res_score = await ac.post("/score", json=score_payload)
        assert res_score.status_code == 200
        score_data = res_score.json()
        assert "score" in score_data
        assert "risk_band" in score_data
        assert "shap_details" in score_data
        assert len(score_data["shap_details"]) > 0

@pytest.mark.asyncio
async def test_static_demo_profiles():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Farmer profile
        res_farmer = await ac.get("/score/farmer@altgrade.in")
        assert res_farmer.status_code == 200
        farmer_data = res_farmer.json()
        assert farmer_data["score"] == 710
        assert farmer_data["risk_band"] == "Excellent"

        # MSME profile
        res_msme = await ac.get("/score/msme@altgrade.in")
        assert res_msme.status_code == 200
        msme_data = res_msme.json()
        assert msme_data["score"] == 610
        assert msme_data["risk_band"] == "Fair"

@pytest.mark.asyncio
async def test_vapi_outbound_and_webhook():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Outbound call request
        vapi_payload = {
            "user_id": "test-user-vapi",
            "phone": "9876543215",
            "language": "hi",
            "profession": "farmer"
        }
        res_vapi = await ac.post("/vapi/outbound-call", json=vapi_payload)
        assert res_vapi.status_code == 200
        vapi_res = res_vapi.json()
        assert vapi_res["status"] in ("success", "simulated")
        assert vapi_res["question_count"] == 10

        # Webhook call end simulation
        webhook_payload = {
            "message": {
                "type": "end-of-call-report",
                "call": {
                    "id": "call-test-999",
                    "customer": {"number": "+919876543215"}
                },
                "artifact": {
                    "transcript": "Hello. I am a farmer. Option 1 for all questions.",
                    "summary": "Farmer completed psychometric questionnaire with excellent responses."
                }
            }
        }
        res_webhook = await ac.post("/vapi/webhook", json=webhook_payload)
        assert res_webhook.status_code == 200

        # Check call results storage
        res_call = await ac.get("/vapi/call-results/test-user-vapi")
        assert res_call.status_code == 200

@pytest.mark.asyncio
async def test_advisor_rag():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        advisor_payload = {
            "user_id": "test-farmer-001",
            "question": "What is my credit score and how can I improve it?"
        }
        res_advisor = await ac.post("/advisor/ask", json=advisor_payload)
        assert res_advisor.status_code == 200
        advisor_data = res_advisor.json()
        assert "answer" in advisor_data
        assert len(advisor_data["answer"]) > 0

@pytest.mark.asyncio
async def test_dashboard_and_decisions():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Overview metrics
        res_overview = await ac.get("/dashboard/overview")
        assert res_overview.status_code == 200
        overview_data = res_overview.json()
        assert "approval_rate" in overview_data or "total_scored" in overview_data

        # Loan Officer Decision
        decision_payload = {
            "user_id": "test-farmer-001",
            "decision": "approved",
            "interest_rate": 8.5,
            "terms": "12 months",
            "notes": "Verified farmer harvest cycle and KCC record.",
            "loan_amount": 150000
        }
        res_decision = await ac.post("/dashboard/decision", json=decision_payload)
        assert res_decision.status_code == 200
