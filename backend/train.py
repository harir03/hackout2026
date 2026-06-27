import argparse
import json
import os
import pickle
import sys
from pathlib import Path

import mlflow
import mlflow.xgboost
import mlflow.lightgbm
import mlflow.sklearn
import lightgbm as lgb
from xgboost import XGBClassifier

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.ml.pipeline import run_pipeline


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, default="../data/synthetic/applicants.parquet")
    parser.add_argument("--output", type=str, default="../models")
    parser.add_argument("--version", type=str, default="v1")
    args = parser.parse_args()

    data_path = Path(args.data)
    output_dir = Path(args.output)

    if not data_path.exists():
        print(f"Data not found: {data_path}")
        print("Run generate.py first to create synthetic data.")
        sys.exit(1)

    # Configure MLflow
    mlflow_enabled = True
    try:
        tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
        mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment("ICA Credit Scoring")
    except Exception as e:
        print(f"MLflow setup failed: {e}. Running local training only.")
        mlflow_enabled = False

    print(f"Training pipeline (data={data_path}, output={output_dir}, version={args.version})")
    print("=" * 70)

    if mlflow_enabled:
        try:
            with mlflow.start_run(run_name=f"training_{args.version}"):
                results = run_pipeline(data_path, output_dir, args.version)

                # Log metrics
                for k, v in results["tier1_metrics"].items():
                    try:
                        mlflow.log_metric(k, float(v))
                    except Exception:
                        pass
                for k, v in results["tier2_metrics"].items():
                    try:
                        mlflow.log_metric(k, float(v))
                    except Exception:
                        pass

                # Log artifacts
                for artifact_path_str in results["saved_artifacts"]:
                    try:
                        mlflow.log_artifact(artifact_path_str)
                    except Exception:
                        pass

                # Register Tier 1 XGBoost model
                try:
                    t1_xgb = XGBClassifier()
                    t1_xgb.load_model(str(output_dir / f"tier1_xgb_{args.version}.json"))
                    mlflow.xgboost.log_model(
                        t1_xgb, 
                        artifact_path="tier1_xgb",
                        registered_model_name="ICA_Tier1_XGB"
                    )
                except Exception as e:
                    print(f"Error logging Tier 1 XGB: {e}")

                # Register Tier 1 Calibrated Classifier
                try:
                    with open(output_dir / f"tier1_calibrated_{args.version}.pkl", "rb") as f:
                        t1_cal = pickle.load(f)
                    mlflow.sklearn.log_model(
                        t1_cal,
                        artifact_path="tier1_calibrated",
                        registered_model_name="ICA_Tier1"
                    )
                except Exception as e:
                    print(f"Error logging Tier 1 Calibrated: {e}")

                # Register Tier 2 XGBoost model
                try:
                    t2_xgb = XGBClassifier()
                    t2_xgb.load_model(str(output_dir / f"tier2_xgb_{args.version}.json"))
                    mlflow.xgboost.log_model(
                        t2_xgb,
                        artifact_path="tier2_xgb",
                        registered_model_name="ICA_Tier2"
                    )
                except Exception as e:
                    print(f"Error logging Tier 2 XGB: {e}")

                # Register Tier 2 LightGBM model
                try:
                    t2_lgbm = lgb.Booster(model_file=str(output_dir / f"tier2_lgbm_{args.version}.txt"))
                    mlflow.lightgbm.log_model(
                        t2_lgbm,
                        artifact_path="tier2_lgbm",
                        registered_model_name="ICA_Tier2_LGBM"
                    )
                except Exception as e:
                    print(f"Error logging Tier 2 LGBM: {e}")

                # Tag registered models
                try:
                    client = mlflow.MlflowClient()
                    for model_name in ["ICA_Tier1", "ICA_Tier2", "ICA_Tier1_XGB", "ICA_Tier2_LGBM"]:
                        try:
                            versions = client.get_latest_versions(model_name, stages=["None"])
                            if versions:
                                client.set_model_version_tag(model_name, versions[0].version, "version_tag", args.version)
                        except Exception as ex:
                            print(f"Could not tag model {model_name}: {ex}")
                except Exception as e:
                    print(f"Error tagging registered models: {e}")
        except Exception as run_ex:
            print(f"MLflow run failed: {run_ex}. Running locally.")
            results = run_pipeline(data_path, output_dir, args.version)
    else:
        results = run_pipeline(data_path, output_dir, args.version)

    print("\nTier 1 (zero-history: D2/D4/D5)")
    print("-" * 40)
    for k, v in results["tier1_metrics"].items():
        print(f"  {k}: {v}")
    print(f"  Score range: {results['tier1_score_stats']['min']}-{results['tier1_score_stats']['max']}")
    print(f"  Score mean: {results['tier1_score_stats']['mean']} (std: {results['tier1_score_stats']['std']})")
    print(f"  Band distribution: {json.dumps(results['tier1_score_stats']['band_distribution'], indent=4)}")

    print("\nTier 2 (full footprint: all 6 workers)")
    print("-" * 40)
    for k, v in results["tier2_metrics"].items():
        print(f"  {k}: {v}")
    print(f"  Score range: {results['tier2_score_stats']['min']}-{results['tier2_score_stats']['max']}")
    print(f"  Score mean: {results['tier2_score_stats']['mean']} (std: {results['tier2_score_stats']['std']})")
    print(f"  Band distribution: {json.dumps(results['tier2_score_stats']['band_distribution'], indent=4)}")

    print("\nSaved artifacts:")
    for path in results["saved_artifacts"]:
        print(f"  {path}")


if __name__ == "__main__":
    main()

