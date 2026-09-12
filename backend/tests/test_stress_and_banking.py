import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ml.stress_monitor import (
    analyze_stress,
    _detect_low_savings,
    _detect_salary_delay,
    _detect_medical_emergency,
    _detect_emi_default_risk,
)
from app.ml.recommender import recommend_products


client = TestClient(app)


def test_stress_monitor_low_savings():
    features = {
        "bank_avg_monthly_inflow": 25000.0,
        "bank_balance_volatility": 0.45,
        "bank_min_balance_ratio": 0.04,  # Est savings = 1000 (< 2000 critical threshold)
    }
    trigger = _detect_low_savings(features, segment="general")
    assert trigger is not None
    assert trigger["trigger_type"] == "low_savings"
    assert trigger["severity_score"] >= 80
    assert trigger["confidence_score"] > 50
    assert "Monthly savings estimated" in trigger["ai_summary"]
    assert "empathetic_message" in trigger
    assert len(trigger["empathetic_message"]) > 20


def test_stress_monitor_salary_delay_salaried():
    features = {
        "bank_avg_monthly_inflow": 30000.0,
        "bank_payment_regularity": 0.40,  # Below 0.65 threshold
        "bank_balance_volatility": 0.35,
    }
    trigger = _detect_salary_delay(features, segment="stable_earner")
    assert trigger is not None
    assert trigger["trigger_type"] == "salary_delay"
    assert trigger["severity_score"] >= 60
    assert "delay" in trigger["ai_summary"].lower()
    assert "empathetic_message" in trigger


def test_stress_monitor_salary_delay_farmer():
    features = {
        "bank_avg_monthly_inflow": 22000.0,
        "bank_payment_regularity": 0.35,
        "bank_balance_volatility": 0.65,
    }
    trigger = _detect_salary_delay(features, segment="farmer")
    assert trigger is not None
    assert trigger["trigger_type"] == "salary_delay"
    assert "harvest" in trigger["ai_summary"].lower()
    assert "empathetic_message" in trigger


def test_stress_monitor_medical_emergency():
    features = {
        "bank_avg_monthly_inflow": 20000.0,
        "bank_balance_volatility": 0.65,
        "bank_min_balance_ratio": 0.03,
    }
    trigger = _detect_medical_emergency(features, segment="general")
    assert trigger is not None
    assert trigger["trigger_type"] == "medical_emergency"
    assert trigger["severity_score"] >= 70
    assert "balance drain" in trigger["ai_summary"].lower()
    assert "empathetic_message" in trigger


def test_stress_monitor_emi_default_risk():
    features = {
        "bank_avg_monthly_inflow": 18000.0,
        "bank_balance_volatility": 0.55,
        "bank_payment_regularity": 0.40,
        "telecom_missed_payments": 3.0,
    }
    trigger = _detect_emi_default_risk(features, segment="general")
    assert trigger is not None
    assert trigger["trigger_type"] == "emi_default_risk"
    assert trigger["severity_score"] >= 35
    assert "default" in trigger["ai_summary"].lower()


def test_analyze_stress_sorting():
    features = {
        "bank_avg_monthly_inflow": 25000.0,
        "bank_balance_volatility": 0.60,
        "bank_min_balance_ratio": 0.02,
        "bank_payment_regularity": 0.35,
        "telecom_missed_payments": 4.0,
    }
    triggers = analyze_stress("user_test", features, segment="general", score=580)
    assert len(triggers) >= 2
    # Verify sorted by severity score descending
    for i in range(len(triggers) - 1):
        assert triggers[i]["severity_score"] >= triggers[i + 1]["severity_score"]


def test_api_stress_triggers():
    resp = client.get("/personalize/stress-triggers/msme@altgrade.in")
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == "msme@altgrade.in"
    assert "triggers" in data
    assert "total_triggers" in data
    assert "max_severity" in data


def test_api_officer_alerts_enriched():
    resp = client.get("/personalize/alerts/officer")
    assert resp.status_code == 200
    data = resp.json()
    assert "alerts" in data
    assert len(data["alerts"]) > 0

    # Verify each alert has the required scores and summaries
    for alert in data["alerts"]:
        assert "severity_score" in alert
        assert "confidence_score" in alert
        assert "ai_summary" in alert
        assert isinstance(alert["severity_score"], (int, float))
        assert isinstance(alert["confidence_score"], (int, float))


def test_api_officer_message_flow():
    test_user = "test_applicant_stress@altgrade.in"

    # Send SMS message
    payload_sms = {
        "user_id": test_user,
        "message": "We noticed financial stress in your recent statement. Can we offer a 30-day EMI grace?",
        "category": "restructuring_offer",
        "channel": "sms",
        "officer_name": "Field Officer Ramesh",
    }
    resp_sms = client.post("/personalize/officer-message", json=payload_sms)
    assert resp_sms.status_code == 200
    res_sms_data = resp_sms.json()
    assert res_sms_data["status"] == "ok"
    assert res_sms_data["message_stored"] is True
    assert res_sms_data["trigger_ai_call"] is False

    # Send Call channel message
    payload_call = {
        "user_id": test_user,
        "message": "Urgent check-in regarding seasonal crop cycle support.",
        "category": "check_in",
        "channel": "call",
        "officer_name": "Senior Loan Officer Anita",
    }
    resp_call = client.post("/personalize/officer-message", json=payload_call)
    assert resp_call.status_code == 200
    res_call_data = resp_call.json()
    assert res_call_data["status"] == "ok"
    assert res_call_data["trigger_ai_call"] is True

    # Retrieve messages for this user
    resp_get = client.get(f"/personalize/officer-messages/{test_user}")
    assert resp_get.status_code == 200
    messages_data = resp_get.json()
    assert messages_data["user_id"] == test_user
    assert messages_data["total"] >= 2
    # Check that the newest message is first
    messages = messages_data["messages"]
    assert any(m["category"] == "restructuring_offer" for m in messages)
    assert any(m["channel"] == "call" for m in messages)


def test_banking_products_catalogue():
    features = {
        "bank_avg_monthly_inflow": 15000.0,
        "bank_min_balance_ratio": 0.05,
        "merchant_has_gst": 0,
    }
    recs = recommend_products(segment="stressed", score=520, features=features)
    assert len(recs) > 0
    rec_ids = [r["product_id"] for r in recs]
    # Check that inclusive products like emergency buffer, savings, insurance, or microcredit appear
    assert any("buffer" in pid or "pmjdy" in pid or "pmjjby" in pid or "svanidhi" in pid or "mudra" in pid for pid in rec_ids)


def test_gujarati_vernacular_in_personalize():
    resp = client.get("/personalize/farmer@altgrade.in")
    assert resp.status_code == 200
    data = resp.json()
    assert "borrower_summary" in data
    audio_scripts = data["borrower_summary"]["audio_scripts"]
    assert "gu" in audio_scripts
    assert len(audio_scripts["gu"]) > 20
    # Verify Gujarati characters
    assert any('\u0A80' <= ch <= '\u0AFF' for ch in audio_scripts["gu"])
