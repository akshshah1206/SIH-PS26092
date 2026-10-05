// Geo-Spatial Partner Locator & Intelligent Router using Leaflet
class PartnerMapRouter {
  constructor() {
    this.map = null;
    this.markersGroup = null;
    this.userMarker = null;
    this.currentLat = 28.6139; // Default Delhi
    this.currentLon = 77.2090;
    this.selectedSchemeId = null;
    this.selectedSchemeName = null;
    this.selectedLoanAmount = null;
    this.partnersData = [];
    this.filterType = 'ALL';
    this.allowHighNpa = false;

    this.partnerListContainer = document.getElementById('partnerList');
    this.partnerFilterSelect = document.getElementById('partnerTypeFilter');
    this.npaToggle = document.getElementById('allowHighNpaToggle');
    this.cityPresetSelect = document.getElementById('cityPresetSelect');

    this.initMap();
    this.bindEvents();
    this.fetchAndRenderPartners();
  }

  initMap() {
    const mapEl = document.getElementById('mapContainer');
    if (!mapEl) return;

    // Center on India
    this.map = L.map('mapContainer').setView([this.currentLat, this.currentLon], 11);

    // OpenStreetMap standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors | MoSJE SIH 26092'
    }).addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);

    // Place user marker
    this.updateUserMarker();
  }

  updateUserMarker() {
    if (this.userMarker) this.map.removeLayer(this.userMarker);

    const userIcon = L.divIcon({
      className: 'user-pin-icon',
      html: `<div style="background: #2563eb; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
      iconSize: [20, 20]
    });

    this.userMarker = L.marker([this.currentLat, this.currentLon], { icon: userIcon })
      .addTo(this.map)
      .bindPopup("<b>Your Location</b><br>Beneficiary Anchor Point")
      .openPopup();
  }

  bindEvents() {
    if (this.partnerFilterSelect) {
      this.partnerFilterSelect.addEventListener('change', (e) => {
        this.filterType = e.target.value;
        this.fetchAndRenderPartners();
      });
    }

    if (this.npaToggle) {
      this.npaToggle.addEventListener('change', (e) => {
        this.allowHighNpa = e.target.checked;
        this.fetchAndRenderPartners();
      });
    }

    if (this.cityPresetSelect) {
      this.cityPresetSelect.addEventListener('change', (e) => {
        const coords = e.target.value.split(',');
        if (coords.length === 2) {
          this.currentLat = parseFloat(coords[0]);
          this.currentLon = parseFloat(coords[1]);
          this.map.setView([this.currentLat, this.currentLon], 11);
          this.updateUserMarker();
          this.fetchAndRenderPartners();
        }
      });
    }

    const gpsBtn = document.getElementById('detectLocationBtn');
    if (gpsBtn) {
      gpsBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              this.currentLat = pos.coords.latitude;
              this.currentLon = pos.coords.longitude;
              this.map.setView([this.currentLat, this.currentLon], 12);
              this.updateUserMarker();
              this.fetchAndRenderPartners();
            },
            (err) => {
              alert("Could not access GPS location. Switched to Delhi default.");
            }
          );
        }
      });
    }
  }

  filterByScheme(schemeId, schemeName, loanAmount) {
    this.selectedSchemeId = schemeId;
    this.selectedSchemeName = schemeName;
    this.selectedLoanAmount = loanAmount;

    const banner = document.getElementById('locatorActiveSchemeBanner');
    if (banner) {
      banner.style.display = 'flex';
      banner.innerHTML = `
        <div style="flex: 1;">
          <strong>Active Scheme Filter:</strong> ${schemeName} (Req: ₹${Math.round(loanAmount).toLocaleString('en-IN')})
        </div>
        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.76rem;" onclick="window.partnerMapRouter.clearSchemeFilter()">Clear Filter</button>
      `;
    }

    this.fetchAndRenderPartners();
  }

  clearSchemeFilter() {
    this.selectedSchemeId = null;
    this.selectedSchemeName = null;
    this.selectedLoanAmount = null;
    const banner = document.getElementById('locatorActiveSchemeBanner');
    if (banner) banner.style.display = 'none';
    this.fetchAndRenderPartners();
  }

  async fetchAndRenderPartners() {
    let url = `${API_BASE}/api/partners?lat=${this.currentLat}&lon=${this.currentLon}&partner_type=${this.filterType}&allow_high_npa=${this.allowHighNpa}`;
    if (this.selectedSchemeId) {
      url += `&scheme_id=${this.selectedSchemeId}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      this.partnersData = data.partners || [];
      this.renderMapMarkers(this.partnersData);
      this.renderSidebar(this.partnersData);
    } catch (err) {
      console.error("Partner router API error:", err);
    }
  }

  renderMapMarkers(partners) {
    if (!this.markersGroup) return;
    this.markersGroup.clearLayers();

    partners.forEach(p => {
      let pinColor = '#10b981'; // Green active
      if (p.health_status === 'QUOTA_LOW') pinColor = '#f59e0b'; // Amber low quota
      if (p.health_status === 'RESTRICTED_NPA') pinColor = '#ef4444'; // Red frozen NPA

      const customIcon = L.divIcon({
        className: 'custom-partner-marker',
        html: `
          <div style="
            background: ${pinColor};
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 10px;">
              ${p.partner_type[0]}
            </span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      });

      const marker = L.marker([p.latitude, p.longitude], { icon: customIcon }).addTo(this.markersGroup);

      const popupContent = `
        <div style="font-family: inherit; font-size: 0.82rem; min-width: 220px;">
          <div style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: ${pinColor}; margin-bottom: 2px;">
            ${p.partner_type} • Status: ${p.health_status}
          </div>
          <strong style="font-size: 0.95rem; color: #0f172a;">${p.name}</strong>
          <div style="color: #64748b; margin: 4px 0;">${p.district}, ${p.state} (${p.distance_km} km)</div>
          <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; margin: 6px 0;">
            <div><strong>Gross NPA:</strong> ${p.gross_npa_pct}%</div>
            <div><strong>Fund Utilization:</strong> ${p.fund_utilization_pct}% (Allocated: ₹${p.allocated_fund_crores} Cr)</div>
            <div><strong>Avg SLA:</strong> ${p.avg_disbursement_days} Days</div>
          </div>
          ${p.is_eligible_for_routing ? `
            <button class="btn btn-primary" style="width: 100%; font-size: 0.76rem; padding: 6px;" onclick="window.partnerMapRouter.selectPartnerForApplication('${p.id}')">
              Select This Partner
            </button>
          ` : `
            <div style="color: #dc2626; font-size: 0.72rem; font-weight: 600;">⚠️ Choked Channel: Excluded from automated application routing due to excessive NPA.</div>
          `}
        </div>
      `;

      marker.bindPopup(popupContent);
    });
  }

  renderSidebar(partners) {
    if (!this.partnerListContainer) return;

    if (partners.length === 0) {
      this.partnerListContainer.innerHTML = `<p style="padding: 16px; color: var(--slate-500);">No channel partners matched the current filter criteria.</p>`;
      return;
    }

    this.partnerListContainer.innerHTML = partners.map(p => {
      let badgeClass = 'status-active';
      let badgeLabel = 'Active & Funded';
      if (p.health_status === 'QUOTA_LOW') {
        badgeClass = 'status-quota-low';
        badgeLabel = 'Quota >95%';
      } else if (p.health_status === 'RESTRICTED_NPA') {
        badgeClass = 'status-restricted';
        badgeLabel = 'Restricted NPA >10%';
      }

      return `
        <div class="partner-card ${!p.is_eligible_for_routing ? 'restricted' : ''}" onclick="window.partnerMapRouter.panToPartner(${p.latitude}, ${p.longitude})">
          <div class="partner-badge-row">
            <span class="badge-status ${badgeClass}">${badgeLabel}</span>
            <span class="badge-status" style="background: var(--slate-100); color: var(--slate-700);">${p.partner_type}</span>
            <span style="margin-left: auto; font-size: 0.74rem; font-weight: 700; color: var(--primary-600);">${p.distance_km} km away</span>
          </div>

          <div class="partner-name">${p.name}</div>
          <div class="partner-meta">${p.address}</div>

          <div class="partner-health-pills">
            <div class="health-pill" style="color: ${p.gross_npa_pct < 6 ? 'var(--emerald-600)' : 'var(--danger-600)'};">
              NPA: ${p.gross_npa_pct}%
            </div>
            <div class="health-pill">
              Utilized: ${p.fund_utilization_pct}%
            </div>
            <div class="health-pill">
              Turnaround: ~${p.avg_disbursement_days}d
            </div>
          </div>

          <div style="font-size: 0.74rem; color: var(--slate-600); margin-top: 8px;">
            <strong>Nodal Officer:</strong> ${p.nodal_officer} (${p.phone})
          </div>

          ${p.is_eligible_for_routing ? `
            <div style="margin-top: 10px; display: flex; gap: 6px;">
              <button class="btn btn-outline" style="flex: 1; font-size: 0.74rem; padding: 5px;" onclick="event.stopPropagation(); window.partnerMapRouter.panToPartner(${p.latitude}, ${p.longitude})">
                Show on Map
              </button>
              <button class="btn btn-primary" style="flex: 1.2; font-size: 0.74rem; padding: 5px;" onclick="event.stopPropagation(); window.partnerMapRouter.selectPartnerForApplication('${p.id}')">
                Route Here & Apply
              </button>
            </div>
          ` : `
            <div style="margin-top: 8px; font-size: 0.72rem; color: var(--danger-600); font-weight: 600;">
              ⛔ Auto-Route Blocked: High NPA Node
            </div>
          `}
        </div>
      `;
    }).join('');
  }

  panToPartner(lat, lon) {
    if (this.map) {
      this.map.setView([lat, lon], 14, { animate: true });
    }
  }

  selectPartnerForApplication(partnerId) {
    const partner = this.partnersData.find(p => p.id === partnerId);
    if (!partner) return;

    window.selectedPartnerForApplication = partner;

    // Open Application modal
    if (window.openApplicationModal) {
      window.openApplicationModal(partner, this.selectedSchemeId, this.selectedLoanAmount);
    }
  }
}

window.partnerMapRouter = null;
document.addEventListener('DOMContentLoaded', () => {
  // Leaflet map requires container to be visible; initialized on tab switch or dom load
  window.partnerMapRouter = new PartnerMapRouter();
});
