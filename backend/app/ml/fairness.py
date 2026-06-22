import numpy as np
from fairlearn.metrics import demographic_parity_ratio


FOUR_FIFTHS_THRESHOLD = 0.8


def audit_demographic_parity(
    predictions: np.ndarray,
    sensitive_attribute: np.ndarray,
    favorable_threshold: int = 550,
) -> dict:
    favorable = (predictions >= favorable_threshold).astype(int)

    ratio = demographic_parity_ratio(
        y_true=favorable,
        y_pred=favorable,
        sensitive_features=sensitive_attribute,
    )

    groups = np.unique(sensitive_attribute)
    group_rates = {}
    for group in groups:
        mask = sensitive_attribute == group
        group_rates[str(group)] = round(float(favorable[mask].mean()), 4)

    flagged = bool(ratio < FOUR_FIFTHS_THRESHOLD)

    return {
        "demographic_parity_ratio": round(float(ratio), 4),
        "threshold": FOUR_FIFTHS_THRESHOLD,
        "flagged": flagged,
        "favorable_score_cutoff": favorable_threshold,
        "group_approval_rates": group_rates,
    }
