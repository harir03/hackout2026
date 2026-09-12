"""
Financial Health and Early Warning Monitor.

Calculates real-time health signals (Green/Amber/Red) from alternate transaction streams.
Generates empathetic support interventions and early warning indicators rather than
punitive rejections.
"""

from typing import Any


def check_health(features: dict[str, Any], segment: str = "stable_earner") -> dict[str, Any]:
    """
    Evaluate multidimensional financial health pulse and generate proactive interventions.
    
    Parameters:
        features: 28-feature dictionary from alternative data workers
        segment: Detected persona ('farmer', 'msme', 'gig_worker', 'stressed', 'stable_earner')
        
    Returns:
        Dictionary with overall status (green/amber/red), score, diagnostic signals,
        and proactive officer intervention recommendations.
    """
    signals: list[dict[str, Any]] = []

    # 1. Cashflow Volatility & Stability Signal
    volatility = float(features.get("bank_balance_volatility", 0.3))
    inflow = float(features.get("bank_avg_monthly_inflow", 25000))
    
    # Farmers naturally have seasonal volatility; calibrate threshold
    volatility_threshold = 0.65 if segment == "farmer" else 0.45

    if volatility <= 0.25:
        signals.append({
            "dimension": "Cash Flow Stability",
            "status": "green",
            "label": "Stable & Predictable",
            "detail": f"Low balance volatility ({int(volatility*100)}%). Steady monthly inflows of ~₹{int(inflow):,}."
        })
    elif volatility <= volatility_threshold:
        status_label = "Seasonal Fluctuation" if segment == "farmer" else "Moderate Swings"
        signals.append({
            "dimension": "Cash Flow Stability",
            "status": "amber",
            "label": status_label,
            "detail": f"Monthly balance volatility is {int(volatility*100)}%. Typical for {segment} cash cycles."
        })
    else:
        signals.append({
            "dimension": "Cash Flow Stability",
            "status": "red",
            "label": "High Volatility Warning",
            "detail": f"High balance swings ({int(volatility*100)}%). Inflows fluctuate substantially month-to-month."
        })

    # 2. Payment & Bill Discipline Signal
    ontime_rate = float(features.get("telecom_ontime_rate", 0.85))
    if ontime_rate >= 0.88:
        signals.append({
            "dimension": "Bill Payment Discipline",
            "status": "green",
            "label": "High Punctuality",
            "detail": f"Consistently pays utility and telecom bills on time ({int(ontime_rate*100)}% on-time track record)."
        })
    elif ontime_rate >= 0.70:
        signals.append({
            "dimension": "Bill Payment Discipline",
            "status": "amber",
            "label": "Occasional Latency",
            "detail": f"Bill payment punctuality is {int(ontime_rate*100)}%. Some bills settled after due date."
        })
    else:
        signals.append({
            "dimension": "Bill Payment Discipline",
            "status": "red",
            "label": "Overdue Payment Risk",
            "detail": f"Substantial late payment frequency ({int((1-ontime_rate)*100)}% of recharges or bills delayed)."
        })

    # 3. Liquidity & Emergency Buffer Signal
    buffer_ratio = float(features.get("bank_min_balance_ratio", 0.15))
    if buffer_ratio >= 0.20:
        signals.append({
            "dimension": "Liquidity Buffer",
            "status": "green",
            "label": "Healthy Safety Cushion",
            "detail": f"Maintains a resilient minimum reserve balance ({int(buffer_ratio*100)}% of average monthly inflow)."
        })
    elif buffer_ratio >= 0.08:
        signals.append({
            "dimension": "Liquidity Buffer",
            "status": "amber",
            "label": "Moderate Buffer",
            "detail": f"Emergency liquidity buffer is modest ({int(buffer_ratio*100)}%). Adequate for short-term needs."
        })
    else:
        signals.append({
            "dimension": "Liquidity Buffer",
            "status": "red",
            "label": "Thin Emergency Buffer",
            "detail": f"Account frequently approaches zero balance minimums ({int(buffer_ratio*100)}% buffer ratio)."
        })

    # Overall Health Determination (Empathetic Aggregation)
    status_counts = {"red": 0, "amber": 0, "green": 0}
    for s in signals:
        status_counts[s["status"]] += 1

    if status_counts["red"] >= 2:
        overall = "red"
        headline = "Stressed Financial Pulse — Proactive Assistance Recommended"
        health_score = 42
    elif status_counts["red"] == 1 or status_counts["amber"] >= 2:
        overall = "amber"
        headline = "Watchlist — Manageable Cashflow Inconsistency"
        health_score = 68
    else:
        overall = "green"
        headline = "Healthy & Resilient Financial Baseline"
        health_score = 92

    # Formulate Empathetic Interventions (Never punitive!)
    interventions: list[str] = []
    if overall == "red":
        interventions = [
            "Proactively schedule a field visit with local Business Correspondent to discuss cashflow timing",
            "Offer a 60-day repayment restructuring or grace period rather than default penalty",
            "Assess eligibility for PM-SVANidhi or state interest subvention emergency working capital"
        ]
    elif overall == "amber":
        if segment == "farmer":
            interventions = [
                "Align upcoming installment dates with harvest mandi sales (Nov/May)",
                "Offer PM Fasal Bima Yojana crop insurance enrollment to protect against monsoon risk"
            ]
        else:
            interventions = [
                "Enable SMS/WhatsApp auto-debit reminder alerts 3 days prior to utility due dates",
                "Suggest building a ₹5,000 micro-emergency fund via recurring auto-save"
            ]
    else:
        interventions = [
            "Eligible for preferred interest rate reduction (-0.75%) upon 6 months of on-time installments",
            "Candidate for pre-approved credit line limit expansion"
        ]

    return {
        "status": overall,
        "score": health_score,
        "headline": headline,
        "signals": signals,
        "interventions": interventions,
        "proactive_alert": overall in ("red", "amber")
    }
