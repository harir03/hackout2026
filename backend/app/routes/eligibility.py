import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    EligibilityResponse,
    LoanApplicationRequest,
    LoanApplicationResponse,
    LoanTier,
    InterviewSummaryRequest,
    InterviewSummaryResponse,
)

router = APIRouter(prefix="/eligibility", tags=["eligibility"])

LOAN_BANDS: list[dict] = [
    {"min_score": 750, "max_score": 850, "band": "Excellent", "max_amount": 1_000_000, "rate": 10.5, "tenures": [12, 24, 36, 48, 60]},
    {"min_score": 650, "max_score": 749, "band": "Good", "max_amount": 500_000, "rate": 13.5, "tenures": [12, 24, 36, 48]},
    {"min_score": 550, "max_score": 649, "band": "Fair", "max_amount": 200_000, "rate": 17.0, "tenures": [12, 24, 36]},
    {"min_score": 450, "max_score": 549, "band": "Poor", "max_amount": 50_000, "rate": 21.0, "tenures": [12, 24]},
]

PROJECT_ROOT = Path(__file__).resolve().parents[2] / ".."


def _calculate_emi(principal: int, annual_rate: float, tenure_months: int) -> float:
    monthly_rate = annual_rate / 100 / 12
    if monthly_rate == 0:
        return round(principal / tenure_months, 2)
    emi = principal * monthly_rate * math.pow(1 + monthly_rate, tenure_months) / (math.pow(1 + monthly_rate, tenure_months) - 1)
    return round(emi, 2)


def _build_eligibility(user_id: str, score: int, band: str) -> EligibilityResponse:
    matched = next((b for b in LOAN_BANDS if b["min_score"] <= score <= b["max_score"]), None)

    if not matched:
        return EligibilityResponse(
            user_id=user_id,
            score=score,
            risk_band=band,
            is_eligible=False,
            max_loan_amount=0,
            interest_rate_annual=0.0,
            tenure_options=[],
        )

    tiers = []
    for t in matched["tenures"]:
        emi = _calculate_emi(matched["max_amount"], matched["rate"], t)
        tiers.append(LoanTier(
            tenure_months=t,
            monthly_emi=emi,
            total_repayment=round(emi * t, 2),
        ))

    return EligibilityResponse(
        user_id=user_id,
        score=score,
        risk_band=band,
        is_eligible=True,
        max_loan_amount=matched["max_amount"],
        interest_rate_annual=matched["rate"],
        tenure_options=tiers,
    )


def _lookup_score(user_id: str) -> tuple[int, str] | None:
    scores_file = PROJECT_ROOT / "demo_data" / "scores_db.json"
    if not scores_file.exists():
        return None
    try:
        records = json.loads(scores_file.read_text())
        for rec in records:
            if rec.get("user_id") == user_id:
                return rec["score"], rec["risk_band"]
    except Exception:
        return None
    return None


@router.get("/{user_id}", response_model=EligibilityResponse)
async def get_eligibility(user_id: str, score: int | None = None, band: str | None = None) -> EligibilityResponse:
    if score is not None and band is not None:
        return _build_eligibility(user_id, score, band)

    lookup = _lookup_score(user_id)
    if lookup is None:
        raise HTTPException(status_code=404, detail="No score found for this user")

    return _build_eligibility(user_id, lookup[0], lookup[1])


@router.get("/compute/direct", response_model=EligibilityResponse)
async def compute_eligibility_direct(score: int, band: str) -> EligibilityResponse:
    return _build_eligibility("direct", score, band)


APPLICATIONS_FILE = PROJECT_ROOT / "demo_data" / "loan_applications.json"


def _load_applications() -> list[dict]:
    if not APPLICATIONS_FILE.exists():
        return []
    try:
        return json.loads(APPLICATIONS_FILE.read_text())
    except Exception:
        return []


def _save_applications(apps: list[dict]) -> None:
    APPLICATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    APPLICATIONS_FILE.write_text(json.dumps(apps, indent=2))


@router.post("/apply", response_model=LoanApplicationResponse)
async def apply_for_loan(req: LoanApplicationRequest) -> LoanApplicationResponse:
    app_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"

    record = {
        "application_id": app_id,
        "user_id": req.user_id,
        "score": req.score,
        "risk_band": req.risk_band,
        "loan_amount": req.loan_amount,
        "tenure_months": req.tenure_months,
        "monthly_emi": req.monthly_emi,
        "interest_rate": req.interest_rate,
        "phone": req.phone,
        "name": req.name,
        "status": "callback_requested",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    apps = _load_applications()
    apps.append(record)
    _save_applications(apps)
    return LoanApplicationResponse(
        application_id=app_id,
        status="callback_requested",
        message=f"Your loan application {app_id} has been submitted. Our team will call you on {req.phone} within 24 hours.",
    )


INTERVIEW_SUMMARIES_FILE = PROJECT_ROOT / "demo_data" / "interview_summaries.json"


def _load_summaries() -> dict[str, str]:
    if not INTERVIEW_SUMMARIES_FILE.exists():
        return {}
    try:
        return json.loads(INTERVIEW_SUMMARIES_FILE.read_text())
    except Exception:
        return {}


def _save_summaries(sums: dict[str, str]) -> None:
    INTERVIEW_SUMMARIES_FILE.parent.mkdir(parents=True, exist_ok=True)
    INTERVIEW_SUMMARIES_FILE.write_text(json.dumps(sums, indent=2))


@router.post("/interview/summary", response_model=InterviewSummaryResponse)
async def post_interview_summary(req: InterviewSummaryRequest) -> InterviewSummaryResponse:
    sums = _load_summaries()
    sums[req.user_id] = req.summary
    _save_summaries(sums)
    return InterviewSummaryResponse(user_id=req.user_id, summary=req.summary, status="saved")


@router.get("/interview/summary/{user_id}", response_model=InterviewSummaryResponse)
async def get_interview_summary(user_id: str) -> InterviewSummaryResponse:
    sums = _load_summaries()
    summary = sums.get(user_id, "")
    return InterviewSummaryResponse(user_id=user_id, summary=summary, status="found" if summary else "not_found")

