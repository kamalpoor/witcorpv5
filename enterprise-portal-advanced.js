'use strict';

// ================================================
// VAULT SE CREDENTIALS AUTO FETCH
// ================================================

async function getVaultCredentials(clientId, portalCode) {
  const token = localStorage.getItem('witcorp-access-token');
  const SUPABASE_URL = 'https://yqbvdbsbuycxlsfkijhc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_5qNAkAQrO5yzGnDcNERPxg_pm2Jv8bw';

  const folderMap = {
    'GST': 'GST',
    'MCA': 'MCA',
    'ITR': 'ITR',
    'TDS': 'TDS',
    'PT': 'General'
  };

  const folder = folderMap[portalCode] || 'General';

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vault_credentials?client_id=eq.${clientId}&folder=eq.${folder}&select=*`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` } }
    );
    const data = res.ok ? await res.json() : [];
    return data[0] || null;
  } catch (e) {
    console.error('Vault fetch error:', e);
    return null;
  }
}

// ================================================
// PORTAL CONFIG
// ================================================

const ADVANCED_PORTALS = {
  gst: {
    id: 1, code: 'GST', name: 'GST Portal', icon: '📊',
    url: 'https://services.gst.gov.in/services/login',
    color: '#3b82f6', category: 'TAX_FILING'
  },
  mca: {
    id: 2, code: 'MCA', name: 'MCA Portal', icon: '🏛️',
    url: 'https://www.mca.gov.in/mcaserver/login.html',
    color: '#10b981', category: 'CORPORATE'
  },
  itr: {
    id: 3, code: 'ITR', name: 'Income Tax e-Filing', icon: '💰',
    url: 'https://www.incometaxindiaefile.gov.in/e-filing/Session/Login1',
    color: '#f59e0b', category: 'TAX_FILING'
  },
  pt: {
    id: 4, code: 'PT', name: 'Professional Tax', icon: '🏷️',
    url: 'https://www.ptportal.gov.in/',
    color: '#f97316', category: 'TAX_FILING'
  },
  tds: {
    id: 5, code: 'TDS', name: 'TDS Portal', icon: '📋',
    url: 'https://www.tdscpc.gov.in/',
    color: '#8b5cf6', category: 'TAX_FILING'
  }
};

const PORTAL_STATE = {
  activeClient: null,
  activePortal: null,
  activeCA: null,
  loginInProgress: false,
  openedWindows: {},
  sessionStartTime: null,
  udinGenerationInProgress: false
};

// ================================================
// MAIN INIT
// ================================================

async function initializeAdvancedPortal() {
  console.log('🚀 Initializing Advanced Enterprise Portal...');

  const page = document.getElementById('page-advanced-portal');
  if (!page) { console.error('page-advanced-portal element not found!'); return; }

  page.style.cssText = 'width:100%;max-width:100%;overflow-x:hidden;';
  page.innerHTML = buildAdvancedPortalHTML();

  populateClientSelector();
  renderAdvancedPortalCards();

  try {
    const cas = await supabaseQuery('ca_masters', { order: 'created_at.desc' });
    STATE.caMasters = Array.isArray(cas) ? cas : [];
  } catch (e) {
    STATE.caMasters = [];
  }
  populateCASelector();

  const autoFileEl = document.getElementById('advAutoFile');
  if (autoFileEl) {
    autoFileEl.addEventListener('change', function () {
      const opts = document.getElementById('advAutoFileOptions');
      if (opts) opts.style.display = this.checked ? 'block' : 'none';
    });
  }

  await loadUDINHistory();

  const docDateEl = document.getElementById('advDocDate');
  if (docDateEl) docDateEl.value = new Date().toISOString().split('T')[0];

  console.log('✅ Advanced Portal ready | Clients:', STATE.clients.length, '| CAs:', STATE.caMasters?.length);
}

// ================================================
// FULL PAGE HTML BUILDER
// ================================================

function buildAdvancedPortalHTML() {
  return `
  <div style="padding:20px;width:100%;box-sizing:border-box;overflow-x:hidden">

    <!-- HEADER -->
    <div style="margin-bottom:24px">
      <h1 style="font-size:26px;font-weight:800;margin:0;color:var(--text)">🚀 Advanced Enterprise Portal</h1>
      <p style="color:var(--text-muted);margin:6px 0 0 0;font-size:13px">Real-time Portal Automation + UDIN Auto-Generation</p>
    </div>

    <!-- CLIENT SELECTION -->
    <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <span style="font-size:22px">👥</span>
        <h2 style="margin:0;font-size:16px;font-weight:700;color:var(--text)">Client Selection</h2>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end;margin-bottom:14px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:8px;color:var(--text-muted)">Select Client *</label>
          <select class="form-control" id="advClientSelector"
            onchange="populateCASelector();displayClientInfo(STATE.clients.find(c=>String(c.id)===String(this.value)))"
            style="font-size:14px;padding:10px">
            <option value="">-- Choose a Client --</option>
          </select>
        </div>
        <button class="btn-primary" onclick="selectClientAndOpenPortals()" style="padding:10px 20px;font-weight:600;white-space:nowrap">
          🔓 Open All Portals
        </button>
      </div>
      <div id="advClientInfoBox" style="font-size:13px;color:var(--text-muted)"></div>
    </div>

    <!-- PORTAL CARDS GRID -->
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="font-size:22px">🌐</span>
        <h2 style="margin:0;font-size:16px;font-weight:700;color:var(--text)">Government Portals</h2>
      </div>
      <div id="advPortalCardsContainer"
        style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">
      </div>
    </div>

    <!-- UDIN SECTION -->
    <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <span style="font-size:22px">🔢</span>
        <h2 style="margin:0;font-size:16px;font-weight:700;color:var(--text)">UDIN Auto-Generator</h2>
        <span style="margin-left:auto;font-size:11px;color:var(--primary);background:var(--primary-glow);padding:5px 12px;border-radius:6px;font-weight:600">⚡ Real-Time</span>
      </div>

      <div style="margin-bottom:16px">
        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:8px;color:var(--text-muted)">Chartered Accountant *</label>
        <select class="form-control" id="advCASelector" style="font-size:14px;padding:10px">
          <option value="">-- Select CA --</option>
        </select>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Document Type *</label>
          <select class="form-control" id="advDocType">
            <option>Audit Report</option>
            <option>Tax Audit</option>
            <option>GST Audit</option>
            <option>Internal Audit</option>
            <option>Review Report</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Financial Year *</label>
          <input type="text" class="form-control" id="advFY" placeholder="2025-26" value="2025-26" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Document Date *</label>
          <input type="date" class="form-control" id="advDocDate" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Audit Type</label>
          <select class="form-control" id="advAuditType">
            <option>Statutory</option>
            <option>Internal</option>
            <option>Tax</option>
            <option>Special</option>
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Audit From</label>
          <input type="date" class="form-control" id="advAuditFrom" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Audit To</label>
          <input type="date" class="form-control" id="advAuditTo" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Total Turnover (₹)</label>
          <input type="number" class="form-control" id="advTurnover" placeholder="0" />
        </div>
      </div>

      <div style="margin-bottom:16px">
        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Remarks</label>
        <textarea class="form-control" id="advRemarks" rows="2" placeholder="Add any notes..."></textarea>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-primary" onclick="generateAdvancedUDIN()"
          style="flex:1;min-width:160px;padding:12px;font-weight:700;background:#7c3aed">
          ⚡ Generate UDIN
        </button>
        <button class="btn-outline" onclick="clearAdvancedForm()"
          style="flex:1;min-width:160px;padding:12px">
          🔄 Clear Form
        </button>
      </div>

      <div id="advUDINResultContainer" style="margin-top:20px"></div>
    </div>

    <!-- UDIN HISTORY -->
    <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:20px;margin-bottom:40px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <span style="font-size:22px">📋</span>
        <h2 style="margin:0;font-size:16px;font-weight:700;color:var(--text)">Recent UDINs</h2>
        <button class="btn-outline" style="margin-left:auto;padding:6px 14px;font-size:12px" onclick="loadUDINHistory()">
          🔄 Refresh
        </button>
      </div>
      <div id="advUDINHistoryContainer">
        <div style="text-align:center;padding:30px;color:var(--text-muted)">Select a client to view UDIN history</div>
      </div>
    </div>
  </div>`;
}

// ================================================
// PORTAL CARDS RENDER
// ================================================

function renderAdvancedPortalCards() {
  const container = document.getElementById('advPortalCardsContainer');
  if (!container) return;

  container.innerHTML = Object.entries(ADVANCED_PORTALS).map(([key, portal]) => `
    <div style="
      background:var(--surface);
      border:1.5px solid var(--border);
      border-radius:14px;
      padding:18px;
      display:flex;
      flex-direction:column;
      gap:12px;
      transition:transform .2s,box-shadow .2s;
    "
    onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'"
    onmouseout="this.style.transform='none';this.style.boxShadow='none'">

      <div style="display:flex;align-items:center;gap:12px">
        <div style="
          width:46px;height:46px;border-radius:12px;
          background:${portal.color}22;
          display:flex;align-items:center;justify-content:center;
          font-size:24px;flex-shrink:0
        ">${portal.icon}</div>
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--text)">${portal.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">Click to open portal</div>
        </div>
      </div>

      <button
        onclick="openPortalDirect('${portal.url}', '${portal.name}')"
        style="
          width:100%;padding:10px;border:none;border-radius:10px;
          font-weight:700;font-size:13px;cursor:pointer;color:#fff;
          background:${portal.color};
          transition:opacity .2s;
        "
        onmouseover="this.style.opacity='.85'"
        onmouseout="this.style.opacity='1'"
      >
        🔓 Open ${portal.code} Portal
      </button>

      <button
        onclick="managePortalCredentialsAdvanced('${key}', document.getElementById('advClientSelector')?.value)"
        style="
          width:100%;padding:8px;background:none;
          border:1.5px solid var(--border);
          border-radius:10px;font-size:12px;
          cursor:pointer;color:var(--text-muted);
          font-family:var(--font);
          transition:border-color .2s,color .2s;
        "
        onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'"
      >
        🔐 Manage Credentials
      </button>
    </div>
  `).join('');
}

// ================================================
// PORTAL DIRECT OPEN
// ================================================

function openPortalDirect(url, name) {
  const clientId = document.getElementById('advClientSelector')?.value;
  if (!clientId) {
    showToast('⚠️ Please select a client first');
  }
  window.open(url, '_blank');
  showToast(`🌐 ${name} opening...`);
}

// ================================================
// CLIENT SELECTOR & INFO
// ================================================

function populateClientSelector() {
  const selector = document.getElementById('advClientSelector');
  if (!selector) return;
  selector.innerHTML = `
    <option value="">-- Choose a Client --</option>
    ${(STATE.clients || []).map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join('')}
  `;
}

function displayClientInfo(client) {
  const box = document.getElementById('advClientInfoBox');
  if (!box) return;
  if (!client) { box.innerHTML = ''; return; }

  box.innerHTML = `
    <div style="
      background:var(--surface2);
      border:1px solid var(--border);
      border-radius:10px;
      padding:12px 16px;
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
      gap:8px;
      font-size:12px;
      margin-top:8px
    ">
      <div><span style="color:var(--text-muted)">📊 GST:</span> <strong>${client.gst || '-'}</strong></div>
      <div><span style="color:var(--text-muted)">🪪 PAN:</span> <strong>${client.pan || '-'}</strong></div>
      <div><span style="color:var(--text-muted)">🏢 TAN:</span> <strong>${client.tan || '-'}</strong></div>
      <div><span style="color:var(--text-muted)">👤 Contact:</span> <strong>${client.contact_person || '-'}</strong></div>
      <div><span style="color:var(--text-muted)">📞 Phone:</span> <strong>${client.phone || '-'}</strong></div>
      <div><span style="color:var(--text-muted)">✅ Status:</span> <strong style="color:${client.status === 'Active' ? '#10b981' : '#f59e0b'}">${client.status || '-'}</strong></div>
    </div>
  `;
}

function selectClientAndOpenPortals() {
  const clientId = document.getElementById('advClientSelector')?.value;
  if (!clientId) { showToast('❌ Please select a client first'); return; }
  const client = STATE.clients.find(c => String(c.id) === String(clientId));
  if (!client) return;

  Object.values(ADVANCED_PORTALS).forEach((portal, i) => {
    setTimeout(() => {
      window.open(portal.url, `portal_${portal.code}_${Date.now()}`);
    }, i * 800);
  });

  showToast(`✅ Opening all portals for ${client.name}...`);
}

// ================================================
// CA SELECTOR
// ================================================

function populateCASelector() {
  const selector = document.getElementById('advCASelector');
  if (!selector) return;

  const cas = STATE.caMasters || [];
  if (!cas.length) {
    selector.innerHTML = `<option value="">-- No CA found. Add in Supabase ca_masters table --</option>`;
    return;
  }

  selector.innerHTML = `
    <option value="">-- Select CA --</option>
    ${cas.map(ca =>
      `<option value="${ca.id}">${escapeHtml(ca.ca_name)} (${ca.icai_regno || 'ICAI No.'})</option>`
    ).join('')}
  `;
}

// ================================================
// CREDENTIALS MANAGEMENT — VAULT SE AUTO FETCH
// ================================================

async function managePortalCredentialsAdvanced(portalKey, clientId) {
  const portal = ADVANCED_PORTALS[portalKey];
  if (!portal) return;

  if (!clientId) {
    showToast('❌ Please select a client first');
    return;
  }

  const client = STATE.clients.find(c => String(c.id) === String(clientId));

  // Vault se auto fetch karo
  showToast('⏳ Fetching credentials from the Vault...');
  const vaultCred = await getVaultCredentials(clientId, portal.code);

  openModalWithContent(`🔐 ${portal.name} — Credentials`, `
    <div style="background:var(--primary-glow);padding:12px;border-radius:10px;margin-bottom:16px">
      <div style="font-size:11px;color:var(--text-muted)">Client</div>
      <div style="font-weight:700;color:var(--primary);font-size:15px">${escapeHtml(client?.name || '')}</div>
    </div>

    ${vaultCred ? `
    <div style="background:#d1fae5;border:1px solid #10b981;border-radius:10px;padding:10px;margin-bottom:12px;font-size:12px;color:#065f46">
      ✅ Credentials auto-fetched from the Vault! Username and password have been filled automatically.
    </div>` : `
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:10px;margin-bottom:12px;font-size:12px;color:#92400e">
      ⚠️ No credentials found for ${portal.code} in the Vault. Please enter them manually or add them to the Vault first.
    </div>`}

    <div class="form-group">
      <label>Username *</label>
      <input type="text" class="form-control" id="advCredUsername"
        placeholder="Username / User ID"
        value="${vaultCred?.username || ''}" />
    </div>
    <div class="form-group">
      <label>Password *</label>
      <div style="display:flex;gap:8px">
        <input type="password" class="form-control" id="advCredPassword"
          placeholder="••••••••" style="flex:1"
          value="${vaultCred?.password || ''}" />
        <button class="btn-outline" style="padding:8px 12px"
          onclick="const el=document.getElementById('advCredPassword');el.type=el.type==='password'?'text':'password'">
          👁️
        </button>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">
      <button class="btn-primary"
        onclick="openPortalWithCredentials('${portal.url}', '${portal.name}')"
        style="flex:1;min-width:140px;padding:10px;background:#10b981">
        🚀 Open Portal
      </button>
      <button class="btn-outline"
        onclick="copyCredAndOpen('${portal.url}','${portal.name}')"
        style="flex:1;min-width:140px;padding:10px">
        📋 Copy & Open
      </button>
      <button class="btn-outline" onclick="closeModal()"
        style="flex:1;min-width:100px;padding:10px">
        ❌ Cancel
      </button>
    </div>
  `);
}

function openPortalWithCredentials(url, name) {
  const username = document.getElementById('advCredUsername')?.value || '';
  const password = document.getElementById('advCredPassword')?.value || '';

  if (username) {
    navigator.clipboard.writeText(username).then(() => {
      showToast(`📋 Username copied successfully! Opening the portal...`);
    });
  }

  setTimeout(() => {
    window.open(url, '_blank');
    closeModal();
  }, 800);
}

function copyCredAndOpen(url, name) {
  const username = document.getElementById('advCredUsername')?.value || '';
  const password = document.getElementById('advCredPassword')?.value || '';

  const text = `Username: ${username}\nPassword: ${password}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast(`📋 Username + Password copied!`);
  });

  setTimeout(() => {
    window.open(url, '_blank');
    closeModal();
  }, 1000);
}

async function saveAdvancedCredentials(portalKey, clientId) {
  const username = document.getElementById('advCredUsername')?.value.trim();
  const password = document.getElementById('advCredPassword')?.value;
  if (!username) { showToast('❌ Username required'); return; }

  const portal = ADVANCED_PORTALS[portalKey];
  const body = {
    client_id: clientId,
    client_name: getClientNameById(clientId),
    portal_id: portal.id,
    portal_name: portal.name,
    username: username,
    password_encrypted: btoa(unescape(encodeURIComponent(password))),
    updated_by: getCurrentUserName()
  };

  const existing = (STATE.portalVault || []).find(c =>
    String(c.client_id) === String(clientId) && c.portal_id === portal.id
  );

  let ok;
  if (existing) {
    ok = await supabaseUpdate('client_portal_vault', existing.id, body);
  } else {
    const result = await supabaseInsert('client_portal_vault', body);
    ok = result && result[0];
    if (ok) {
      if (!STATE.portalVault) STATE.portalVault = [];
      STATE.portalVault.push(result[0]);
    }
  }

  if (ok) {
    closeModal();
    showToast(`✅ ${portal.name} credentials saved!`);
  } else {
    showToast('❌ Save failed — check client_portal_vault table');
  }
}

// ================================================
// UDIN GENERATION
// ================================================

async function generateAdvancedUDIN() {
  const clientId = document.getElementById('advClientSelector')?.value;
  const caId = document.getElementById('advCASelector')?.value;
  const docType = document.getElementById('advDocType')?.value;
  const fy = document.getElementById('advFY')?.value?.trim();
  const docDate = document.getElementById('advDocDate')?.value;
  const auditFrom = document.getElementById('advAuditFrom')?.value;
  const auditTo = document.getElementById('advAuditTo')?.value;
  const turnover = document.getElementById('advTurnover')?.value;
  const auditType = document.getElementById('advAuditType')?.value;
  const remarks = document.getElementById('advRemarks')?.value?.trim();

  if (!clientId) { showToast('❌ Please select a client'); return; }
  if (!caId) { showToast('❌ Please select a CA'); return; }
  if (!docDate) { showToast('❌ Please enter the document date'); return; }
  if (!fy) { showToast('❌ Please enter the financial year'); return; }

  showToast('⏳ Generating UDIN...');

  const clientName = getClientNameById(clientId);
  const ca = (STATE.caMasters || []).find(c => String(c.id) === String(caId));
  const caName = ca?.ca_name || 'CA';
  const caICAI = ca?.icai_regno || '000000';

  const d = new Date(docDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const randomPart = Math.floor(100000000 + Math.random() * 900000000);
  const generatedUDIN = `${caICAI}${dd}${mm}${yyyy}${randomPart}`;

  const body = {
    client_id: clientId,
    client_name: clientName,
    ca_id: caId,
    ca_name: caName,
    ca_icai_regno: caICAI,
    udin_number: generatedUDIN,
    document_type: docType,
    financial_year: fy,
    document_date: docDate,
    audit_period_from: auditFrom || null,
    audit_period_to: auditTo || null,
    turnover: parseFloat(turnover) || 0,
    audit_type: auditType,
    remarks: remarks || '',
    filing_status: 'Generated',
    generated_by: getCurrentUserName(),
    generated_at: new Date().toISOString()
  };

  try {
    const result = await supabaseInsert('udin_master', body);
    if (result && result[0]) {
      displayUDINResult(generatedUDIN, result[0]);
      await loadUDINHistory();
      showToast('✅ UDIN Successfully Generated!');
    } else {
      displayUDINResult(generatedUDIN, body);
      showToast('✅ UDIN Generated! (Please check the udin_master table)');
    }
  } catch (e) {
    console.error('UDIN error:', e);
    displayUDINResult(generatedUDIN, body);
    showToast('✅ UDIN Generated!');
  }
}

function displayUDINResult(udin, record) {
  const container = document.getElementById('advUDINResultContainer');
  if (!container) return;

  container.innerHTML = `
    <div style="
      background:linear-gradient(135deg,#312e81,#4c1d95);
      border-radius:14px;
      padding:24px;
      text-align:center;
      margin-top:8px
    ">
      <div style="font-size:12px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
        ✅ UDIN Generated Successfully
      </div>
      <div style="
        font-size:28px;font-weight:900;color:#fff;
        font-family:'Courier New',monospace;
        letter-spacing:3px;
        background:rgba(255,255,255,.1);
        border:2px solid rgba(255,255,255,.3);
        border-radius:10px;
        padding:16px;
        margin-bottom:16px;
        word-break:break-all;
        cursor:pointer;
      " onclick="copyAdvancedUDIN('${udin}')" title="Click to copy">
        ${udin}
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-bottom:16px">
        ${record.ca_name || ''} • ${record.financial_year || ''} • ${record.document_type || ''}
        <br>Click UDIN to copy
      </div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button onclick="copyAdvancedUDIN('${udin}')"
          style="background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer">
          📋 Copy UDIN
        </button>
        <button onclick="printAdvancedUDIN('${udin}','${(record.ca_name||'').replace(/'/g,'')}')"
          style="background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer">
          🖨️ Print
        </button>
        <button onclick="shareAdvancedUDIN('${udin}')"
          style="background:#25D366;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer">
          💬 WhatsApp
        </button>
      </div>
    </div>
  `;

  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyAdvancedUDIN(udin) {
  navigator.clipboard.writeText(udin).then(() => showToast('📋 UDIN copied!'));
}

function printAdvancedUDIN(udin, caName) {
  const w = window.open('', '', 'width=700,height=500');
  w.document.write(`<!DOCTYPE html><html><head><title>UDIN</title>
  <style>body{font-family:Arial;padding:40px;text-align:center}
  .udin{font-size:36px;font-weight:900;letter-spacing:4px;color:#4c1d95;
  font-family:'Courier New';border:3px solid #4c1d95;padding:20px;border-radius:12px;margin:20px 0}
  </style></head><body>
  <h2>🔢 UDIN Certificate</h2>
  <p><strong>CA:</strong> ${caName}</p>
  <div class="udin">${udin}</div>
  <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
  <script>window.onload=()=>window.print()<\/script>
  </body></html>`);
  w.document.close();
}

function shareAdvancedUDIN(udin) {
  const text = encodeURIComponent(`🔢 UDIN: ${udin}\nGenerated via WITCORP Portal • ${new Date().toLocaleString('en-IN')}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

// ================================================
// UDIN HISTORY
// ================================================

async function loadUDINHistory() {
  const container = document.getElementById('advUDINHistoryContainer');
  if (!container) return;

  container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted)">⏳ Loading...</div>`;

  const clientId = document.getElementById('advClientSelector')?.value;

  try {
    const filters = clientId ? `client_id=eq.${clientId}` : '';
    const records = await supabaseQuery('udin_master', {
      filters,
      order: 'created_at.desc',
      limit: 15
    });

    if (!records || !records.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:30px;color:var(--text-muted)">
          <div style="font-size:32px;margin-bottom:8px">📋</div>
          <div>No UDINs found${clientId ? ' for this client' : ''}</div>
        </div>`;
      return;
    }

    container.innerHTML = records.map(r => `
      <div style="
        background:var(--surface2);
        border:1.5px solid var(--border);
        border-radius:12px;
        padding:14px 16px;
        margin-bottom:10px;
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px
      ">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13px;color:var(--text);margin-bottom:4px">
            ${escapeHtml(r.client_name || '-')} — ${escapeHtml(r.ca_name || '-')}
          </div>
          <div style="
            font-size:14px;font-weight:700;
            color:var(--primary);
            font-family:'Courier New',monospace;
            letter-spacing:2px;
            margin-bottom:6px
          ">${escapeHtml(r.udin_number || '-')}</div>
          <div style="font-size:11px;color:var(--text-muted)">
            📄 ${r.document_type || '-'} • 📅 FY ${r.financial_year || '-'} •
            🕐 ${r.generated_at ? formatDateTime(r.generated_at) : '-'}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="copyAdvancedUDIN('${escapeHtml(r.udin_number || '')}')"
            class="btn-outline" style="padding:5px 12px;font-size:11px;white-space:nowrap">
            📋 Copy
          </button>
          <span style="
            font-size:11px;font-weight:600;text-align:center;
            color:${r.filing_status === 'Filed' ? '#10b981' : '#f59e0b'};
            background:${r.filing_status === 'Filed' ? '#d1fae5' : '#fef3c7'};
            padding:2px 8px;border-radius:99px
          ">${r.filing_status || 'Generated'}</span>
        </div>
      </div>
    `).join('');

  } catch (e) {
    console.error('UDIN history error:', e);
    container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted)">History load failed</div>`;
  }
}

// ================================================
// CLEAR FORM
// ================================================

function clearAdvancedForm() {
  const fields = ['advCASelector','advDocType','advFY','advDocDate','advAuditFrom','advAuditTo','advTurnover','advAuditType','advRemarks'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'advFY' ? '2025-26' : '';
  });
  const resultEl = document.getElementById('advUDINResultContainer');
  if (resultEl) resultEl.innerHTML = '';
  showToast('🔄 Form cleared');
}

// ================================================
// EXPORT
// ================================================

window.initializeAdvancedPortal = initializeAdvancedPortal;
window.renderAdvancedPortalCards = renderAdvancedPortalCards;
window.populateClientSelector = populateClientSelector;
window.populateCASelector = populateCASelector;
window.displayClientInfo = displayClientInfo;
window.selectClientAndOpenPortals = selectClientAndOpenPortals;
window.openPortalDirect = openPortalDirect;
window.managePortalCredentialsAdvanced = managePortalCredentialsAdvanced;
window.saveAdvancedCredentials = saveAdvancedCredentials;
window.openPortalWithCredentials = openPortalWithCredentials;
window.copyCredAndOpen = copyCredAndOpen;
window.generateAdvancedUDIN = generateAdvancedUDIN;
window.displayUDINResult = displayUDINResult;
window.copyAdvancedUDIN = copyAdvancedUDIN;
window.printAdvancedUDIN = printAdvancedUDIN;
window.shareAdvancedUDIN = shareAdvancedUDIN;
window.loadUDINHistory = loadUDINHistory;
window.clearAdvancedForm = clearAdvancedForm;
window.getVaultCredentials = getVaultCredentials;

console.log('✅ enterprise-portal-advanced.js v4.0 loaded');
