import json
from typing import List, Dict, Any

def recommend_schemes(user_profile: Dict[str, Any], all_schemes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Intelligent AI & rule-based engine matching marginalized entrepreneurs
    to concessional MoSJE / NSFDC financial schemes.
    """
    caste = user_profile.get("caste_category", "").upper()
    income = float(user_profile.get("family_annual_income", 0))
    gender = user_profile.get("gender", "male").lower()
    project_cost = float(user_profile.get("estimated_project_cost", 0))
    project_type = user_profile.get("project_type", "").lower()
    education = user_profile.get("education_status", "").lower()
    is_sanitation_worker = bool(user_profile.get("is_sanitation_worker", False))

    scored_schemes = []

    for scheme in all_schemes:
        score = 0.0
        reasons = []
        warnings = []
        is_eligible = True

        # Rule 1: Caste Verification (MoSJE target demographic)
        if caste == "SC":
            score += 25
            reasons.append("Eligible under MoSJE Scheduled Caste empowerment mandate.")
        elif caste in ["ST", "OBC", "EWS"]:
            # Some schemes allow through sister corporations (e.g. NBCFDC/NSTFDC)
            score += 15
            warnings.append("Note: Cross-agency routing via NBCFDC/NSTFDC channel may apply.")
        else:
            is_eligible = False
            warnings.append("General category: Concessional MoSJE channel finance requires SC/OBC certification.")

        # Rule 2: Family Income Ceiling (MoSJE limit: ₹5.00 Lakhs)
        if income <= 300000:
            score += 25
            reasons.append("High priority: Family income is well within the low-income empowerment bracket (≤ ₹3.0L).")
        elif income <= 500000:
            score += 20
            reasons.append("Eligible: Family income meets the ₹5.00 Lakhs annual ceiling.")
        else:
            score -= 20
            is_eligible = False
            warnings.append("Income exceeds the ₹5.00 Lakhs annual limit for 100% concessional priority.")

        # Rule 3: Project Cost Bracket Matching
        min_cost = scheme["min_project_cost"]
        max_cost = scheme["max_project_cost"]

        if min_cost <= project_cost <= max_cost:
            score += 30
            reasons.append(f"Optimal project size: Estimated cost of ₹{project_cost:,.0f} fits within scheme range (₹{min_cost:,.0f} - ₹{max_cost:,.0f}).")
        elif project_cost < min_cost:
            score += 10
            warnings.append(f"Requested cost (₹{project_cost:,.0f}) is below standard minimum ₹{min_cost:,.0f}.")
        else:
            score -= 15
            warnings.append(f"Requested cost exceeds maximum scheme ceiling of ₹{max_cost:,.0f}.")

        # Rule 4: Scheme Category & Specific Purpose Matching
        eligible_purposes = scheme.get("eligible_purposes", [])
        category = scheme.get("category", "")
        short_code = scheme.get("short_code", "")

        # ── Gender: Mahila Samriddhi (MSY) ──
        if short_code == "MSY":
            if gender == "female":
                score += 35
                reasons.append("Top Priority Match: Mahila Samriddhi offers the lowest subsidized interest rate (4.0% p.a.) for SC women entrepreneurs.")
            else:
                score -= 60
                is_eligible = False
                warnings.append("Mahila Samriddhi Yojana is strictly reserved for SC female entrepreneurs.")

        # ── Education: ELS-DOM & ELS-ABR ──
        if category == "education" and short_code in ("ELS-DOM", "ELS-ABR"):
            edu_keywords = ["education", "study", "college", "university", "degree", "medical", "engineering", "management", "abroad", "foreign", "masters", "phd"]
            if any(kw in project_type for kw in edu_keywords):
                score += 30
                reasons.append("Direct match: Professional degree / higher education financing.")
                if short_code == "ELS-ABR" and any(kw in project_type for kw in ["abroad", "foreign", "masters", "phd"]):
                    score += 15
                    reasons.append("Overseas study boost: ELS-Abroad provides up to ₹30L for international universities.")
            else:
                score -= 30

        # ── Education: VSL – Vocational & Skill Upskilling Loan (NEW SCH009) ──
        if short_code == "VSL":
            vsl_keywords = ["vocational", "iti", "skill", "polytechnic", "diploma", "nursing", "computer", "driving",
                            "welding", "electrician", "fashion", "hotel", "training", "course", "certificate",
                            "higher_education", "engineering", "data_science", "legal"]
            if any(kw in project_type for kw in vsl_keywords):
                score += 38
                reasons.append("Best-fit: VSL offers the lowest education interest rate (3% for women, 4% for men) plus 15% course-fee subsidy up to ₹50,000.")
                if gender == "female":
                    score += 10
                    reasons.append("Female applicant bonus: VSL rate drops to just 3.0% p.a. — lowest in portfolio.")
            elif any(kw in project_type for kw in ["education", "study", "college"]):
                score += 15
                reasons.append("Partial match: VSL can cover short-term certified skill programmes.")
            else:
                score -= 20

        # ── Sanitation: SUY – Swachhta Udyami Yojana ──
        if short_code == "SUY":
            suy_keywords = ["cleaning", "sanitation", "waste", "scavenger", "sewage", "toilet", "garbage", "drain"]
            if is_sanitation_worker or any(kw in project_type for kw in suy_keywords):
                score += 35
                reasons.append("High Impact: Up to 33.33% / ₹5.0 Lakhs capital subsidy for mechanized sanitation vehicles.")
            else:
                score -= 10

        # ── Sanitation: SSEL – Swachh Sahar Sanitation Enterprise Loan (NEW SCH010) ──
        if short_code == "SSEL":
            ssel_keywords = ["sanitation", "toilet", "community_toilet", "solid_waste", "garbage", "composting",
                             "cleaning", "drain", "sewage", "e_waste", "plastic_waste", "waste_management",
                             "mechanized_cleaning", "septic"]
            if is_sanitation_worker or any(kw in project_type for kw in ssel_keywords):
                score += 40
                reasons.append("Top Sanitation Match: SSEL covers community toilets, EV garbage fleets, composting & drain-cleaning. 25% subsidy up to ₹2.5 Lakhs.")
                if project_cost <= 1500000:
                    score += 10
                    reasons.append("Optimal scale: Project cost fits SSEL's urban sanitation micro-enterprise range.")
                if gender == "female":
                    score += 8
                    reasons.append("Female applicant: SSEL rate drops to 3.5% p.a.")
            elif "waste" in project_type or "recycle" in project_type:
                score += 15
                reasons.append("Partial match: SSEL also covers plastic/e-waste segregation and collection centres.")
            else:
                score -= 15

        # ── Green: GBS – Green Business Scheme ──
        if short_code == "GBS":
            green_keywords = ["solar", "electric", "ev", "green", "recycle", "organic", "bio_fertilizer", "battery"]
            if any(kw in project_type for kw in green_keywords):
                score += 25
                reasons.append("Green Entrepreneurship Priority: Concessional backing for clean mobility and solar power.")

        # ── Green: SGES – Solar Sahay & Green Energy Scheme (NEW SCH011) ──
        if short_code == "SGES":
            sges_keywords = ["solar", "solar_rooftop", "solar_pump", "solar_power", "biogas", "biomass",
                             "electric_vehicle", "ev_charging", "battery_charging", "wind_turbine",
                             "green_hydrogen", "renewable", "organic_farming", "bio_fertilizer",
                             "recycle", "green", "ev", "electric"]
            if any(kw in project_type for kw in sges_keywords):
                score += 42
                reasons.append("Strongest Green Match: SGES offers up to ₹50L at 4.5-5.5% with 20% capital subsidy (max ₹5L). Aligned with PM Surya Ghar & MNRE programmes.")
                if "solar" in project_type:
                    score += 12
                    reasons.append("Solar priority boost: Solar rooftop / pump projects receive highest subsidy priority under MNRE empanelment.")
                if gender == "female":
                    score += 8
                    reasons.append("Female applicant: SGES rate drops to 4.5% p.a.")
                if project_cost >= 500000:
                    score += 5
                    reasons.append("Large green project: SGES supports scale-up up to ₹50 Lakhs with longer 10-year tenure.")
            else:
                score -= 10

        # ── Micro Credit: MCF ──
        if short_code == "MCF":
            if project_cost <= 140000:
                score += 15
                reasons.append("Fast-track approval: Micro Credit Finance requires minimal collateral documentation.")

        # ── Purpose match (universal across all schemes) ──
        if any(term in project_type for term in eligible_purposes):
            score += 10
            reasons.append(f"Project activity matches recognized high-viability sector ({project_type}).")

        # Determine effective interest rate for user
        effective_rate = scheme["interest_rate_female"] if gender == "female" else scheme["interest_rate_male"]

        # Calculate max loan and subsidy
        max_loan_pct = scheme.get("max_loan_percentage", 90)
        promoter_min_pct = scheme.get("promoter_contribution_min", 10)
        
        calculated_loan = min(project_cost * (max_loan_pct / 100.0), max_cost)
        beneficiary_margin = project_cost - calculated_loan
        
        capital_subsidy = 0.0
        if scheme.get("subsidy_percentage", 0) > 0:
            subsidy_calc = project_cost * (scheme["subsidy_percentage"] / 100.0)
            capital_subsidy = min(subsidy_calc, scheme.get("capital_subsidy_max", 0))

        # Normalize score between 0 and 100
        match_score = max(5, min(99, int(score)))

        scored_schemes.append({
            "scheme": scheme,
            "match_score": match_score,
            "is_eligible": is_eligible,
            "reasons": reasons,
            "warnings": warnings,
            "effective_interest_rate": effective_rate,
            "calculated_loan_amount": round(calculated_loan, 2),
            "beneficiary_margin_required": round(beneficiary_margin, 2),
            "promoter_margin_pct": promoter_min_pct,
            "capital_subsidy_amount": round(capital_subsidy, 2),
            "recommended_tenure_years": scheme["max_tenure_years"],
            "moratorium_months": scheme["moratorium_months_min"]
        })

    # Sort primarily by eligibility, match score, then lowest effective interest rate (cheaper credit first)
    scored_schemes.sort(
        key=lambda x: (
            x["is_eligible"],
            x["match_score"],
            -x["effective_interest_rate"],
            x["capital_subsidy_amount"]
        ),
        reverse=True
    )
    return scored_schemes
