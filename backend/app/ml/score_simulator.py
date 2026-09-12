"""
Underwriter Loan Restructuring and What-If Simulator.

Enables loan officers and underwriters to model bespoke lending structures for thin-file
and informal borrowers (loan amount, tenure, harvest grace periods/moratoriums, and behavioral improvements)
with real-time EMI affordability and projected default risk delta calculations.
"""

from typing import Any


def calculate_emi(principal: float, annual_rate_pct: float, tenure_months: int) -> float:
    """Standard reducing-balance monthly EMI calculation."""
    if tenure_months <= 0 or principal <= 0:
        return 0.0
    if annual_rate_pct <= 0:
        return round(principal / tenure_months, 2)
    
    monthly_rate = (annual_rate_pct / 100.0) / 12.0
    factor = (1.0 + monthly_rate) ** tenure_months
    emi = (principal * monthly_rate * factor) / (factor - 1.0)
    return round(emi, 2)


def simulate_loan_structure(
    base_score: int,
    features: dict[str, Any],
    loan_amount: float,
    tenure_months: int,
    annual_interest_rate: float = 10.5,
    moratorium_months: int = 0,
    behavioral_improvements: list[str] | None = None
) -> dict[str, Any]:
    """
    Simulate impact of restructured loan terms and behavioral improvements.
    
    Parameters:
        base_score: Current AltGrade score (0-850)
        features: 28-feature dictionary
        loan_amount: Requested or adjusted principal (e.g. 25000, 50000, 100000)
        tenure_months: Repayment duration in months (e.g. 12, 18, 24, 36)
        annual_interest_rate: Annual interest rate in percent
        moratorium_months: Grace period before principal repayments begin (e.g. 2 months for harvest)
        behavioral_improvements: List of planned improvements (e.g. 'auto_debit_bills', 'maintain_buffer')
        
    Returns:
        Structured simulation response with calculated EMI, debt-service ratio,
        projected score change, and underwriting feasibility assessment.
    """
    behavioral_improvements = behavioral_improvements or []
    
    # 1. Calculate Monthly EMI
    effective_tenure = max(1, tenure_months - moratorium_months)
    monthly_emi = calculate_emi(loan_amount, annual_interest_rate, effective_tenure)
    total_repayment = round(monthly_emi * effective_tenure, 2)
    total_interest = round(total_repayment - loan_amount, 2)

    # 2. Compute Affordability Ratio (FOIR - Fixed Obligation to Income Ratio)
    monthly_inflow = float(features.get("bank_avg_monthly_inflow", 25000))
    if monthly_inflow <= 0:
        monthly_inflow = 15000.0  # conservative baseline
        
    affordability_ratio = round((monthly_emi / monthly_inflow) * 100, 1)

    # 3. Assess Affordability Grade
    if affordability_ratio <= 22.0:
        affordability_status = "safe"
        affordability_label = "Optimal & Highly Sustainable (Low Default Risk)"
        affordability_badge = "emerald"
    elif affordability_ratio <= 35.0:
        affordability_status = "manageable"
        affordability_label = "Manageable Cashflow Burden"
        affordability_badge = "sky"
    elif affordability_ratio <= 50.0:
        affordability_status = "caution"
        affordability_label = "Elevated EMI Burden — Monitor Cashflow Timing"
        affordability_badge = "amber"
    else:
        affordability_status = "critical"
        affordability_label = "High Risk — Exceeds RBI 50% Repayment Burden Cap"
        affordability_badge = "rose"

    # 4. Projected Score & Risk Delta Calculations
    score_delta = 0
    projected_improvements: list[dict[str, Any]] = []

    # Tenure smoothing benefit
    if tenure_months >= 24 and affordability_ratio <= 25.0:
        score_delta += 14
        projected_improvements.append({
            "action": "Extended Tenure to 24+ Months",
            "impact_pts": 14,
            "rationale": "Reduces monthly repayment strain, significantly lowering default probability."
        })

    # Harvest moratorium benefit
    if moratorium_months >= 2:
        score_delta += 12
        projected_improvements.append({
            "action": f"{moratorium_months}-Month Seasonal Grace Period",
            "impact_pts": 12,
            "rationale": "Aligns repayment start with crop harvest proceeds, avoiding early distress."
        })

    # Selected behavioral improvements
    if "auto_debit_bills" in behavioral_improvements:
        score_delta += 18
        projected_improvements.append({
            "action": "Enrolled in Utility Auto-Debit Mandate",
            "impact_pts": 18,
            "rationale": "Eliminates late recharge penalties and establishes consistent payment discipline."
        })

    if "maintain_buffer" in behavioral_improvements:
        score_delta += 22
        projected_improvements.append({
            "action": "Maintain Minimum ₹10,000 Balance Reserve",
            "impact_pts": 22,
            "rationale": "Dampens balance volatility index and builds liquid buffer cushion."
        })

    if "pm_kisan_link" in behavioral_improvements:
        score_delta += 15
        projected_improvements.append({
            "action": "Verified PM-Kisan DBT Bank Inflows",
            "impact_pts": 15,
            "rationale": "Validates government direct-benefit-transfer anchor to account."
        })

    projected_score = min(850, base_score + score_delta)

    # 5. Underwriter Recommendation
    if affordability_status in ("safe", "manageable") and projected_score >= 500:
        recommendation = "APPROVE"
        underwriter_verdict = (
            f"Restructured terms are viable. Monthly EMI of ₹{monthly_emi:,.0f} constitutes "
            f"{affordability_ratio}% of monthly inflow. Projected score improves to {projected_score}."
        )
    elif moratorium_months > 0 and affordability_status != "critical":
        recommendation = "APPROVE_WITH_CONDITIONS"
        underwriter_verdict = (
            f"Approve with mandatory {moratorium_months}-month seasonal moratorium and enrollment in "
            "automated digital reminders."
        )
    else:
        recommendation = "REVISE_TERMS"
        underwriter_verdict = (
            f"Current terms generate high burden ({affordability_ratio}% DTI). Recommend increasing tenure "
            f"or capping principal below ₹{int(monthly_inflow * 0.35 * tenure_months):,}."
        )

    return {
        "loan_amount": loan_amount,
        "tenure_months": tenure_months,
        "effective_tenure_months": effective_tenure,
        "annual_interest_rate": annual_interest_rate,
        "moratorium_months": moratorium_months,
        "monthly_emi": monthly_emi,
        "total_interest": total_interest,
        "total_repayment": total_repayment,
        "monthly_inflow": monthly_inflow,
        "affordability_ratio": affordability_ratio,
        "affordability_status": affordability_status,
        "affordability_label": affordability_label,
        "affordability_badge": affordability_badge,
        "base_score": base_score,
        "projected_score": projected_score,
        "score_delta": score_delta,
        "projected_improvements": projected_improvements,
        "recommendation": recommendation,
        "underwriter_verdict": underwriter_verdict,
    }
