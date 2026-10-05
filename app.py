import os
import json
import uuid
import sqlite3
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from database import get_db, init_db
from recommender import recommend_schemes
from calculator import calculate_concessional_loan
from partner_router import route_channel_partners

# Initialize database on startup
init_db()

app = FastAPI(
    title="MoSJE AI-Driven Scheme Matching Platform",
    description="SIH 2026 Problem Statement 26092: AI-driven scheme matching, concessional calculator, and geo-spatial partner routing for marginalized entrepreneurs.",
    version="1.0.0"
)

# Enable CORS for local development and live demonstrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

# Pydantic Request Models
class RecommenderRequest(BaseModel):
    caste_category: str = Field(default="SC", description="SC, ST, OBC, General")
    family_annual_income: float = Field(..., description="Annual family income in INR")
    gender: str = Field(default="male", description="male, female, other")
    estimated_project_cost: float = Field(..., description="Total cost of project in INR")
    project_type: str = Field(..., description="Type of venture e.g. retail_shop, tailoring, manufacturing, solar")
    education_status: Optional[str] = Field(default="12th_pass")
    is_sanitation_worker: Optional[bool] = Field(default=False)
    state: Optional[str] = None
    district: Optional[str] = None

class CalculatorRequest(BaseModel):
    principal: float = Field(..., description="Loan amount in INR")
    annual_interest_rate: float = Field(default=6.5, description="Annual rate in %")
    tenure_years: int = Field(default=5, description="Tenure in years")
    moratorium_months: int = Field(default=6, description="Moratorium period in months")
    commercial_benchmark_rate: Optional[float] = Field(default=12.5)

class ApplicationCreateRequest(BaseModel):
    applicant_name: str
    gender: str
    caste_category: str
    family_annual_income: float
    education_status: str
    project_type: str
    estimated_project_cost: float
    requested_loan_amount: float
    state: str
    district: str
    pincode: str
    latitude: Optional[float] = 28.6139
    longitude: Optional[float] = 77.2090
    recommended_scheme_id: str
    assigned_partner_id: str
    estimated_emi: Optional[float] = 0.0
    moratorium_months: Optional[int] = 6
    interest_rate: Optional[float] = 6.5
    readiness_score: Optional[int] = 85
    documents_submitted: Optional[List[str]] = []

class StatusUpdateRequest(BaseModel):
    status: str
    officer_remarks: Optional[str] = ""

class SendOtpRequest(BaseModel):
    username: str
    phone: str
    email: str

class VerifyOtpRequest(BaseModel):
    username: str
    phone: str
    email: str
    otp_code: str

class UserProfileUpdateRequest(BaseModel):
    user_id: str
    full_name: Optional[str] = None
    gender: Optional[str] = "female"
    birthdate: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    education_qualification: Optional[str] = None
    caste_category: Optional[str] = "SC"
    annual_income: Optional[float] = 180000.0
    business_category: Optional[str] = None
    current_revenue: Optional[float] = 0.0

# Helpers to fetch data
def fetch_all_schemes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM schemes")
    rows = cursor.fetchall()
    schemes = []
    for r in rows:
        d = dict(r)
        d["eligible_purposes"] = json.loads(d["eligible_purposes"]) if d["eligible_purposes"] else []
        d["channel_partner_types"] = json.loads(d["channel_partner_types"]) if d["channel_partner_types"] else []
        d["required_documents"] = json.loads(d["required_documents"]) if d["required_documents"] else []
        schemes.append(d)
    conn.close()
    return schemes

def fetch_all_partners():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM channel_partners")
    rows = cursor.fetchall()
    partners = []
    for r in rows:
        d = dict(r)
        d["authorized_schemes"] = json.loads(d["authorized_schemes"]) if d["authorized_schemes"] else []
        partners.append(d)
    conn.close()
    return partners

# --- REST Endpoints ---

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "MoSJE Scheme Matching API", "version": "1.0.0"}

@app.get("/api/schemes")
def list_schemes(category: Optional[str] = None):
    schemes = fetch_all_schemes()
    if category and category.lower() != "all":
        schemes = [s for s in schemes if s["category"].lower() == category.lower()]
    return {"total": len(schemes), "schemes": schemes}

@app.get("/api/schemes/{scheme_id}")
def get_scheme(scheme_id: str):
    schemes = fetch_all_schemes()
    for s in schemes:
        if s["id"] == scheme_id or s["short_code"].upper() == scheme_id.upper():
            return s
    raise HTTPException(status_code=404, detail="Scheme not found")

@app.post("/api/recommend")
def recommend_scheme_endpoint(req: RecommenderRequest):
    schemes = fetch_all_schemes()
    results = recommend_schemes(req.model_dump(), schemes)
    return {
        "status": "success",
        "user_profile": req.model_dump(),
        "total_evaluated": len(schemes),
        "recommendations": results
    }

@app.post("/api/calculator")
def loan_calculator_endpoint(req: CalculatorRequest):
    result = calculate_concessional_loan(
        principal=req.principal,
        annual_interest_rate=req.annual_interest_rate,
        tenure_years=req.tenure_years,
        moratorium_months=req.moratorium_months,
        commercial_benchmark_rate=req.commercial_benchmark_rate or 12.5
    )
    return result

@app.get("/api/partners")
def list_partners_endpoint(
    lat: float = Query(28.6139, description="User latitude (defaults to Delhi)"),
    lon: float = Query(77.2090, description="User longitude (defaults to Delhi)"),
    scheme_id: Optional[str] = None,
    partner_type: Optional[str] = None,
    radius: float = Query(1500.0, description="Search radius in km"),
    allow_high_npa: bool = Query(False, description="Whether to include frozen/high NPA partners")
):
    partners = fetch_all_partners()
    routed = route_channel_partners(
        user_lat=lat,
        user_lon=lon,
        partners_list=partners,
        scheme_id=scheme_id,
        partner_type=partner_type,
        max_radius_km=radius,
        allow_high_npa=allow_high_npa
    )
    
    # Summary metrics for quick view
    total_active = sum(1 for p in routed if p["is_eligible_for_routing"])
    total_restricted = sum(1 for p in routed if not p["is_eligible_for_routing"])
    
    return {
        "user_coordinates": {"lat": lat, "lon": lon},
        "total_found": len(routed),
        "eligible_for_routing_count": total_active,
        "restricted_high_npa_count": total_restricted,
        "partners": routed
    }

@app.post("/api/applications")
def create_application_endpoint(req: ApplicationCreateRequest):
    conn = get_db()
    cursor = conn.cursor()

    app_id = f"APP-{uuid.uuid4().hex[:8].upper()}"
    qr_token = f"MOSJE-AUTH-{uuid.uuid4().hex[:12].upper()}"

    cursor.execute("""
    INSERT INTO applications (
        id, applicant_name, gender, caste_category, family_annual_income,
        education_status, project_type, estimated_project_cost, requested_loan_amount,
        state, district, pincode, latitude, longitude,
        recommended_scheme_id, assigned_partner_id, estimated_emi,
        moratorium_months, interest_rate, readiness_score, documents_submitted,
        qr_verification_token, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_OFFICER_REVIEW')
    """, (
        app_id, req.applicant_name, req.gender, req.caste_category, req.family_annual_income,
        req.education_status, req.project_type, req.estimated_project_cost, req.requested_loan_amount,
        req.state, req.district, req.pincode, req.latitude, req.longitude,
        req.recommended_scheme_id, req.assigned_partner_id, req.estimated_emi,
        req.moratorium_months, req.interest_rate, req.readiness_score,
        json.dumps(req.documents_submitted), qr_token
    ))
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "application_id": app_id,
        "qr_verification_token": qr_token,
        "assigned_partner_id": req.assigned_partner_id,
        "message": "Referral dossier generated successfully. Present this voucher to the allocated Channel Partner."
    }

@app.get("/api/applications")
def list_applications_endpoint(partner_id: Optional[str] = None, status: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()

    query = """
    SELECT a.*, s.name as scheme_name, s.short_code as scheme_code,
           p.name as partner_name, p.partner_type, p.gross_npa_pct, p.phone as partner_phone
    FROM applications a
    LEFT JOIN schemes s ON a.recommended_scheme_id = s.id
    LEFT JOIN channel_partners p ON a.assigned_partner_id = p.id
    WHERE 1=1
    """
    params = []
    if partner_id:
        query += " AND a.assigned_partner_id = ?"
        params.append(partner_id)
    if status and status.upper() != "ALL":
        query += " AND a.status = ?"
        params.append(status.upper())

    query += " ORDER BY a.created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    apps = []
    for r in rows:
        item = dict(r)
        item["documents_submitted"] = json.loads(item["documents_submitted"]) if item["documents_submitted"] else []
        apps.append(item)
    conn.close()
    return {"total": len(apps), "applications": apps}

@app.patch("/api/applications/{app_id}/status")
def update_application_status(app_id: str, req: StatusUpdateRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM applications WHERE id = ?", (app_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Application not found")

    cursor.execute(
        "UPDATE applications SET status = ?, officer_remarks = ? WHERE id = ?",
        (req.status.upper(), req.officer_remarks, app_id)
    )
    conn.commit()
    conn.close()
    return {"status": "updated", "application_id": app_id, "new_status": req.status.upper()}

@app.get("/api/analytics")
def get_analytics():
    conn = get_db()
    cursor = conn.cursor()

    # Total applications
    cursor.execute("SELECT COUNT(*) FROM applications")
    total_apps = cursor.fetchone()[0]

    # Status counts
    cursor.execute("SELECT status, COUNT(*) FROM applications GROUP BY status")
    status_breakdown = dict(cursor.fetchall())

    # Total loan value requested
    cursor.execute("SELECT COALESCE(SUM(requested_loan_amount), 0) FROM applications")
    total_loan_volume = cursor.fetchone()[0]

    # Partner health metrics
    cursor.execute("""
    SELECT partner_type, 
           COUNT(*) as total_partners,
           AVG(gross_npa_pct) as avg_npa,
           SUM(allocated_fund_crores) as total_allocated_cr,
           SUM(utilized_fund_crores) as total_utilized_cr
    FROM channel_partners
    GROUP BY partner_type
    """)
    partner_metrics = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "total_applications": total_apps,
        "status_breakdown": status_breakdown,
        "total_loan_volume_requested": total_loan_volume,
        "partner_ecosystem_health": partner_metrics
    }

# --- User Authentication & Profile Endpoints ---

@app.post("/api/auth/send-otp")
def send_otp_endpoint(req: SendOtpRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    expires_at = (datetime.now() + timedelta(minutes=10)).isoformat()
    
    cursor.execute("""
    INSERT INTO otps (identifier, otp_code, expires_at, is_used)
    VALUES (?, ?, ?, 0)
    """, (req.phone, otp_code, expires_at))
    conn.commit()
    conn.close()
    
    return {
        "status": "success",
        "message": f"OTP sent to {req.phone} & {req.email}",
        "otp_code": otp_code, # Provided for seamless demo evaluation
        "expires_in_seconds": 600
    }

@app.post("/api/auth/verify-otp")
def verify_otp_endpoint(req: VerifyOtpRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    # Check OTP (allow master demo OTP '123456' as well)
    cursor.execute("""
    SELECT id FROM otps 
    WHERE identifier = ? AND otp_code = ? AND is_used = 0
    ORDER BY id DESC LIMIT 1
    """, (req.phone, req.otp_code))
    otp_record = cursor.fetchone()
    
    if not otp_record and req.otp_code != "123456":
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
        
    if otp_record:
        cursor.execute("UPDATE otps SET is_used = 1 WHERE id = ?", (otp_record[0],))
        conn.commit()
        
    # Check if user already exists by username or phone
    cursor.execute("SELECT * FROM users WHERE username = ? OR phone = ?", (req.username, req.phone))
    user_row = cursor.fetchone()
    
    if user_row:
        user_data = dict(user_row)
        if not user_data.get("email"):
            cursor.execute("UPDATE users SET email = ? WHERE id = ?", (req.email, user_data["id"]))
            conn.commit()
            user_data["email"] = req.email
    else:
        # Create new user with complete profile structure
        new_user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
        cursor.execute("""
        INSERT INTO users (
            id, username, phone, email, full_name, gender, birthdate,
            address, district, state, pincode, education_qualification,
            caste_category, annual_income, business_category, current_revenue
        ) VALUES (?, ?, ?, ?, ?, 'female', '1995-05-15', 'Flat 102, Ambedkar Colony', 'Central Delhi', 'Delhi', '110002', '12th Standard', 'SC', 180000, 'Tailoring & Garments', 65000)
        """, (new_user_id, req.username, req.phone, req.email, req.username))
        conn.commit()
        
        cursor.execute("SELECT * FROM users WHERE id = ?", (new_user_id,))
        user_data = dict(cursor.fetchone())
        
    conn.close()
    return {
        "status": "success",
        "message": "Authentication successful",
        "token": f"TOKEN-{uuid.uuid4().hex[:16]}",
        "user": user_data
    }

@app.get("/api/user/profile")
def get_user_profile(user_id: Optional[str] = None, username: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    elif username:
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    else:
        cursor.execute("SELECT * FROM users ORDER BY created_at DESC LIMIT 1")
        
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User profile not found")
    return {"status": "success", "user": dict(row)}

@app.put("/api/user/profile")
def update_user_profile(req: UserProfileUpdateRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE id = ?", (req.user_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    cursor.execute("""
    UPDATE users SET
        full_name = ?, gender = ?, birthdate = ?, address = ?,
        district = ?, state = ?, pincode = ?, education_qualification = ?,
        caste_category = ?, annual_income = ?, business_category = ?,
        current_revenue = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (
        req.full_name, req.gender, req.birthdate, req.address,
        req.district, req.state, req.pincode, req.education_qualification,
        req.caste_category, req.annual_income, req.business_category,
        req.current_revenue, req.user_id
    ))
    conn.commit()
    cursor.execute("SELECT * FROM users WHERE id = ?", (req.user_id,))
    updated_user = dict(cursor.fetchone())
    conn.close()
    return {"status": "success", "message": "Profile updated successfully", "user": updated_user}



# ============================================================
#  CLEAN ALIAS ROUTES (no /api/ prefix) for the new frontend
# ============================================================

class NewSendOtpRequest(BaseModel):
    username: str
    phone: str

class NewVerifyOtpRequest(BaseModel):
    token: str
    otp: str
    username: Optional[str] = None
    phone: Optional[str] = None

class ProfileSaveRequest(BaseModel):
    user_id: Optional[str] = None
    fullName: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    caste: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    education: Optional[str] = None
    income: Optional[float] = None
    occupation: Optional[str] = None
    isSanitationWorker: Optional[bool] = False
    businessCategory: Optional[str] = None
    businessStatus: Optional[str] = None
    currentRevenue: Optional[float] = None
    project_cost: Optional[float] = None
    businessLocation: Optional[str] = None
    employees: Optional[int] = None
    preferredTenure: Optional[int] = None
    preferredPartner: Optional[str] = None

# In-memory OTP store keyed by token (for demo)
_otp_store: Dict[str, Any] = {}

@app.post("/auth/send-otp")
def new_send_otp(req: NewSendOtpRequest):
    """New frontend: send OTP without email."""
    otp_code = str(random.randint(100000, 999999))
    token    = f"OTP-TOKEN-{uuid.uuid4().hex}"
    expires_at = (datetime.now() + timedelta(minutes=10)).isoformat()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO otps (identifier, otp_code, expires_at, is_used) VALUES (?, ?, ?, 0)",
        (req.phone, otp_code, expires_at)
    )
    conn.commit()
    conn.close()

    _otp_store[token] = {"username": req.username, "phone": req.phone, "otp": otp_code}

    return {
        "status":   "success",
        "token":    token,
        "demo_otp": otp_code,
        "expires_in_seconds": 600
    }

@app.post("/auth/verify-otp")
def new_verify_otp(req: NewVerifyOtpRequest):
    """New frontend: verify OTP by token."""
    clean_otp = req.otp.strip()
    entry = _otp_store.get(req.token)

    conn = get_db()
    cursor = conn.cursor()

    phone = req.phone or (entry["phone"] if entry else None)
    username = req.username or (entry["username"] if entry else None)

    # Master demo OTP is always valid
    if clean_otp == "123456":
        valid = True
    elif entry and entry.get("otp") == clean_otp:
        valid = True
    else:
        # Fallback to checking SQLite otps table in case of server restart or worker memory loss
        cursor.execute(
            "SELECT identifier, otp_code, expires_at FROM otps WHERE otp_code = ? AND is_used = 0 ORDER BY id DESC LIMIT 1",
            (clean_otp,)
        )
        otp_row = cursor.fetchone()
        if otp_row:
            valid = True
            if not phone:
                phone = otp_row["identifier"]
        else:
            valid = False

    if not valid:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check the code and try again.")

    if not username:
        username = "beneficiary_" + (phone[-4:] if phone and len(phone) >= 4 else "user")
    if not phone:
        phone = "+919876543210"

    # Mark OTP as used
    cursor.execute(
        "UPDATE otps SET is_used = 1 WHERE (identifier = ? OR otp_code = ?) AND is_used = 0",
        (phone, clean_otp)
    )

    cursor.execute("SELECT * FROM users WHERE username = ? OR phone = ?", (username, phone))
    row = cursor.fetchone()
    if row:
        user_data = dict(row)
        if not user_data.get("username"):
            cursor.execute("UPDATE users SET username = ? WHERE id = ?", (username, user_data["id"]))
            user_data["username"] = username
    else:
        new_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
        cursor.execute(
            "INSERT INTO users (id, username, phone, email, caste_category, annual_income) VALUES (?, ?, ?, '', 'SC', 0)",
            (new_id, username, phone)
        )
        conn.commit()
        cursor.execute("SELECT * FROM users WHERE id = ?", (new_id,))
        user_data = dict(cursor.fetchone())

    conn.commit()
    conn.close()
    _otp_store.pop(req.token, None)

    has_profile = bool(user_data.get("full_name") or user_data.get("annual_income"))
    session_token = f"TOKEN-{uuid.uuid4().hex[:16]}"

    return {
        "status":        "success",
        "user_id":       user_data["id"],
        "session_token": session_token,
        "has_profile":   has_profile
    }

@app.get("/schemes")
def list_schemes_clean(category: Optional[str] = None):
    schemes = fetch_all_schemes()
    if category and category.lower() != "all":
        schemes = [s for s in schemes if s["category"].lower() == category.lower()]
    return {"total": len(schemes), "schemes": schemes}

@app.post("/recommend")
def recommend_clean(req: RecommenderRequest):
    schemes = fetch_all_schemes()
    results = recommend_schemes(req.model_dump(), schemes)
    return {"status": "success", "recommendations": results}

@app.get("/partners/route")
def route_partners_clean(
    lat: float = 28.6139, lng: float = 77.2090,
    scheme_id: Optional[str] = None, limit: int = 8
):
    partners = fetch_all_partners()
    if scheme_id:
        schemes = fetch_all_schemes()
        sch = next((s for s in schemes if s["id"] == scheme_id), None)
        if sch:
            allowed = sch.get("channel_partner_types", [])
            partners = [p for p in partners if p.get("partner_type") in allowed]
    routed = route_channel_partners(lat, lng, partners, limit=limit)
    return {"partners": routed}

@app.post("/profile")
def save_profile_clean(req: ProfileSaveRequest):
    user_id = req.user_id
    if not user_id:
        return {"status": "ok", "note": "Profile saved locally (no user_id provided)"}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if cursor.fetchone():
        cursor.execute("""
            UPDATE users SET
                full_name = COALESCE(?, full_name),
                gender = COALESCE(?, gender),
                birthdate = COALESCE(?, birthdate),
                address = COALESCE(?, address),
                district = COALESCE(?, district),
                state = COALESCE(?, state),
                pincode = COALESCE(?, pincode),
                education_qualification = COALESCE(?, education_qualification),
                caste_category = COALESCE(?, caste_category),
                annual_income = COALESCE(?, annual_income),
                business_category = COALESCE(?, business_category),
                current_revenue = COALESCE(?, current_revenue),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            req.fullName, req.gender, req.dob, req.address,
            req.district, req.state, req.pincode, req.education,
            req.caste, req.income, req.businessCategory,
            req.currentRevenue, user_id
        ))
        conn.commit()
    conn.close()
    return {"status": "success", "message": "Profile saved"}


# ── Serve static assets (CSS, JS, images) ──
if FRONTEND_DIR.exists():
    # Mount assets sub-directories so relative links work
    css_dir = FRONTEND_DIR / "css"
    js_dir  = FRONTEND_DIR / "js"
    assets_dir = FRONTEND_DIR / "assets"
    if css_dir.exists():
        app.mount("/css",    StaticFiles(directory=css_dir),    name="css")
    if js_dir.exists():
        app.mount("/js",     StaticFiles(directory=js_dir),     name="js")
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# ── Serve each HTML page at its natural .html URL ──
def _page(filename: str):
    p = FRONTEND_DIR / filename
    if p.exists():
        return FileResponse(str(p), media_type="text/html")
    return JSONResponse({"error": f"{filename} not found"}, status_code=404)

@app.get("/")
def root():
    return _page("sign-in.html")

@app.get("/sign-in.html")
def signin_page():
    return _page("sign-in.html")

@app.get("/index.html")
def home_page():
    return _page("index.html")

@app.get("/schemes.html")
def schemes_page():
    return _page("schemes.html")

@app.get("/scheme-detail.html")
def scheme_detail_page():
    return _page("scheme-detail.html")

@app.get("/profile.html")
def profile_page():
    return _page("profile.html")
