from typing import Literal
import numpy as np
from faker import Faker

fake = Faker("en_IN")

RiskProfile = Literal["low", "medium", "high"]

INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
    "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal", "Delhi", "Chandigarh",
]


def generate(rng: np.random.Generator, risk_profile: RiskProfile) -> dict:
    address_changes_24m = int(rng.poisson(
        {"low": 0.3, "medium": 1.2, "high": 3.5}[risk_profile]
    ))

    years_at_current = max(0, int(rng.exponential(
        {"low": 8, "medium": 3, "high": 1}[risk_profile]
    )))

    metro_prob = {"low": 0.55, "medium": 0.40, "high": 0.25}[risk_profile]
    is_metro = bool(rng.random() < metro_prob)

    state = rng.choice(INDIAN_STATES)
    pin_code = str(rng.integers(100000, 999999))

    home_ownership_prob = {"low": 0.7, "medium": 0.4, "high": 0.15}[risk_profile]
    owns_home = bool(rng.random() < home_ownership_prob)

    return {
        "loc_address_changes_24m": address_changes_24m,
        "loc_years_at_current": years_at_current,
        "loc_is_metro": int(is_metro),
        "loc_state": str(state),
        "loc_pin_code": pin_code,
        "loc_owns_home": int(owns_home),
    }
