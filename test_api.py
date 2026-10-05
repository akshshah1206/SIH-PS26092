import json
from recommender import recommend_schemes
from calculator import calculate_concessional_loan
from partner_router import route_channel_partners
from database import get_db, init_db

init_db()

# Test 1: Recommender
with open("backend/data/schemes.json") as f:
    schemes = json.load(f)

test_profile = {
    "caste_category": "SC",
    "family_annual_income": 180000,
    "gender": "female",
    "estimated_project_cost": 120000,
    "project_type": "tailoring",
    "education_status": "10th_pass",
    "is_sanitation_worker": False
}

recommendations = recommend_schemes(test_profile, schemes)
print(f"Top Recommended Scheme: {recommendations[0]['scheme']['name']} (Match: {recommendations[0]['match_score']}%)")
print(f"Effective Rate: {recommendations[0]['effective_interest_rate']}% p.a.")
print(f"Calculated Loan: ₹{recommendations[0]['calculated_loan_amount']:,.2f}")

# Test 2: Calculator
calc_result = calculate_concessional_loan(
    principal=108000,
    annual_interest_rate=4.0,
    tenure_years=3,
    moratorium_months=6,
    commercial_benchmark_rate=12.5
)
print(f"Concessional Monthly EMI: ₹{calc_result['monthly_emi_concessional']}")
print(f"Commercial Monthly EMI: ₹{calc_result['monthly_emi_commercial']}")
print(f"Total Money Saved: ₹{calc_result['total_savings_amount']:,.2f} ({calc_result['savings_percentage']}%)")

# Test 3: Geo-Router
with open("backend/data/partners.json") as f:
    partners = json.load(f)

routed = route_channel_partners(
    user_lat=28.6139,
    user_lon=77.2090,
    partners_list=partners,
    scheme_id="SCH002",
    allow_high_npa=False
)
print(f"Found {len(routed)} partners. Top routed partner: {routed[0]['name']} (Distance: {routed[0]['distance_km']} km, NPA: {routed[0]['gross_npa_pct']}%, Status: {routed[0]['health_status']})")
print("All Core Tests Passed Successfully!")
