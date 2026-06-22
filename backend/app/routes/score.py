from pathlib import Path

import numpy as np
from fastapi import APIRouter

from app.ml.consolidator import run_consolidator
from app.ml.explainer import ScoringEngine
from app.ml.features import TIER1_FEATURES, TIER2_FEATURES
from app.ml.pipeline import score_to_band
from app.models.schemas import ScoreRequest, ScoreResponse, ShapFeature, SignalConflict

router = APIRouter()

_engine: ScoringEngine | None = None


def _get_engine() -> ScoringEngine:
    global _engine
    if _engine is None:
        _engine = ScoringEngine(Path(__file__).resolve().parents[2] / ".." / "models")
    return _engine


def _build_response(user_id: str, tier: str, engine: ScoringEngine, rng: np.random.Generator) -> ScoreResponse:
    if tier == "tier2":
        X = rng.random((1, len(TIER2_FEATURES)))
        result = engine.score_and_explain_tier2(X)[0]
    else:
        X = rng.random((1, len(TIER1_FEATURES)))
        result = engine.score_and_explain_tier1(X)[0]

    consolidated = run_consolidator(
        score=result["score"],
        shap_details=result["shap_details"],
        applicant_flags={"is_wilful_defaulter": False, "high_emi_burden": False},
        tier=tier,
    )

    final_score = consolidated["final_score"]
    band = score_to_band(final_score)
    tier_label = "Tier 2 (Full)" if tier == "tier2" else "Tier 1 (Zero-history)"

    return ScoreResponse(
        user_id=user_id,
        score=final_score,
        risk_band=band,
        tier=tier_label,
        model_version="blend-calibrated",
        shap_details=[ShapFeature(**feat) for feat in result["shap_details"]],
        signal_conflicts=[SignalConflict(**c) for c in consolidated["signal_conflicts"]],
        hard_caps_applied=consolidated["hard_caps_applied"],
        tier1_reweight=consolidated["tier1_reweight"],
        has_conflicts=consolidated["has_conflicts"],
        has_hard_cap=consolidated["has_hard_cap"],
    )


@router.post("/score", response_model=ScoreResponse)
async def post_score(body: ScoreRequest) -> ScoreResponse:
    engine = _get_engine()
    rng = np.random.default_rng(hash(body.user_id) % (2**32))
    has_bank = "d1_bank" in body.consented_sources
    tier = "tier2" if has_bank else "tier1"
    return _build_response(body.user_id, tier, engine, rng)


@router.get("/score/{user_id}", response_model=ScoreResponse)
async def get_score(user_id: str) -> ScoreResponse:
    engine = _get_engine()
    rng = np.random.default_rng(hash(user_id) % (2**32))
    has_bank = rng.random() > 0.2
    tier = "tier2" if has_bank else "tier1"
    return _build_response(user_id, tier, engine, rng)
