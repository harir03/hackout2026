from app.models.schemas import ScoreResponse, ShapFeature, SignalConflict

FARMER_SHAP = [
    {"worker": "Location", "label": "loc_years_at_current", "points": 42.5, "direction": "positive", "feature_value": 35.0,
     "explanation": "You have lived at your ancestral village address in Kovvur Village for 35 years. Exceptional land & residential tenure is the strongest positive credit anchor in AltGrade's Agricultural Model."},
    {"worker": "Location", "label": "loc_owns_home", "points": 28.3, "direction": "positive", "feature_value": 1.0,
     "explanation": "Ancestral agricultural land and home ownership verified. Land ownership provides strong credit security and long-term stability."},
    {"worker": "Bank/UPI", "label": "bank_avg_monthly_inflow", "points": 22.1, "direction": "positive", "feature_value": 18000.0,
     "explanation": "Your average monthly agricultural bank inflow of ₹18.0K (harvest yields + PM-Kisan Direct Benefit Transfers) demonstrates healthy rural cash flow."},
    {"worker": "Telecom", "label": "telecom_ontime_rate", "points": 18.7, "direction": "positive", "feature_value": 1.0,
     "explanation": "Your telecom payment on-time rate is 100% via local offline retail top-ups on a ₹149/month plan, confirming dependable bill-paying discipline."},
    {"worker": "Bank/UPI", "label": "bank_payment_regularity", "points": 16.4, "direction": "positive", "feature_value": 0.95,
     "explanation": "Your recurring payment regularity is 95% (bills, EMIs, subscriptions paid on schedule). This demonstrates disciplined financial behavior."},
    {"worker": "Questionnaire", "label": "psych_engagement_score", "points": 14.2, "direction": "positive", "feature_value": 85.0,
     "explanation": "Your agricultural psychometric score is 85/100. You demonstrated disciplined harvest expense planning, PM-Kisan credit utilization, and prompt KCC repayment habits."},
    {"worker": "Bank/UPI", "label": "bank_upi_txn_count", "points": 11.8, "direction": "positive", "feature_value": 8.0,
     "explanation": "Recorded 8 digital/DBT transactions. Rural farmers relying on cash and PM-Kisan direct transfers are evaluated via Tier-1 agricultural cash-flow metrics."},
    {"worker": "Location", "label": "loc_address_changes_24m", "points": 10.5, "direction": "positive", "feature_value": 0.0,
     "explanation": "No address changes in 24 months. Residential stability strongly correlates with lower default risk."},
    {"worker": "Bank/UPI", "label": "bank_balance_volatility", "points": 8.6, "direction": "positive", "feature_value": 0.22,
     "explanation": "Your seasonal agricultural cash-flow fluctuation is 22%. AltGrade's Agricultural engine accommodates post-harvest balance cycles without penalty."},
    {"worker": "Telecom", "label": "telecom_plan_value", "points": 6.3, "direction": "positive", "feature_value": 149.0,
     "explanation": "Your 2G keypad phone recharge plan of ₹149/month reflects economical utility usage without unnecessary digital overhead."},
    {"worker": "Bank/UPI", "label": "bank_inflow_trend", "points": 4.1, "direction": "positive", "feature_value": 0.03,
     "explanation": "Your bank inflow trend is growing at 3.0% month-over-month, showing an improving income trajectory."},
    {"worker": "Questionnaire", "label": "psych_consistency", "points": 3.8, "direction": "positive", "feature_value": 0.92,
     "explanation": "Your answer consistency is 92%. You gave coherent, non-contradictory responses, which indicates genuine and thoughtful engagement."},
    {"worker": "Location", "label": "loc_is_metro", "points": -5.2, "direction": "negative", "feature_value": 0.0,
     "explanation": "Located in Kovvur Village (agricultural rural zone). Rural land ownership and agricultural tenure provide strong stability."},
    {"worker": "Telecom", "label": "telecom_data_usage_gb", "points": -3.1, "direction": "negative", "feature_value": 0.2,
     "explanation": "Keypad/2G voice usage detected. Data usage penalties are disabled for agricultural profiles."},
    {"worker": "Bank/UPI", "label": "bank_min_balance_ratio", "points": 5.9, "direction": "positive", "feature_value": 0.35,
     "explanation": "Your minimum balance ratio is 0.35 (minimum balance ÷ average inflow). Maintaining a healthy floor balance shows you keep reserves for emergencies."},
]

FARMER_CONFLICTS = [
    {"positive_worker": "Location", "positive_net_points": 76.1, "negative_worker": "Telecom",
     "negative_net_points": -3.1, "combined_magnitude": 79.2,
     "description": "Location (+76.1 pts) has mixed signals with Telecom (net +21.9, but -3.1 pts in negative features)"},
]

MSME_SHAP = [
    {"worker": "Merchant/GST", "label": "merchant_has_gst", "points": 32.4, "direction": "positive", "feature_value": 1.0,
     "explanation": "Your GSTIN is registered and valid. Having a registered GST number demonstrates formal business operations and makes revenue independently verifiable via government records."},
    {"worker": "Merchant/GST", "label": "merchant_months_operating", "points": 24.8, "direction": "positive", "feature_value": 24.0,
     "explanation": "Your business has been operating for 24 months (2 years). Businesses operating for >18 months have significantly lower failure rates and demonstrate sustainability."},
    {"worker": "Bank/UPI", "label": "bank_avg_monthly_inflow", "points": 18.3, "direction": "positive", "feature_value": 15000.0,
     "explanation": "Your average monthly business cash inflow of ₹15.0K demonstrates consistent merchant sales and commercial turnover."},
    {"worker": "Merchant/GST", "label": "merchant_filing_regularity", "points": 14.6, "direction": "positive", "feature_value": 0.78,
     "explanation": "Your GST filing regularity is 78% (filings submitted on time). Regular filing above 80% demonstrates strong business compliance and operational discipline."},
    {"worker": "Location", "label": "loc_years_at_current", "points": 12.9, "direction": "positive", "feature_value": 8.0,
     "explanation": "You have operated your commercial business in Madurai Town Market for 8 years, demonstrating excellent local commercial stability."},
    {"worker": "Questionnaire", "label": "psych_engagement_score", "points": 11.2, "direction": "positive", "feature_value": 65.0,
     "explanation": "Your MSME commercial psychometric score is 65/100. You demonstrated prompt 15-30 day supplier payment terms and high digital payment adoption."},
    {"worker": "Telecom", "label": "telecom_ontime_rate", "points": 10.5, "direction": "positive", "feature_value": 0.90,
     "explanation": "Your telecom bill on-time payment rate is 90% on a ₹399/month plan. Consistent telecom payments are a strong proxy for general bill-paying discipline."},
    {"worker": "Bank/UPI", "label": "bank_payment_regularity", "points": 8.7, "direction": "positive", "feature_value": 0.85,
     "explanation": "Your recurring payment regularity is 85% (bills, EMIs, subscriptions paid on schedule). This demonstrates disciplined financial behavior."},
    {"worker": "Merchant/GST", "label": "merchant_annual_turnover", "points": 7.4, "direction": "positive", "feature_value": 1200000.0,
     "explanation": "Your declared annual turnover is ₹12.0L. This places you in a healthy revenue bracket for MSME lending and supports your loan repayment capacity."},
    {"worker": "E-commerce", "label": "ecom_purchase_frequency", "points": 5.1, "direction": "positive", "feature_value": 8.0,
     "explanation": "You made 8 e-commerce purchases in the last 6 months. Regular purchasing activity demonstrates consistent spending capacity and a verifiable digital footprint."},
    {"worker": "Bank/UPI", "label": "bank_balance_volatility", "points": -8.3, "direction": "negative", "feature_value": 0.32,
     "explanation": "Your bank balance fluctuates by 32% month-to-month (threshold: <25%). High volatility suggests inconsistent cash flow — large deposits followed by near-zero balances raise repayment risk."},
    {"worker": "Bank/UPI", "label": "bank_upi_txn_count", "points": 6.2, "direction": "positive", "feature_value": 35.0,
     "explanation": "You made 35 UPI/digital transactions in the analysis period. Active digital transacting (>15 txns) correlates with engaged financial behavior and leaves a verifiable audit trail."},
    {"worker": "Merchant/GST", "label": "merchant_gst_returns_filed", "points": -4.6, "direction": "negative", "feature_value": 8.0,
     "explanation": "8 GST returns filed. A long filing history provides a verifiable revenue trail that strengthens your credit profile."},
    {"worker": "Location", "label": "loc_is_metro", "points": -3.2, "direction": "negative", "feature_value": 0.0,
     "explanation": "Your location (Madurai) is classified as non-metro. Non-metro borrowers face statistically higher default rates due to limited financial infrastructure, though individual creditworthiness may differ."},
    {"worker": "Questionnaire", "label": "psych_consistency", "points": 4.8, "direction": "positive", "feature_value": 0.82,
     "explanation": "Your answer consistency is 82%. You gave coherent, non-contradictory responses, which indicates genuine and thoughtful engagement."},
]

MSME_CONFLICTS = [
    {"positive_worker": "Merchant/GST", "positive_net_points": 74.6, "negative_worker": "Bank/UPI",
     "negative_net_points": -8.3, "combined_magnitude": 82.9,
     "description": "Merchant/GST (+74.6 pts) contradicts Bank/UPI (-8.3 pts in volatile balance)"},
]

HARI_SHAP = [
    {"worker": "Bank/UPI", "label": "bank_avg_monthly_inflow", "points": 38.2, "direction": "positive", "feature_value": 45000.0,
     "explanation": "Your average monthly bank inflow of ₹45.0K is above the ₹12K median for alternate-credit applicants, indicating healthy cash flow into your account."},
    {"worker": "Location", "label": "loc_years_at_current", "points": 28.4, "direction": "positive", "feature_value": 6.0,
     "explanation": "You have been at your current address for 6 years. Residential stability (>2 years) is one of the strongest predictors of loan repayment consistency."},
    {"worker": "Telecom", "label": "telecom_ontime_rate", "points": 22.1, "direction": "positive", "feature_value": 0.98,
     "explanation": "Your telecom bill on-time payment rate is 98% on a ₹799/month plan. Consistent telecom payments are a strong proxy for general bill-paying discipline."},
    {"worker": "E-commerce", "label": "ecom_purchase_frequency", "points": 18.6, "direction": "positive", "feature_value": 24.0,
     "explanation": "You made 24 e-commerce purchases in the last 6 months. Regular purchasing activity (>10 orders) demonstrates consistent spending capacity and a verifiable digital footprint."},
    {"worker": "Questionnaire", "label": "psych_engagement_score", "points": 16.3, "direction": "positive", "feature_value": 78.0,
     "explanation": "Your psychometric engagement score is 78/100. You demonstrated strong financial literacy and disciplined attitudes in the questionnaire."},
    {"worker": "Merchant/GST", "label": "merchant_has_gst", "points": 14.8, "direction": "positive", "feature_value": 1.0,
     "explanation": "Your GSTIN is registered and valid. Having a registered GST number demonstrates formal business operations and makes revenue independently verifiable via government records."},
    {"worker": "Bank/UPI", "label": "bank_payment_regularity", "points": 12.5, "direction": "positive", "feature_value": 0.96,
     "explanation": "Your recurring payment regularity is 96% (bills, EMIs, subscriptions paid on schedule). This demonstrates disciplined financial behavior."},
    {"worker": "Location", "label": "loc_is_metro", "points": 10.2, "direction": "positive", "feature_value": 1.0,
     "explanation": "You are located in Bengaluru (Tier-1 metro). Metro locations correlate with 15-20% lower default rates due to better access to financial services, employment diversity, and higher income ceilings."},
    {"worker": "Merchant/GST", "label": "merchant_filing_regularity", "points": 8.9, "direction": "positive", "feature_value": 0.95,
     "explanation": "Your GST filing regularity is 95% (filings submitted on time). Regular filing above 80% demonstrates strong business compliance and operational discipline."},
    {"worker": "Bank/UPI", "label": "bank_upi_txn_count", "points": 7.6, "direction": "positive", "feature_value": 48.0,
     "explanation": "You made 48 UPI/digital transactions in the analysis period. Active digital transacting (>15 txns) correlates with engaged financial behavior and leaves a verifiable audit trail."},
    {"worker": "E-commerce", "label": "ecom_return_rate", "points": 5.4, "direction": "positive", "feature_value": 0.04,
     "explanation": "Your e-commerce return rate is 4% (threshold: <10%). Low returns indicate deliberate purchasing decisions and financial awareness."},
    {"worker": "Location", "label": "loc_address_changes_24m", "points": 4.8, "direction": "positive", "feature_value": 0.0,
     "explanation": "No address changes in 24 months. Residential stability strongly correlates with lower default risk."},
    {"worker": "Questionnaire", "label": "psych_consistency", "points": 3.9, "direction": "positive", "feature_value": 0.94,
     "explanation": "Your answer consistency is 94%. You gave coherent, non-contradictory responses, which indicates genuine and thoughtful engagement."},
    {"worker": "Telecom", "label": "telecom_plan_value", "points": 6.1, "direction": "positive", "feature_value": 799.0,
     "explanation": "Your telecom plan value of ₹799/month indicates a mid-to-high spending tier, suggesting comfortable discretionary income."},
]

HARI_CONFLICTS = []


def get_static_response(user_id: str, consent_id: str | None = None) -> ScoreResponse | None:
    email_lower = user_id.lower()

    if email_lower in ("testhari@altgrade.in", "testhari@altgrade", "hari@altgrade.in", "hari"):
        return ScoreResponse(
            user_id=user_id, score=750, risk_band="Excellent", tier="Tier 2 (Full)",
            model_version="blend-calibrated",
            shap_details=[ShapFeature(**f) for f in HARI_SHAP],
            signal_conflicts=[SignalConflict(**c) for c in HARI_CONFLICTS],
            hard_caps_applied=[], tier1_reweight=None,
            has_conflicts=False, has_hard_cap=False,
            consent_id=consent_id, ecom_source="simulated",
        )

    if email_lower in ("farmer@altgrade.in", "farmer"):
        return ScoreResponse(
            user_id=user_id, score=710, risk_band="Excellent", tier="Tier 1 (Zero-history)",
            model_version="blend-calibrated",
            shap_details=[ShapFeature(**f) for f in FARMER_SHAP],
            signal_conflicts=[SignalConflict(**c) for c in FARMER_CONFLICTS],
            hard_caps_applied=[], tier1_reweight=None,
            has_conflicts=True, has_hard_cap=False,
            consent_id=consent_id, ecom_source="simulated",
        )

    if email_lower in ("msme@altgrade.in", "msme"):
        return ScoreResponse(
            user_id=user_id, score=610, risk_band="Fair", tier="Tier 2 (Full)",
            model_version="blend-calibrated",
            shap_details=[ShapFeature(**f) for f in MSME_SHAP],
            signal_conflicts=[SignalConflict(**c) for c in MSME_CONFLICTS],
            hard_caps_applied=[], tier1_reweight=None,
            has_conflicts=True, has_hard_cap=False,
            consent_id=consent_id, ecom_source="simulated",
        )

    return None
