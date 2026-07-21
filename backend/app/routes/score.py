import uuid
import asyncio
import re
import io
from typing import Any
from pathlib import Path
import numpy as np
import pdfplumber
from fastapi import APIRouter, UploadFile, File, Form
from sqlalchemy import text

from app.db import async_session
from app.ml.consolidator import run_consolidator
from app.ml.explainer import ScoringEngine
from app.ml.explainability import generate_explanations
from app.ml.features import TIER1_FEATURES, TIER2_FEATURES
from app.ml.pipeline import score_to_band
from app.models.schemas import ScoreRequest, ScoreResponse, ShapFeature, SignalConflict

from app.data_gen import (
    d1_bank_upi,
    d2_telecom,
    d3_ecommerce,
    d4_location,
    d5_questionnaire,
    d6_merchant_gst,
)

router = APIRouter()
_engine = None


def _get_engine() -> ScoringEngine:
    global _engine
    if _engine is None:
        _engine = ScoringEngine(Path(__file__).resolve().parents[2] / ".." / "models")
    return _engine


def parse_bank_pdf(file_bytes: bytes) -> dict[str, float]:
    inflows = []
    balances = []
    upi_count = 0
    
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text_content = page.extract_text()
            if not text_content:
                continue
            for line in text_content.split("\n"):
                line_lower = line.lower()
                amounts = re.findall(r"\d+[\d,]*\.\d{2}", line)
                if amounts:
                    try:
                        vals = [float(a.replace(",", "")) for a in amounts]
                        if len(vals) >= 2:
                            tx_amt = vals[0]
                            bal = vals[-1]
                            balances.append(bal)
                            if any(word in line_lower for word in ["cr", "credit", "dep", "deposit", "+"]):
                                inflows.append(tx_amt)
                        elif len(vals) == 1:
                            balances.append(vals[0])
                    except Exception:
                        pass
                
                if any(word in line_lower for word in ["upi", "imps", "neft", "transfer"]):
                    upi_count += 1
                    
    avg_inflow = float(np.mean(inflows)) if inflows else 12500.0
    mean_bal = np.mean(balances) if balances else 5000.0
    volatility = float(np.std(balances) / mean_bal) if balances and mean_bal > 0 else 0.25
    min_bal = float(np.min(balances)) if balances else 1200.0
    min_bal_ratio = min_bal / avg_inflow if avg_inflow > 0 else 0.1
    
    return {
        "bank_avg_monthly_inflow": avg_inflow,
        "bank_inflow_trend": 0.02,
        "bank_balance_volatility": volatility,
        "bank_payment_regularity": 0.95,
        "bank_upi_txn_count": float(upi_count),
        "bank_min_balance_ratio": min_bal_ratio
    }


async def _build_response_with_features(
    user_id: str,
    tier: str,
    engine: ScoringEngine,
    rng: np.random.Generator,
    feat_dict: dict[str, Any],
    consent_id: str | None = None,
    ecom_source: str = "simulated",
    profile_data: dict[str, Any] | None = None,
    answers: dict[str, int] | None = None,
) -> ScoreResponse:
    if tier == "tier2":
        x_values = [feat_dict[feat] for feat in TIER2_FEATURES]
        X = np.array([x_values])
        result = engine.score_and_explain_tier2(X)[0]
    else:
        x_values = [feat_dict[feat] for feat in TIER1_FEATURES]
        X = np.array([x_values])
        result = engine.score_and_explain_tier1(X)[0]

    consolidated = run_consolidator(
        score=result["score"],
        shap_details=result["shap_details"],
        applicant_flags={"is_wilful_defaulter": False, "high_emi_burden": False},
        tier=tier,
    )

    final_score = consolidated["final_score"]
    band = score_to_band(final_score)
    tier_label = "Tier 2 (Full)" if tier == "tier2" else "Tier 1 (Zero-history)"

    try:
        async def _log_score_to_db():
            import json
            import datetime
            score_id = uuid.uuid4()

            try:
                scores_file = Path(__file__).resolve().parents[2] / ".." / "demo_data" / "scores_db.json"
                scores_data = {}
                if scores_file.exists():
                    try:
                        scores_data = json.loads(scores_file.read_text())
                    except Exception:
                        pass
                scores_data[str(score_id)] = {
                    "id": str(score_id),
                    "user_id": user_id,
                    "score": final_score,
                    "risk_band": band,
                    "tier": tier_label,
                    "model_version": "blend-calibrated",
                    "shap_details": result["shap_details"],
                    "signal_conflicts": consolidated["signal_conflicts"],
                    "hard_caps_applied": consolidated["hard_caps_applied"],
                    "has_conflicts": consolidated["has_conflicts"],
                    "has_hard_cap": consolidated["has_hard_cap"],
                    "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "consent_id": consent_id,
                }
                scores_file.write_text(json.dumps(scores_data, indent=2))
            except Exception as file_ex:
                print(f"Failed to write fallback scores file: {file_ex}")

            try:
                async with async_session() as session:
                    try:
                        db_user_id = uuid.UUID(user_id)
                    except ValueError:
                        db_user_id = uuid.uuid5(uuid.NAMESPACE_DNS, user_id)

                    await session.execute(
                        text(
                            "INSERT INTO scores (id, user_id, score, risk_band, tier, model_version, shap_details, signal_conflicts, hard_caps_applied, has_conflicts, has_hard_cap) "
                            "VALUES (:id, :user_id, :score, :risk_band, :tier, :version, :shap, :conflicts, :caps, :has_c, :has_hc)"
                        ),
                        {
                            "id": str(score_id),
                            "user_id": str(db_user_id),
                            "score": final_score,
                            "risk_band": band,
                            "tier": tier_label,
                            "version": "blend-calibrated",
                            "shap": json.dumps(result["shap_details"]),
                            "conflicts": json.dumps(consolidated["signal_conflicts"]),
                            "caps": json.dumps(consolidated["hard_caps_applied"]),
                            "has_c": consolidated["has_conflicts"],
                            "has_hc": consolidated["has_hard_cap"],
                        }
                    )
                    await session.commit()
            except Exception as db_ex:
                print(f"PostgreSQL decision audit log skipped: {db_ex}")

        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_log_score_to_db())
    except Exception as db_ex:
        print(f"PostgreSQL decision audit log skipped: {db_ex}")

    enriched_shap = generate_explanations(result["shap_details"], feat_dict, profile_data, answers)

    return ScoreResponse(
        user_id=user_id,
        score=final_score,
        risk_band=band,
        tier=tier_label,
        model_version="blend-calibrated",
        shap_details=[ShapFeature(**feat) for feat in enriched_shap],
        signal_conflicts=[SignalConflict(**c) for c in consolidated["signal_conflicts"]],
        hard_caps_applied=consolidated["hard_caps_applied"],
        tier1_reweight=consolidated["tier1_reweight"],
        has_conflicts=consolidated["has_conflicts"],
        has_hard_cap=consolidated["has_hard_cap"],
        consent_id=consent_id,
        ecom_source=ecom_source,
    )


def _get_profile_features(
    user_id: str,
    phone: str | None,
    rng: np.random.Generator,
    profile: str,
    answers: dict[str, int] | None = None,
    time_taken_ms: int | None = None,
    changes_count: int | None = None,
) -> dict[str, Any]:
    import json
    feat_dict = {}
    feat_dict.update(d1_bank_upi.generate(rng, profile))
    feat_dict.update(d2_telecom.generate(rng, profile))
    feat_dict.update(d4_location.generate(rng, profile))
    feat_dict.update(d5_questionnaire.generate(rng, profile))
    feat_dict.update(d6_merchant_gst.generate(rng, profile))

    profile_data = None
    profiles_path = Path(__file__).resolve().parents[2] / "demo_data" / "profiles.json"
    if profiles_path.exists() and user_id.lower() != "hari@altgrade.in":
        try:
            with open(profiles_path, "r") as f:
                all_profiles = json.load(f)
                search_id = "hari" if user_id.lower() == "testhari@altgrade.in" else user_id
                for p_name, p_val in all_profiles.items():
                    if p_name.lower() == search_id.lower() or (phone and p_val.get("phone") == phone):
                        profile_data = p_val
                        break
        except Exception as e:
            print(f"Failed to load demo profiles: {e}")

    if profile_data:
        if "bank_data" in profile_data:
            bd = profile_data["bank_data"]
            feat_dict["bank_avg_monthly_inflow"] = bd.get("monthly_inflow", 15000.0)
            feat_dict["bank_min_balance_ratio"] = 0.1 if bd.get("bounce_events", 0) > 2 else 0.6
        
        if "telecom_data" in profile_data:
            td = profile_data["telecom_data"]
            feat_dict["telecom_ontime_rate"] = td.get("ontime_payment_rate", 0.9)
            feat_dict["telecom_plan_value"] = td.get("monthly_average_spend", 399.0)
            feat_dict["telecom_active_months"] = td.get("recharge_frequency_days", 28) * 1.5
            feat_dict["telecom_missed_payments"] = 0 if td.get("ontime_payment_rate", 0.9) > 0.9 else 2
        
        if "ecommerce_data" in profile_data:
            ed = profile_data["ecommerce_data"]
            feat_dict["ecom_purchase_frequency"] = ed.get("order_count_6m", 12)
            feat_dict["ecom_return_rate"] = ed.get("return_rate", 0.05)
            feat_dict["ecom_avg_monthly_spend"] = ed.get("total_spend_6m", 12000.0) / 6.0
            feat_dict["ecom_account_age_months"] = int(ed.get("oldest_order_days", 365) / 30.0)
        
        if "location_data" in profile_data:
            ld = profile_data["location_data"]
            feat_dict["loc_is_metro"] = 1.0 if ld.get("city") in ["Bengaluru", "Mumbai", "Delhi"] else 0.0
            feat_dict["loc_years_at_current"] = 5.0
            feat_dict["loc_address_changes_24m"] = 0.0
        
        if "questionnaire_data" in profile_data:
            qd = profile_data["questionnaire_data"]
            feat_dict["psych_engagement_score"] = qd.get("cfpb_score", 60)
            feat_dict["psych_straight_line_ratio"] = 1.0 if qd.get("straight_line_detected") else 0.0
            feat_dict["psych_consistency"] = 0.9 if qd.get("hesitation_flags", 0) == 0 else 0.6
        
        if "gst_data" in profile_data:
            gd = profile_data["gst_data"]
            feat_dict["merchant_has_gst"] = 1.0 if gd.get("gstin_valid") else 0.0
            feat_dict["merchant_filing_regularity"] = gd.get("filing_promptness_rate", 0.9)
            feat_dict["merchant_months_operating"] = gd.get("operating_months", 24)
            feat_dict["merchant_annual_turnover"] = 1500000.0 if gd.get("gstin_valid") else 0.0

    if answers:
        try:
            ans_values = [int(v) for v in answers.values()]
            ans_sum = sum(ans_values)
            base_psych = float(max(35, 95 - (ans_sum / 45) * 60))
            
            time_sec = 120.0
            time_penalty = 0.0
            time_consistency_mod = 0.0
            if time_taken_ms is not None:
                time_sec = float(time_taken_ms) / 1000.0
                if time_sec < 15.0:
                    time_penalty = 40.0
                    time_consistency_mod = -0.5
                elif time_sec < 30.0:
                    time_penalty = 15.0
                    time_consistency_mod = -0.2
                elif 35.0 <= time_sec <= 120.0:
                    time_penalty = -5.0
            
            straight_line_ratio = 0.0
            if len(ans_values) >= 10:
                from collections import Counter
                counts = Counter(ans_values)
                most_common_count = counts.most_common(1)[0][1]
                straight_line_ratio = float(most_common_count) / len(ans_values)
            
            straight_line_penalty = 0.0
            if straight_line_ratio >= 0.73:
                straight_line_penalty = 35.0
            
            psych_score = float(max(30.0, min(100.0, base_psych - time_penalty - straight_line_penalty)))
            feat_dict["psych_engagement_score"] = psych_score
            feat_dict["psych_mean_answer"] = float(np.mean(ans_values)) if ans_values else 1.5
            feat_dict["psych_std_answer"] = float(np.std(ans_values)) if ans_values else 0.5
            
            base_consistency = 0.95
            if changes_count is not None:
                if changes_count > 8:
                    base_consistency = 0.50
                elif changes_count > 4:
                    base_consistency = 0.70
                elif changes_count > 2:
                    base_consistency = 0.85
            
            feat_dict["psych_consistency"] = float(max(0.2, min(1.0, base_consistency + time_consistency_mod)))
            feat_dict["psych_straight_line_ratio"] = straight_line_ratio
            feat_dict["psych_completion_time_sec"] = time_sec
        except Exception as q_ex:
            print(f"Psychometric calculation failed: {q_ex}")

    return feat_dict


async def _build_response(
    user_id: str,
    tier: str,
    engine: ScoringEngine,
    rng: np.random.Generator,
    consent_id: str | None = None,
    phone: str | None = None,
    answers: dict[str, int] | None = None,
    time_taken_ms: int | None = None,
    changes_count: int | None = None,
    bypass_cache: bool = False,
    location_history: list[dict] | None = None,
) -> ScoreResponse:
    import json
    if not bypass_cache:
        try:
            async with async_session() as session:
                try:
                    db_user_id = uuid.UUID(user_id)
                except ValueError:
                    db_user_id = uuid.uuid5(uuid.NAMESPACE_DNS, user_id)
                
                res = await session.execute(
                    text("SELECT score, risk_band, tier, model_version, shap_details, signal_conflicts, hard_caps_applied, has_conflicts, has_hard_cap, consent_id "
                         "FROM scores WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 1"),
                    {"user_id": db_user_id}
                )
                row = res.fetchone()
                if row:
                    return ScoreResponse(
                        user_id=user_id,
                        score=row[0],
                        risk_band=row[1],
                        tier=row[2],
                        model_version=row[3],
                        shap_details=[ShapFeature(**feat) for feat in (json.loads(row[4]) if isinstance(row[4], str) else row[4])],
                        signal_conflicts=[SignalConflict(**c) for c in (json.loads(row[5]) if isinstance(row[5], str) else row[5])],
                        hard_caps_applied=json.loads(row[6]) if isinstance(row[6], str) else row[6],
                        tier1_reweight=None,
                        has_conflicts=row[7],
                        has_hard_cap=row[8],
                        consent_id=str(row[9]) if row[9] else None,
                        ecom_source="simulated"
                    )
        except Exception as db_ex:
            print(f"Failed to check existing score in DB: {db_ex}")

        try:
            scores_file = Path(__file__).resolve().parents[2] / ".." / "demo_data" / "scores_db.json"
            if scores_file.exists():
                scores_data = json.loads(scores_file.read_text())
                user_scores = [s for s in scores_data.values() if s["user_id"] == user_id]
                if user_scores:
                    latest = sorted(user_scores, key=lambda x: x["created_at"])[-1]
                    return ScoreResponse(
                        user_id=user_id,
                        score=latest["score"],
                        risk_band=latest["risk_band"],
                        tier=latest["tier"],
                        model_version=latest["model_version"],
                        shap_details=[ShapFeature(**feat) for feat in latest["shap_details"]],
                        signal_conflicts=[SignalConflict(**c) for c in latest["signal_conflicts"]],
                        hard_caps_applied=latest["hard_caps_applied"],
                        tier1_reweight=None,
                        has_conflicts=latest["has_conflicts"],
                        has_hard_cap=latest["has_hard_cap"],
                        consent_id=latest.get("consent_id"),
                        ecom_source="simulated"
                    )
        except Exception as file_ex:
            print(f"Failed to check existing score in fallback JSON: {file_ex}")

    profiles = ["low", "medium", "high"]
    profile = profiles[hash(user_id) % len(profiles)]

    feat_dict = _get_profile_features(user_id, phone, rng, profile, answers, time_taken_ms, changes_count)

    profile_data = None
    profiles_path = Path(__file__).resolve().parents[3] / "demo_data" / "profiles.json"
    if profiles_path.exists():
        try:
            all_profiles = json.loads(profiles_path.read_text())
            search_id = user_id.lower()
            if search_id in ("testhari@altgrade.in", "hari@altgrade.in"):
                search_id = "hari"
            for p_name, p_val in all_profiles.items():
                if p_name.lower() == search_id or (phone and p_val.get("mobile") == phone):
                    profile_data = p_val
                    break
        except Exception:
            pass

    ecom_data = d3_ecommerce.generate(rng, profile)
    for k, v in ecom_data.items():
        if k not in feat_dict:
            feat_dict[k] = v
    ecom_source = "simulated"

    if location_history and len(location_history) > 0:
        METRO_CITIES = {
            "delhi", "mumbai", "bangalore", "bengaluru", "chennai", "kolkata",
            "hyderabad", "pune", "ahmedabad", "jaipur", "lucknow", "surat",
            "kanpur", "nagpur", "indore", "thane", "bhopal", "visakhapatnam",
            "patna", "vadodara", "ghaziabad", "ludhiana", "coimbatore", "kochi",
            "chandigarh", "gurgaon", "gurugram", "noida", "navi mumbai",
        }
        current_year = 2026
        current_entry = location_history[0]
        current_from = current_entry.get("fromYear", current_year)
        years_at_current = max(0, current_year - current_from)
        address_changes = max(0, len(location_history) - 1)

        place_name = current_entry.get("place", "").lower()
        is_metro = any(city in place_name for city in METRO_CITIES)

        feat_dict["loc_address_changes_24m"] = min(address_changes, 5)
        feat_dict["loc_years_at_current"] = years_at_current
        feat_dict["loc_is_metro"] = 1 if is_metro else 0
        feat_dict["loc_owns_home"] = 1 if years_at_current >= 5 else 0

    return await _build_response_with_features(user_id, tier, engine, rng, feat_dict, consent_id, ecom_source, profile_data, answers)


@router.post("/score", response_model=ScoreResponse)
async def post_score(body: ScoreRequest) -> ScoreResponse:
    engine = _get_engine()
    rng = np.random.default_rng(hash(body.user_id) % (2**32))
    has_bank = "d1_bank" in body.consented_sources
    tier = "tier2" if has_bank else "tier1"
    return await _build_response(
        body.user_id,
        tier,
        engine,
        rng,
        body.consent_id,
        body.phone,
        body.answers,
        body.time_taken_ms,
        body.changes_count,
        bypass_cache=True,
        location_history=body.location_history,
    )



@router.post("/score/upload-statement", response_model=ScoreResponse)
async def upload_statement(
    user_id: str = Form(...),
    consent_id: str = Form(...),
    file: UploadFile = File(...)
) -> ScoreResponse:
    content = await file.read()
    try:
        parsed_features = parse_bank_pdf(content)
    except Exception as parse_ex:
        print(f"PDF statement parsing failed: {parse_ex}")
        parsed_features = {
            "bank_avg_monthly_inflow": 15000.0,
            "bank_inflow_trend": 0.01,
            "bank_balance_volatility": 0.2,
            "bank_payment_regularity": 0.9,
            "bank_upi_txn_count": 25.0,
            "bank_min_balance_ratio": 0.3
        }

    engine = _get_engine()
    rng = np.random.default_rng(42)
    profiles = ["low", "medium", "high"]
    profile = profiles[hash(user_id) % len(profiles)]
    
    feat_dict = _get_profile_features(user_id, None, rng, profile)
    feat_dict.update(parsed_features)
    
    ecom_data = d3_ecommerce.generate(rng, profile)
    feat_dict.update(ecom_data)
    ecom_source = ecom_data.get("source", "simulated")
    
    return await _build_response_with_features(user_id, "tier2", engine, rng, feat_dict, consent_id, ecom_source)


@router.get("/score/{user_id}", response_model=ScoreResponse)
async def get_score(user_id: str, consent_id: str | None = None) -> ScoreResponse:
    engine = _get_engine()
    rng = np.random.default_rng(hash(user_id) % (2**32))
    has_bank = rng.random() > 0.2
    tier = "tier2" if has_bank else "tier1"
    return await _build_response(user_id, tier, engine, rng, consent_id, None)
