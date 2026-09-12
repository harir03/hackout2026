import pytest
import httpx
import time
from app.main import app
from app.routes.vapi import (
    build_on_call_banking_system_prompt,
    build_sequential_system_prompt,
    _build_banking_first_message,
    _build_first_message,
    generate_ai_call_suggestion,
    call_results_store,
)


def test_account_manager_prompt_and_privacy_rules():
    """Verify Arun Account Manager persona and privacy-preserving verification."""
    prompt_gu = build_on_call_banking_system_prompt("gu")
    assert "Arun" in prompt_gu
    assert "Gujarati" in prompt_gu
    assert "last 4 digits of your Aadhaar" in prompt_gu
    assert "never ask for your full 12-digit Aadhaar" in prompt_gu
    assert "Loan Dashboard" in prompt_gu


def test_first_messages_in_gujarati():
    """Verify first greetings for Account Manager and Assessment Officer in Gujarati."""
    banking_msg = _build_banking_first_message("gu", "user-123")
    assert "અરુણ" in banking_msg
    assert "પર્સનલ એકાઉન્ટ મેનેજર" in banking_msg

    assessment_msg = _build_first_message("gu", "user-123")
    assert "નમસ્તે" in assessment_msg
    assert "user-123" in assessment_msg
    assert "સાયકોમેટ્રિક ક્રેડિટ મૂલ્યાંકન" in assessment_msg


def test_ai_call_suggestion_calculation():
    """Verify credit score, interest rate, EMI, and spoken Gujarati advice."""
    res_farmer = generate_ai_call_suggestion(
        user_id="user-farmer",
        profession="farmer",
        answers={i: 3 for i in range(10)},
        language="gu"
    )
    assert res_farmer["score"] >= 650
    assert res_farmer["credit_limit"] >= 50000
    assert res_farmer["annual_interest_rate"] > 0
    assert res_farmer["emi"] > 0
    assert "અભિનંદન" in res_farmer["spoken_offer"]
    assert "કિસાન એગ્રી લોન" in res_farmer["spoken_offer"]

    res_msme = generate_ai_call_suggestion(
        user_id="user-msme",
        profession="msme",
        answers={i: 3 for i in range(10)},
        language="gu"
    )
    assert "મુદ્રા" in res_msme["spoken_offer"]


@pytest.mark.asyncio
async def test_on_call_banking_outbound_and_results_flow():
    """Verify end-to-end On-Call Banking callback and dashboard redirect."""
    test_user_id = "test-bank-user-456"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        # Trigger outbound call for on-call banking in Gujarati
        call_res = await ac.post("/vapi/outbound-call", json={
            "user_id": test_user_id,
            "phone": "9876543215",
            "language": "gu",
            "profession": "farmer",
            "call_type": "on_call_banking"
        })
        assert call_res.status_code == 200
        call_data = call_res.json()
        assert call_data["status"] in ("simulated", "success")
        assert call_data["phone"] == "+919876543215"

        # Check call results status
        status_res = await ac.get(f"/vapi/call-results/{test_user_id}")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["user_id"] == test_user_id
        assert status_data["call_type"] == "on_call_banking"
        assert status_data["status"] in ("ringing", "in_progress", "completed")

        # Fast forward simulation to complete call and verify Loan Dashboard handoff
        if test_user_id in call_results_store:
            call_results_store[test_user_id]["created_at"] = time.time() - 25.0

        final_res = await ac.get(f"/vapi/call-results/{test_user_id}")
        assert final_res.status_code == 200
        final_data = final_res.json()
        assert final_data["completed"] is True
        assert final_data["redirect_to"] == "/score"
        assert "ai_suggestion" in final_data
        assert final_data["ai_suggestion"]["credit_limit"] > 0
        assert "અભિનંદન" in final_data["ai_suggestion"]["spoken_offer"]


@pytest.mark.asyncio
async def test_assessment_voice_outbound_flow():
    """Verify Questionnaire Assessment outbound call and handoff."""
    test_user_id = "test-assess-user-789"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        call_res = await ac.post("/vapi/outbound-call", json={
            "user_id": test_user_id,
            "phone": "9876543215",
            "language": "gu",
            "profession": "msme",
            "call_type": "assessment"
        })
        assert call_res.status_code == 200
        assert call_res.json()["question_count"] == 10

        # Fast forward simulation
        if test_user_id in call_results_store:
            call_results_store[test_user_id]["created_at"] = time.time() - 30.0

        final_res = await ac.get(f"/vapi/call-results/{test_user_id}")
        assert final_res.status_code == 200
        final_data = final_res.json()
        assert final_data["completed"] is True
        assert final_data["redirect_to"] == "/score"
        assert len(final_data["answers"]) == 10
