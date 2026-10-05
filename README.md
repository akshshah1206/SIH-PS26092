# MoSJE Udyam Saarthi • AI-Driven Scheme Matching for Marginalized Entrepreneurs

> **Smart India Hackathon (SIH 2026)**  
> **Problem Statement ID:** 26092  
> **Ministry / Department:** Ministry of Social Justice and Empowerment (MoSJE) / Department of Social Justice and Empowerment  
> **Theme:** Smart Automation | **Category:** Software  

---

## 🌟 Executive Summary

To promote the socio-economic empowerment of the Scheduled Caste (SC) population, the Government of India provides concessional credit (interest rates typically **4.0% to 8.0% p.a.**, up to 90% funding, with 3 to 12 months moratorium periods). 

However, direct applications to MoSJE/NSFDC are not entertained. Funds are routed through a decentralized **Channel Finance System** comprising **over 100 Channel Partners** (State Channelizing Agencies [SCAs], Public Sector Banks [PSBs], Regional Rural Banks [RRBs], and NBFC-MFIs).

### The Bottlenecks Solved:
1. **Information Asymmetry**: Beneficiaries struggle to navigate scheme criteria (Micro Finance vs. Term Loans vs. Mahila Samriddhi vs. Education vs. Swachhta Udyami).
2. **Channel Partner Dead-Ends & Choke Points**: Beneficiaries submit applications to local bank branches that have exhausted their quarterly fund allocation or are restricted due to high NPAs (>10%), causing months of delay or rejection.
3. **Financial Illiteracy & Hidden Costs**: First-time entrepreneurs cannot compute the effect of moratorium periods, promoter margins, and capital subsidies.

---

## 🚀 Key Prototype Capabilities

### 1. Smart AI & Rule-Based Scheme Recommender
- **Multi-Factor Profile Match**: Evaluates caste eligibility, income ceiling ($\le$ ₹5.00 Lakhs), project cost bounds, and vocational skills.
- **Affirmative Inclusivity Engine**: Automatically identifies female entrepreneurs to award top priority for **Mahila Samriddhi Yojana (4.0% p.a.)** and awards capital subsidies (up to 33.33% / ₹5.0L) under **Swachhta Udyami Yojana**.
- **Explainable AI (XAI)**: Generates clear, plain-language match reasons ("Why this scheme?") so beneficiaries understand why they qualify.

### 2. Dynamic Concessional Financial Calculator
- **Moratorium-Aware EMI Engine**: Models 3 to 12-month grace periods where only simple concessional interest is serviced, calculating true post-moratorium installments.
- **Commercial Bank Benchmark**: Shows side-by-side comparison with standard commercial lending (12.5% p.a.), highlighting total rupees and percentage saved.
- **Year-by-Year Amortization Schedule**: Full breakdown of principal paid, interest paid, and remaining balance.

### 3. Geo-Spatial Partner Locator & "Non-Choked" Router
- **Interactive Leaflet Mapping**: Computes Haversine distances to nearest SCAs, PSBs, RRBs, and NBFC-MFIs across Indian districts.
- **Live Partner Health Filtering**: 
  - 🟢 **Active & Funded**: Healthy NPA (<7%) and active fund allocation headroom.
  - 🟡 **Quota Alert**: Quarterly allocation >95% utilized (queue delay warning).
  - 🔴 **Restricted High NPA (>10%)**: Automatically excluded from automated routing to prevent fund black holes.

### 4. Verified Application Dossier & QR Referral Voucher
- **One-Click Pre-screening**: Auto-validates caste, income, and business readiness.
- **Tamper-Evident Referral Slip**: Generates a printable voucher featuring an authenticated verification token and digital QR code for instant offline processing by the Channel Partner.

### 5. Officer & Channel Partner Portal
- **End-to-End Processing Loop**: Officers can review incoming routed applications, inspect document readiness, and advance status (**Verified $\to$ Sanctioned $\to$ Disbursed**).
- **Macro Analytics**: Live monitoring of aggregate loan requests, disbursed funds, and channel-wise NPA health.

### 6. Accessibility & Multilingual Voice Assistance
- Built-in **Speech Synthesis (Hindi & English)** for audio readout of scheme recommendations and EMI results.
- High Contrast Mode & Font Size scaling (+ / -) for rural and low-vision accessibility.

### 7. Beneficiary Authentication & Comprehensive Profile Management
- **Username, Phone & OTP Verification**: Secure authentication via SMS/Email OTP verification with simulated demo codes (`123456`).
- **Top Right Menu Profile Pill**: Shows user avatar, full name, and social category verification badge.
- **Full Demographic & Enterprise Profile**:
  - Full Legal Name & Gender
  - Date of Birth
  - Residential Address (Street, District, State, Pincode)
  - Educational Qualification (10th, 12th, ITI, Graduate, Post-Graduate)
  - Social Category / Caste (SC, ST, OBC, EWS, General)
  - Annual Family Income (₹)
  - Enterprise Category (Retail, Tailoring, Sanitation Tech, Solar/Clean Tech, Dairy, etc.)
  - Current Annual/Monthly Business Revenue (₹)
- **One-Click Auto-Fill**: Syncs profile data directly into the AI Scheme Matcher and Application Dossier.
- **Sign Out Action**: One-click session clearance.

---

## 🏗️ Architecture & Technology Stack

```
                                  [ Beneficiary / Citizen ]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
             [ Web / Mobile UI ]                             [ Voice Assistant ]
      (HTML5 / Modern CSS / Leaflet.js)                 (Web Speech Synthesis En/Hi)
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │ REST APIs
                                              ▼
                                   [ FastAPI Gateway ]
                   ┌──────────────────────────┼──────────────────────────┐
                   ▼                          ▼                          ▼
         [ Recommender Engine ]     [ Dynamic Calculator ]     [ Geo-Spatial Router ]
        (Multi-criteria AI + XAI)   (Moratorium + Amortize)     (Haversine + NPA Guard)
                   │                          │                          │
                   └──────────────────────────┼──────────────────────────┘
                                              │
                                              ▼
                                 [ SQLite Database Engine ]
                       (Schemes, Channel Partners, Verified Applications)
                                              ▲
                                              │
                                  [ Channel Partner Portal ]
                             (SCA / PSB / RRB Nodal Officers)
```

- **Backend**: Python 3.14 + FastAPI (Asynchronous REST API, OpenAPI / Swagger specs)
- **Database**: SQLite (Zero-configuration, persistent relational store)
- **Frontend**: Modern Vanilla JavaScript (ES6+), Semantic HTML5, CSS Design System (Custom properties, Glassmorphism, Responsive Grid)
- **Mapping**: Leaflet.js with OpenStreetMap tiles (no third-party paid API keys required)
- **Audio / Accessibility**: Web Speech API (`speechSynthesis`)

---

## ⚡ Quick Start Instructions

### Prerequisites
- Python 3.10+ installed

### 1. Start the Platform
```bash
./run.sh
```
Or directly using Python:
```bash
python3 backend/database.py
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Access the Application
- **Main Web Application**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc API Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Testing the API Suite

Run the automated integration test script:
```bash
PYTHONPATH=backend python3 backend/test_api.py
```

---

## 📋 Evaluation Mapping (SIH 26092 Criteria)

| Required Deliverable | Prototype Implementation |
| :--- | :--- |
| **1. Smart Scheme Recommender** | Implemented with multi-criteria rule engine, 8+ NSFDC schemes, gender concessions, and XAI match reasons. |
| **2. Financial Calculator** | Dynamic sliders covering ₹10K to ₹50L, 3.5% to 15% interest, 3–12m moratoriums, and commercial bank interest savings counter. |
| **3. Geo-Spatial Partner Locator & Router** | Leaflet interactive map filtering 18+ real partner nodes across Indian states; blocks partners with >10% NPA. |
| **4. Multi-lingual Support & Literacy** | English and Hindi voice readouts, accessibility tools, and clear jargon-free guides. |
| **5. Channel Finance Efficiency** | Printable QR referral voucher and officer dashboard to track applications to disbursement. |
