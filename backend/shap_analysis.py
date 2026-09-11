import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.model_selection import train_test_split

from app.ml.explainer import BASELINE_SCORE, ScoringEngine, _feature_to_worker
from app.ml.fairness import audit_demographic_parity
from app.ml.features import LABEL_MAP, TIER1_FEATURES, TIER2_FEATURES
from app.ml.pipeline import probability_to_score, score_to_band

CONFLICT_MAGNITUDE_THRESHOLD = 5.0


def main():
    data_path = Path("../data/synthetic/applicants.parquet")
    models_dir = Path("../models")
    output_dir = Path("../models/shap_outputs")
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Loading data and models...")
    df = pd.read_parquet(data_path)
    y = df["risk_profile"].map(LABEL_MAP).values

    X_t2 = df[TIER2_FEATURES].values
    X_t2_train, X_t2_test, y_t2_train, y_t2_test, idx_train, idx_test = train_test_split(
        X_t2, y, np.arange(len(df)), test_size=0.2, random_state=42, stratify=y,
    )

    engine = ScoringEngine(models_dir)

    print("\n" + "=" * 70)
    print("1. GLOBAL FEATURE IMPORTANCE (Tier 2, test set)")
    print("=" * 70)

    t2_importance = engine.global_importance(X_t2_test, tier="tier2")
    print(f"\n  {'Feature':<35} {'Mean |SHAP|':>12}")
    print(f"  {'-'*35} {'-'*12}")
    for feat, val in list(t2_importance.items())[:15]:
        print(f"  {feat:<35} {val:>12.6f}")

    with open(output_dir / "global_importance_tier2.json", "w") as f:
        json.dump(t2_importance, f, indent=2)

    t1_importance = engine.global_importance(
        df.iloc[idx_test][TIER1_FEATURES].values, tier="tier1"
    )
    with open(output_dir / "global_importance_tier1.json", "w") as f:
        json.dump(t1_importance, f, indent=2)

    print("\n" + "=" * 70)
    print("2. SHAP SUMMARY PLOT (Tier 2)")
    print("=" * 70)

    shap_values_t2 = engine.tier2_xgb_explainer.shap_values(X_t2_test)

    if isinstance(shap_values_t2, list):
        plot_shap = shap_values_t2[0]
    else:
        plot_shap = shap_values_t2[:, :, 0] if shap_values_t2.ndim == 3 else shap_values_t2

    plt.figure(figsize=(12, 8))
    shap.summary_plot(
        plot_shap,
        X_t2_test,
        feature_names=TIER2_FEATURES,
        show=False,
        max_display=20,
    )
    plt.tight_layout()
    plt.savefig(output_dir / "shap_summary_tier2.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved shap_summary_tier2.png")

    print("\n" + "=" * 70)
    print("3. CONFLICT EXAMPLE")
    print("=" * 70)

    test_df = df.iloc[idx_test].reset_index(drop=True)

    median_payment_reg = test_df["bank_payment_regularity"].median()
    median_inflow = test_df["bank_avg_monthly_inflow"].median()
    median_return_rate = test_df["ecom_return_rate"].median()

    conflict_mask = (
        (test_df["bank_payment_regularity"] > median_payment_reg) &
        (test_df["bank_avg_monthly_inflow"] > median_inflow) &
        (test_df["ecom_return_rate"] > median_return_rate)
    )

    conflict_candidates = test_df[conflict_mask]
    print(f"  Found {len(conflict_candidates)} conflict candidates")

    conflict_candidates_sorted = conflict_candidates.copy()
    conflict_candidates_sorted["return_rank"] = conflict_candidates_sorted["ecom_return_rate"].rank(ascending=False)
    conflict_candidates_sorted["bank_rank"] = conflict_candidates_sorted["bank_payment_regularity"].rank(ascending=False)
    conflict_candidates_sorted["combined_rank"] = conflict_candidates_sorted["return_rank"] + conflict_candidates_sorted["bank_rank"]
    conflict_idx = conflict_candidates_sorted["combined_rank"].idxmin()

    example_row = test_df.iloc[conflict_idx]
    example_X = X_t2_test[conflict_idx:conflict_idx+1]

    result = engine.score_and_explain_tier2(example_X)[0]
    score = result["score"]
    shap_breakdown = result["shap_details"]

    print(f"\n  Applicant: {example_row['applicant_id']}")
    print(f"  Risk profile: {example_row['risk_profile']}")
    print(f"  Score: {score} (baseline: {BASELINE_SCORE})")
    print(f"  bank_payment_regularity: {example_row['bank_payment_regularity']:.4f} (median: {median_payment_reg:.4f})")
    print(f"  bank_avg_monthly_inflow: {example_row['bank_avg_monthly_inflow']:.2f} (median: {median_inflow:.2f})")
    print(f"  ecom_return_rate: {example_row['ecom_return_rate']:.4f} (median: {median_return_rate:.4f})")

    points_sum = sum(f["points"] for f in shap_breakdown)
    reconstructed = BASELINE_SCORE + points_sum
    print(f"\n  Sum of points: {points_sum:+.1f}")
    print(f"  Reconstructed: {BASELINE_SCORE} + {points_sum:+.1f} = {reconstructed:.1f}")
    print(f"  Actual score:  {score}")
    print(f"  Reconstruction error: {abs(reconstructed - score):.1f}")

    print(f"\n  {'Feature':<35} {'Points':>8} {'Dir':>10} {'Value':>10}")
    print(f"  {'-'*35} {'-'*8} {'-'*10} {'-'*10}")
    for feat in shap_breakdown[:10]:
        print(f"  {feat['label']:<35} {feat['points']:>+8.1f} {feat['direction']:>10} {feat['feature_value']:>10.4f}")

    workers: dict[str, dict[str, list]] = {}
    for feat in shap_breakdown:
        w = feat["worker"]
        if w not in workers:
            workers[w] = {"pos": [], "neg": []}
        bucket = "pos" if feat["points"] > 0 else "neg"
        workers[w][bucket].append((feat["label"], feat["points"]))

    genuinely_conflicted = []
    uniformly_positive = []
    uniformly_negative = []

    for w, d in sorted(workers.items()):
        has_strong_pos = any(abs(p) > CONFLICT_MAGNITUDE_THRESHOLD for _, p in d["pos"])
        has_strong_neg = any(abs(p) > CONFLICT_MAGNITUDE_THRESHOLD for _, p in d["neg"])
        net = sum(p for _, p in d["pos"]) + sum(p for _, p in d["neg"])

        if has_strong_pos and has_strong_neg:
            genuinely_conflicted.append(w)
        elif net > 0:
            uniformly_positive.append(w)
        else:
            uniformly_negative.append(w)

    print(f"\n  Genuinely conflicted workers (>0.05 magnitude on each side): {genuinely_conflicted}")
    print(f"  Uniformly positive workers: {uniformly_positive}")
    print(f"  Uniformly negative workers: {uniformly_negative}")

    conflict_json = {
        "applicant_id": str(example_row["applicant_id"]),
        "risk_profile": str(example_row["risk_profile"]),
        "score": score,
        "baseline_score": BASELINE_SCORE,
        "key_features": {
            "bank_payment_regularity": round(float(example_row["bank_payment_regularity"]), 4),
            "bank_avg_monthly_inflow": round(float(example_row["bank_avg_monthly_inflow"]), 2),
            "ecom_return_rate": round(float(example_row["ecom_return_rate"]), 4),
        },
        "conflict_summary": {
            "genuinely_conflicted_workers": genuinely_conflicted,
            "uniformly_positive_workers": uniformly_positive,
            "uniformly_negative_workers": uniformly_negative,
        },
        "shap_breakdown": shap_breakdown,
    }

    with open(models_dir / "shap_conflict_example.json", "w") as f:
        json.dump(conflict_json, f, indent=2)
    print(f"\n  Saved shap_conflict_example.json")

    if isinstance(shap_values_t2, list):
        force_shap = shap_values_t2[0][conflict_idx]
        base_value = engine.tier2_xgb_explainer.expected_value[0]
    else:
        if shap_values_t2.ndim == 3:
            force_shap = shap_values_t2[conflict_idx, :, 0]
            base_value = engine.tier2_xgb_explainer.expected_value[0]
        else:
            force_shap = shap_values_t2[conflict_idx]
            base_value = engine.tier2_xgb_explainer.expected_value

    plt.figure(figsize=(14, 4))
    shap.force_plot(
        base_value,
        force_shap,
        feature_names=TIER2_FEATURES,
        matplotlib=True,
        show=False,
    )
    plt.savefig(output_dir / "shap_force_conflict.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved shap_force_conflict.png")

    print("\n" + "=" * 70)
    print("4. FAIRNESS AUDIT")
    print("=" * 70)

    xgb_probs = engine.tier2_xgb.predict_proba(X_t2_test)
    scores = probability_to_score(xgb_probs[:, 0], xgb_probs[:, 1], xgb_probs[:, 2])

    rng = np.random.default_rng(42)
    synthetic_gender = rng.choice(["M", "F", "NB"], size=len(X_t2_test), p=[0.48, 0.48, 0.04])

    gender_audit = audit_demographic_parity(scores, synthetic_gender)

    print(f"\n  Demographic parity ratio: {gender_audit['demographic_parity_ratio']}")
    print(f"  Flagged (< 0.8): {gender_audit['flagged']}")
    print(f"  Group approval rates:")
    for group, rate in gender_audit["group_approval_rates"].items():
        print(f"    {group}: {rate:.4f}")

    with open(output_dir / "fairness_audit.json", "w") as f:
        json.dump(gender_audit, f, indent=2)
    print("  Saved fairness_audit.json")

    print("\n" + "=" * 70)
    print("5. PROTECTED ATTRIBUTE VERIFICATION")
    print("=" * 70)

    protected_terms = {"gender", "sex", "religion", "caste", "race", "ethnicity"}
    t1_protected = [f for f in TIER1_FEATURES if any(p in f.lower() for p in protected_terms)]
    t2_protected = [f for f in TIER2_FEATURES if any(p in f.lower() for p in protected_terms)]
    print(f"\n  Protected attributes in Tier 1 features: {t1_protected if t1_protected else 'NONE (clean)'}")
    print(f"  Protected attributes in Tier 2 features: {t2_protected if t2_protected else 'NONE (clean)'}")

    print("\n" + "=" * 70)
    print("DONE")
    print("=" * 70)


if __name__ == "__main__":
    main()
