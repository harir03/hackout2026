import argparse
import json
import sys
from pathlib import Path

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

    print(f"Training pipeline (data={data_path}, output={output_dir}, version={args.version})")
    print("=" * 70)

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
