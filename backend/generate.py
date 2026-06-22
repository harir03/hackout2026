import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.data_gen.orchestrator import generate_population


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=5000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output-dir", type=str, default="../data/synthetic")
    parser.add_argument("--format", choices=["parquet", "csv", "both"], default="both")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating {args.n} synthetic applicants (seed={args.seed})...")
    df = generate_population(n=args.n, seed=args.seed)

    if args.format in ("parquet", "both"):
        parquet_path = output_dir / "applicants.parquet"
        df.to_parquet(parquet_path, index=False)
        print(f"Wrote {parquet_path} ({parquet_path.stat().st_size / 1024:.1f} KB)")

    if args.format in ("csv", "both"):
        csv_path = output_dir / "applicants.csv"
        df.to_csv(csv_path, index=False)
        print(f"Wrote {csv_path} ({csv_path.stat().st_size / 1024:.1f} KB)")

    print(f"\nRisk profile distribution:")
    print(df["risk_profile"].value_counts().to_string())

    print(f"\nTotal applicants: {len(df)}")
    print(f"Columns: {len(df.columns)}")
    print(f"Features (excl. metadata): {len(df.columns) - 5}")


if __name__ == "__main__":
    main()
