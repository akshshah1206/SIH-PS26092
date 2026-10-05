// Officer & Channel Partner Dashboard Controller
class OfficerPortal {
  constructor() {
    this.tableBody = document.getElementById('officerAppsTableBody');
    this.statusFilter = document.getElementById('officerStatusFilter');
    this.statsCards = {
      totalApps: document.getElementById('statTotalApps'),
      totalVolume: document.getElementById('statTotalVolume'),
      verifiedApps: document.getElementById('statVerifiedApps'),
      disbursedApps: document.getElementById('statDisbursedApps')
    };

    this.bindEvents();
    this.loadData();
  }

  bindEvents() {
    if (this.statusFilter) {
      this.statusFilter.addEventListener('change', () => this.loadApplications());
    }

    const refreshBtn = document.getElementById('officerRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadData());
    }
  }

  async loadData() {
    await Promise.all([
      this.loadAnalytics(),
      this.loadApplications()
    ]);
  }

  async loadAnalytics() {
    try {
      const res = await fetch(`${API_BASE}/api/analytics`);
      const data = await res.json();

      if (this.statsCards.totalApps) {
        this.statsCards.totalApps.innerText = data.total_applications || 0;
      }
      if (this.statsCards.totalVolume) {
        this.statsCards.totalVolume.innerText = `₹ ${((data.total_loan_volume_requested || 0) / 100000).toFixed(1)} L`;
      }

      const breakdown = data.status_breakdown || {};
      if (this.statsCards.verifiedApps) {
        this.statsCards.verifiedApps.innerText = (breakdown['VERIFIED'] || 0) + (breakdown['SANCTIONED'] || 0);
      }
      if (this.statsCards.disbursedApps) {
        this.statsCards.disbursedApps.innerText = breakdown['DISBURSED'] || 0;
      }

      // Render partner ecosystem cards
      const ecoContainer = document.getElementById('ecosystemHealthGrid');
      if (ecoContainer && data.partner_ecosystem_health) {
        ecoContainer.innerHTML = data.partner_ecosystem_health.map(item => `
          <div style="background: #ffffff; border: 1px solid var(--slate-200); border-radius: var(--radius-sm); padding: 14px;">
            <div style="font-size: 0.76rem; color: var(--slate-500); font-weight: 700;">${item.partner_type} Channel</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary-900); margin: 4px 0;">
              ₹ ${item.total_utilized_cr.toFixed(1)} / ${item.total_allocated_cr.toFixed(1)} Cr
            </div>
            <div style="font-size: 0.74rem; color: ${item.avg_npa < 5 ? 'var(--emerald-600)' : 'var(--danger-600)'}; font-weight: 600;">
              Avg NPA: ${item.avg_npa.toFixed(1)}% (${item.total_partners} Nodes)
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
    }
  }

  async loadApplications() {
    const status = this.statusFilter ? this.statusFilter.value : 'ALL';
    try {
      const res = await fetch(`${API_BASE}/api/applications?status=${status}`);
      const data = await res.json();
      this.renderTable(data.applications || []);
    } catch (err) {
      console.error("Error loading applications:", err);
    }
  }

  renderTable(applications) {
    if (!this.tableBody) return;

    if (applications.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 30px; color: var(--slate-500);">
            No applications found matching the current filter.
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = applications.map(app => {
      let statusBadge = '<span class="badge-status status-quota-low">Under Review</span>';
      if (app.status === 'VERIFIED') statusBadge = '<span class="badge-status status-active">Docs Verified</span>';
      if (app.status === 'SANCTIONED') statusBadge = '<span class="badge-status status-active">Sanctioned</span>';
      if (app.status === 'DISBURSED') statusBadge = '<span class="badge-status status-active" style="background:#dbeafe; color:#1e40af;">Disbursed</span>';

      return `
        <tr>
          <td>
            <strong>${app.id}</strong><br>
            <span style="font-size: 0.72rem; color: var(--slate-500);">${new Date(app.created_at).toLocaleDateString()}</span>
          </td>
          <td>
            <strong>${app.applicant_name}</strong> (${app.gender[0].toUpperCase()})<br>
            <span style="font-size: 0.74rem; color: var(--slate-600);">${app.caste_category} • Inc: ₹${(app.family_annual_income/100000).toFixed(1)}L</span>
          </td>
          <td>
            <span style="font-weight: 700; color: var(--primary-800);">${app.scheme_code || 'Scheme'}</span><br>
            <span style="font-size: 0.74rem; color: var(--slate-600);">${app.project_type}</span>
          </td>
          <td>
            <strong>₹ ${Number(app.requested_loan_amount).toLocaleString('en-IN')}</strong><br>
            <span style="font-size: 0.72rem; color: var(--emerald-600); font-weight: 600;">@ ${app.interest_rate}% (${app.moratorium_months}m Morat)</span>
          </td>
          <td>
            <strong>${app.partner_name || app.assigned_partner_id}</strong><br>
            <span style="font-size: 0.72rem; color: var(--slate-500);">${app.district}, ${app.state}</span>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 4px;">
              ${app.status === 'PENDING_OFFICER_REVIEW' ? `
                <button class="btn btn-primary" style="padding: 4px 8px; font-size: 0.72rem;" onclick="window.officerPortal.updateStatus('${app.id}', 'VERIFIED')">Verify</button>
              ` : ''}
              ${app.status === 'VERIFIED' ? `
                <button class="btn btn-accent" style="padding: 4px 8px; font-size: 0.72rem;" onclick="window.officerPortal.updateStatus('${app.id}', 'SANCTIONED')">Sanction</button>
              ` : ''}
              ${app.status === 'SANCTIONED' ? `
                <button class="btn btn-success" style="padding: 4px 8px; font-size: 0.72rem;" onclick="window.officerPortal.updateStatus('${app.id}', 'DISBURSED')">Disburse</button>
              ` : ''}
              <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.72rem;" onclick="window.officerPortal.viewDossier('${app.id}')">QR Voucher</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async updateStatus(appId, newStatus) {
    const remarks = prompt(`Enter officer remarks for status change to ${newStatus}:`, "Eligibility verified with channel finance guidelines.");
    if (remarks === null) return;

    try {
      const res = await fetch(`${API_BASE}/api/applications/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, officer_remarks: remarks })
      });
      if (res.ok) {
        alert(`Application ${appId} successfully updated to ${newStatus}.`);
        this.loadData();
      }
    } catch (err) {
      console.error("Update status error:", err);
    }
  }

  async viewDossier(appId) {
    try {
      const res = await fetch(`${API_BASE}/api/applications`);
      const data = await res.json();
      const app = (data.applications || []).find(a => a.id === appId);
      if (app) {
        window.renderReferralVoucher(app);
      }
    } catch (err) {
      console.error("View dossier error:", err);
    }
  }
}

window.officerPortal = null;
document.addEventListener('DOMContentLoaded', () => {
  window.officerPortal = new OfficerPortal();
});
