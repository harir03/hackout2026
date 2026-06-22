import json
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter
from pydantic import BaseModel

from app.ml.consolidator import run_consolidator
from app.ml.explainer import ScoringEngine
from app.ml.features import TIER2_FEATURES
from app.ml.pipeline import score_to_band

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

PROJECT_ROOT = Path(__file__).resolve().parents[2] / ".."
MODELS_DIR = PROJECT_ROOT / "models"
DATA_PATH = PROJECT_ROOT / "data" / "synthetic" / "applicants.parquet"
SAMPLE_SIZE = 200
_cached_overview: dict | None = None


class BandCount(BaseModel):
    band: str
    count: int
    percentage: float


class ConflictApplicant(BaseModel):
    user_id: str
    score: int
    band: str
    conflicts: list[str]


class FairnessResult(BaseModel):
    demographic_parity_ratio: float
    passes_four_fifths: bool
    last_audit: str


class DashboardOverview(BaseModel):
    total_scored: int
    approval_rate: float
    conflict_count: int
    hard_cap_count: int
    band_distribution: list[BandCount]
    flagged_applicants: list[ConflictApplicant]
    fairness: FairnessResult


def _compute_overview() -> dict:
    engine = ScoringEngine(MODELS_DIR)
    rng = np.random.default_rng(2024)

    df = pd.read_parquet(DATA_PATH)
    available_features = [f for f in TIER2_FEATURES if f in df.columns]
    sample = df.sample(n=min(SAMPLE_SIZE, len(df)), random_state=2024)

    band_counts: dict[str, int] = {
        "Excellent": 0, "Good": 0, "Fair": 0,
        "Poor": 0, "Not Eligible": 0,
    }
    approved = 0
    conflict_count = 0
    hard_cap_count = 0
    flagged: list[dict] = []

    for idx, (_, row) in enumerate(sample.iterrows()):
        user_id = str(row.get("applicant_id", f"applicant-{idx:04d}"))

        feature_values = []
        for feat in TIER2_FEATURES:
            if feat in row.index and pd.notna(row[feat]):
                feature_values.append(float(row[feat]))
            else:
                feature_values.append(0.0)

        X = np.array([feature_values])
        result = engine.score_and_explain_tier2(X)[0]

        is_wilful = rng.random() < 0.02
        high_emi = rng.random() < 0.08

        consolidated = run_consolidator(
            score=result["score"],
            shap_details=result["shap_details"],
            applicant_flags={
                "is_wilful_defaulter": is_wilful,
                "high_emi_burden": high_emi,
            },
            tier="tier2",
        )

        final_score = consolidated["final_score"]
        band = score_to_band(final_score)
        band_counts[band] = band_counts.get(band, 0) + 1

        if final_score >= 550:
            approved += 1

        if consolidated["has_conflicts"]:
            conflict_count += 1
            flagged.append({
                "user_id": user_id,
                "score": final_score,
                "band": band,
                "conflicts": [c["description"] for c in consolidated["signal_conflicts"][:2]],
            })

        if consolidated["has_hard_cap"]:
            hard_cap_count += 1

    fairness_path = MODELS_DIR / "shap_outputs" / "fairness_audit.json"
    if fairness_path.exists():
        audit = json.loads(fairness_path.read_text())
        fairness = {
            "demographic_parity_ratio": audit.get("demographic_parity_ratio", 0.0),
            "passes_four_fifths": audit.get("passes_four_fifths_rule", False),
            "last_audit": "Post-training audit",
        }
    else:
        fairness = {
            "demographic_parity_ratio": 0.0,
            "passes_four_fifths": False,
            "last_audit": "Not available",
        }

    distribution = [
        {"band": band, "count": count, "percentage": round(count / SAMPLE_SIZE * 100, 1)}
        for band, count in band_counts.items()
    ]

    return {
        "total_scored": SAMPLE_SIZE,
        "approval_rate": round(approved / SAMPLE_SIZE * 100, 1),
        "conflict_count": conflict_count,
        "hard_cap_count": hard_cap_count,
        "band_distribution": distribution,
        "flagged_applicants": sorted(flagged, key=lambda x: -x["score"])[:20],
        "fairness": fairness,
    }


@router.get("/overview", response_model=DashboardOverview)
async def get_overview() -> DashboardOverview:
    global _cached_overview
    if _cached_overview is None:
        _cached_overview = _compute_overview()
    return DashboardOverview(**_cached_overview)
