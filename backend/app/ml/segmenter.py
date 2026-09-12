"""
Livelihood and Persona Segmentation Engine.

Contextualizes thin-file / alternative credit applicants into their economic livelihood model
(Farmer, Kirana/MSME, Gig Worker, Stressed, Stable Earner). Prevents traditional bureau bias
where seasonal farmers or daily cash-basis vendors are unfairly classified as high-risk.
"""

from typing import Any


def detect_segment(features: dict[str, Any]) -> dict[str, Any]:
    """
    Analyze alternative data features to categorize the borrower into their economic reality.
    
    Parameters:
        features: 28-feature dictionary produced by orchestrator.py / score pipeline
        
    Returns:
        Dictionary containing segment classification, title, livelihood anchor,
        seasonality risk, and underwriter guidelines.
    """
    # Extract key diagnostic features with safe fallbacks
    loc_years = float(features.get("loc_years_at_current", 0))
    is_metro = int(features.get("loc_is_metro", 0))
    telecom_plan = float(features.get("telecom_plan_value", 0))
    telecom_ontime = float(features.get("telecom_ontime_rate", 1.0))
    sim_age = float(features.get("telecom_sim_age_months", 0))
    bank_inflow = float(features.get("bank_avg_monthly_inflow", 0))
    balance_volatility = float(features.get("bank_balance_volatility", 0))
    has_gst = int(features.get("merchant_has_gst", 0))
    merchant_turnover = float(features.get("merchant_monthly_turnover", 0))
    ecom_freq = float(features.get("ecom_order_frequency", 0))
    upi_volume = float(features.get("upi_monthly_volume", 0))

    # 1. Check for Active Distress / Financial Stress First
    # True distress requires severe volatility combined with missed payments or acute short-term tenure
    is_acute_distress = (
        (balance_volatility > 0.70) or
        (balance_volatility > 0.52 and telecom_ontime < 0.75) or
        (telecom_ontime < 0.60 and loc_years < 3)
    )

    if is_acute_distress:
        return {
            "segment": "stressed",
            "title": "Stressed Cashflow / Transitioning Earner",
            "badge_color": "rose",
            "sub_segment": "High Cashflow Volatility",
            "livelihood_anchor": "Requires Cashflow Smoothing / Flexible Moratorium",
            "seasonality_risk": "Critical",
            "icon": "AlertTriangle",
            "characteristics": [
                "High month-to-month balance fluctuations (>55%)",
                "Irregular utility/telecom bill payments",
                "Thin liquid emergency reserves"
            ],
            "underwriting_advice": (
                "Do not reject outright. Assess if stress is temporary due to unexpected medical "
                "or seasonal shocks. Offer restructured micro-credit with flexible weekly repayments "
                "or connect with government emergency interest subventions."
            )
        }

    # 2. Check for MSME / Kirana Store Owner
    if has_gst == 1 or merchant_turnover > 40000 or (upi_volume > 35 and loc_years >= 3):
        return {
            "segment": "msme",
            "title": "Kirana & Micro-Enterprise Merchant",
            "badge_color": "blue",
            "sub_segment": "Daily Cash & UPI Trader",
            "livelihood_anchor": f"Trade Turnover (~₹{int(merchant_turnover or bank_inflow):,}/mo) & Commercial Foothold",
            "seasonality_risk": "Moderate (Pre-Festive Peak)",
            "icon": "Store",
            "characteristics": [
                "Frequent daily UPI inflows from diverse consumer counterparties",
                "Proven commercial stability at current premises",
                "High stock inventory turnover cycles"
            ],
            "underwriting_advice": (
                "Ideal candidate for MUDRA Shishu/Kishore working capital loans or merchant overdrafts. "
                "Evaluate supplier invoice regularity rather than fixed monthly salary slips."
            )
        }

    # 3. Check for Agricultural / Rural Farmer
    if is_metro == 0 and (loc_years >= 12 or (loc_years >= 6 and telecom_plan < 250)):
        return {
            "segment": "farmer",
            "title": "Agricultural Producer / Farmer",
            "badge_color": "emerald",
            "sub_segment": "Kharif & Rabi Seasonal Cultivator",
            "livelihood_anchor": f"Land & Village Residential Stability ({int(loc_years)} years tenure)",
            "seasonality_risk": "High (Harvest-Dependent Inflows)",
            "icon": "Wheat",
            "characteristics": [
                f"Long-term village residential tenure ({int(loc_years)} years on family land)",
                "Low digital footprint compensated by high community stability",
                "Cash inflows concentrated during post-harvest marketing months (Nov-Jan, Apr-May)"
            ],
            "underwriting_advice": (
                "CRITICAL: Do not penalize low mid-season bank balances (July-Oct); these reflect "
                "necessary input purchases (seeds, fertilizers). Structure loan repayments with a 60-90 day "
                "harvest moratorium or bullet repayments aligned to harvest sales."
            )
        }

    # 4. Check for Gig Worker / Urban Transit Earner
    if is_metro == 1 and (ecom_freq > 4 or upi_volume > 20) and loc_years < 8:
        return {
            "segment": "gig_worker",
            "title": "Platform Gig Earner / Urban Transit Worker",
            "badge_color": "amber",
            "sub_segment": "Weekly Payout & Mobility Earner",
            "livelihood_anchor": f"Active Digital Inflows & Telecom Footprint ({int(sim_age)} mo SIM age)",
            "seasonality_risk": "Low (Weekly Steady Payouts)",
            "icon": "Bike",
            "characteristics": [
                "Digital-first mobile payment habits and high app engagement",
                "Weekly or fortnightly recurring payouts from delivery/mobility platforms",
                "Urban rental residency with active telecom history"
            ],
            "underwriting_advice": (
                "Structure repayments on a weekly auto-debit frequency matching platform payout cycles. "
                "Qualifies for two-wheeler financing or small emergency credit lines."
            )
        }

    # 5. Default: Consistent Baseline Earner
    return {
        "segment": "stable_earner",
        "title": "Salaried / Consistent Baseline Earner",
        "badge_color": "slate",
        "sub_segment": "Regular Monthly Earner",
        "livelihood_anchor": f"Consistent Monthly Bank Inflows (~₹{int(bank_inflow):,}/mo)",
        "seasonality_risk": "Low",
        "icon": "UserCheck",
        "characteristics": [
            "Predictable monthly account inflow intervals",
            "Consistently on-time telecom and utility recharges",
            "Stable residential and employment records"
        ],
        "underwriting_advice": (
            "Standard personal credit or consumer durable loan terms apply. "
            "Evaluate debt-to-income ratio (DTI) below 45% for instant automated sanction."
        )
    }
