from typing import Literal
import numpy as np

RiskProfile = Literal["low", "medium", "high"]

FILING_REG_PARAMS: dict[RiskProfile, tuple[float, float]] = {
    "low": (7, 2.5),
    "medium": (5, 4),
    "high": (3, 5.5),
}

MERCHANT_RATING_PARAMS: dict[RiskProfile, tuple[float, float]] = {
    "low": (5, 2.5),
    "medium": (4, 4),
    "high": (2.5, 5),
}


def generate(rng: np.random.Generator, risk_profile: RiskProfile) -> dict:
    fr_a, fr_b = FILING_REG_PARAMS[risk_profile]
    filing_regularity = float(np.clip(rng.beta(fr_a, fr_b) + rng.normal(0, 0.07), 0, 1))

    mr_a, mr_b = MERCHANT_RATING_PARAMS[risk_profile]
    merchant_rating = 1.0 + float(np.clip(rng.beta(mr_a, mr_b) + rng.normal(0, 0.06), 0, 1)) * 4.0

    months_operating = max(1, int(rng.gamma(
        {"low": 8, "medium": 4, "high": 2}[risk_profile],
        {"low": 12, "medium": 8, "high": 4}[risk_profile],
    )))

    annual_turnover = max(50_000, round(float(rng.lognormal(
        {"low": 14.5, "medium": 13.5, "high": 12.5}[risk_profile],
        {"low": 0.5, "medium": 0.8, "high": 1.2}[risk_profile],
    )), 2))

    gst_returns_filed_12m = int(rng.binomial(
        12,
        {"low": 0.95, "medium": 0.70, "high": 0.35}[risk_profile],
    ))

    has_gst = bool(rng.random() < {"low": 0.9, "medium": 0.6, "high": 0.25}[risk_profile])

    return {
        "merchant_filing_regularity": round(filing_regularity, 4),
        "merchant_rating": round(merchant_rating, 2),
        "merchant_months_operating": months_operating,
        "merchant_annual_turnover": annual_turnover,
        "merchant_gst_returns_filed": gst_returns_filed_12m,
        "merchant_has_gst": int(has_gst),
    }
