import uuid
from typing import Literal

import numpy as np
import pandas as pd
from faker import Faker

from app.data_gen import d1_bank_upi, d2_telecom, d3_ecommerce
from app.data_gen import d4_location, d5_questionnaire, d6_merchant_gst

fake = Faker("en_IN")

RiskProfile = Literal["low", "medium", "high"]

PROFILE_DISTRIBUTION: list[tuple[RiskProfile, float]] = [
    ("low", 0.30),
    ("medium", 0.45),
    ("high", 0.25),
]

GENERATORS = [
    d1_bank_upi,
    d2_telecom,
    d3_ecommerce,
    d4_location,
    d5_questionnaire,
    d6_merchant_gst,
]


def generate_applicant(rng: np.random.Generator, risk_profile: RiskProfile) -> dict:
    applicant: dict = {
        "applicant_id": str(uuid.uuid4()),
        "name": fake.name(),
        "phone": fake.phone_number(),
        "email": fake.email(),
        "risk_profile": risk_profile,
    }

    for gen in GENERATORS:
        applicant.update(gen.generate(rng, risk_profile))

    return applicant


def generate_population(
    n: int = 5000,
    seed: int = 42,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    Faker.seed(seed)

    profiles: list[RiskProfile] = []
    for profile, weight in PROFILE_DISTRIBUTION:
        count = int(n * weight)
        profiles.extend([profile] * count)

    remainder = n - len(profiles)
    if remainder > 0:
        profiles.extend(["medium"] * remainder)

    rng.shuffle(profiles)

    records = [generate_applicant(rng, p) for p in profiles]
    df = pd.DataFrame(records)

    float_cols = [c for c in df.columns if df[c].dtype == "float64"]
    int_cols = [c for c in df.columns if df[c].dtype in ("int64", "int32") and c not in ("applicant_id",)]

    n_rows = len(df)

    for col in float_cols:
        col_std = df[col].std()
        if col_std > 0:
            noise = rng.normal(0, col_std * 0.85, size=n_rows)
            vals = df[col] + noise
            if df[col].between(0, 1).all():
                vals = np.clip(vals, 0, 1)
            df[col] = vals

    for col in int_cols:
        col_std = df[col].std()
        if col_std > 0:
            noise = rng.normal(0, col_std * 0.55, size=n_rows)
            df[col] = (df[col] + noise).round().astype(int)

    flip_rate = 0.08
    flip_mask = rng.random(n_rows) < flip_rate
    adjacent: dict[str, list[str]] = {
        "low": ["medium"],
        "medium": ["low", "high"],
        "high": ["medium"],
    }
    for idx in df.index[flip_mask]:
        current = df.at[idx, "risk_profile"]
        candidates = adjacent[current]
        df.at[idx, "risk_profile"] = rng.choice(candidates)

    return df
