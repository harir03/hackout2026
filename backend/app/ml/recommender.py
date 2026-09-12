"""
Government Scheme and Subsidized Product Recommendation Engine.

Matches thin-file applicants and their detected livelihood persona to official Indian
government welfare schemes, subsidized credit lines, and micro-insurance programs
(PM-Kisan, PMFBY, MUDRA, PM-SVANidhi, PMJJBY/PMSBY).
"""

from typing import Any

SCHEMES_CATALOGUE = [
    {
        "id": "pmfby_crop_insurance",
        "name": "PM Fasal Bima Yojana (PMFBY)",
        "category": "Agricultural Crop Protection",
        "target_segments": ["farmer"],
        "min_score": 0,
        "max_score": 850,
        "subsidy_rate": "Subsidized Premium (2% Kharif, 1.5% Rabi)",
        "max_benefit": "Up to ₹2,50,000 per crop season",
        "description": "Comprehensive risk insurance covering yield loss due to non-preventable natural risks (drought, flood, unseasonal rain).",
        "icon": "ShieldCheck",
        "official_portal": "https://pmfby.gov.in",
        "key_criterion": "Must cultivate notifying agricultural crops with rural land tenure"
    },
    {
        "id": "kcc_credit_expansion",
        "name": "Kisan Credit Card (KCC) Limit Expansion",
        "category": "Subsidized Agricultural Credit",
        "target_segments": ["farmer"],
        "min_score": 480,
        "max_score": 850,
        "subsidy_rate": "7% Interest (Effective 4% with Prompt Repayment Incentive)",
        "max_benefit": "Credit limit up to ₹3,00,000 without collateral",
        "description": "Flexible revolving credit line for agricultural inputs, crop maintenance, and post-harvest household expenses.",
        "icon": "CreditCard",
        "official_portal": "https://agricoop.nic.in",
        "key_criterion": "Proven residential/land tenure stability and on-time telecom/utility history"
    },
    {
        "id": "mudra_shishu",
        "name": "Pradhan Mantri MUDRA Yojana (Shishu)",
        "category": "Micro-Enterprise Working Capital",
        "target_segments": ["msme", "gig_worker", "stressed"],
        "min_score": 420,
        "max_score": 850,
        "subsidy_rate": "Zero Collateral, Concessional MFI Rates (~8.5-10%)",
        "max_benefit": "Loans up to ₹50,000",
        "description": "Collateral-free working capital loan for small shop owners, kirana stores, artisans, and street entrepreneurs to buy inventory.",
        "icon": "Store",
        "official_portal": "https://www.mudra.org.in",
        "key_criterion": "Active micro-business or retail activity with regular UPI/cash turnover"
    },
    {
        "id": "mudra_kishore",
        "name": "Pradhan Mantri MUDRA Yojana (Kishore)",
        "category": "MSME Scale-Up Capital",
        "target_segments": ["msme"],
        "min_score": 580,
        "max_score": 850,
        "subsidy_rate": "Competitive Bank MCLR + Spread (~9.2-11%)",
        "max_benefit": "Working capital from ₹50,000 to ₹5,00,000",
        "description": "Expansion loan for registered micro-merchants with established commercial premises and active trade flows.",
        "icon": "TrendingUp",
        "official_portal": "https://www.mudra.org.in",
        "key_criterion": "GST registration or monthly merchant sales volume exceeding ₹40,000"
    },
    {
        "id": "pm_svanidhi",
        "name": "PM-SVANidhi (Street Vendor Special Credit)",
        "category": "Vendor Micro-Credit & Subsidy",
        "target_segments": ["gig_worker", "stressed", "msme"],
        "min_score": 0,
        "max_score": 620,
        "subsidy_rate": "7% Direct Interest Subsidy + Cashback on Digital UPI Transactions",
        "max_benefit": "Tranche 1: ₹10,000; Tranche 2: ₹20,000; Tranche 3: ₹50,000",
        "description": "Working capital micro-credit designed specifically to revive urban and peri-urban street vendors and service providers.",
        "icon": "Smartphone",
        "official_portal": "https://pmsvanidhi.mohua.gov.in",
        "key_criterion": "Urban transit earner or daily merchant operating with mobile UPI payments"
    },
    {
        "id": "pmjjby_life_cover",
        "name": "PM Jeevan Jyoti Bima Yojana (PMJJBY)",
        "category": "Social Security & Life Protection",
        "target_segments": ["farmer", "msme", "gig_worker", "stable_earner", "stressed"],
        "min_score": 0,
        "max_score": 850,
        "subsidy_rate": "Ultra-Low Premium (₹436 per year)",
        "max_benefit": "₹2,00,000 Life Insurance Cover",
        "description": "Guaranteed renewable one-year life insurance coverage for any cause of death, debited automatically from bank savings account.",
        "icon": "HeartHandshake",
        "official_portal": "https://financialservices.gov.in",
        "key_criterion": "Savings bank account holder aged 18 to 50 years"
    },
    {
        "id": "pmsby_accident_cover",
        "name": "PM Suraksha Bima Yojana (PMSBY)",
        "category": "Accidental Disability Cover",
        "target_segments": ["farmer", "msme", "gig_worker", "stable_earner", "stressed"],
        "min_score": 0,
        "max_score": 850,
        "subsidy_rate": "Nominal Premium (₹20 per year)",
        "max_benefit": "₹2,00,000 for Accidental Death / Permanent Disability",
        "description": "Essential accident insurance offering immediate financial security for families of informal workers and rural breadwinners.",
        "icon": "ShieldAlert",
        "official_portal": "https://financialservices.gov.in",
        "key_criterion": "Savings bank account holder aged 18 to 70 years"
    },
    {
        "id": "micro_buffer_rd",
        "name": "Smart Auto-Save Emergency Buffer",
        "category": "Financial Resilience & Savings",
        "target_segments": ["stressed", "gig_worker", "farmer"],
        "min_score": 0,
        "max_score": 650,
        "subsidy_rate": "6.8% Compound Annual Interest",
        "max_benefit": "Builds ₹6,000 Emergency Reserve in 12 Months",
        "description": "Automated ₹500/month recurring deposit timed to post-salary or post-recharge dates to insulate against unexpected shocks.",
        "icon": "PiggyBank",
        "official_portal": "https://rbi.org.in",
        "key_criterion": "Account with low minimum balance buffer ratio (< 15%)"
    },
    {
        "id": "pmjdy_basic_savings",
        "name": "PMJDY Zero-Balance Priority Savings",
        "category": "Basic Banking & Liquidity",
        "target_segments": ["farmer", "gig_worker", "stressed", "msme"],
        "min_score": 0,
        "max_score": 850,
        "subsidy_rate": "Zero Maintenance Charges + ₹10,000 Overdraft Buffer",
        "max_benefit": "₹10,000 Hassle-Free Overdraft Facility after 6 months",
        "description": "Financial inclusion primary savings account with no minimum balance requirement, free RuPay debit card, and direct DBT transfer support.",
        "icon": "Wallet",
        "official_portal": "https://pmjdy.gov.in",
        "key_criterion": "Thin-file applicant requiring baseline formal banking relationship"
    },
    {
        "id": "atal_pension_yojana",
        "name": "Atal Pension Yojana (Guaranteed Retirement)",
        "category": "Social Security & Pension",
        "target_segments": ["farmer", "gig_worker", "msme", "stable_earner"],
        "min_score": 0,
        "max_score": 850,
        "subsidy_rate": "Guaranteed 8% Return Backed by Govt of India",
        "max_benefit": "Guaranteed ₹1,000 to ₹5,000 Monthly Lifetime Pension",
        "description": "Statutory pension scheme for workers in the unorganized sector with guaranteed lifelong income after age 60.",
        "icon": "Award",
        "official_portal": "https://www.npscra.nsdl.co.in",
        "key_criterion": "Unorganized worker aged 18 to 40 years seeking lifelong retirement safety"
    }
]


def recommend_products(
    segment: str,
    score: int,
    features: dict[str, Any]
) -> list[dict[str, Any]]:
    """
    Match borrower profile to best-fit government schemes and financial products.
    
    Parameters:
        segment: Detected persona ('farmer', 'msme', 'gig_worker', 'stressed', 'stable_earner')
        score: AltGrade credit score (0-850)
        features: 28-feature dictionary
        
    Returns:
        List of recommended products sorted by suitability match score (highest first).
    """
    recommendations: list[dict[str, Any]] = []

    for scheme in SCHEMES_CATALOGUE:
        # Segment relevance match
        is_primary_target = segment in scheme["target_segments"]
        
        # Score eligibility check
        score_eligible = scheme["min_score"] <= score <= scheme["max_score"]

        # Calculate granular fit score (0-100)
        fit = 50.0

        if is_primary_target:
            fit += 30.0
        else:
            fit -= 20.0

        if score_eligible:
            fit += 15.0
        else:
            fit -= 25.0

        # Fine-grained contextual adjustments
        if scheme["id"] == "pmfby_crop_insurance" and segment == "farmer":
            fit += 5.0
        elif scheme["id"] == "kcc_credit_expansion" and segment == "farmer" and score >= 550:
            fit += 5.0
        elif scheme["id"] == "mudra_kishore" and int(features.get("merchant_has_gst", 0)) == 1:
            fit += 10.0
        elif scheme["id"] == "pm_svanidhi" and segment in ("gig_worker", "stressed"):
            fit += 8.0
        elif scheme["id"] == "micro_buffer_rd" and float(features.get("bank_min_balance_ratio", 0.2)) < 0.10:
            fit += 12.0

        fit_score = max(10, min(99, int(fit)))

        # Only return schemes with >= 55% fit
        if fit_score >= 55:
            # Generate officer pitch & talking points
            talking_points = (
                f"Candidate qualifies based on {scheme['key_criterion'].lower()}. "
                f"Highlight {scheme['subsidy_rate']} to lower their borrowing cost."
            )

            recommendations.append({
                "product_id": scheme["id"],
                "name": scheme["name"],
                "category": scheme["category"],
                "fit_score": fit_score,
                "subsidy_rate": scheme["subsidy_rate"],
                "max_benefit": scheme["max_benefit"],
                "description": scheme["description"],
                "icon": scheme["icon"],
                "official_portal": scheme["official_portal"],
                "key_criterion": scheme["key_criterion"],
                "officer_talking_points": talking_points,
                "pre_approved": fit_score >= 85 and score >= 550
            })

    # Sort by fit score descending
    recommendations.sort(key=lambda x: x["fit_score"], reverse=True)
    return recommendations
