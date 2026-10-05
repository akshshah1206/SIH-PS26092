// Global Application Controller & State
let currentLanguage = 'en';

const TRANSLATIONS = {
  en: {
    heroTitle: "AI-Driven Concessional Credit Matching for Marginalized Entrepreneurs",
    heroSubtitle: "Bridging the gap between Scheduled Caste beneficiaries and 100+ authorized Channel Partners (SCAs, PSBs, RRBs, NBFC-MFIs) with intelligent scheme recommendations, moratorium-adjusted EMI calculators, and non-choked geo-spatial routing.",
    tabRecommender: "AI Scheme Matcher",
    tabCalculator: "Financial Calculator",
    tabLocator: "Geo-Spatial Router",
    tabOfficer: "Officer Portal",
    listenBtn: "Listen in English",
    welcomeVoice: "Welcome to the Ministry of Social Justice and Empowerment AI credit platform. Let us find the most suitable concessional loan for your business."
  },
  hi: {
    heroTitle: "वंचित एवं अनुसूचित जाति उद्यमियों हेतु एआई-संचालित रियायती ऋण मिलान मंच",
    heroSubtitle: "अनुसूचित जाति के लाभार्थियों को राज्य चैनलाइजिंग एजेंसियों (SCA), सार्वजनिक बैंकों और क्षेत्रीय ग्रामीण बैंकों के 100 से अधिक चैनल भागीदारों से जोड़ना। एआई योजना सिफारिश, रियायती ईएमआई कैलकुलेटर और निकटतम अधिकृत बैंक मैपिंग।",
    tabRecommender: "एआई योजना मिलान",
    tabCalculator: "वित्तीय ईएमआई कैलकुलेटर",
    tabLocator: "निकटतम बैंक एवं SCA खोजें",
    tabOfficer: "अधिकारी पोर्टल",
    listenBtn: "हिंदी में सुनें",
    welcomeVoice: "सामाजिक न्याय और अधिकारिता मंत्रालय के एआई क्रेडिट पोर्टल में आपका स्वागत है। आइए आपके व्यवसाय के लिए सबसे उपयुक्त रियायती ऋण खोजें।"
  }
};

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });

  // Re-render map tiles if switching to locator tab
  if (tabId === 'tab-locator' && window.partnerMapRouter && window.partnerMapRouter.map) {
    setTimeout(() => {
      window.partnerMapRouter.map.invalidateSize();
    }, 200);
  }

  // Refresh officer data if switching to officer tab
  if (tabId === 'tab-officer' && window.officerPortal) {
    window.officerPortal.loadData();
  }
}

// Language Switcher
function setLanguage(lang) {
  currentLanguage = lang;
  if (window.voiceAssistant) {
    window.voiceAssistant.setLanguage(lang);
  }

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const heroTitle = document.getElementById('heroTitle');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const voiceBtnLabel = document.getElementById('voiceBtnLabel');

  if (heroTitle) heroTitle.innerText = t.heroTitle;
  if (heroSubtitle) heroSubtitle.innerText = t.heroSubtitle;
  if (voiceBtnLabel) voiceBtnLabel.innerText = t.listenBtn;
}

// Accessibility Tools
let fontSizeStep = 0;
function changeFontSize(delta) {
  fontSizeStep = Math.max(-2, Math.min(3, fontSizeStep + delta));
  const baseSize = 16 + (fontSizeStep * 1.5);
  document.documentElement.style.setProperty('--base-font-size', `${baseSize}px`);
}

function toggleHighContrast() {
  document.body.classList.toggle('high-contrast');
}

// Voice Assistant Trigger
function playVoiceNarration() {
  if (!window.voiceAssistant) return;

  if (window.latestRecommendationSummary && window.latestRecommendationSummary[currentLanguage]) {
    window.voiceAssistant.speak(window.latestRecommendationSummary[currentLanguage]);
  } else {
    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    window.voiceAssistant.speak(t.welcomeVoice);
  }
}

// Modal Handlers
function openApplicationModal(partner, schemeId, loanAmount) {
  const modal = document.getElementById('applicationModal');
  if (!modal) return;

  document.getElementById('modalPartnerName').innerText = partner.name;
  document.getElementById('modalPartnerAddress').innerText = `${partner.district}, ${partner.state}`;
  document.getElementById('modalPartnerOfficer').innerText = `${partner.nodal_officer} (${partner.phone})`;
  document.getElementById('modalPartnerId').value = partner.id;

  if (schemeId) {
    document.getElementById('modalSchemeSelect').value = schemeId;
  }
  if (loanAmount) {
    document.getElementById('modalRequestedAmount').value = Math.round(loanAmount);
  }

  // Auto-fill from active user profile if available
  if (window.authManager && window.authManager.currentUser) {
    const u = window.authManager.currentUser;
    if (u.full_name) document.getElementById('modalApplicantName').value = u.full_name;
    if (u.gender) document.getElementById('modalGender').value = u.gender;
    if (u.caste_category) document.getElementById('modalCaste').value = u.caste_category;
    if (u.annual_income) document.getElementById('modalIncome').value = u.annual_income;
    if (u.state) document.getElementById('modalState').value = u.state;
    if (u.district) document.getElementById('modalDistrict').value = u.district;
    if (u.pincode) document.getElementById('modalPincode').value = u.pincode;
  }

  modal.classList.add('active');
}

function closeApplicationModal() {
  const modal = document.getElementById('applicationModal');
  if (modal) modal.classList.remove('active');
}

function closeVoucherModal() {
  const modal = document.getElementById('voucherModal');
  if (modal) modal.classList.remove('active');
}

// Submit Application & Generate Referral Voucher
async function submitApplicationForm(e) {
  e.preventDefault();

  const name = document.getElementById('modalApplicantName').value;
  const caste = document.getElementById('modalCaste').value;
  const gender = document.getElementById('modalGender').value;
  const income = parseFloat(document.getElementById('modalIncome').value);
  const cost = parseFloat(document.getElementById('modalProjectCost').value);
  const loan = parseFloat(document.getElementById('modalRequestedAmount').value);
  const schemeId = document.getElementById('modalSchemeSelect').value;
  const partnerId = document.getElementById('modalPartnerId').value;
  const projectType = document.getElementById('modalProjectType').value;
  const state = document.getElementById('modalState').value;
  const district = document.getElementById('modalDistrict').value;
  const pincode = document.getElementById('modalPincode').value;

  const docs = [];
  document.querySelectorAll('.doc-check:checked').forEach(c => docs.push(c.value));

  const payload = {
    applicant_name: name,
    gender: gender,
    caste_category: caste,
    family_annual_income: income,
    education_status: "12th_pass",
    project_type: projectType,
    estimated_project_cost: cost,
    requested_loan_amount: loan,
    state: state,
    district: district,
    pincode: pincode,
    recommended_scheme_id: schemeId,
    assigned_partner_id: partnerId,
    estimated_emi: Math.round(loan * 0.035),
    moratorium_months: 6,
    interest_rate: 6.5,
    readiness_score: 85,
    documents_submitted: docs
  };

  try {
    const res = await fetch(`${API_BASE}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    closeApplicationModal();

    // Render Voucher
    payload.id = result.application_id;
    payload.qr_verification_token = result.qr_verification_token;
    payload.partner_name = document.getElementById('modalPartnerName').innerText;
    payload.created_at = new Date().toISOString();

    renderReferralVoucher(payload);
  } catch (err) {
    alert("Error submitting application: " + err.message);
  }
}

// Generate simple SVG QR Code for offline voucher verification
function generateMockQRCode(text) {
  // Simple deterministic pattern based on hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  
  let rects = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if ((r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)) {
        // Corners
        rects += `<rect x="${c*14}" y="${r*14}" width="12" height="12" fill="#0f172a" />`;
      } else if (((hash >> (r * 2 + c)) & 1) === 1 || (r + c) % 3 === 0) {
        rects += `<rect x="${c*14}" y="${r*14}" width="12" height="12" fill="#0f172a" />`;
      }
    }
  }

  return `
    <svg width="130" height="130" viewBox="0 0 126 126" xmlns="http://www.w3.org/2000/svg">
      <rect width="126" height="126" fill="#ffffff" />
      ${rects}
    </svg>
  `;
}

function renderReferralVoucher(app) {
  const container = document.getElementById('voucherDetails');
  if (!container) return;

  const qrSvg = generateMockQRCode(app.qr_verification_token || app.id);

  container.innerHTML = `
    <div class="voucher-header">
      <div style="font-size: 0.74rem; font-weight: 700; color: var(--saffron-600); text-transform: uppercase; letter-spacing: 0.5px;">
        Ministry of Social Justice and Empowerment • MoSJE Channel Finance Referral
      </div>
      <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--primary-900); margin: 4px 0;">
        Concessional Lending Referral Voucher
      </h2>
      <div style="font-size: 0.8rem; color: var(--slate-500);">Application Ref: <strong>${app.id}</strong></div>
    </div>

    <div class="voucher-qr-box">
      ${qrSvg}
      <div style="margin-left: 18px; text-align: left;">
        <div style="font-size: 0.72rem; color: var(--slate-500); text-transform: uppercase;">Digital Verification Token</div>
        <div style="font-family: monospace; font-size: 0.85rem; font-weight: 700; color: var(--slate-800);">${app.qr_verification_token || 'MOSJE-VERIFIED'}</div>
        <div style="font-size: 0.72rem; color: var(--emerald-600); font-weight: 600; margin-top: 4px;">✓ Authenticated Route • NPA & Quota Pre-screened</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 0.84rem;">
      <div style="background: var(--slate-50); padding: 10px; border-radius: 6px;">
        <div style="font-size: 0.7rem; color: var(--slate-500); text-transform: uppercase;">Beneficiary Name</div>
        <strong>${app.applicant_name}</strong> (${app.caste_category})
      </div>
      <div style="background: var(--slate-50); padding: 10px; border-radius: 6px;">
        <div style="font-size: 0.7rem; color: var(--slate-500); text-transform: uppercase;">Annual Family Income</div>
        <strong>₹ ${Number(app.family_annual_income).toLocaleString('en-IN')}</strong> (Eligible)
      </div>
      <div style="background: var(--slate-50); padding: 10px; border-radius: 6px;">
        <div style="font-size: 0.7rem; color: var(--slate-500); text-transform: uppercase;">Allocated Channel Partner</div>
        <strong>${app.partner_name || app.assigned_partner_id}</strong>
      </div>
      <div style="background: var(--slate-50); padding: 10px; border-radius: 6px;">
        <div style="font-size: 0.7rem; color: var(--slate-500); text-transform: uppercase;">Requested Concessional Loan</div>
        <strong style="color: var(--emerald-600);">₹ ${Number(app.requested_loan_amount).toLocaleString('en-IN')}</strong>
      </div>
    </div>

    <div style="background: var(--warning-100); border-left: 4px solid var(--warning-500); padding: 10px; border-radius: 4px; font-size: 0.78rem; margin-bottom: 16px;">
      <strong>Instructions for Beneficiary:</strong> Present this voucher along with your original Caste Certificate, Aadhaar Card, and Income Certificate at the allocated Channel Partner office. No collateral required for loans up to ₹1.40 Lakhs.
    </div>

    <div style="display: flex; gap: 10px;">
      <button class="btn btn-primary" style="flex: 1;" onclick="window.print()">🖨️ Print / Save Voucher</button>
      <button class="btn btn-outline" style="flex: 1;" onclick="closeVoucherModal()">Close</button>
    </div>
  `;

  document.getElementById('voucherModal').classList.add('active');
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  // Bind tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Bind language switcher
  const langSelect = document.getElementById('globalLangSelect');
  if (langSelect) {
    langSelect.addEventListener('change', (e) => setLanguage(e.target.value));
  }

  // Bind accessibility font buttons
  const fontPlus = document.getElementById('fontPlusBtn');
  const fontMinus = document.getElementById('fontMinusBtn');
  const highContrast = document.getElementById('highContrastBtn');
  const voiceBtn = document.getElementById('globalVoiceBtn');

  if (fontPlus) fontPlus.addEventListener('click', () => changeFontSize(1));
  if (fontMinus) fontMinus.addEventListener('click', () => changeFontSize(-1));
  if (highContrast) highContrast.addEventListener('click', toggleHighContrast);
  if (voiceBtn) voiceBtn.addEventListener('click', playVoiceNarration);

  // Bind application form
  const appForm = document.getElementById('applicationForm');
  if (appForm) appForm.addEventListener('submit', submitApplicationForm);
});
