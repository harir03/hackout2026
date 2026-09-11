from typing import Literal
import numpy as np
from faker import Faker

fake = Faker("en_IN")

RiskProfile = Literal["low", "medium", "high"]

INFLOW_TREND_PARAMS: dict[RiskProfile, tuple[float, float]] = {
    "low": (0.02, 0.02),
    "medium": (0.005, 0.02),
    "high": (-0.01, 0.025),
}

BALANCE_VOLATILITY_PARAMS: dict[RiskProfile, tuple[float, float]] = {
    "low": (2, 8),
    "medium": (4, 4),
    "high": (7, 3),
}

PAYMENT_REGULARITY_PARAMS: dict[RiskProfile, tuple[float, float]] = {
    "low": (7, 3),
    "medium": (5, 4),
    "high": (3, 6),
}


def generate(rng: np.random.Generator, risk_profile: RiskProfile) -> dict:
    trend_mean, trend_std = INFLOW_TREND_PARAMS[risk_profile]
    monthly_inflows = []
    base_inflow = rng.uniform(15_000, 120_000)
    for month in range(12):
        growth = rng.normal(trend_mean, trend_std)
        base_inflow = max(base_inflow * (1 + growth), 1_000)
        monthly_inflows.append(round(base_inflow, 2))

    vol_a, vol_b = BALANCE_VOLATILITY_PARAMS[risk_profile]
    balance_volatility = float(np.clip(rng.beta(vol_a, vol_b) + rng.normal(0, 0.08), 0, 1))

    reg_a, reg_b = PAYMENT_REGULARITY_PARAMS[risk_profile]
    payment_regularity = float(np.clip(rng.beta(reg_a, reg_b) + rng.normal(0, 0.08), 0, 1))

    avg_inflow = np.mean(monthly_inflows)
    inflow_trend_slope = float(np.polyfit(range(12), monthly_inflows, 1)[0]) / avg_inflow

    upi_txn_count_monthly = int(rng.poisson(
        {"low": 35, "medium": 25, "high": 15}[risk_profile]
    ))

    min_balance_ratio = float(rng.beta(
        {"low": 5, "medium": 3, "high": 1.5}[risk_profile],
        {"low": 2, "medium": 4, "high": 6}[risk_profile],
    ))

    return {
        "bank_avg_monthly_inflow": round(avg_inflow, 2),
        "bank_inflow_trend": round(inflow_trend_slope, 6),
        "bank_balance_volatility": round(balance_volatility, 4),
        "bank_payment_regularity": round(payment_regularity, 4),
        "bank_upi_txn_count": upi_txn_count_monthly,
        "bank_min_balance_ratio": round(min_balance_ratio, 4),
    }
