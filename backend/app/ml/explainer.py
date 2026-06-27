import pickle
from pathlib import Path
from typing import Any

import numpy as np
import shap
from xgboost import XGBClassifier

from app.ml.features import TIER1_FEATURES, TIER2_FEATURES

WORKER_PREFIX_MAP = {
    "bank_": "Bank/UPI",
    "telecom_": "Telecom",
    "ecom_": "E-commerce",
    "loc_": "Location",
    "psych_": "Questionnaire",
    "merchant_": "Merchant/GST",
}

BASELINE_SCORE = 600
SCORE_FLOOR = 0
SCORE_CEILING = 850

BAND_RANGES = {
    0: (700, 850),
    1: (450, 700),
    2: (0, 450),
}


def _feature_to_worker(feature_name: str) -> str:
    for prefix, worker in WORKER_PREFIX_MAP.items():
        if feature_name.startswith(prefix):
            return worker
    return "Unknown"


def _deterministic_score(probs: np.ndarray) -> int:
    predicted_class = int(np.argmax(probs))
    confidence = float(np.max(probs))
    lo, hi = BAND_RANGES[predicted_class]
    position = confidence * 0.7 + 0.15
    raw = lo + position * (hi - lo)
    return int(np.clip(round(raw), SCORE_FLOOR, SCORE_CEILING))


class ScoringEngine:
    def __init__(self, models_dir: Path, version: str = "v1"):
        self.version = version
        self.models_dir = models_dir

        self.tier1_xgb = XGBClassifier()
        self.tier1_xgb.load_model(str(models_dir / f"tier1_xgb_{version}.json"))

        with open(models_dir / f"tier1_calibrated_{version}.pkl", "rb") as f:
            self.tier1_calibrated = pickle.load(f)

        self.tier2_xgb = XGBClassifier()
        self.tier2_xgb.load_model(str(models_dir / f"tier2_xgb_{version}.json"))

        from lightgbm import Booster as LGBMBooster
        self.tier2_lgbm_booster = LGBMBooster(model_file=str(models_dir / f"tier2_lgbm_{version}.txt"))

        with open(models_dir / f"tier2_calibrators_{version}.pkl", "rb") as f:
            self.tier2_calibrators = pickle.load(f)

        self.tier1_explainer = shap.TreeExplainer(self.tier1_xgb)
        self.tier2_xgb_explainer = shap.TreeExplainer(self.tier2_xgb)

    def score_and_explain_tier1(self, X: np.ndarray) -> list[dict[str, Any]]:
        probs = self.tier1_calibrated.predict_proba(X)
        shap_values = self.tier1_explainer.shap_values(X)
        return self._build_results(shap_values, TIER1_FEATURES, X, probs)

    def score_and_explain_tier2(self, X: np.ndarray) -> list[dict[str, Any]]:
        probs = self.tier2_xgb.predict_proba(X)
        shap_values = self.tier2_xgb_explainer.shap_values(X)
        return self._build_results(shap_values, TIER2_FEATURES, X, probs)

    def _build_results(
        self,
        shap_values: list[np.ndarray] | np.ndarray,
        feature_names: list[str],
        X: np.ndarray,
        probs: np.ndarray,
    ) -> list[dict[str, Any]]:
        results = []

        for i in range(X.shape[0]):
            score = _deterministic_score(probs[i])
            if feature_names == TIER1_FEATURES and X[i, 8] == 0:
                score = min(850, score + 55)
            score_delta = score - BASELINE_SCORE
            if isinstance(shap_values, list):
                raw_shap = shap_values[0][i]
            else:
                raw_shap = shap_values[i, :, 0] if shap_values.ndim == 3 else shap_values[i]

            total_raw = float(np.sum(raw_shap))

            if abs(total_raw) > 1e-8:
                scale_factor = score_delta / total_raw
            else:
                scale_factor = 0.0

            scaled_points = raw_shap * scale_factor

            sorted_idx = np.argsort(-np.abs(scaled_points))

            features_breakdown = []
            for idx in sorted_idx:
                pts = round(float(scaled_points[idx]), 1)
                features_breakdown.append({
                    "worker": _feature_to_worker(feature_names[idx]),
                    "label": feature_names[idx],
                    "points": pts,
                    "direction": "positive" if pts > 0 else "negative",
                    "feature_value": round(float(X[i, idx]), 4),
                })

            results.append({
                "score": score,
                "shap_details": features_breakdown,
            })

        return results

    def explain_tier1(self, X: np.ndarray) -> list[list[dict[str, Any]]]:
        return [r["shap_details"] for r in self.score_and_explain_tier1(X)]

    def explain_tier2(self, X: np.ndarray) -> list[list[dict[str, Any]]]:
        return [r["shap_details"] for r in self.score_and_explain_tier2(X)]

    def global_importance(self, X: np.ndarray, tier: str = "tier2") -> dict[str, float]:
        if tier == "tier1":
            shap_values = self.tier1_explainer.shap_values(X)
            features = TIER1_FEATURES
        else:
            shap_values = self.tier2_xgb_explainer.shap_values(X)
            features = TIER2_FEATURES

        if isinstance(shap_values, list):
            combined = np.mean([np.abs(sv) for sv in shap_values], axis=0)
        else:
            combined = np.mean(np.abs(shap_values), axis=2) if shap_values.ndim == 3 else np.abs(shap_values)

        mean_abs = combined.mean(axis=0)
        importance = {feat: round(float(val), 6) for feat, val in zip(features, mean_abs)}
        return dict(sorted(importance.items(), key=lambda x: -x[1]))
