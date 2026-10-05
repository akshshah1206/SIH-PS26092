import sqlite3
import json
import os
from pathlib import Path

DB_FILE = Path(__file__).parent / "sih_mosje.db"
SCHEMES_FILE = Path(__file__).parent / "data" / "schemes.json"
PARTNERS_FILE = Path(__file__).parent / "data" / "partners.json"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Schemes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS schemes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        short_code TEXT NOT NULL,
        category TEXT NOT NULL,
        min_project_cost REAL NOT NULL,
        max_project_cost REAL NOT NULL,
        max_loan_percentage REAL NOT NULL,
        promoter_contribution_min REAL NOT NULL,
        subsidy_percentage REAL DEFAULT 0,
        capital_subsidy_max REAL DEFAULT 0,
        interest_rate_male REAL NOT NULL,
        interest_rate_female REAL NOT NULL,
        moratorium_months_min INTEGER NOT NULL,
        moratorium_months_max INTEGER NOT NULL,
        max_tenure_years INTEGER NOT NULL,
        family_income_limit REAL NOT NULL,
        target_beneficiary TEXT NOT NULL,
        eligible_purposes TEXT NOT NULL,
        channel_partner_types TEXT NOT NULL,
        required_documents TEXT NOT NULL,
        description_en TEXT NOT NULL,
        description_hi TEXT NOT NULL,
        badge TEXT
    )
    """)

    # Channel Partners table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS channel_partners (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        partner_type TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        pincode TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        authorized_schemes TEXT NOT NULL,
        allocated_fund_crores REAL NOT NULL,
        utilized_fund_crores REAL NOT NULL,
        fund_utilization_pct REAL NOT NULL,
        gross_npa_pct REAL NOT NULL,
        status TEXT NOT NULL,
        avg_disbursement_days INTEGER NOT NULL,
        nodal_officer TEXT NOT NULL
    )
    """)

    # Beneficiary Applications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        applicant_name TEXT NOT NULL,
        gender TEXT NOT NULL,
        caste_category TEXT NOT NULL,
        family_annual_income REAL NOT NULL,
        education_status TEXT NOT NULL,
        project_type TEXT NOT NULL,
        estimated_project_cost REAL NOT NULL,
        requested_loan_amount REAL NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        pincode TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        recommended_scheme_id TEXT NOT NULL,
        assigned_partner_id TEXT NOT NULL,
        estimated_emi REAL,
        moratorium_months INTEGER,
        interest_rate REAL,
        readiness_score INTEGER,
        documents_submitted TEXT,
        qr_verification_token TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'PENDING_OFFICER_REVIEW',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        officer_remarks TEXT,
        FOREIGN KEY(recommended_scheme_id) REFERENCES schemes(id),
        FOREIGN KEY(assigned_partner_id) REFERENCES channel_partners(id)
    )
    """)

    # Registered Beneficiary Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        full_name TEXT,
        gender TEXT DEFAULT 'female',
        birthdate TEXT,
        address TEXT,
        district TEXT,
        state TEXT,
        pincode TEXT,
        education_qualification TEXT,
        caste_category TEXT DEFAULT 'SC',
        annual_income REAL DEFAULT 180000,
        business_category TEXT,
        current_revenue REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # OTP verification table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used INTEGER DEFAULT 0
    )
    """)

    conn.commit()

    # Seed schemes if empty
    cursor.execute("SELECT COUNT(*) FROM schemes")
    if cursor.fetchone()[0] == 0 and SCHEMES_FILE.exists():
        with open(SCHEMES_FILE, "r", encoding="utf-8") as f:
            schemes_data = json.load(f)
            for s in schemes_data:
                cursor.execute("""
                INSERT INTO schemes (
                    id, name, short_code, category, min_project_cost, max_project_cost,
                    max_loan_percentage, promoter_contribution_min, subsidy_percentage,
                    capital_subsidy_max, interest_rate_male, interest_rate_female,
                    moratorium_months_min, moratorium_months_max, max_tenure_years,
                    family_income_limit, target_beneficiary, eligible_purposes,
                    channel_partner_types, required_documents, description_en, description_hi, badge
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    s["id"], s["name"], s["short_code"], s["category"], s["min_project_cost"],
                    s["max_project_cost"], s["max_loan_percentage"], s["promoter_contribution_min"],
                    s["subsidy_percentage"], s["capital_subsidy_max"], s["interest_rate_male"],
                    s["interest_rate_female"], s["moratorium_months_min"], s["moratorium_months_max"],
                    s["max_tenure_years"], s["family_income_limit"], s["target_beneficiary"],
                    json.dumps(s["eligible_purposes"]), json.dumps(s["channel_partner_types"]),
                    json.dumps(s["required_documents"]), s["description_en"], s["description_hi"],
                    s.get("badge")
                ))
            conn.commit()

    # Seed channel partners if empty
    cursor.execute("SELECT COUNT(*) FROM channel_partners")
    if cursor.fetchone()[0] == 0 and PARTNERS_FILE.exists():
        with open(PARTNERS_FILE, "r", encoding="utf-8") as f:
            partners_data = json.load(f)
            for p in partners_data:
                cursor.execute("""
                INSERT INTO channel_partners (
                    id, name, partner_type, state, district, pincode, address,
                    latitude, longitude, phone, email, authorized_schemes,
                    allocated_fund_crores, utilized_fund_crores, fund_utilization_pct,
                    gross_npa_pct, status, avg_disbursement_days, nodal_officer
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    p["id"], p["name"], p["partner_type"], p["state"], p["district"],
                    p["pincode"], p["address"], p["latitude"], p["longitude"],
                    p["phone"], p["email"], json.dumps(p["authorized_schemes"]),
                    p["allocated_fund_crores"], p["utilized_fund_crores"], p["fund_utilization_pct"],
                    p["gross_npa_pct"], p["status"], p["avg_disbursement_days"], p["nodal_officer"]
                ))
            conn.commit()

    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized and seeded successfully.")
