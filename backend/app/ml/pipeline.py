import json
import pickle
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import label_binarize
from xgboost import XGBClassifier

from app.ml.features import LABEL_MAP, SCORE_BANDS, TIER1_FEATURES, TIER2_FEATURES


def load_data(data_path: Path) -> pd.DataFrame:
    return pd.read_parquet(data_path)


def encode_labels(df: pd.DataFrame) -> np.ndarray:
    return df["risk_profile"].map(LABEL_MAP).values


def probability_to_score(prob_low: np.ndarray, prob_medium: np.ndarray, prob_high: np.ndarray) -> np.ndarray:
    probs = np.column_stack([prob_low, prob_medium, prob_high])
    predicted_class = np.argmax(probs, axis=1)
    confidence = np.max(probs, axis=1)

    band_ranges = {
        0: (700, 850),
        1: (450, 700),
        2: (0, 450),
    }

    scores = np.zeros(len(predicted_class), dtype=int)
    rng = np.random.default_rng(42)

    for i in range(len(predicted_class)):
        cls = predicted_class[i]
        lo, hi = band_ranges[cls]
        position = confidence[i] * 0.7 + 0.15
        base = lo + position * (hi - lo)
        jitter = rng.normal(0, (hi - lo) * 0.08)
        scores[i] = int(np.clip(np.round(base + jitter), 0, 850))

    return scores


def score_to_band(score: int) -> str:
    for low, high, band in SCORE_BANDS:
        if low <= score <= high:
            return band
    return "Not Eligible"


def train_tier1(X_train: np.ndarray, y_train: np.ndarray, X_test: np.ndarray, y_test: np.ndarray) -> dict[str, Any]:
    xgb = XGBClassifier(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.08,
        subsample=0.7,
        colsample_bytree=0.6,
        reg_alpha=1.0,
        reg_lambda=2.0,
        min_child_weight=10,
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss",
        random_state=42,
    )
    xgb.fit(X_train, y_train)

    calibrated = CalibratedClassifierCV(xgb, method="isotonic", cv=5)
    calibrated.fit(X_train, y_train)

    raw_probs = xgb.predict_proba(X_test)
    cal_probs = calibrated.predict_proba(X_test)

    metrics = compute_metrics(y_test, raw_probs, cal_probs, "Tier1")

    scores = probability_to_score(cal_probs[:, 0], cal_probs[:, 1], cal_probs[:, 2])

    return {
        "xgb": xgb,
        "calibrated": calibrated,
        "metrics": metrics,
        "test_scores": scores,
        "test_probs": cal_probs,
    }


def train_tier2(
    X_train: np.ndarray, y_train: np.ndarray,
    X_test: np.ndarray, y_test: np.ndarray,
) -> dict[str, Any]:
    xgb = XGBClassifier(
        n_estimators=80,
        max_depth=3,
        learning_rate=0.08,
        subsample=0.7,
        colsample_bytree=0.5,
        reg_alpha=1.5,
        reg_lambda=3.0,
        min_child_weight=15,
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss",
        random_state=42,
    )
    xgb.fit(X_train, y_train)

    lgbm = LGBMClassifier(
        n_estimators=80,
        max_depth=3,
        learning_rate=0.08,
        subsample=0.7,
        colsample_bytree=0.5,
        reg_alpha=1.5,
        reg_lambda=3.0,
        min_child_weight=15,
        objective="multiclass",
        num_class=3,
        random_state=42,
        verbose=-1,
    )
    lgbm.fit(X_train, y_train)

    xgb_train_probs = xgb.predict_proba(X_train)
    lgbm_train_probs = lgbm.predict_proba(X_train)
    blended_train_probs = (xgb_train_probs + lgbm_train_probs) / 2.0

    calibrators = []
    for class_idx in range(3):
        y_binary = (y_train == class_idx).astype(float)
        iso = IsotonicRegression(out_of_bounds="clip")
        iso.fit(blended_train_probs[:, class_idx], y_binary)
        calibrators.append(iso)

    xgb_test_probs = xgb.predict_proba(X_test)
    lgbm_test_probs = lgbm.predict_proba(X_test)
    blended_test_probs = (xgb_test_probs + lgbm_test_probs) / 2.0

    cal_probs = np.column_stack([
        calibrators[i].transform(blended_test_probs[:, i]) for i in range(3)
    ])
    row_sums = cal_probs.sum(axis=1, keepdims=True)
    cal_probs = cal_probs / row_sums

    metrics = compute_metrics(y_test, blended_test_probs, cal_probs, "Tier2")

    scores = probability_to_score(cal_probs[:, 0], cal_probs[:, 1], cal_probs[:, 2])

    return {
        "xgb": xgb,
        "lgbm": lgbm,
        "calibrators": calibrators,
        "metrics": metrics,
        "test_scores": scores,
        "test_probs": cal_probs,
    }


def compute_metrics(
    y_test: np.ndarray,
    raw_probs: np.ndarray,
    cal_probs: np.ndarray,
    tier_name: str,
) -> dict[str, float]:
    y_bin = label_binarize(y_test, classes=[0, 1, 2])

    raw_auc = roc_auc_score(y_bin, raw_probs, multi_class="ovr", average="weighted")
    cal_auc = roc_auc_score(y_bin, cal_probs, multi_class="ovr", average="weighted")

    raw_brier = np.mean([
        brier_score_loss(y_bin[:, i], raw_probs[:, i]) for i in range(3)
    ])
    cal_brier = np.mean([
        brier_score_loss(y_bin[:, i], cal_probs[:, i]) for i in range(3)
    ])

    return {
        f"{tier_name}_raw_auc": round(float(raw_auc), 4),
        f"{tier_name}_cal_auc": round(float(cal_auc), 4),
        f"{tier_name}_raw_brier": round(float(raw_brier), 4),
        f"{tier_name}_cal_brier": round(float(cal_brier), 4),
    }


def save_artifacts(
    tier1_result: dict,
    tier2_result: dict,
    output_dir: Path,
    version: str = "v1",
) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    saved = []

    t1_xgb_path = output_dir / f"tier1_xgb_{version}.json"
    tier1_result["xgb"].save_model(str(t1_xgb_path))
    saved.append(t1_xgb_path)

    t1_cal_path = output_dir / f"tier1_calibrated_{version}.pkl"
    with open(t1_cal_path, "wb") as f:
        pickle.dump(tier1_result["calibrated"], f)
    saved.append(t1_cal_path)

    t2_xgb_path = output_dir / f"tier2_xgb_{version}.json"
    tier2_result["xgb"].save_model(str(t2_xgb_path))
    saved.append(t2_xgb_path)

    t2_lgbm_path = output_dir / f"tier2_lgbm_{version}.txt"
    tier2_result["lgbm"].booster_.save_model(str(t2_lgbm_path))
    saved.append(t2_lgbm_path)

    t2_cal_path = output_dir / f"tier2_calibrators_{version}.pkl"
    with open(t2_cal_path, "wb") as f:
        pickle.dump(tier2_result["calibrators"], f)
    saved.append(t2_cal_path)

    metrics_path = output_dir / f"metrics_{version}.json"
    all_metrics = {**tier1_result["metrics"], **tier2_result["metrics"]}
    with open(metrics_path, "w") as f:
        json.dump(all_metrics, f, indent=2)
    saved.append(metrics_path)

    return saved


def run_pipeline(data_path: Path, output_dir: Path, version: str = "v1") -> dict:
    df = load_data(data_path)
    y = encode_labels(df)

    X_t1 = df[TIER1_FEATURES].values
    X_t2 = df[TIER2_FEATURES].values

    X_t1_train, X_t1_test, y_t1_train, y_t1_test = train_test_split(
        X_t1, y, test_size=0.2, random_state=42, stratify=y,
    )
    X_t2_train, X_t2_test, y_t2_train, y_t2_test = train_test_split(
        X_t2, y, test_size=0.2, random_state=42, stratify=y,
    )

    tier1_result = train_tier1(X_t1_train, y_t1_train, X_t1_test, y_t1_test)
    tier2_result = train_tier2(X_t2_train, y_t2_train, X_t2_test, y_t2_test)

    saved = save_artifacts(tier1_result, tier2_result, output_dir, version)

    score_dist_t1 = pd.Series(tier1_result["test_scores"])
    score_dist_t2 = pd.Series(tier2_result["test_scores"])

    band_dist_t1 = score_dist_t1.apply(score_to_band).value_counts().to_dict()
    band_dist_t2 = score_dist_t2.apply(score_to_band).value_counts().to_dict()

    return {
        "tier1_metrics": tier1_result["metrics"],
        "tier2_metrics": tier2_result["metrics"],
        "tier1_score_stats": {
            "mean": round(float(score_dist_t1.mean()), 1),
            "std": round(float(score_dist_t1.std()), 1),
            "min": int(score_dist_t1.min()),
            "max": int(score_dist_t1.max()),
            "band_distribution": band_dist_t1,
        },
        "tier2_score_stats": {
            "mean": round(float(score_dist_t2.mean()), 1),
            "std": round(float(score_dist_t2.std()), 1),
            "min": int(score_dist_t2.min()),
            "max": int(score_dist_t2.max()),
            "band_distribution": band_dist_t2,
        },
        "saved_artifacts": [str(p) for p in saved],
    }
