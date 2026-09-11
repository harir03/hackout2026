import pytest
import numpy as np
from app.ml.pipeline import score_to_band
from app.ml.consolidator import run_consolidator
from app.ml.features import TIER1_FEATURES, TIER2_FEATURES
from app.ml.explainer import ScoringEngine


def test_score_to_band():
    assert score_to_band(800) == "Excellent"
    assert score_to_band(700) == "Good"
    assert score_to_band(600) == "Fair"
    assert score_to_band(450) == "Poor"
    assert score_to_band(200) == "Not Eligible"


def test_consolidator_no_flags():
    res = run_consolidator(
        score=650,
        shap_details=[],
        applicant_flags={"is_wilful_defaulter": False, "high_emi_burden": False},
        tier="tier2"
    )
    assert res["final_score"] == 650
    assert res["has_hard_cap"] is False
    assert res["has_conflicts"] is False


def test_consolidator_hard_cap_wilful():
    res = run_consolidator(
        score=750,
        shap_details=[],
        applicant_flags={"is_wilful_defaulter": True, "high_emi_burden": False},
        tier="tier2"
    )
    assert res["final_score"] == 200
    assert res["has_hard_cap"] is True


def test_consolidator_hard_cap_emi():
    res = run_consolidator(
        score=750,
        shap_details=[],
        applicant_flags={"is_wilful_defaulter": False, "high_emi_burden": True},
        tier="tier2"
    )
    assert res["final_score"] == 350
    assert res["has_hard_cap"] is True
