from typing import Literal
import numpy as np

RiskProfile = Literal["low", "medium", "high"]

ONTIME_PARAMS: dict[RiskProfile, tuple[float, float]] = {
    "low": (5, 3.5),
    "medium": (4, 4),
    "high": (3.5, 4.5),
}

PLAN_VALUE_PARAMS: dict[RiskProfile, tuple[float, float]] = {
    "low": (500, 2500),
    "medium": (300, 1200),
    "high": (150, 600),
}


def generate(rng: np.random.Generator, risk_profile: RiskProfile) -> dict:
    ot_a, ot_b = ONTIME_PARAMS[risk_profile]
    monthly_ontime = [float(rng.beta(ot_a, ot_b)) for _ in range(24)]
    ontime_rate = float(np.clip(np.mean(monthly_ontime) + rng.normal(0, 0.06), 0, 1))

    ontime_trend = float(np.polyfit(range(24), monthly_ontime, 1)[0])

    plan_lo, plan_hi = PLAN_VALUE_PARAMS[risk_profile]
    plan_value = round(float(rng.uniform(plan_lo, plan_hi)), 2)

    active_months = int(rng.integers(
        {"low": 18, "medium": 8, "high": 1}[risk_profile],
        25,
    ))

    data_usage_gb = round(float(rng.gamma(
        {"low": 5, "medium": 3, "high": 1.5}[risk_profile],
        {"low": 3, "medium": 2, "high": 1}[risk_profile],
    )), 2)

    missed_payments_24m = int(rng.binomial(
        24,
        {"low": 0.06, "medium": 0.14, "high": 0.25}[risk_profile],
    ))

    return {
        "telecom_ontime_rate": round(ontime_rate, 4),
        "telecom_ontime_trend": round(ontime_trend, 6),
        "telecom_plan_value": plan_value,
        "telecom_active_months": active_months,
        "telecom_data_usage_gb": data_usage_gb,
        "telecom_missed_payments": missed_payments_24m,
    }
