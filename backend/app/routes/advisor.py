from pathlib import Path
from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.ml.consolidator import run_consolidator
from app.ml.explainer import ScoringEngine
from app.ml.features import TIER1_FEATURES, TIER2_FEATURES
from app.ml.pipeline import score_to_band
from app.rag.advisor import get_advisor
from app.rag.ingestion import ingest_sources

router = APIRouter(prefix="/advisor", tags=["advisor"])

_engine: ScoringEngine | None = None


def _get_engine() -> ScoringEngine:
    global _engine
    if _engine is None:
        _engine = ScoringEngine(Path(__file__).resolve().parents[2] / ".." / "models")
    return _engine


def _score_for_user(user_id: str) -> dict[str, Any]:
    engine = _get_engine()
    rng = np.random.default_rng(hash(user_id) % (2**32))
    has_bank_data = rng.random() > 0.2
    tier = "tier2" if has_bank_data else "tier1"

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

    return {
        "score": consolidated["final_score"],
        "risk_band": score_to_band(consolidated["final_score"]),
        "tier": "Tier 2 (Full)" if tier == "tier2" else "Tier 1 (Zero-history)",
        "shap_details": result["shap_details"],
        "signal_conflicts": consolidated["signal_conflicts"],
        "hard_caps_applied": consolidated["hard_caps_applied"],
        "tier1_reweight": consolidated["tier1_reweight"],
    }


class AskRequest(BaseModel):
    user_id: str
    question: str


class SourceChunk(BaseModel):
    id: str
    source: str
    excerpt: str


class AskResponse(BaseModel):
    answer: str
    question: str
    sources: list[SourceChunk]
    applicant_context_used: bool


class IngestResponse(BaseModel):
    collections: dict[str, int]
    status: str


@router.post("/ask", response_model=AskResponse)
async def ask_advisor(request: AskRequest) -> AskResponse:
    api_key = settings.gemini_api_key
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")

    score_result = _score_for_user(request.user_id)
    advisor = get_advisor(api_key)

    result = advisor.answer(
        question=request.question,
        score_result=score_result,
        api_key=api_key,
    )

    return AskResponse(
        answer=result["answer"],
        question=result["question"],
        sources=[SourceChunk(**s) for s in result["sources"]],
        applicant_context_used=result["applicant_context_used"],
    )


@router.post("/ingest", response_model=IngestResponse)
async def run_ingestion() -> IngestResponse:
    api_key = settings.gemini_api_key
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")

    stats = ingest_sources(api_key)
    return IngestResponse(collections=stats, status="ok")
