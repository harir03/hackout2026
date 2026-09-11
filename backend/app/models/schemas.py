from pydantic import BaseModel


class ShapFeature(BaseModel):
    worker: str
    label: str
    points: float
    direction: str
    feature_value: float
    explanation: str = ""


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
    phone: str | None = None
    answers: dict[str, int] | None = None
    time_taken_ms: int | None = None
    changes_count: int | None = None
    location_history: list[dict] | None = None


class LoanTier(BaseModel):
    tenure_months: int
    monthly_emi: float
    total_repayment: float


class EligibilityResponse(BaseModel):
    user_id: str
    score: int
    risk_band: str
    is_eligible: bool
    max_loan_amount: int
    interest_rate_annual: float
    tenure_options: list[LoanTier]


class LoanApplicationRequest(BaseModel):
    user_id: str
    score: int
    risk_band: str
    loan_amount: int
    tenure_months: int
    monthly_emi: float
    interest_rate: float
    phone: str
    name: str = ""


class LoanApplicationResponse(BaseModel):
    application_id: str
    status: str
    message: str


class InterviewSummaryRequest(BaseModel):
    user_id: str
    summary: str


class InterviewSummaryResponse(BaseModel):
    user_id: str
    summary: str
    status: str
