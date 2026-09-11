import sys
from pathlib import Path

import numpy as np
import pandas as pd

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "synthetic" / "applicants.parquet"

NUMERIC_FEATURES = [
    "bank_avg_monthly_inflow", "bank_inflow_trend", "bank_balance_volatility",
    "bank_payment_regularity", "bank_upi_txn_count", "bank_min_balance_ratio",
    "telecom_ontime_rate", "telecom_ontime_trend", "telecom_plan_value",
    "telecom_active_months", "telecom_data_usage_gb", "telecom_missed_payments",
    "ecom_purchase_frequency", "ecom_return_rate", "ecom_avg_monthly_spend",
    "ecom_spend_trend", "ecom_account_age_months", "ecom_category_diversity",
    "loc_address_changes_24m", "loc_years_at_current", "loc_is_metro", "loc_owns_home",
    "psych_engagement_score", "psych_consistency", "psych_completion_time_sec",
    "psych_straight_line_ratio", "psych_mean_answer", "psych_std_answer",
    "merchant_filing_regularity", "merchant_rating", "merchant_months_operating",
    "merchant_annual_turnover", "merchant_gst_returns_filed", "merchant_has_gst",
]

WORKER_GROUPS = {
    "D1 Bank/UPI": [f for f in NUMERIC_FEATURES if f.startswith("bank_")],
    "D2 Telecom": [f for f in NUMERIC_FEATURES if f.startswith("telecom_")],
    "D3 E-commerce": [f for f in NUMERIC_FEATURES if f.startswith("ecom_")],
    "D4 Location": [f for f in NUMERIC_FEATURES if f.startswith("loc_")],
    "D5 Questionnaire": [f for f in NUMERIC_FEATURES if f.startswith("psych_")],
    "D6 Merchant/GST": [f for f in NUMERIC_FEATURES if f.startswith("merchant_")],
}


def main():
    if not DATA_PATH.exists():
        print(f"Data not found at {DATA_PATH}. Run generate.py first.")
        sys.exit(1)

    df = pd.read_parquet(DATA_PATH)
    profiles = sorted(df["risk_profile"].unique())

    print("=" * 80)
    print("SANITY CHECK: Synthetic Data Separability by Risk Profile")
    print("=" * 80)

    print(f"\nPopulation: {len(df)} applicants")
    print(f"Risk profiles: {dict(df['risk_profile'].value_counts())}")
    print(f"Total features: {len(NUMERIC_FEATURES)}")

    for group_name, features in WORKER_GROUPS.items():
        print(f"\n{'-' * 80}")
        print(f" {group_name}")
        print(f"{'-' * 80}")
        print(f"{'Feature':<35} {'Low':>12} {'Medium':>12} {'High':>12}  {'Sep?':>5}")
        print(f"{'-' * 35} {'-' * 12} {'-' * 12} {'-' * 12}  {'-' * 5}")

        for feat in features:
            means = {}
            for p in profiles:
                means[p] = df[df["risk_profile"] == p][feat].mean()

            low_val = means.get("low", 0)
            med_val = means.get("medium", 0)
            high_val = means.get("high", 0)

            overall_std = df[feat].std()
            if overall_std > 0:
                spread = abs(low_val - high_val) / overall_std
            else:
                spread = 0

            sep = "Y" if spread > 0.5 else "N"

            print(f"{feat:<35} {low_val:>12.4f} {med_val:>12.4f} {high_val:>12.4f}  {sep:>5}")

    separable_count = 0
    total_count = 0
    for features in WORKER_GROUPS.values():
        for feat in features:
            total_count += 1
            overall_std = df[feat].std()
            if overall_std > 0:
                low_mean = df[df["risk_profile"] == "low"][feat].mean()
                high_mean = df[df["risk_profile"] == "high"][feat].mean()
                if abs(low_mean - high_mean) / overall_std > 0.5:
                    separable_count += 1

    print(f"\n{'=' * 80}")
    print(f"SUMMARY: {separable_count}/{total_count} features show clear separation (spread > 0.5 std)")
    pct = separable_count / total_count * 100 if total_count > 0 else 0
    verdict = "PASS" if pct >= 70 else "NEEDS WORK"
    print(f"Verdict: {verdict} ({pct:.0f}% separable)")
    print(f"{'=' * 80}")


if __name__ == "__main__":
    main()
