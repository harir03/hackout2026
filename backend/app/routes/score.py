import uuid
import asyncio
from pathlib import Path
import numpy as np
from fastapi import APIRouter
from sqlalchemy import text

from app.db import async_session
from app.ml.consolidator import run_consolidator
from app.ml.explainer import ScoringEngine
from app.ml.features import TIER1_FEATURES, TIER2_FEATURES
from app.ml.pipeline import score_to_band
from app.models.schemas import ScoreRequest, ScoreResponse, ShapFeature, SignalConflict

from app.data_gen import (
    d1_bank_upi,
    d2_telecom,
    d3_ecommerce,
    d4_location,
    d5_questionnaire,
    d6_merchant_gst,
)

router = APIRouter()
_engine = None


def _get_engine() -> ScoringEngine:
    global _engine
    if _engine is None:
        _engine = ScoringEngine(Path(__file__).resolve().parents[2] / ".." / "models")
    return _engine


async def _build_response(
    user_id: str,
    tier: str,
    engine: ScoringEngine,
    rng: np.random.Generator,
    consent_id: str | None = None,
) -> ScoreResponse:
    profiles = ["low", "medium", "high"]
    profile = profiles[hash(user_id) % len(profiles)]

    feat_dict = {}
    feat_dict.update(d1_bank_upi.generate(rng, profile))
    feat_dict.update(d2_telecom.generate(rng, profile))
    feat_dict.update(d4_location.generate(rng, profile))
    feat_dict.update(d5_questionnaire.generate(rng, profile))
    feat_dict.update(d6_merchant_gst.generate(rng, profile))

    from app.routes.auth import IN_MEMORY_TOKENS, get_redis_client
    gmail_token = None
    r = get_redis_client()
    if r:
        try:
            gmail_token = r.get(f"gmail_token:{user_id}")
        except Exception:
            pass
    if not gmail_token:
        gmail_token = IN_MEMORY_TOKENS.get(user_id)

    if gmail_token:
        from app.data_gen import d3_gmail
        ecom_data = await d3_gmail.generate(gmail_token, rng, profile)
    else:
        ecom_data = d3_ecommerce.generate(rng, profile)

    feat_dict.update(ecom_data)
    ecom_source = ecom_data.get("source", "simulated")

    if tier == "tier2":
        x_values = [feat_dict[feat] for feat in TIER2_FEATURES]
        X = np.array([x_values])
        result = engine.score_and_explain_tier2(X)[0]
    else:
        x_values = [feat_dict[feat] for feat in TIER1_FEATURES]
        X = np.array([x_values])
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

    try:
        async def _log_score_to_db():
            async with async_session() as session:
                score_id = uuid.uuid4()
                try:
                    db_user_id = uuid.UUID(user_id)
                except ValueError:
                    db_user_id = uuid.uuid5(uuid.NAMESPACE_DNS, user_id)

                await session.execute(
                    text(
                        "INSERT INTO scores (id, user_id, score, risk_band, tier, consented_sources, model_version, consent_id) "
                        "VALUES (:id, :user_id, :score, :risk_band, :tier, :sources, :version, :consent_id)"
                    ),
                    {
                        "id": score_id,
                        "user_id": db_user_id,
                        "score": final_score,
                        "risk_band": band,
                        "tier": tier_label,
                        "sources": TIER2_FEATURES if tier == "tier2" else TIER1_FEATURES,
                        "version": "blend-calibrated",
                        "consent_id": uuid.UUID(consent_id) if consent_id else None,
                    }
                )

                for feat in result["shap_details"]:
                    await session.execute(
                        text(
                            "INSERT INTO shap_values (id, score_id, feature_name, shap_value, feature_value) "
                            "VALUES (:id, :score_id, :name, :shap, :val)"
                        ),
                        {
                            "id": uuid.uuid4(),
                            "score_id": score_id,
                            "name": feat["label"],
                            "shap": feat["points"],
                            "val": feat["feature_value"],
                        }
                    )
                await session.commit()

        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_log_score_to_db())
    except Exception as db_ex:
        print(f"PostgreSQL decision audit log skipped: {db_ex}")

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
        consent_id=consent_id,
        ecom_source=ecom_source,
    )


@router.post("/score", response_model=ScoreResponse)
async def post_score(body: ScoreRequest) -> ScoreResponse:
    engine = _get_engine()
    rng = np.random.default_rng(hash(body.user_id) % (2**32))
    has_bank = "d1_bank" in body.consented_sources
    tier = "tier2" if has_bank else "tier1"
    return await _build_response(body.user_id, tier, engine, rng, body.consent_id)


@router.get("/score/{user_id}", response_model=ScoreResponse)
async def get_score(user_id: str, consent_id: str | None = None) -> ScoreResponse:
    engine = _get_engine()
    rng = np.random.default_rng(hash(user_id) % (2**32))
    has_bank = rng.random() > 0.2
    tier = "tier2" if has_bank else "tier1"
    return await _build_response(user_id, tier, engine, rng, consent_id)
