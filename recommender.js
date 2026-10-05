// Recommender Engine UI Controller
class RecommenderUI {
  constructor() {
    this.form = document.getElementById('recommenderForm');
    this.resultsContainer = document.getElementById('recommenderResults');
    this.resultsGrid = document.getElementById('recommenderGrid');
    this.statusBanner = document.getElementById('recommenderStatusBanner');

    this.bindEvents();
  }

  bindEvents() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.runRecommendation();
      });
    }

    // Quick preset buttons for instant demo
    document.querySelectorAll('.demo-profile-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const profile = JSON.parse(e.currentTarget.dataset.profile);
        this.populateForm(profile);
        this.runRecommendation();
      });
    });
  }

  populateForm(p) {
    if (p.caste) document.getElementById('inputCaste').value = p.caste;
    if (p.income) document.getElementById('inputIncome').value = p.income;
    if (p.gender) document.getElementById('inputGender').value = p.gender;
    if (p.cost) document.getElementById('inputCost').value = p.cost;
    if (p.projectType) document.getElementById('inputProjectType').value = p.projectType;
    if (p.education) document.getElementById('inputEducation').value = p.education;
    const sanCheck = document.getElementById('inputSanitation');
    if (sanCheck) sanCheck.checked = !!p.isSanitation;
  }

  async runRecommendation() {
    const payload = {
      caste_category: document.getElementById('inputCaste').value,
      family_annual_income: parseFloat(document.getElementById('inputIncome').value || 200000),
      gender: document.getElementById('inputGender').value,
      estimated_project_cost: parseFloat(document.getElementById('inputCost').value || 100000),
      project_type: document.getElementById('inputProjectType').value,
      education_status: document.getElementById('inputEducation').value,
      is_sanitation_worker: document.getElementById('inputSanitation') ? document.getElementById('inputSanitation').checked : false
    };

    if (this.resultsContainer) this.resultsContainer.style.display = 'block';
    if (this.resultsGrid) {
      this.resultsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
          <div class="voice-pulse" style="margin: 0 auto 16px; width: 16px; height: 16px;"></div>
          <p style="font-weight: 600; color: var(--slate-600);">AI is evaluating 8+ MoSJE & NSFDC credit schemes against your profile...</p>
        </div>
      `;
    }

    try {
      const res = await fetch(`${API_BASE}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      this.renderRecommendations(data.recommendations, payload);
    } catch (err) {
      console.error("Recommender error:", err);
      if (this.resultsGrid) {
        this.resultsGrid.innerHTML = `<p style="color: red; padding: 20px;">Error connecting to scheme engine. Please check backend.</p>`;
      }
    }
  }

  renderRecommendations(recommendations, userProfile) {
    if (!this.resultsGrid) return;

    if (!recommendations || recommendations.length === 0) {
      this.resultsGrid.innerHTML = `<p style="padding: 20px;">No matching schemes found for this criteria.</p>`;
      return;
    }

    // Store top recommendation for voice summary
    const topRec = recommendations[0];
    const topScheme = topRec.scheme;

    // Set voice summary
    const voiceTextEn = `Based on your profile, the top recommended scheme is ${topScheme.name} with an interest rate of ${topRec.effective_interest_rate} percent per annum and a loan amount of rupees ${Math.round(topRec.calculated_loan_amount)}.`;
    const voiceTextHi = `आपकी प्रोफाइल के अनुसार सबसे उपयुक्त योजना है: ${topScheme.name}। इसमें आपको ${topRec.effective_interest_rate} प्रतिशत वार्षिक रियायती ब्याज पर ${Math.round(topRec.calculated_loan_amount)} रुपये तक का ऋण मिल सकता है।`;

    window.latestRecommendationSummary = { en: voiceTextEn, hi: voiceTextHi };

    this.resultsGrid.innerHTML = recommendations.map((item, index) => {
      const s = item.scheme;
      const isTop = index === 0;

      return `
        <div class="scheme-card ${isTop ? 'top-match' : ''}">
          <div class="match-score-badge">
            <span>★</span> ${item.match_score}% Match
          </div>

          <div>
            <div class="scheme-code">${s.short_code} • ${s.badge || 'Concessional Channel Finance'}</div>
            <h3 class="scheme-title">${s.name}</h3>
            <p style="font-size: 0.84rem; color: var(--slate-600); margin-bottom: 14px;">${s.description_en}</p>

            <div class="scheme-metrics-grid">
              <div class="metric-item">
                <div class="lbl">Interest Rate</div>
                <div class="val" style="color: var(--emerald-600);">${item.effective_interest_rate}% p.a.</div>
              </div>
              <div class="metric-item">
                <div class="lbl">Calculated Loan</div>
                <div class="val">₹ ${Math.round(item.calculated_loan_amount).toLocaleString('en-IN')}</div>
              </div>
              <div class="metric-item">
                <div class="lbl">Promoter Margin</div>
                <div class="val">₹ ${Math.round(item.beneficiary_margin_required).toLocaleString('en-IN')} (${item.promoter_margin_pct}%)</div>
              </div>
              <div class="metric-item">
                <div class="lbl">Moratorium Period</div>
                <div class="val">${item.moratorium_months} Months</div>
              </div>
            </div>

            ${item.capital_subsidy_amount > 0 ? `
              <div style="background: var(--emerald-100); color: var(--emerald-700); padding: 8px 12px; border-radius: 6px; font-size: 0.82rem; font-weight: 700; margin-bottom: 12px;">
                🎁 Includes Capital Subsidy: Up to ₹ ${item.capital_subsidy_amount.toLocaleString('en-IN')}
              </div>
            ` : ''}

            <div style="font-size: 0.78rem; font-weight: 700; color: var(--slate-700); margin-bottom: 6px; text-transform: uppercase;">
              Explainable AI Match Reasons:
            </div>
            <ul class="reasons-list">
              ${item.reasons.slice(0, 3).map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>

          <div class="scheme-card-actions">
            <button class="btn btn-outline" style="flex: 1; font-size: 0.82rem; padding: 8px 10px;" onclick="window.recommenderUI.openCalculatorForScheme('${s.id}', ${item.calculated_loan_amount}, ${item.effective_interest_rate}, ${s.max_tenure_years}, ${item.moratorium_months})">
              🧮 Calculate EMI
            </button>
            <button class="btn btn-primary" style="flex: 1.2; font-size: 0.82rem; padding: 8px 10px;" onclick="window.recommenderUI.routeToPartners('${s.id}', '${s.name}', ${item.calculated_loan_amount})">
              📍 Find Partner
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Scroll smoothly to results
    this.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openCalculatorForScheme(schemeId, principal, rate, tenure, moratorium) {
    if (window.switchTab) window.switchTab('tab-calculator');
    if (window.loanCalculator) {
      window.loanCalculator.loadSchemeParameters(principal, rate, tenure, moratorium);
    }
  }

  routeToPartners(schemeId, schemeName, loanAmount) {
    if (window.switchTab) window.switchTab('tab-locator');
    if (window.partnerMapRouter) {
      window.partnerMapRouter.filterByScheme(schemeId, schemeName, loanAmount);
    }
  }
}

window.recommenderUI = null;
document.addEventListener('DOMContentLoaded', () => {
  window.recommenderUI = new RecommenderUI();
});
