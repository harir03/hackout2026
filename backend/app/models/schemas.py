from pydantic import BaseModel


class ShapFeature(BaseModel):
    worker: str
    label: str
    points: float
    direction: str
    feature_value: float


class SignalConflict(BaseModel):
    positive_worker: str
    positive_net_points: float
    negative_worker: str
    negative_net_points: float
    combined_magnitude: float
    description: str


class ScoreResponse(BaseModel):
    user_id: str
    score: int
    risk_band: str
    tier: str
    model_version: str
    shap_details: list[ShapFeature]
    signal_conflicts: list[SignalConflict]
    hard_caps_applied: list[str]
    tier1_reweight: str | None = None
    has_conflicts: bool
    has_hard_cap: bool
    consent_id: str | None = None
    ecom_source: str | None = None


class ScoreRequest(BaseModel):
    user_id: str
    consented_sources: list[str]
    consent_id: str | None = None


