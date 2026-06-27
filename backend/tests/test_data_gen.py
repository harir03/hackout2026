import pytest
import numpy as np
from app.data_gen import (
    d1_bank_upi,
    d2_telecom,
    d3_ecommerce,
    d4_location,
    d5_questionnaire,
    d6_merchant_gst,
    orchestrator,
)


def test_individual_generators():
    rng = np.random.default_rng(42)
    profile = "low"
    
    bank_data = d1_bank_upi.generate(rng, profile)
    assert len(bank_data) > 0
    assert "bank_avg_monthly_inflow" in bank_data

    telecom_data = d2_telecom.generate(rng, profile)
    assert len(telecom_data) > 0
    assert "telecom_ontime_rate" in telecom_data

    ecom_data = d3_ecommerce.generate(rng, profile)
    assert len(ecom_data) > 0
    assert "ecom_purchase_frequency" in ecom_data

    loc_data = d4_location.generate(rng, profile)
    assert len(loc_data) > 0
    assert "loc_address_changes_24m" in loc_data

    psych_data = d5_questionnaire.generate(rng, profile)
    assert len(psych_data) > 0
    assert "psych_engagement_score" in psych_data

    merchant_data = d6_merchant_gst.generate(rng, profile)
    assert len(merchant_data) > 0
    assert "merchant_gst_returns_filed" in merchant_data


def test_orchestrator_generate_single():
    rng = np.random.default_rng(42)
    record = orchestrator.generate_applicant(rng, "low")
    assert "applicant_id" in record
    assert record["risk_profile"] == "low"
    assert "bank_avg_monthly_inflow" in record
