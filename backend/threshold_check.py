import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from app.ml.explainer import ScoringEngine
from app.ml.features import LABEL_MAP, TIER2_FEATURES

df = pd.read_parquet("../data/synthetic/applicants.parquet")
y = df["risk_profile"].map(LABEL_MAP).values
X = df[TIER2_FEATURES].values
_, X_test, _, _, _, _ = train_test_split(X, y, np.arange(len(df)), test_size=0.2, random_state=42, stratify=y)

engine = ScoringEngine(Path("../models"))

all_magnitudes = []
for i in range(len(X_test)):
    r = engine.score_and_explain_tier2(X_test[i:i+1])[0]
    worker_nets: dict[str, float] = {}
    for f in r["shap_details"]:
        worker_nets[f["worker"]] = worker_nets.get(f["worker"], 0.0) + f["points"]
    workers = list(worker_nets.keys())
    for a in range(len(workers)):
        for b in range(a+1, len(workers)):
            na, nb = worker_nets[workers[a]], worker_nets[workers[b]]
            if na * nb < 0:
                all_magnitudes.append(abs(na) + abs(nb))

mags = np.array(all_magnitudes)
print(f"Total worker-pair conflicts: {len(mags)}")
for t in [20, 40, 60, 80, 100]:
    n = (mags >= t).sum()
    print(f"  threshold {t:>3}: {n} pairs ({n/len(X_test)*100/15:.1f}% of applicants approx)")

print(f"\nPercentiles: p25={np.percentile(mags,25):.0f} p50={np.percentile(mags,50):.0f} p75={np.percentile(mags,75):.0f} p90={np.percentile(mags,90):.0f}")
