import math
from typing import Dict, Any, List

def calculate_concessional_loan(
    principal: float,
    annual_interest_rate: float,
    tenure_years: int,
    moratorium_months: int = 6,
    commercial_benchmark_rate: float = 12.5
) -> Dict[str, Any]:
    """
    Computes dynamic EMI with moratorium period support, amortization summary,
    and financial comparison against commercial bank lending rates.
    """
    if principal <= 0:
        return {"error": "Principal must be greater than zero"}

    total_months = max(12, tenure_years * 12)
    repayment_months = max(6, total_months - moratorium_months)

    # Monthly rates
    r_concessional = (annual_interest_rate / 100.0) / 12.0
    r_commercial = (commercial_benchmark_rate / 100.0) / 12.0

    # Moratorium interest calculation (simple interest during moratorium)
    moratorium_monthly_interest = principal * r_concessional
    total_moratorium_interest = moratorium_monthly_interest * moratorium_months

    # Standard EMI formula for active repayment tenure
    # EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    if r_concessional > 0:
        emi_factor = math.pow(1 + r_concessional, repayment_months)
        concessional_emi = principal * r_concessional * emi_factor / (emi_factor - 1)
    else:
        concessional_emi = principal / repayment_months

    total_repayment_concessional = (concessional_emi * repayment_months) + total_moratorium_interest
    total_concessional_interest = total_repayment_concessional - principal

    # Commercial benchmark calculation (typically no concessional moratorium or standard moratorium at 12.5%)
    if r_commercial > 0:
        comm_factor = math.pow(1 + r_commercial, total_months)
        commercial_emi = principal * r_commercial * comm_factor / (comm_factor - 1)
    else:
        commercial_emi = principal / total_months

    total_commercial_payment = commercial_emi * total_months
    total_commercial_interest = total_commercial_payment - principal

    # Net savings through MoSJE Concessional Channel Finance
    total_interest_saved = max(0.0, total_commercial_interest - total_concessional_interest)
    monthly_saving = max(0.0, commercial_emi - concessional_emi)

    # Yearly Amortization Schedule
    yearly_schedule: List[Dict[str, Any]] = []
    balance = principal
    cumulative_interest = 0.0
    cumulative_principal = 0.0

    current_month = 1
    # Process moratorium period
    for m in range(1, moratorium_months + 1):
        cumulative_interest += moratorium_monthly_interest
        if m % 12 == 0 or m == moratorium_months:
            pass

    # Process repayment period
    current_year = 1
    year_interest = moratorium_monthly_interest * min(moratorium_months, 12)
    year_principal = 0.0

    for m in range(1, repayment_months + 1):
        interest_payment = balance * r_concessional
        principal_payment = concessional_emi - interest_payment
        balance = max(0.0, balance - principal_payment)

        year_interest += interest_payment
        year_principal += principal_payment
        cumulative_interest += interest_payment
        cumulative_principal += principal_payment

        if m % 12 == 0 or m == repayment_months:
            yearly_schedule.append({
                "year": current_year,
                "principal_paid": round(year_principal, 2),
                "interest_paid": round(year_interest, 2),
                "total_paid": round(year_principal + year_interest, 2),
                "remaining_balance": round(balance, 2)
            })
            current_year += 1
            year_interest = 0.0
            year_principal = 0.0

    return {
        "principal": round(principal, 2),
        "concessional_rate_pct": annual_interest_rate,
        "commercial_rate_pct": commercial_benchmark_rate,
        "moratorium_months": moratorium_months,
        "active_repayment_months": repayment_months,
        "total_tenure_months": total_months,
        "monthly_emi_concessional": round(concessional_emi, 2),
        "monthly_emi_commercial": round(commercial_emi, 2),
        "monthly_saving": round(monthly_saving, 2),
        "moratorium_interest_per_month": round(moratorium_monthly_interest, 2),
        "total_moratorium_interest": round(total_moratorium_interest, 2),
        "total_interest_concessional": round(total_concessional_interest, 2),
        "total_interest_commercial": round(total_commercial_interest, 2),
        "total_cost_concessional": round(total_repayment_concessional, 2),
        "total_cost_commercial": round(total_commercial_payment, 2),
        "total_savings_amount": round(total_interest_saved, 2),
        "savings_percentage": round((total_interest_saved / max(1.0, total_commercial_interest)) * 100, 1),
        "yearly_schedule": yearly_schedule
    }
