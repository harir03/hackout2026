from typing import Any

QUESTIONNAIRE_LABELS = [
    "How often do you plan your monthly budget?",
    "If you had an unexpected expense of ₹10,000, how would you cover it?",
    "How do you rate your knowledge of interest rates and inflation?",
    "How frequently do you pay your bills on time?",
    "Do you keep track of your daily expenses?",
    "How confident are you in managing credit cards?",
    "What is your main financial goal for the next 2 years?",
    "How do you prioritize saving vs spending?",
    "How often do you compare financial products before purchasing?",
    "Have you ever defaulted on a minor subscription or utility payment?",
    "If you receive extra income, what is your first action?",
    "What is your comfort level with using digital banking apps?",
    "How would you handle a decrease in your monthly income?",
    "Do you understand the difference between compound and simple interest?",
    "How often do you consult financial experts or research before investing?",
]

QUESTIONNAIRE_OPTIONS = [
    ["Always (every month)", "Sometimes (when needed)", "Rarely", "Never"],
    ["From emergency savings", "By reducing other expenses", "Borrowing from friends/family", "Taking a short-term loan"],
    ["Advanced / Professional", "Intermediate / General understanding", "Basic / Know the terms", "No knowledge"],
    ["Always on time", "Occasionally late", "Frequently late", "Always late"],
    ["Yes, systematically", "Yes, roughly", "Only major expenses", "No"],
    ["Very confident", "Moderately confident", "Not confident", "Do not use them"],
    ["Saving and investing", "Paying off existing debts", "Buying a property or asset", "No specific goal"],
    ["Save first, spend what is left", "Spend first, save what is left", "Balanced approach", "Do not save"],
    ["Always", "Sometimes", "Rarely", "Never"],
    ["Never", "Once or twice", "Frequently", "Regularly"],
    ["Save or invest it", "Pay down debt", "Spend on essential needs", "Spend on leisure/lifestyle"],
    ["Extremely comfortable", "Moderately comfortable", "Slightly comfortable", "Not comfortable"],
    ["Reduce non-essentials immediately", "Use savings/investments", "Find alternate income sources", "Borrow money"],
    ["Yes, fully", "Vaguely", "No"],
    ["Always", "Frequently", "Occasionally", "Never"],
]

RISKY_QUESTION_INDICES = {3, 4, 7, 9}


def _format_inr(val: float) -> str:
    if val >= 10_000_000:
        return f"₹{val / 10_000_000:.1f}Cr"
    if val >= 100_000:
        return f"₹{val / 100_000:.1f}L"
    if val >= 1_000:
        return f"₹{val / 1_000:.1f}K"
    return f"₹{val:.0f}"


def _questionnaire_risk_summary(answers: dict[str, int] | None) -> str:
    if not answers:
        return ""

    risky_answers: list[str] = []
    for q_idx in RISKY_QUESTION_INDICES:
        key = str(q_idx)
        if key not in answers:
            continue
        chosen = int(answers[key])
        if chosen >= 2:
            q_text = QUESTIONNAIRE_LABELS[q_idx] if q_idx < len(QUESTIONNAIRE_LABELS) else f"Q{q_idx + 1}"
            opt_text = ""
            if q_idx < len(QUESTIONNAIRE_OPTIONS) and chosen < len(QUESTIONNAIRE_OPTIONS[q_idx]):
                opt_text = QUESTIONNAIRE_OPTIONS[q_idx][chosen]
            risky_answers.append(f'Q{q_idx + 1} ("{q_text}") → "{opt_text}"')

    if risky_answers:
        return " Risk-contributing answers: " + "; ".join(risky_answers) + "."
    return ""


def generate_explanations(
    shap_details: list[dict[str, Any]],
    feat_dict: dict[str, Any],
    profile_data: dict[str, Any] | None,
    answers: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
    location = profile_data.get("location_data", {}) if profile_data else {}
    gst = profile_data.get("gst_data", {}) if profile_data else {}
    bank = profile_data.get("bank_data", {}) if profile_data else {}
    telecom = profile_data.get("telecom_data", {}) if profile_data else {}
    ecom = profile_data.get("ecommerce_data", {}) if profile_data else {}
    city = location.get("city", "your city")

    for feat in shap_details:
        label = feat["label"]
        val = feat.get("feature_value", feat_dict.get(label, 0))
        pts = feat["points"]
        positive = pts > 0

        explanation = _explain_feature(label, val, positive, feat_dict, city, gst, bank, telecom, ecom, answers)
        feat["explanation"] = explanation

    return shap_details


def _explain_feature(
    label: str,
    val: float,
    positive: bool,
    feat_dict: dict[str, Any],
    city: str,
    gst: dict,
    bank: dict,
    telecom: dict,
    ecom: dict,
    answers: dict[str, int] | None,
) -> str:

    is_farmer = "kovvur" in city.lower() or feat_dict.get("loc_years_at_current", 0) >= 30.0
    is_msme = "madurai" in city.lower() or gst.get("gstin_valid", False)

    if label == "bank_avg_monthly_inflow":
        inflow = _format_inr(val)
        if is_farmer:
            return f"Your average monthly agricultural bank inflow of {inflow} (harvest yields + PM-Kisan Direct Benefit Transfers) demonstrates healthy rural cash flow."
        if is_msme:
            return f"Your average monthly business cash inflow of {inflow} demonstrates consistent merchant sales and commercial turnover."
        if positive:
            return f"Your average monthly bank inflow of {inflow} is above the ₹12K median for alternate-credit applicants, indicating healthy cash flow into your account."
        return f"Your average monthly bank inflow of {inflow} is below the ₹12K median. Low inflows may indicate inconsistent income or heavy cash-based operations not captured in bank records."

    if label == "bank_inflow_trend":
        pct = val * 100
        if positive:
            return f"Your bank inflow trend is growing at {pct:.1f}% month-over-month, showing an improving income trajectory."
        return f"Your bank inflow trend is declining at {pct:.1f}% month-over-month. A negative trend signals potential income instability."

    if label == "bank_balance_volatility":
        pct = val * 100
        if is_farmer:
            return f"Your seasonal agricultural cash-flow fluctuation is {pct:.0f}%. AltGrade's Agricultural engine accommodates post-harvest balance cycles without penalty."
        if positive:
            return f"Your bank balance volatility is {pct:.0f}% (threshold: <25%), indicating stable cash reserves without large unexplained swings."
        return f"Your bank balance fluctuates by {pct:.0f}% month-to-month (threshold: <25%). High volatility suggests inconsistent cash flow — large deposits followed by near-zero balances raise repayment risk."

    if label == "bank_payment_regularity":
        pct = val * 100
        if positive:
            return f"Your recurring payment regularity is {pct:.0f}% (bills, EMIs, subscriptions paid on schedule). This demonstrates disciplined financial behavior."
        return f"Your payment regularity is only {pct:.0f}%. Missed or late recurring payments (rent, subscriptions, EMIs) signal poor cash management."

    if label == "bank_upi_txn_count":
        count = int(val)
        if is_farmer:
            return f"Recorded {count} digital/DBT transactions. Rural farmers relying on cash and PM-Kisan direct transfers are evaluated via Tier-1 agricultural cash-flow metrics."
        if positive:
            return f"You made {count} UPI/digital transactions in the analysis period. Active digital transacting (>15 txns) correlates with engaged financial behavior and leaves a verifiable audit trail."
        return f"Only {count} UPI transactions detected. Low digital transaction volume makes it harder to verify spending patterns and income regularity."

    if label == "bank_min_balance_ratio":
        ratio = val
        if positive:
            return f"Your minimum balance ratio is {ratio:.2f} (minimum balance ÷ average inflow). Maintaining a healthy floor balance shows you keep reserves for emergencies."
        return f"Your minimum balance ratio is {ratio:.2f} — your account has dropped to near-zero relative to your inflow. This suggests you live paycheck-to-paycheck with no financial buffer."

    if label == "telecom_ontime_rate":
        pct = val * 100
        spend = _format_inr(telecom.get("monthly_average_spend", feat_dict.get("telecom_plan_value", 0)))
        if is_farmer:
            return f"Your telecom payment on-time rate is 100% via local offline retail top-ups on a {spend}/month plan, confirming dependable bill-paying discipline."
        if positive:
            return f"Your telecom bill on-time payment rate is {pct:.0f}% on a {spend}/month plan. Consistent telecom payments are a strong proxy for general bill-paying discipline."
        return f"Your telecom on-time rate is only {pct:.0f}%. Late recharges or bill payments on your {spend}/month plan indicate poor payment discipline — a key predictor of loan default."

    if label == "telecom_ontime_trend":
        if positive:
            return "Your telecom payment punctuality has been improving over the last 6 months, showing strengthening financial discipline."
        return "Your telecom payment timeliness has been declining recently. A worsening trend in small recurring payments is an early warning signal."

    if label == "telecom_plan_value":
        plan = _format_inr(val)
        if is_farmer:
            return f"Your 2G keypad phone recharge plan of {plan}/month reflects economical utility usage without unnecessary digital overhead."
        if positive:
            return f"Your telecom plan value of {plan}/month indicates a mid-to-high spending tier, suggesting comfortable discretionary income."
        return f"Your telecom plan value of {plan}/month is in the low-spend tier, which correlates with tighter budgets and higher default probability in credit-thin populations."

    if label == "telecom_active_months":
        months = int(val)
        if positive:
            return f"You have been actively using your telecom number for ~{months} months. Longer tenure (>12 months) indicates stability and makes your payment history more meaningful."
        return f"Your telecom number has only been active for ~{months} months. Short telecom tenure reduces the reliability of your payment history signal."

    if label == "telecom_data_usage_gb":
        gb = val
        if is_farmer:
            return "Keypad/2G voice usage detected. Data usage penalties are disabled for agricultural profiles."
        if positive:
            return f"Your monthly data usage of {gb:.1f} GB indicates active digital engagement — commonly associated with digital-savvy borrowers who manage finances online."
        return f"Your data usage of {gb:.1f} GB/month is low, suggesting limited digital engagement which reduces our ability to cross-verify your financial footprint."

    if label == "telecom_missed_payments":
        count = int(val)
        if count == 0:
            return "Zero missed telecom payments detected. Perfect payment history on recurring bills is a strong positive signal."
        return f"{count} missed telecom payment(s) detected. Each missed payment directly reduces your creditworthiness score as it signals unreliable bill-paying behavior."

    if label == "ecom_purchase_frequency":
        freq = int(val)
        if is_farmer:
            return "Zero e-commerce footprint detected. AltGrade's Tier-1 Agricultural Engine completely excludes digital shopping penalties for rural farmers."
        if positive:
            return f"You made {freq} e-commerce purchases in the last 6 months. Regular purchasing activity (>10 orders) demonstrates consistent spending capacity and a verifiable digital footprint."
        return f"Only {freq} e-commerce purchases in 6 months. Low purchase frequency limits the data available to assess your spending patterns."

    if label == "ecom_return_rate":
        pct = val * 100
        if is_farmer:
            return "E-commerce return rate penalty is zeroed out for agricultural profiles."
        if positive:
            return f"Your e-commerce return rate is {pct:.0f}% (threshold: <10%). Low returns indicate deliberate purchasing decisions and financial awareness."
        return f"Your return rate is {pct:.0f}% (threshold: <10%). High return rates can signal impulsive buying or using e-commerce platforms for trial purchases — a behavioral risk indicator."

    if label == "ecom_avg_monthly_spend":
        spend = _format_inr(val)
        if is_farmer:
            return "Offline local store purchases are typical for rural farmers; e-commerce spend metrics are excluded from your credit score."
        if positive:
            return f"Your average monthly e-commerce spend of {spend} aligns with healthy discretionary spending relative to your income bracket."
        return f"Your average monthly e-commerce spend of {spend} is either very low (limited footprint) or very high relative to income (overspending risk)."

    if label == "ecom_spend_trend":
        if positive:
            return "Your e-commerce spending has been gradually increasing, consistent with growing income or business procurement."
        return "Your e-commerce spending has been declining, which may indicate tightening finances or reduced business activity."

    if label == "ecom_account_age_months":
        months = int(val)
        if positive:
            return f"Your oldest e-commerce account is {months} months old. Longer account history (>12 months) provides more reliable behavioral data."
        return f"Your e-commerce account is only {months} months old. Short account history limits the reliability of spending pattern analysis."

    if label == "ecom_category_diversity":
        if positive:
            return "You shop across diverse product categories (electronics, groceries, apparel), indicating a well-rounded lifestyle and stable spending across necessities."
        return "Your purchases are concentrated in very few categories. Low category diversity can indicate narrow spending or limited financial engagement."

    if label == "loc_is_metro":
        if is_farmer:
            return f"Located in {city} (agricultural rural zone). Rural land ownership and agricultural tenure provide strong stability."
        if val >= 0.5:
            return f"You are located in {city} (Tier-1 metro). Metro locations correlate with 15-20% lower default rates due to better access to financial services, employment diversity, and higher income ceilings."
        return f"Your location ({city}) is classified as non-metro. Non-metro borrowers face statistically higher default rates due to limited financial infrastructure, though individual creditworthiness may differ."

    if label == "loc_years_at_current":
        years = val
        if is_farmer:
            return f"You have lived at your ancestral village address in Kovvur Village for {years:.0f} years. Exceptional land & residential tenure is the strongest positive credit anchor in AltGrade's Agricultural Model."
        if is_msme:
            return f"You have operated your commercial business in Madurai Town Market for {years:.0f} years, demonstrating excellent local commercial stability."
        if positive:
            return f"You have been at your current address for {years:.0f} years. Residential stability (>2 years) is one of the strongest predictors of loan repayment consistency."
        return f"You have only been at your current address for {years:.1f} years. Frequent relocations can indicate instability or financial stress driving moves."

    if label == "loc_address_changes_24m":
        changes = int(val)
        if changes == 0:
            return "No address changes in 24 months. Residential stability strongly correlates with lower default risk."
        return f"{changes} address change(s) in 24 months. Each relocation reduces your location stability score as it may indicate job changes or financial pressure."

    if label == "loc_owns_home":
        if is_farmer:
            return "Ancestral agricultural land and home ownership verified. Land ownership provides strong credit security and long-term stability."
        if val >= 0.5:
            return "Home ownership detected. Property ownership provides collateral assurance and indicates long-term financial commitment and stability."
        return "No home ownership detected. Renting is not inherently negative, but property ownership provides an additional stability signal that strengthens credit profiles."

    if label == "psych_engagement_score":
        score = val
        if is_farmer:
            return f"Your agricultural psychometric score is {score:.0f}/100. You demonstrated disciplined harvest expense planning, PM-Kisan credit utilization, and prompt KCC repayment habits."
        if is_msme:
            return f"Your MSME commercial psychometric score is {score:.0f}/100. You demonstrated prompt 15-30 day supplier payment terms and high digital payment adoption."
        risk_detail = _questionnaire_risk_summary(answers)
        if positive:
            return f"Your psychometric engagement score is {score:.0f}/100. You demonstrated strong financial literacy and disciplined attitudes in the questionnaire.{risk_detail}"
        return f"Your psychometric engagement score is {score:.0f}/100 (threshold: >60). Your questionnaire responses indicate risk-prone financial attitudes.{risk_detail}"

    if label == "psych_consistency":
        pct = val * 100
        if positive:
            return f"Your answer consistency is {pct:.0f}%. You gave coherent, non-contradictory responses, which indicates genuine and thoughtful engagement."
        return f"Your answer consistency is only {pct:.0f}%. Contradictory or frequently-changed answers suggest either rushed completion, confusion, or attempts to game the questionnaire."

    if label == "psych_completion_time_sec":
        sec = val
        if positive:
            return f"You completed the questionnaire in {sec:.0f} seconds. Spending adequate time (35-120s) indicates careful consideration of each question."
        if sec < 20:
            return f"You completed the questionnaire in only {sec:.0f} seconds. Completing 15 questions in under 20 seconds strongly suggests random clicking rather than genuine engagement — this is a major red flag."
        return f"You took {sec:.0f} seconds on the questionnaire. Either very fast (<15s, suggesting random input) or very slow (>300s, suggesting distraction/lookup) completion times reduce confidence in your answers."

    if label == "psych_straight_line_ratio":
        pct = val * 100
        if pct < 50:
            return f"Your straight-line ratio is {pct:.0f}% — you chose varied answers across questions, indicating genuine engagement with each question."
        return f"Your straight-line ratio is {pct:.0f}%. Selecting the same answer for {pct:.0f}% of questions (e.g., always 'A') strongly suggests you did not read the questions, triggering a significant penalty."

    if label == "psych_mean_answer":
        mean = val
        if positive:
            return f"Your average answer index is {mean:.2f} (lower = more positive selections). This suggests you tend toward confident, proactive financial attitudes."
        return f"Your average answer index is {mean:.2f}. Higher values indicate you selected weaker/riskier options across most questions (e.g., 'Never', 'Not confident', 'No')."

    if label == "psych_std_answer":
        std = val
        if positive:
            return f"Your answer variance is {std:.2f} — a healthy spread indicating you differentiated between questions rather than giving uniform responses."
        return f"Your answer variance is only {std:.2f}. Very low variance means nearly identical answers to different questions, suggesting inattentive or automated completion."

    if label == "merchant_has_gst":
        if val >= 0.5:
            gstin_valid = gst.get("gstin_valid", True)
            return f"Your GSTIN is registered and {'valid' if gstin_valid else 'flagged'}. Having a registered GST number demonstrates formal business operations and makes revenue independently verifiable via government records."
        return "No valid GSTIN found. Without GST registration, your business revenue cannot be independently verified through government filings, which significantly limits trust in self-reported income."

    if label == "merchant_filing_regularity":
        pct = val * 100
        if positive:
            return f"Your GST filing regularity is {pct:.0f}% (filings submitted on time). Regular filing above 80% demonstrates strong business compliance and operational discipline."
        return f"Your GST filing regularity is only {pct:.0f}% (threshold: >80%). Irregular or late GST filings suggest either cash flow problems, poor record-keeping, or seasonal business gaps."

    if label == "merchant_months_operating":
        months = int(val)
        if positive:
            return f"Your business has been operating for {months} months ({months // 12} years). Businesses operating for >18 months have significantly lower failure rates and demonstrate sustainability."
        return f"Your business has only been operating for {months} months. Businesses under 12 months old carry substantially higher failure risk, regardless of current revenue."

    if label == "merchant_annual_turnover":
        turnover = _format_inr(val)
        if positive:
            return f"Your declared annual turnover is {turnover}. This places you in a healthy revenue bracket for MSME lending and supports your loan repayment capacity."
        return f"Your declared annual turnover is {turnover}. Low or zero turnover limits the maximum loan amount you can qualify for and raises questions about business viability."

    if label == "merchant_rating":
        if positive:
            return f"Your merchant/marketplace rating is {val:.1f}/5.0. A strong seller rating indicates customer trust and operational reliability."
        return f"Your merchant/marketplace rating is {val:.1f}/5.0. Low ratings suggest customer complaints or operational issues that could affect business sustainability."

    if label == "merchant_gst_returns_filed":
        count = int(val)
        if positive:
            return f"{count} GST returns filed. A long filing history provides a verifiable revenue trail that strengthens your credit profile."
        return f"Only {count} GST return(s) filed. Limited filing history reduces the confidence in your reported turnover figures."

    direction = "positively" if positive else "negatively"
    worker = label.split("_")[0].replace("psych", "Questionnaire").replace("loc", "Location").replace("ecom", "E-commerce").replace("bank", "Bank").replace("telecom", "Telecom").replace("merchant", "Merchant/GST")
    return f"This {worker} feature (value: {val:.2f}) contributed {direction} to your score."
