import json
from pathlib import Path
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ml.segmenter import detect_segment
from app.ml.health_monitor import check_health
from app.ml.recommender import recommend_products
from app.ml.score_simulator import simulate_loan_structure
from app.ml.static_profiles import get_static_response

router = APIRouter(prefix="/personalize", tags=["Personalization & Intelligence"])


def _extract_features_for_user(user_id: str) -> tuple[int, str, dict[str, Any]]:
    """Helper to get score, risk band, and feature dictionary for any user ID."""
    clean_id = user_id.lower().strip()
    if clean_id in ("testhari@altgrade.in", "hari@altgrade.in"):
        clean_id = "hari"

    # 1. Check static profile
    static_resp = get_static_response(clean_id)
    if static_resp:
        score = static_resp.score
        band = static_resp.risk_band
        # Build feature dictionary from shap_details
        features: dict[str, Any] = {}
        for item in static_resp.shap_details:
            lbl = item.label
            val = getattr(item, "feature_value", None)
            if val is not None:
                features[lbl] = val
            elif lbl == "loc_years_at_current":
                features[lbl] = 35.0 if "farmer" in clean_id else 8.0
            elif lbl == "merchant_has_gst":
                features[lbl] = 1 if "msme" in clean_id else 0
            elif lbl == "bank_avg_monthly_inflow":
                features[lbl] = 22000.0
            elif lbl == "telecom_ontime_rate":
                features[lbl] = 0.95

        # Set foundational fallbacks
        features.setdefault("loc_years_at_current", 35.0 if "farmer" in clean_id else 6.0)
        features.setdefault("loc_is_metro", 0 if "farmer" in clean_id else 1)
        features.setdefault("telecom_plan_value", 149.0 if "farmer" in clean_id else 399.0)
        features.setdefault("telecom_ontime_rate", 0.95)
        features.setdefault("bank_avg_monthly_inflow", 22000.0 if "farmer" in clean_id else 45000.0)
        features.setdefault("bank_balance_volatility", 0.48 if "farmer" in clean_id else 0.28)
        features.setdefault("bank_min_balance_ratio", 0.22)
        features.setdefault("merchant_has_gst", 1 if "msme" in clean_id else 0)
        features.setdefault("merchant_monthly_turnover", 120000.0 if "msme" in clean_id else 0.0)
        features.setdefault("upi_monthly_volume", 15 if "farmer" in clean_id else 80)
        features.setdefault("ecom_order_frequency", 1.0 if "farmer" in clean_id else 4.0)

        return score, band, features

    # 2. Check demo_data/profiles.json
    project_root = Path(__file__).resolve().parents[2]
    profiles_file = project_root / "demo_data" / "profiles.json"
    if profiles_file.exists():
        try:
            profiles = json.loads(profiles_file.read_text())
            if clean_id in profiles:
                prof = profiles[clean_id]
                score = 650
                band = "Good"
                features = {
                    "loc_years_at_current": float(prof.get("location_data", {}).get("years_at_address", 5.0)),
                    "loc_is_metro": 1 if prof.get("location_data", {}).get("city", "").lower() in ("bengaluru", "mumbai", "delhi") else 0,
                    "telecom_plan_value": float(prof.get("telecom_data", {}).get("plan_value", 299.0)),
                    "telecom_ontime_rate": float(prof.get("telecom_data", {}).get("recharge_ontime_ratio", 0.90)),
                    "bank_avg_monthly_inflow": float(prof.get("bank_data", {}).get("avg_inflow", 35000.0)),
                    "bank_balance_volatility": float(prof.get("bank_data", {}).get("balance_volatility", 0.35)),
                    "bank_min_balance_ratio": float(prof.get("bank_data", {}).get("min_balance_ratio", 0.18)),
                    "merchant_has_gst": 1 if prof.get("gst_data", {}).get("has_gst") else 0,
                    "merchant_monthly_turnover": float(prof.get("gst_data", {}).get("monthly_turnover", 0.0)),
                    "upi_monthly_volume": int(prof.get("bank_data", {}).get("upi_count", 25)),
                    "ecom_order_frequency": float(prof.get("ecommerce_data", {}).get("order_count", 2.0)),
                }
                return score, band, features
        except Exception:
            pass

    # 3. Default fallback profile
    return (
        640,
        "Good",
        {
            "loc_years_at_current": 8.0,
            "loc_is_metro": 0,
            "telecom_plan_value": 249.0,
            "telecom_ontime_rate": 0.92,
            "bank_avg_monthly_inflow": 28000.0,
            "bank_balance_volatility": 0.34,
            "bank_min_balance_ratio": 0.16,
            "merchant_has_gst": 0,
            "merchant_monthly_turnover": 0.0,
            "upi_monthly_volume": 20,
            "ecom_order_frequency": 1.5,
        }
    )


class SimulationRequest(BaseModel):
    user_id: str
    loan_amount: float
    tenure_months: int
    annual_interest_rate: float = 10.5
    moratorium_months: int = 0
    behavioral_improvements: list[str] = []


@router.get("/{user_id}")
async def get_user_intelligence(user_id: str):
    """
    Unified endpoint returning persona segmentation, financial health,
    recommended government schemes, and vernacular spoken audio scripts.
    """
    score, band, features = _extract_features_for_user(user_id)
    
    # 1. Segment Detection
    segment_info = detect_segment(features)
    segment_name = segment_info["segment"]
    segment_info.setdefault("name", segment_info.get("title", segment_name.title()))
    segment_info.setdefault("tagline", segment_info.get("sub_segment", ""))
    segment_info.setdefault("underwriter_notes", segment_info.get("underwriting_advice", ""))
    segment_info.setdefault("icon", "🌾" if segment_name == "farmer" else ("🏪" if segment_name == "msme" else ("🛵" if segment_name == "gig_worker" else "💼")))

    # 2. Financial Health Pulse
    health_info = check_health(features, segment=segment_name)
    health_info.setdefault("status_label", health_info.get("headline", "Financial Pulse"))
    health_info.setdefault("stability_score", health_info.get("score", 75))
    buffer_ratio = float(features.get("bank_min_balance_ratio", 0.18))
    health_info.setdefault("liquidity_buffer_days", round(buffer_ratio * 30, 1))
    ontime_rate = float(features.get("telecom_ontime_rate", 0.92))
    health_info.setdefault("bill_discipline_pct", round(ontime_rate * 100, 1))
    health_info.setdefault("intervention_summary", health_info.get("headline", ""))
    health_info.setdefault("actionable_steps", health_info.get("interventions", []))
    warning_signals = [s["detail"] for s in health_info.get("signals", []) if s.get("status") in ("red", "amber")]
    health_info.setdefault("warning_signals", warning_signals)

    # 3. Product & Scheme Recommendations
    recommendations = recommend_products(segment=segment_name, score=score, features=features)
    for r in recommendations:
        r.setdefault("scheme_name", r.get("name", ""))
        r.setdefault("match_score", r.get("fit_score", 85))
        r.setdefault("interest_subsidy", r.get("subsidy_rate", ""))
        r.setdefault("match_reasons", [r.get("officer_talking_points", "Qualified for priority subsidy")])
        r.setdefault("ministry_or_body", "Govt of India" if "PM" in r.get("name", "") else "Reserve Bank of India")

    # 4. Spoken Vernacular Audio Scripts (for low-literacy borrowers)
    credit_limit = 50000 if score < 650 else (100000 if score < 720 else 200000)

    if segment_name == "farmer":
        audio_scripts = {
            "gu": f"નમસ્તે! તમારા 30 વર્ષના ગ્રામીણ રહેઠાણ અને નિયમિત બિલ ચુકવણીના આધારે, તમારો ઓલ્ટગ્રેડ સ્કોર {score} છે. તમે ₹{credit_limit:,} સુધીની કિસાન લોન અને પીએમ પાક વીમા માટે પાત્ર છો. તમારા સ્થાનિક લોન અધિકારીનો સંપર્ક કરવા નીચેના બટન પર ટેપ કરો.",
            "hi": f"नमस्ते! आपकी 30 वर्ष की ग्रामीण निवास स्थिरता और समय पर बिल भुगतान के आधार पर, आपका ऑल्टग्रेड स्कोर {score} है। आप ₹{credit_limit:,} तक के किसान ऋण और पीएम फसल बीमा के पात्र हैं। अपने स्थानीय ऋण अधिकारी से मिलने के लिए नीचे दिए गए बटन पर टैप करें।",
            "ta": f"வணக்கம்! உங்கள் கிராமிய குடியிருப்பு நிலைத்தன்மை மற்றும் சரியான நேர கட்டணங்களின் அடிப்படையில், உங்கள் கடன் மதிப்பீடு {score}. நீங்கள் ₹{credit_limit:,} வரை விவசாயக் கடன் மற்றும் பயிர் காப்பீட்டிற்கு தகுதியுடையவர்.",
            "en": f"Good news! Based on your long-term land stability and regular bill payments, your AltGrade score is {score}. You qualify for agricultural credit up to ₹{credit_limit:,} and PM crop insurance."
        }
        plain_summary = f"You qualify for up to ₹{credit_limit:,} agricultural credit with harvest-aligned repayments."
        plain_tip = "Keep paying your mobile recharges and electricity bills on time to unlock a higher credit limit."
    elif segment_name == "msme":
        audio_scripts = {
            "gu": f"નમસ્તે! તમારા વ્યવસાયિક ટર્નઓવર અને નિયમિત UPI વેચાણના આધારે, તમારો સ્કોર {score} છે. તમે ₹{credit_limit:,} સુધીની મુદ્રા બિઝનેસ લોન માટે પાત્ર છો.",
            "hi": f"नमस्ते! आपके व्यापारिक टर्नओवर और नियमित यूपीआई बिक्री के आधार पर, आपका स्कोर {score} है। आप ₹{credit_limit:,} तक के मुद्रा व्यापार ऋण के पात्र हैं।",
            "ta": f"வணக்கம்! உங்கள் வணிக விற்பனை மற்றும் UPI பரிவர்த்தனைகளின் அடிப்படையில், உங்கள் மதிப்பீடு {score}. நீங்கள் ₹{credit_limit:,} வரை முத்ரா கடனுக்கு தகுதியுடையவர்.",
            "en": f"Good news! Based on your business sales and regular UPI inflows, your score is {score}. You qualify for MUDRA working capital up to ₹{credit_limit:,}."
        }
        plain_summary = f"You qualify for up to ₹{credit_limit:,} collateral-free MUDRA business credit."
        plain_tip = "Continue accepting digital UPI customer payments to verify higher monthly sales."
    else:
        audio_scripts = {
            "gu": f"નમસ્તે! તમારી સમયસર બિલ ચુકવણી અને બેંક રેકોર્ડના આધારે, તમારો સ્કોર {score} છે. તમે ₹{credit_limit:,} સુધીની લોન માટે પાત્ર છો.",
            "hi": f"नमस्ते! आपके समय पर बिल भुगतान और बैंक रिकॉर्ड के आधार पर, आपका स्कोर {score} है। आप ₹{credit_limit:,} तक के ऋण के लिए पात्र हैं।",
            "ta": f"வணக்கம்! உங்கள் சரியான நேர கட்டணங்களின் அடிப்படையில், உங்கள் மதிப்பீடு {score}. நீங்கள் ₹{credit_limit:,} வரை கடன் பெறலாம்.",
            "en": f"Good news! Based on your consistent bill payments, your AltGrade score is {score}. You qualify for credit up to ₹{credit_limit:,}."
        }
        plain_summary = f"You qualify for up to ₹{credit_limit:,} credit with simple terms."
        plain_tip = "Pay electricity and utility bills before the 5th of each month to keep growing your score."

    return {
        "user_id": user_id,
        "score": score,
        "risk_band": band,
        "credit_limit": credit_limit,
        "segment": segment_info,
        "health": health_info,
        "recommendations": recommendations,
        "borrower_summary": {
            "headline": f"Score: {score} — Eligible for Credit",
            "plain_summary": plain_summary,
            "plain_tip": plain_tip,
            "audio_scripts": audio_scripts,
        },
        "features": features
    }


@router.post("/simulate")
async def simulate_restructuring(req: SimulationRequest):
    """Underwriter interactive loan restructuring and what-if simulation endpoint."""
    score, _, features = _extract_features_for_user(req.user_id)
    
    result = simulate_loan_structure(
        base_score=score,
        features=features,
        loan_amount=req.loan_amount,
        tenure_months=req.tenure_months,
        annual_interest_rate=req.annual_interest_rate,
        moratorium_months=req.moratorium_months,
        behavioral_improvements=req.behavioral_improvements,
    )
    result["foir_ratio_pct"] = result.get("affordability_ratio", 0.0)
    result["is_affordable"] = result.get("affordability_status") in ("safe", "manageable")
    result["max_recommended_emi"] = round(result.get("monthly_inflow", 25000) * 0.40, 2)
    result["repayment_schedule_type"] = (
        f"Reducing balance with {req.moratorium_months}m seasonal grace"
        if req.moratorium_months > 0
        else "Standard monthly reducing balance"
    )
    result["guidance"] = result.get("underwriter_verdict", "")
    return result


@router.get("/alerts/officer")
async def get_loan_officer_alerts():
    """
    Returns prioritized field alerts for the loan officer dashboard:
    1. Pre-delinquency watchlist (Stressed accounts needing proactive visits)
    2. Upgrade eligible accounts (Consistent payers ready for limit expansion)
    """
    return {
        "alerts": [
            {
                "user_id": "msme@altgrade.in",
                "name": "Lakshmi Stores (Madurai)",
                "segment": "msme",
                "status": "amber",
                "score": 680,
                "type": "pre_delinquency",
                "urgency": "medium",
                "message": "Monthly merchant UPI velocity dropped 22% this cycle. Proactive field check recommended before inventory season.",
                "action": "Schedule Field Check"
            },
            {
                "user_id": "farmer@altgrade.in",
                "name": "Ramesh Kumar (Kovvur)",
                "segment": "farmer",
                "status": "amber",
                "score": 710,
                "type": "seasonal_watch",
                "urgency": "low",
                "message": "Normal Kharif pre-sowing input expenditure. Advise enrolling in PMFBY crop insurance and 60-day moratorium.",
                "action": "Attach PMFBY Subsidy"
            },
            {
                "user_id": "hari@altgrade.in",
                "name": "Hari Prasad",
                "segment": "stable_earner",
                "status": "green",
                "score": 750,
                "type": "upgrade_eligible",
                "urgency": "high",
                "message": "100% on-time installments for 6 consecutive months. Pre-approved for ₹1,00,000 credit limit increase.",
                "action": "Offer Credit Upgrade"
            }
        ]
    }
