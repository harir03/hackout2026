"""
Financial Stress Monitoring Engine
Detects salary delays, low savings, medical emergencies, and EMI default risk.
Each trigger includes severity_score, confidence_score, and AI-generated summary.
"""

from __future__ import annotations

import datetime
from typing import Any


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


def _detect_low_savings(features: dict[str, Any], segment: str) -> dict | None:
    """Detect when monthly savings are dangerously low relative to income."""
    inflow = float(features.get("bank_avg_monthly_inflow", 0))
    volatility = float(features.get("bank_balance_volatility", 0))
    min_balance_ratio = float(features.get("bank_min_balance_ratio", 0))

    if inflow <= 0:
        return None

    estimated_savings_ratio = min_balance_ratio
    estimated_monthly_savings = inflow * estimated_savings_ratio

    critical_threshold = 1000 if segment == "farmer" else 2000
    warning_threshold = 3000 if segment == "farmer" else 5000

    if estimated_monthly_savings > warning_threshold:
        return None

    if estimated_monthly_savings < critical_threshold:
        severity = _clamp(85 + (critical_threshold - estimated_monthly_savings) / critical_threshold * 15)
    else:
        severity = _clamp(40 + (warning_threshold - estimated_monthly_savings) / warning_threshold * 40)

    confidence = _clamp(60 + (1 - volatility) * 30)
    if min_balance_ratio < 0.05:
        confidence = _clamp(confidence + 15)

    savings_str = f"₹{estimated_monthly_savings:,.0f}"
    inflow_str = f"₹{inflow:,.0f}"

    return {
        "trigger_type": "low_savings",
        "severity_score": round(severity),
        "confidence_score": round(confidence),
        "ai_summary": (
            f"Monthly savings estimated at {savings_str} against income of {inflow_str}/month "
            f"(savings ratio: {estimated_savings_ratio * 100:.0f}%). "
            f"Balance volatility is {volatility * 100:.0f}%, indicating irregular cash flow. "
            f"{'This is critically low — the user may not be able to cover unexpected expenses or EMI payments.' if severity > 75 else 'Savings are below healthy levels and may impact repayment capacity during lean months.'}"
        ),
        "recommended_action": (
            "Offer a micro-savings plan linked to salary credit. Consider restructuring existing EMIs with a moratorium period."
            if severity > 75
            else "Suggest a recurring deposit auto-sweep to build emergency buffer. Monitor for next 30 days."
        ),
        "empathetic_message": (
            f"We noticed your savings have been lower than usual recently. We understand that managing finances "
            f"can be challenging. Our team is here to help — we can explore options like adjusting your payment "
            f"schedule or connecting you with savings programs that match your income pattern. Would you like us to call you?"
        ),
    }


def _detect_salary_delay(features: dict[str, Any], segment: str) -> dict | None:
    """Detect when salary/income credit appears delayed or missing."""
    inflow = float(features.get("bank_avg_monthly_inflow", 0))
    payment_regularity = float(features.get("bank_payment_regularity", 1.0))
    volatility = float(features.get("bank_balance_volatility", 0))

    if segment == "farmer":
        if volatility > 0.55 and payment_regularity < 0.5:
            severity = _clamp(55 + (0.55 - payment_regularity) * 80)
            confidence = _clamp(45 + volatility * 30)
            return {
                "trigger_type": "salary_delay",
                "severity_score": round(severity),
                "confidence_score": round(confidence),
                "ai_summary": (
                    f"Agricultural income pattern shows extended gap between harvests. "
                    f"Payment regularity is at {payment_regularity * 100:.0f}% with "
                    f"balance swings of {volatility * 100:.0f}%. This suggests the farmer may be "
                    f"in a non-harvest period with limited cash reserves."
                ),
                "recommended_action": (
                    "Activate harvest-aligned moratorium. Contact the borrower to verify crop cycle timing "
                    "and offer PMFBY insurance enrollment if not already covered."
                ),
                "empathetic_message": (
                    f"We understand that farming income follows seasonal patterns. If you're currently between "
                    f"harvests, we can adjust your payment schedule to align with your crop cycle. "
                    f"Our agricultural support team can also help you explore insurance options. Shall we arrange a call?"
                ),
            }
        return None

    if payment_regularity < 0.65 and inflow > 10000:
        severity = _clamp(60 + (0.65 - payment_regularity) * 120)
        confidence = _clamp(55 + (1 - payment_regularity) * 40)
        days_estimate = round((1 - payment_regularity) * 45)

        return {
            "trigger_type": "salary_delay",
            "severity_score": round(severity),
            "confidence_score": round(confidence),
            "ai_summary": (
                f"Income credit regularity dropped to {payment_regularity * 100:.0f}%. "
                f"Estimated salary delay of ~{days_estimate} days based on payment pattern analysis. "
                f"Monthly inflow of ₹{inflow:,.0f} suggests active employment, but irregular credits "
                f"may indicate employer cash flow issues or job change."
            ),
            "recommended_action": (
                "Proactive call to check employment status. If salary delay is temporary, offer 15-day EMI grace. "
                "If employment changed, reassess credit capacity."
            ),
            "empathetic_message": (
                f"We noticed a change in your income pattern. If your salary has been delayed or if you've "
                f"recently changed jobs, we'd like to help you stay on track. We can offer flexible payment "
                f"options while things settle. Would a quick call with our support team help?"
            ),
        }

    return None


def _detect_medical_emergency(features: dict[str, Any], segment: str) -> dict | None:
    """Detect potential medical emergency from sudden balance drops."""
    volatility = float(features.get("bank_balance_volatility", 0))
    min_balance_ratio = float(features.get("bank_min_balance_ratio", 0))
    inflow = float(features.get("bank_avg_monthly_inflow", 0))

    if volatility > 0.5 and min_balance_ratio < 0.08 and inflow > 8000:
        severity = _clamp(70 + (0.5 - min_balance_ratio) * 60)
        confidence = _clamp(35 + volatility * 30)

        return {
            "trigger_type": "medical_emergency",
            "severity_score": round(severity),
            "confidence_score": round(confidence),
            "ai_summary": (
                f"Unusual balance drain detected — minimum balance dropped to "
                f"{min_balance_ratio * 100:.1f}% of average with {volatility * 100:.0f}% volatility. "
                f"Pattern is consistent with large unplanned expenditure (medical, accident, or family emergency). "
                f"Confidence is moderate as this is inferred from balance patterns, not transaction categories."
            ),
            "recommended_action": (
                "Immediate empathetic outreach. Offer EMI holiday (1-3 months) and connect with "
                "Ayushman Bharat or state health insurance if applicable. Do NOT escalate to collections."
            ),
            "empathetic_message": (
                f"We understand that unexpected situations can impact your finances. If you or your family "
                f"is dealing with a medical or personal emergency, please know that we're here to support you. "
                f"We can pause your payments temporarily and help you access government health schemes. "
                f"Your wellbeing comes first — please let us know how we can help."
            ),
        }

    return None


def _detect_emi_default_risk(features: dict[str, Any], segment: str) -> dict | None:
    """Detect high EMI default risk from debt burden signals."""
    inflow = float(features.get("bank_avg_monthly_inflow", 0))
    volatility = float(features.get("bank_balance_volatility", 0))
    payment_regularity = float(features.get("bank_payment_regularity", 1.0))
    telecom_missed = float(features.get("telecom_missed_payments", 0))

    if inflow <= 0:
        return None

    risk_signal = 0.0
    risk_signal += (1 - payment_regularity) * 40
    risk_signal += min(telecom_missed, 5) * 8
    risk_signal += max(0, volatility - 0.3) * 40

    if risk_signal < 35:
        return None

    severity = _clamp(risk_signal)
    confidence = _clamp(50 + risk_signal * 0.4)

    return {
        "trigger_type": "emi_default_risk",
        "severity_score": round(severity),
        "confidence_score": round(confidence),
        "ai_summary": (
            f"Multiple financial stress indicators detected: "
            f"payment regularity at {payment_regularity * 100:.0f}%, "
            f"{int(telecom_missed)} missed telecom payments, "
            f"balance volatility at {volatility * 100:.0f}%. "
            f"Combined risk score of {risk_signal:.0f}/100 suggests elevated probability of "
            f"EMI default in the next 30-60 days."
        ),
        "recommended_action": (
            "Schedule proactive restructuring call. Consider tenure extension to reduce EMI burden. "
            "If risk score > 70, escalate to senior underwriter for loan modification review."
        ),
        "empathetic_message": (
            f"We've noticed some changes in your payment patterns. Life can be unpredictable, and we want "
            f"to make sure your repayment plan works for your current situation. Our team can explore options "
            f"like extending your tenure or adjusting your EMI amount. Would you prefer a call or a message?"
        ),
    }


def analyze_stress(
    user_id: str,
    features: dict[str, Any],
    segment: str = "general",
    score: int = 650,
) -> list[dict]:
    """
    Run all stress detection modules and return a list of triggered alerts.
    Each alert includes severity_score, confidence_score, ai_summary,
    recommended_action, and empathetic_message.
    """
    detectors = [
        _detect_low_savings,
        _detect_salary_delay,
        _detect_medical_emergency,
        _detect_emi_default_risk,
    ]

    triggers: list[dict] = []
    for detector in detectors:
        result = detector(features, segment)
        if result is not None:
            result["user_id"] = user_id
            result["detected_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            result["user_score"] = score
            triggers.append(result)

    triggers.sort(key=lambda t: t["severity_score"], reverse=True)
    return triggers
