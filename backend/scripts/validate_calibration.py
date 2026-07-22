import os
import urllib.request
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

GMSC_URL = "https://raw.githubusercontent.com/turintech/sas-migration/master/data/cs-training.csv"
HOME_CREDIT_URL = "https://huggingface.co/cantalapiedra/poc_scoring_fair/resolve/main/application_train.csv"


def get_data_dir() -> Path:
    base_dir = Path(__file__).resolve().parents[1]
    data_dir = base_dir / "data" / "validation"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def download_if_needed(file_path: Path, url: str) -> Path:
    if not file_path.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp, open(file_path, "wb") as out_file:
            out_file.write(resp.read())
    return file_path


def load_give_me_some_credit() -> tuple[pd.DataFrame, pd.Series]:
    data_dir = get_data_dir()
    csv_path = data_dir / "cs-training.csv"
    download_if_needed(csv_path, GMSC_URL)
    df = pd.read_csv(csv_path)

    features = [
        "RevolvingUtilizationOfUnsecuredLines",
        "age",
        "NumberOfTime30-59DaysPastDueNotWorse",
        "DebtRatio",
        "MonthlyIncome",
        "NumberOfOpenCreditLinesAndLoans",
        "NumberOfTimes90DaysLate",
        "NumberRealEstateLoansOrLines",
        "NumberOfTime60-89DaysPastDueNotWorse",
        "NumberOfDependents",
    ]

    target = "SeriousDlqin2yrs"

    X = df[features].copy()
    X = X.fillna(X.median())
    y = df[target].astype(int)

    return X, y


def load_home_credit() -> tuple[pd.DataFrame, pd.Series]:
    data_dir = get_data_dir()
    csv_path = data_dir / "application_train.csv"
    download_if_needed(csv_path, HOME_CREDIT_URL)
    df = pd.read_csv(csv_path)

    target = "TARGET"
    y = df[target].astype(int)

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    numeric_cols = [c for c in numeric_cols if c not in ["SK_ID_CURR", "TARGET"]]

    X = df[numeric_cols].copy()
    X = X.fillna(X.median())

    return X, y


def validate_give_me_some_credit(X: pd.DataFrame, y: pd.Series) -> dict[str, Any]:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    xgb = XGBClassifier(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.08,
        random_state=42,
        eval_metric="logloss",
    )
    xgb.fit(X_train, y_train)

    raw_probs = xgb.predict_proba(X_test)[:, 1]

    calibrated_xgb = CalibratedClassifierCV(estimator=xgb, method="isotonic", cv=5)
    calibrated_xgb.fit(X_train, y_train)

    cal_probs = calibrated_xgb.predict_proba(X_test)[:, 1]

    raw_brier = float(brier_score_loss(y_test, raw_probs))
    cal_brier = float(brier_score_loss(y_test, cal_probs))
    auc = float(roc_auc_score(y_test, cal_probs))

    raw_prob_true, raw_prob_pred = calibration_curve(y_test, raw_probs, n_bins=10)
    cal_prob_true, cal_prob_pred = calibration_curve(y_test, cal_probs, n_bins=10)

    return {
        "auc": auc,
        "raw_brier": raw_brier,
        "cal_brier": cal_brier,
        "raw_curve": {"prob_pred": raw_prob_pred.tolist(), "prob_true": raw_prob_true.tolist()},
        "cal_curve": {"prob_pred": cal_prob_pred.tolist(), "prob_true": cal_prob_true.tolist()},
    }


def validate_home_credit(X: pd.DataFrame, y: pd.Series) -> dict[str, Any]:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    xgb = XGBClassifier(
        n_estimators=80,
        max_depth=3,
        learning_rate=0.08,
        random_state=42,
        eval_metric="logloss",
    )
    xgb.fit(X_train, y_train)

    lgbm = LGBMClassifier(
        n_estimators=80,
        max_depth=3,
        learning_rate=0.08,
        random_state=42,
        verbose=-1,
    )
    lgbm.fit(X_train, y_train)

    xgb_train_p = xgb.predict_proba(X_train)[:, 1]
    lgbm_train_p = lgbm.predict_proba(X_train)[:, 1]
    blended_train_p = (xgb_train_p + lgbm_train_p) / 2.0

    iso = IsotonicRegression(out_of_bounds="clip")
    iso.fit(blended_train_p, y_train)

    xgb_test_p = xgb.predict_proba(X_test)[:, 1]
    lgbm_test_p = lgbm.predict_proba(X_test)[:, 1]
    blended_test_p = (xgb_test_p + lgbm_test_p) / 2.0

    calibrated_test_p = np.clip(iso.transform(blended_test_p), 0.0, 1.0)

    raw_brier = float(brier_score_loss(y_test, blended_test_p))
    cal_brier = float(brier_score_loss(y_test, calibrated_test_p))
    auc = float(roc_auc_score(y_test, calibrated_test_p))

    raw_prob_true, raw_prob_pred = calibration_curve(y_test, blended_test_p, n_bins=10)
    cal_prob_true, cal_prob_pred = calibration_curve(y_test, calibrated_test_p, n_bins=10)

    quantiles = np.quantile(calibrated_test_p, [0.333, 0.666])
    low_mask = calibrated_test_p <= quantiles[0]
    med_mask = (calibrated_test_p > quantiles[0]) & (calibrated_test_p <= quantiles[1])
    high_mask = calibrated_test_p > quantiles[1]

    band_results = {}
    for name, mask in [("Low Risk", low_mask), ("Medium Risk", med_mask), ("High Risk", high_mask)]:
        y_band = y_test.values[mask]
        p_band = calibrated_test_p[mask]
        p_true, p_pred = calibration_curve(y_band, p_band, n_bins=5)
        band_results[name] = {
            "mean_predicted": float(np.mean(p_band)),
            "observed_rate": float(np.mean(y_band)),
            "brier": float(brier_score_loss(y_band, p_band)),
            "curve_predicted": p_pred.tolist(),
            "curve_observed": p_true.tolist(),
        }

    return {
        "auc": auc,
        "raw_brier": raw_brier,
        "cal_brier": cal_brier,
        "raw_curve": {"prob_pred": raw_prob_pred.tolist(), "prob_true": raw_prob_true.tolist()},
        "cal_curve": {"prob_pred": cal_prob_pred.tolist(), "prob_true": cal_prob_true.tolist()},
        "band_results": band_results,
    }


def generate_report(gmsc_res: dict[str, Any], hc_res: dict[str, Any]) -> None:
    docs_dir = Path(__file__).resolve().parents[2] / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)
    report_path = docs_dir / "calibration-validation.md"

    lines = [
        "# Model Calibration Validation Report",
        "",
        "## Model Performance (AUC)",
        f"- **AUC (Tier 1 Model — Give Me Some Credit)**: {gmsc_res['auc']:.4f}",
        f"- **AUC (Tier 2 Model — Home Credit Default Risk)**: {hc_res['auc']:.4f}",
        "> Comparable published approaches report AUC of 0.79–0.92 (Home Credit benchmark studies)",
        "",
        "## 1. Give Me Some Credit Dataset (Tier 1 Validation)",
        "### Brier Score Comparison",
        f"- **Raw XGBoost Brier Score**: {gmsc_res['raw_brier']:.6f}",
        f"- **Calibrated XGBoost Brier Score**: {gmsc_res['cal_brier']:.6f}",
        f"- **Improvement**: {((gmsc_res['raw_brier'] - gmsc_res['cal_brier']) / gmsc_res['raw_brier']) * 100:.2f}% reduction in probability error",
        "",
        "### Calibration Curve (Predicted vs Observed Default Rate)",
        "| Bin | Uncalibrated Predicted | Calibrated Predicted | Observed Outcome Rate |",
        "|---|---|---|---|",
    ]

    cal_pred = gmsc_res["cal_curve"]["prob_pred"]
    cal_true = gmsc_res["cal_curve"]["prob_true"]
    raw_pred = gmsc_res["raw_curve"]["prob_pred"]

    min_len = min(len(cal_pred), len(raw_pred))
    for i in range(min_len):
        lines.append(f"| {i+1} | {raw_pred[i]:.4f} | {cal_pred[i]:.4f} | {cal_true[i]:.4f} |")

    lines.extend([
        "",
        "## 2. Home Credit Default Risk Dataset (Tier 2 Validation)",
        "### Brier Score Comparison",
        f"- **Raw Blended Model Brier Score**: {hc_res['raw_brier']:.6f}",
        f"- **Calibrated Blended Model Brier Score**: {hc_res['cal_brier']:.6f}",
        f"- **Improvement**: {((hc_res['raw_brier'] - hc_res['cal_brier']) / hc_res['raw_brier']) * 100:.2f}% reduction in probability error",
        "",
        "### Overall Calibration Curve",
        "| Bin | Raw Blended Predicted | Calibrated Predicted | Observed Outcome Rate |",
        "|---|---|---|---|",
    ])

    hc_cal_pred = hc_res["cal_curve"]["prob_pred"]
    hc_cal_true = hc_res["cal_curve"]["prob_true"]
    hc_raw_pred = hc_res["raw_curve"]["prob_pred"]

    hc_min_len = min(len(hc_cal_pred), len(hc_raw_pred))
    for i in range(hc_min_len):
        lines.append(f"| {i+1} | {hc_raw_pred[i]:.4f} | {hc_cal_pred[i]:.4f} | {hc_cal_true[i]:.4f} |")

    lines.extend([
        "",
        "### Per-Risk-Band Calibration (Tier 2 Stratified Analysis)",
        "| Risk Band | Mean Predicted Probability | Observed Default Rate | Band Brier Score |",
        "|---|---|---|---|",
    ])

    for band_name, band_data in hc_res["band_results"].items():
        lines.append(
            f"| {band_name} | {band_data['mean_predicted']:.4f} | {band_data['observed_rate']:.4f} | {band_data['brier']:.6f} |"
        )

    lines.extend([
        "",
        "## Conclusion and Scope Limitation",
        "This validates that the calibration methodology (CalibratedClassifierCV for Tier 1, IsotonicRegression for the Tier 2 blend) is implemented correctly — it does not validate model accuracy for Indian credit-invisible populations, since neither dataset contains that population. That validation requires real production outcomes or an institutional data partnership.",
    ])

    report_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    X_gmsc, y_gmsc = load_give_me_some_credit()
    gmsc_results = validate_give_me_some_credit(X_gmsc, y_gmsc)

    X_hc, y_hc = load_home_credit()
    hc_results = validate_home_credit(X_hc, y_hc)

    generate_report(gmsc_results, hc_results)


if __name__ == "__main__":
    main()
