import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from fairlearn.metrics import demographic_parity_ratio

from app.ml.explainer import ScoringEngine
from app.ml.features import LABEL_MAP, TIER1_FEATURES, TIER2_FEATURES

def run_fairness_audit():
    data_path = Path(__file__).resolve().parent.parent / "data" / "synthetic" / "applicants.parquet"
    if not data_path.exists():
        print(f"Data not found at {data_path}.")
        sys.exit(1)
        
    df = pd.read_parquet(data_path)
    y = df["risk_profile"].map(LABEL_MAP).values
    
    df_train, df_test = train_test_split(df, test_size=0.2, random_state=42, stratify=y)
    
    models_dir = Path(__file__).resolve().parent / "models"
    if not models_dir.exists():
        models_dir = Path(__file__).resolve().parent / ".." / "models"
        
    engine = ScoringEngine(models_dir)
    
    X_t1_test = df_test[TIER1_FEATURES].values
    t1_scores = []
    for i in range(len(X_t1_test)):
        t1_scores.append(engine.score_and_explain_tier1(X_t1_test[i:i+1])[0]["score"])
    
    X_t2_test = df_test[TIER2_FEATURES].values
    t2_scores = []
    for i in range(len(X_t2_test)):
        t2_scores.append(engine.score_and_explain_tier2(X_t2_test[i:i+1])[0]["score"])
        
    t1_approvals = (np.array(t1_scores) >= 600).astype(int)
    t2_approvals = (np.array(t2_scores) >= 600).astype(int)
    
    sensitive_metro = (df_test["loc_is_metro"] >= 1).astype(int).values
    
    from fairlearn.metrics import MetricFrame, selection_rate, demographic_parity_ratio
    t1_metro_ratio = demographic_parity_ratio(
        y_true=t1_approvals,
        y_pred=t1_approvals,
        sensitive_features=sensitive_metro
    )
    t2_metro_ratio = demographic_parity_ratio(
        y_true=t2_approvals,
        y_pred=t2_approvals,
        sensitive_features=sensitive_metro
    )
    
    frame_t1 = MetricFrame(metrics=selection_rate, y_true=t1_approvals, y_pred=t1_approvals, sensitive_features=sensitive_metro)
    print("\nTier 1 MetricFrame by group:")
    print(frame_t1.by_group)
    print(f"Tier 1 (Zero-History) Demographic Parity Ratio: {t1_metro_ratio:.4f}")
    
    # Tier 2 detailed selection rates
    t2_metro_approved = t2_approvals[sensitive_metro == 1].mean()
    t2_non_metro_approved = t2_approvals[sensitive_metro == 0].mean()
    print(f"Tier 2 Metro Approval Rate: {t2_metro_approved:.4f}")
    print(f"Tier 2 Non-Metro Approval Rate: {t2_non_metro_approved:.4f}")
    print(f"Tier 2 (Full Footprint) Demographic Parity Ratio: {t2_metro_ratio:.4f}")
    
    verdict_t1 = "PASS" if t1_metro_ratio >= 0.8 else "FAIL"
    verdict_t2 = "PASS" if t2_metro_ratio >= 0.8 else "FAIL"
    print(f"Tier 1 Verdict: {verdict_t1}")
    print(f"Tier 2 Verdict: {verdict_t2}")
    print("=" * 80)
    
    if t1_metro_ratio < 0.8 or t2_metro_ratio < 0.8:
        sys.exit(1)

if __name__ == "__main__":
    run_fairness_audit()
