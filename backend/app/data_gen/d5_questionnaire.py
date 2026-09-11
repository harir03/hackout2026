from typing import Literal
import numpy as np

RiskProfile = Literal["low", "medium", "high"]

RUBRIC_WEIGHTS = [
    1.0, 0.8, 1.2, 0.9, 1.0, 0.7, 1.1, 0.8, 1.0, 0.9,
    1.0, 0.8, 1.2, 0.9, 1.0, 0.7, 1.1, 0.8, 1.0, 0.9,
    1.0, 0.8, 1.2, 0.9, 1.0, 0.7, 1.1, 0.8, 1.0, 0.9,
]

LIKERT_CENTER: dict[RiskProfile, float] = {
    "low": 3.6,
    "medium": 3.0,
    "high": 2.6,
}

LIKERT_SPREAD: dict[RiskProfile, float] = {
    "low": 0.9,
    "medium": 1.0,
    "high": 1.0,
}


def _engagement_score(rng: np.random.Generator, answers: np.ndarray, risk_profile: RiskProfile) -> float:
    reversal_count = 0
    for i in range(2, len(answers)):
        if (answers[i] - answers[i - 1]) * (answers[i - 1] - answers[i - 2]) < 0:
            reversal_count += 1
    reversal_rate = reversal_count / max(len(answers) - 2, 1)

    unique_ratio = len(np.unique(answers)) / 5.0

    base_engagement = (reversal_rate * 0.6 + unique_ratio * 0.4)
    noise = float(rng.normal(0, 0.12))

    return float(np.clip(base_engagement + noise, 0, 1))


def generate(rng: np.random.Generator, risk_profile: RiskProfile) -> dict:
    center = LIKERT_CENTER[risk_profile]
    spread = LIKERT_SPREAD[risk_profile]

    raw_answers = rng.normal(center, spread, size=30)
    answers = np.clip(np.round(raw_answers), 1, 5).astype(int)

    engagement = _engagement_score(rng, answers, risk_profile)

    consistency = 1.0 - float(np.std(answers) / 2.0)
    consistency += float(rng.normal(0, 0.08))

    completion_time_seconds = max(60, int(rng.normal(
        {"low": 280, "medium": 240, "high": 180}[risk_profile],
        {"low": 80, "medium": 80, "high": 80}[risk_profile],
    )))

    straight_line_count = 0
    for i in range(1, 30):
        if answers[i] == answers[i - 1]:
            straight_line_count += 1

    return {
        "psych_engagement_score": round(engagement, 4),
        "psych_consistency": round(max(0, min(1, consistency)), 4),
        "psych_completion_time_sec": completion_time_seconds,
        "psych_straight_line_ratio": round(straight_line_count / 29, 4),
        "psych_mean_answer": round(float(np.mean(answers)), 4),
        "psych_std_answer": round(float(np.std(answers)), 4),
    }
