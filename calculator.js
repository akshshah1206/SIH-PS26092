// Dynamic Concessional EMI and Moratorium Calculator
const API_BASE = window.location.origin;

class LoanCalculator {
  constructor() {
    this.principalInput = document.getElementById('calcPrincipal');
    this.rateInput = document.getElementById('calcRate');
    this.tenureInput = document.getElementById('calcTenure');
    this.moratoriumInput = document.getElementById('calcMoratorium');

    this.principalVal = document.getElementById('calcPrincipalVal');
    this.rateVal = document.getElementById('calcRateVal');
    this.tenureVal = document.getElementById('calcTenureVal');
    this.moratoriumVal = document.getElementById('calcMoratoriumVal');

    this.emiResult = document.getElementById('calcEmiResult');
    this.commEmiResult = document.getElementById('calcCommEmiResult');
    this.savingsResult = document.getElementById('calcSavingsResult');
    this.interestConcessional = document.getElementById('calcInterestConcessional');
    this.interestCommercial = document.getElementById('calcInterestCommercial');
    this.amortizationBody = document.getElementById('calcAmortizationBody');

    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    const inputs = [this.principalInput, this.rateInput, this.tenureInput, this.moratoriumInput];
    inputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          this.updateDisplayValues();
          this.calculate();
        });
      }
    });

    // Preset buttons
    document.querySelectorAll('.calc-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const p = e.currentTarget.dataset.principal;
        const r = e.currentTarget.dataset.rate;
        const t = e.currentTarget.dataset.tenure;
        const m = e.currentTarget.dataset.moratorium;

        if (p) this.principalInput.value = p;
        if (r) this.rateInput.value = r;
        if (t) this.tenureInput.value = t;
        if (m) this.moratoriumInput.value = m;

        this.updateDisplayValues();
        this.calculate();
      });
    });
  }

  updateDisplayValues() {
    if (this.principalVal) this.principalVal.innerText = `₹ ${Number(this.principalInput.value).toLocaleString('en-IN')}`;
    if (this.rateVal) this.rateVal.innerText = `${this.rateInput.value} %`;
    if (this.tenureVal) this.tenureVal.innerText = `${this.tenureInput.value} Yrs`;
    if (this.moratoriumVal) this.moratoriumVal.innerText = `${this.moratoriumInput.value} Months`;
  }

  async calculate() {
    const payload = {
      principal: parseFloat(this.principalInput.value),
      annual_interest_rate: parseFloat(this.rateInput.value),
      tenure_years: parseInt(this.tenureInput.value),
      moratorium_months: parseInt(this.moratoriumInput.value),
      commercial_benchmark_rate: 12.5
    };

    try {
      const res = await fetch(`${API_BASE}/api/calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      this.renderResults(data);
    } catch (err) {
      console.error("Calculator API error, using client-side fallback:", err);
      this.clientSideCalculate(payload);
    }
  }

  clientSideCalculate(p) {
    const totalMonths = p.tenure_years * 12;
    const repaymentMonths = Math.max(6, totalMonths - p.moratorium_months);
    const rConc = (p.annual_interest_rate / 100) / 12;
    const rComm = (12.5 / 100) / 12;

    const emiFactor = Math.pow(1 + rConc, repaymentMonths);
    const emiConc = (p.principal * rConc * emiFactor) / (emiFactor - 1);

    const commFactor = Math.pow(1 + rComm, totalMonths);
    const emiComm = (p.principal * rComm * commFactor) / (commFactor - 1);

    const totalConcInterest = (emiConc * repaymentMonths) + (p.principal * rConc * p.moratorium_months) - p.principal;
    const totalCommInterest = (emiComm * totalMonths) - p.principal;
    const savings = Math.max(0, totalCommInterest - totalConcInterest);

    this.renderResults({
      monthly_emi_concessional: emiConc,
      monthly_emi_commercial: emiComm,
      total_interest_concessional: totalConcInterest,
      total_interest_commercial: totalCommInterest,
      total_savings_amount: savings,
      savings_percentage: ((savings / totalCommInterest) * 100).toFixed(1),
      yearly_schedule: []
    });
  }

  renderResults(data) {
    if (this.emiResult) {
      this.emiResult.innerText = `₹ ${Math.round(data.monthly_emi_concessional).toLocaleString('en-IN')}`;
    }
    if (this.commEmiResult) {
      this.commEmiResult.innerText = `₹ ${Math.round(data.monthly_emi_commercial).toLocaleString('en-IN')}`;
    }
    if (this.savingsResult) {
      this.savingsResult.innerText = `₹ ${Math.round(data.total_savings_amount).toLocaleString('en-IN')} (${data.savings_percentage}% saved)`;
    }
    if (this.interestConcessional) {
      this.interestConcessional.innerText = `₹ ${Math.round(data.total_interest_concessional).toLocaleString('en-IN')}`;
    }
    if (this.interestCommercial) {
      this.interestCommercial.innerText = `₹ ${Math.round(data.total_interest_commercial).toLocaleString('en-IN')}`;
    }

    // Render Yearly Amortization rows
    if (this.amortizationBody && data.yearly_schedule && data.yearly_schedule.length > 0) {
      this.amortizationBody.innerHTML = data.yearly_schedule.map(row => `
        <tr>
          <td>Year ${row.year}</td>
          <td>₹ ${Math.round(row.principal_paid).toLocaleString('en-IN')}</td>
          <td>₹ ${Math.round(row.interest_paid).toLocaleString('en-IN')}</td>
          <td>₹ ${Math.round(row.total_paid).toLocaleString('en-IN')}</td>
          <td>₹ ${Math.round(row.remaining_balance).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');
    }
  }

  // Pre-load parameters from recommender
  loadSchemeParameters(principal, rate, tenure, moratorium) {
    if (this.principalInput) this.principalInput.value = principal;
    if (this.rateInput) this.rateInput.value = rate;
    if (this.tenureInput) this.tenureInput.value = tenure;
    if (this.moratoriumInput) this.moratoriumInput.value = moratorium;
    this.updateDisplayValues();
    this.calculate();
  }
}

window.loanCalculator = null;
document.addEventListener('DOMContentLoaded', () => {
  window.loanCalculator = new LoanCalculator();
});
