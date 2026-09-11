from typing import Literal
import numpy as np

RiskProfile = Literal["low", "medium", "high"]

PURCHASE_FREQ_PARAMS: dict[RiskProfile, tuple[float, float]] = {
    "low": (5, 3),
    "medium": (3.5, 3),
    "high": (2.5, 4),
}

RETURN_RATE_PARAMS: dict[RiskProfile, tuple[float, float]] = {
    "low": (1.5, 12),
    "medium": (3, 7),
    "high": (5, 5),
}


def generate(rng: np.random.Generator, risk_profile: RiskProfile) -> dict:
    pf_a, pf_b = PURCHASE_FREQ_PARAMS[risk_profile]
    purchase_frequency = max(1, int(rng.beta(pf_a, pf_b) * 30))

    rr_a, rr_b = RETURN_RATE_PARAMS[risk_profile]
    return_rate = float(np.clip(rng.beta(rr_a, rr_b) + rng.normal(0, 0.06), 0, 1))

    monthly_spend = [
        round(float(rng.lognormal(
            {"low": 8.5, "medium": 7.8, "high": 7.0}[risk_profile],
            {"low": 0.4, "medium": 0.6, "high": 0.9}[risk_profile],
        )), 2)
        for _ in range(12)
    ]
    avg_spend = float(np.mean(monthly_spend))
    spend_trend = float(np.polyfit(range(12), monthly_spend, 1)[0]) / max(avg_spend, 1)

    account_age_months = int(rng.integers(
        {"low": 24, "medium": 6, "high": 1}[risk_profile],
        73,
    ))

    category_diversity = int(rng.binomial(
        15,
        {"low": 0.6, "medium": 0.4, "high": 0.2}[risk_profile],
    ))

    return {
        "ecom_purchase_frequency": purchase_frequency,
        "ecom_return_rate": round(return_rate, 4),
        "ecom_avg_monthly_spend": round(avg_spend, 2),
        "ecom_spend_trend": round(spend_trend, 6),
        "ecom_account_age_months": account_age_months,
        "ecom_category_diversity": max(1, category_diversity),
    }
