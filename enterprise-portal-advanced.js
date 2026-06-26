/* ================================================
   WITCORP ENTERPRISE PORTAL - ADVANCED
   Real-time Portal Automation + UDIN Auto-Generation
   Version: 2.0 - Production Grade
   ================================================ */

'use strict';

// ================================================
// 1. PORTAL CONFIGURATION & STATE
// ================================================

const ADVANCED_PORTALS = {
  gst: {
    id: 1,
    code: 'GST',
    name: 'GST Portal',
    icon: '📊',
    url: 'https://services.gst.gov.in/services/login',
    color: '#3b82f6',
    category: 'TAX_FILING',
    supports_auto_filing: true,
    filing_types: ['GST-3B', 'GSTR-9', 'IFF']
  },
  mca: {
    id: 2,
    code: 'MCA',
    name: 'MCA Portal',
    icon: '🏛️',
    url: 'https://www.mca.gov.in/mcaserver/login.html',
    color: '#10b981',
    category: 'CORPORATE',
    supports_auto_filing: true,
    filing_types: ['AOC-4', 'DIR-3-KYC', 'RUN']
  },
  itr: {
    id: 3,
    code: 'ITR',
    name: 'Income Tax e-Filing',
    icon: '💰',
    url: 'https://www.incometaxindiaefile.gov.in/e-filing/Session/Login1',
    color: '#f59e0b',
    category: 'TAX_FILING',
    supports_auto_filing: true,
    filing_types: ['ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6']
  },
  pt: {
    id: 4,
    code: 'PT',
    name: 'Professional Tax',
    icon: '🏷️',
    url: 'https://www.ptportal.gov.in/',
    color: '#8b5cf6',
    category: 'TAX_FILING',
    supports_auto_filing: false,
    filing_types: ['PT-RETURN']
  },
  tds: {
    id: 5,
    code: 'TDS',
    name: 'TDS Portal',
    icon: '📋',
    url: 'https://www.tdscpc.gov.in/',
    color: '#ec4899',
    category: 'TAX_FILING',
    supports_auto_filing: true,
    filing_types: ['24Q', '26Q', '27Q', '27EQ']
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
// 2. INITIALIZATION
// ================================================

async function initializeAdvancedPortal() {
  console.log('🚀 Initializing Advanced Enterprise Portal...');
  
  try {
    // Load portal config
    const portals = await supabaseQuery('portal_master', { order: 'priority.asc' });
    STATE.advancedPortals = Array.isArray(portals) ? portals : [];
    
    // Load credentials
    const creds = await supabaseQuery('client_portal_vault', { order: 'client_name.asc' });
    STATE.portalVault = Array.isArray(creds) ? creds : [];
    
    // Load CA Masters
    const cas = await supabaseQuery('ca_masters', { order: 'ca_name.asc' });
    STATE.caMasters = Array.isArray(cas) ? cas : [];
    
    // Load UDIN Records
    const udins = await supabaseQuery('udin_master', { order: 'generated_at.desc', limit: 100 });
    STATE.udinRecords = Array.isArray(udins) ? udins : [];
    
    // Populate dropdowns
    populateClientSelector();
     renderAdvancedPortalCards();
    
    console.log('✅ Advanced portal initialized');
  } catch (error) {
    console.error('❌ Init error:', error);
    showToast('Error initializing portal');
  }
}

// ================================================
// 3. CLIENT SELECTION & AUTO-OPEN PORTALS
// ================================================

async function selectClientAndOpenPortals() {
  const clientSelector = document.getElementById('advClientSelector');
  const clientId = clientSelector?.value;
  
  if (!clientId) {
    showToast('❌ Please select a client');
    return;
  }
  
  const client = STATE.clients.find(c => String(c.id) === String(clientId));
  if (!client) return;
  
  PORTAL_STATE.activeClient = clientId;
  
  // Display client info
  displayClientInfo(client);
  
  // Open all portals with auto-login
  openAllPortalsWithLogin(clientId);
  
  showToast(`✅ Opening all portals for ${client.name}...`);
}

function displayClientInfo(client) {
  const container = document.getElementById('advClientInfoBox');
  if (!container) return;
  
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;font-size:12px">
      <div><span style="color:var(--text-muted)">📊 GST:</span> <strong>${client.gst || '-'}</strong></div>
      <div><span style="color:var(--text-muted)">📋 PAN:</span> <strong>${client.pan || '-'}</strong></div>
      <div><span style="color:var(--text-muted)">👤 Contact:</span> <strong>${client.contact_person || '-'}</strong></div>
      <div><span style="color:var(--text-muted)">📞 Phone:</span> <strong>${client.phone || '-'}</strong></div>
    </div>
  `;
}

async function openAllPortalsWithLogin(clientId) {
  const portals = Object.entries(ADVANCED_PORTALS);
  
  for (const [key, portal] of portals) {
    setTimeout(() => {
      openPortalWithAutoLogin(key, clientId);
    }, 1500); // Stagger openings
  }
}

async function openPortalWithAutoLogin(portalKey, clientId) {
  const portal = ADVANCED_PORTALS[portalKey];
  const client = STATE.clients.find(c => String(c.id) === String(clientId));
  
  if (!client) return;
  
  PORTAL_STATE.activePortal = portalKey;
  PORTAL_STATE.loginInProgress = true;
  
  // Get credentials from vault
  const creds = STATE.portalVault?.find(c => 
    String(c.client_id) === String(clientId) && 
    c.portal_id === portal.id
  );
  
  if (!creds) {
    console.log(`⚠️ No credentials for ${portal.name}`);
    PORTAL_STATE.loginInProgress = false;
    return;
  }
  
  // Open portal
  const portalWindow = window.open(portal.url, `portal_${portalKey}_${Date.now()}`);
  
  if (!portalWindow) {
    console.log('⚠️ Pop-up blocked');
    PORTAL_STATE.loginInProgress = false;
    return;
  }
  
  PORTAL_STATE.openedWindows[portalKey] = {
    window: portalWindow,
    openedAt: new Date(),
    clientId: clientId,
    credentials: creds
  };
  
  // Auto-fill credentials
  let attempts = 0;
  const fillInterval = setInterval(async () => {
    attempts++;
    
    try {
      if (portalWindow.closed) {
        clearInterval(fillInterval);
        await logPortalSession(clientId, portal.id, creds.username, 'CLOSED');
        PORTAL_STATE.loginInProgress = false;
        return;
      }
      
      if (attempts < 20) {
        const userField = portalWindow.document.querySelector(portal.username_field || 'input[type="text"]');
        const passField = portalWindow.document.querySelector(portal.password_field || 'input[type="password"]');
        
        if (userField) {
          userField.value = creds.username;
          userField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (passField) {
          passField.value = creds.password;
          passField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (userField && passField) {
          console.log(`✅ ${portal.name} filled`);
          clearInterval(fillInterval);
          PORTAL_STATE.sessionStartTime = new Date();
          await logPortalSession(clientId, portal.id, creds.username, 'AUTOFILLED');
        }
      } else {
        clearInterval(fillInterval);
        PORTAL_STATE.loginInProgress = false;
      }
    } catch (e) {
      if (attempts >= 20) clearInterval(fillInterval);
    }
  }, 500);
}

// ================================================
// 4. PORTAL CREDENTIALS MANAGEMENT
// ================================================

function managePortalCredentialsAdvanced(portalKey, clientId) {
  const portal = ADVANCED_PORTALS[portalKey];
  const client = STATE.clients.find(c => String(c.id) === String(clientId));
  const existingCred = STATE.portalVault?.find(c => 
    String(c.client_id) === String(clientId) && 
    c.portal_id === portal.id
  );
  
  openModalWithContent(
    `🔐 ${portal.name} - Credentials`,
    `
      <div style="display:grid;gap:14px">
        <div style="background:var(--primary-glow);padding:12px;border-radius:8px">
          <div style="font-size:11px;color:var(--text-muted)">Client</div>
          <div style="font-weight:700;color:var(--primary)">${escapeHtml(client?.name || '')}</div>
        </div>
        
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px">Username *</label>
          <input type="text" class="form-control" id="advCredUsername" placeholder="Username" value="${existingCred?.username || ''}" />
        </div>
        
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px">Password *</label>
          <div style="display:flex;gap:8px">
            <input type="password" class="form-control" id="advCredPassword" placeholder="••••••••" value="${existingCred?.password || ''}" style="flex:1" />
            <button class="btn-outline" onclick="toggleAdvancedPasswordView()" style="padding:8px 12px;font-size:12px">👁️</button>
          </div>
        </div>
        
        <div>
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px">OTP Method (if enabled)</label>
          <select class="form-control" id="advOTPMethod">
            <option value="NONE">None</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
            <option value="AUTHENTICATOR">Authenticator App</option>
          </select>
        </div>
        
        <div style="display:flex;gap:10px">
          <button class="btn-primary" onclick="saveAdvancedCredentials('${portalKey}', '${clientId}')" style="flex:1;padding:10px;font-weight:600">💾 Save</button>
          <button class="btn-outline" onclick="closeModal()" style="flex:1;padding:10px">❌ Cancel</button>
        </div>
      </div>
    `
  );
}

function toggleAdvancedPasswordView() {
  const passInput = document.getElementById('advCredPassword');
  const btn = event.target;
  
  if (passInput?.type === 'password') {
    passInput.type = 'text';
    btn.textContent = '🙈';
  } else {
    passInput.type = 'password';
    btn.textContent = '👁️';
  }
}

async function saveAdvancedCredentials(portalKey, clientId) {
  const username = document.getElementById('advCredUsername')?.value.trim();
  const password = document.getElementById('advCredPassword')?.value;
  const otpMethod = document.getElementById('advOTPMethod')?.value;
  
  if (!username || !password) {
    showToast('❌ Username and password required');
    return;
  }
  
  const portal = ADVANCED_PORTALS[portalKey];
  const existing = STATE.portalVault?.find(c => 
    String(c.client_id) === String(clientId) && 
    c.portal_id === portal.id
  );
  
  const body = {
    client_id: clientId,
    client_name: getClientNameById(clientId),
    portal_id: portal.id,
    username: username,
    password_encrypted: btoa(password), // Basic encoding (use proper encryption in production)
    password_hash: await hashPassword(password),
    otp_enabled: otpMethod !== 'NONE',
    otp_method: otpMethod,
    is_active: true,
    is_verified: false,
    updated_by: getCurrentUserName()
  };
  
  try {
    if (existing) {
      await supabaseUpdate('client_portal_vault', existing.id, body);
      const idx = STATE.portalVault.findIndex(c => c.id === existing.id);
      if (idx !== -1) STATE.portalVault[idx] = { ...STATE.portalVault[idx], ...body };
      showToast(`✅ Updated!`);
    } else {
      const result = await supabaseInsert('client_portal_vault', body);
      if (result && result[0]) {
        STATE.portalVault.push(result[0]);
        showToast(`✅ Saved!`);
      }
    }
    
    closeModal();
    await logAuditAction(clientId, 'SAVE_CREDENTIALS', 'client_portal_vault', portal.id);
  } catch (error) {
    console.error('Save error:', error);
    showToast('❌ Save failed');
  }
}

// ================================================
// 5. ADVANCED UDIN GENERATION
// ================================================

async function generateAdvancedUDIN() {
  const clientId = document.getElementById('advClientSelector')?.value;
  const caId = document.getElementById('advCASelector')?.value;
  const docType = document.getElementById('advDocType')?.value;
  const fy = document.getElementById('advFY')?.value;
  const docDate = document.getElementById('advDocDate')?.value;
  const auditFrom = document.getElementById('advAuditFrom')?.value;
  const auditTo = document.getElementById('advAuditTo')?.value;
  const turnover = document.getElementById('advTurnover')?.value;
  const auditType = document.getElementById('advAuditType')?.value;
  const remarks = document.getElementById('advRemarks')?.value.trim();
  const autoFile = document.getElementById('advAutoFile')?.checked;
  
  // Validation
  if (!clientId || !caId || !docDate || !fy) {
    showToast('❌ Fill required fields');
    return;
  }
  
  PORTAL_STATE.udinGenerationInProgress = true;
  showToast('⏳ Generating UDIN...');
  
  const clientName = getClientNameById(clientId);
  const ca = STATE.caMasters.find(c => String(c.id) === String(caId));
  const caName = ca?.ca_name || '';
  const caICAI = ca?.icai_regno || '';
  
  try {
    // Call Supabase function to generate UDIN
    const { data, error } = await supabaseClient.rpc('fn_create_udin_record', {
      p_client_id: clientId,
      p_client_name: clientName,
      p_ca_id: caId,
      p_ca_name: caName,
      p_ca_icai: caICAI,
      p_doc_type: docType,
      p_fy: fy,
      p_doc_date: docDate,
      p_audit_from: auditFrom || null,
      p_audit_to: auditTo || null,
      p_turnover: parseFloat(turnover) || 0,
      p_audit_type: auditType,
      p_generated_by: getCurrentUserName()
    });
    
    if (error) {
      throw error;
    }
    
    // Get generated UDIN
    const udinRecord = await supabaseQuery('udin_master', { 
      match: { id: data },
      limit: 1
    });
    
    if (udinRecord && udinRecord[0]) {
      const generatedUDIN = udinRecord[0].udin_number;
      
      // Display result
      displayUDINResult(generatedUDIN, udinRecord[0]);
      
      // Schedule auto-filing if enabled
      if (autoFile) {
        scheduleAutoFiling(data, clientId);
      }
      
      showToast('✅ UDIN Generated Successfully!');
      PORTAL_STATE.udinGenerationInProgress = false;
    }
  } catch (error) {
    console.error('UDIN generation error:', error);
    showToast('❌ Generation failed');
    PORTAL_STATE.udinGenerationInProgress = false;
  }
}

function displayUDINResult(udin, record) {
  const container = document.getElementById('advUDINResultContainer');
  if (!container) return;
  
  container.innerHTML = `
    <div style="background:var(--primary-glow);border:2px solid var(--primary);border-radius:12px;padding:20px">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">✅ UDIN Generated</div>
        <div style="
          font-size:36px;font-weight:900;color:var(--primary);
          font-family:'Courier New',monospace;letter-spacing:4px;
          padding:16px;background:var(--bg);border-radius:8px;
          border:2px solid var(--primary);margin-bottom:12px;
        ">${udin}</div>
        <div style="font-size:11px;color:var(--text-muted)">Click to copy or use buttons below</div>
      </div>
      
      <div style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:12px;font-size:11px">
        <div><strong>CA:</strong> ${record.ca_name}</div>
        <div><strong>ICAI:</strong> ${record.ca_icai_regno}</div>
        <div><strong>FY:</strong> ${record.financial_year}</div>
        <div><strong>Generated:</strong> ${formatDateTime(record.generated_at)}</div>
      </div>
      
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px">
        <button class="btn-primary" onclick="copyAdvancedUDIN('${udin}')" style="padding:10px;font-size:12px">📋 Copy</button>
        <button class="btn-primary" onclick="printAdvancedUDIN('${udin}', '${record.ca_name}')" style="padding:10px;font-size:12px">🖨️ Print</button>
        <button class="btn-primary" onclick="downloadAdvancedUDINPDF('${udin}')" style="padding:10px;font-size:12px">📥 PDF</button>
        <button class="btn-primary" onclick="shareAdvancedUDIN('${udin}')" style="padding:10px;font-size:12px">💬 Share</button>
      </div>
    </div>
  `;
}

function copyAdvancedUDIN(udin) {
  navigator.clipboard.writeText(udin);
  showToast('📋 UDIN copied!');
}

function printAdvancedUDIN(udin, caName) {
  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>UDIN Certificate</title>
      <style>
        body { font-family: Arial; padding: 40px; }
        .certificate { border: 2px solid #3b82f6; padding: 40px; border-radius: 10px; }
        h1 { text-align: center; color: #3b82f6; }
        .udin { font-size: 48px; font-weight: bold; text-align: center; letter-spacing: 4px; margin: 30px 0; color: #3b82f6; font-family: 'Courier New'; }
        .info { margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="certificate">
        <h1>🔢 UDIN Certificate</h1>
        <div class="info"><strong>CA Name:</strong> ${caName}</div>
        <div class="udin">${udin}</div>
        <div class="info"><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</div>
        <p style="text-align:center;color:#666;font-size:12px;margin-top:40px">This UDIN has been generated by the system and is valid for filing purposes.</p>
      </div>
      <script>window.print();</script>
    </body>
    </html>
  `);
}

function downloadAdvancedUDINPDF(udin) {
  showToast('📥 PDF generation initiated...');
  // TODO: Integrate PDF library
  showToast('⏳ PDF feature coming soon');
}

function shareAdvancedUDIN(udin) {
  const message = encodeURIComponent(`🔢 UDIN: ${udin}\nGenerated via WITCORP Portal\n${new Date().toLocaleString('en-IN')}`);
  window.open(`https://wa.me/?text=${message}`, '_blank');
}

// ================================================
// 6. AUTO-FILING SCHEDULER
// ================================================

async function scheduleAutoFiling(udinId, clientId) {
  const selectedPortals = Array.from(document.querySelectorAll('.advAutoFilePortal:checked')).map(el => parseInt(el.value));
  
  if (selectedPortals.length === 0) {
    showToast('⚠️ Select portals for auto-filing');
    return;
  }
  
  const scheduleDate = document.getElementById('advFilingScheduleDate')?.value;
  const scheduleTime = document.getElementById('advFilingScheduleTime')?.value;
  
  if (!scheduleDate) {
    showToast('❌ Select filing date');
    return;
  }
  
  const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime || '09:00'}`);
  
  try {
    // Call Supabase function to schedule auto-filing
    const { error } = await supabaseClient.rpc('fn_schedule_auto_filing', {
      p_udin_id: udinId,
      p_portal_ids: selectedPortals,
      p_scheduled_date: scheduledDateTime.toISOString()
    });
    
    if (error) throw error;
    
    showToast(`✅ Auto-filing scheduled for ${selectedPortals.length} portal(s)`);
    
    // Create notification
    createNotification(clientId, 'AUTO_FILING_SCHEDULED', `UDIN scheduled for filing to ${selectedPortals.length} portal(s)`);
  } catch (error) {
    console.error('Schedule error:', error);
    showToast('❌ Scheduling failed');
  }
}

// ================================================
// 7. SESSION MANAGEMENT & LOGGING
// ================================================

async function logPortalSession(clientId, portalId, username, sessionStatus) {
  try {
    const body = {
      client_id: clientId,
      client_name: getClientNameById(clientId),
      portal_id: portalId,
      login_username: username,
      login_timestamp: new Date().toISOString(),
      status: sessionStatus,
      user_agent: navigator.userAgent,
      ip_address: 'browser'
    };
    
    await supabaseInsert('portal_login_audit', body);
  } catch (error) {
    console.error('Logging error:', error);
  }
}

async function logAuditAction(resourceId, action, resourceType, resourceSubId) {
  try {
    const body = {
      user_id: getCurrentUser()?.id,
      action: action,
      resource_type: resourceType,
      resource_id: String(resourceId),
      details: { portal_id: resourceSubId },
      user_agent: navigator.userAgent,
      status: 'SUCCESS'
    };
    
    await supabaseInsert('system_logs', body);
  } catch (error) {
    console.error('Audit error:', error);
  }
}

// ================================================
// 8. NOTIFICATION SYSTEM
// ================================================

async function createNotification(clientId, eventType, message) {
  try {
    const body = {
      client_id: clientId,
      event_type: eventType,
      title: eventType.replace(/_/g, ' '),
      message: message,
      notification_type: 'IN_APP',
      send_email: true,
      status: 'PENDING'
    };
    
    await supabaseInsert('notification_queue', body);
  } catch (error) {
    console.error('Notification error:', error);
  }
}

// ================================================
// 9. UTILITY FUNCTIONS
// ================================================

function populateClientSelector() {
  const selector = document.getElementById('advClientSelector');
  if (!selector || !STATE.clients) return;
  
  selector.innerHTML = `
    <option value="">-- Select Client --</option>
    ${STATE.clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
  `;
}

function populateCASelector() {
  const selector = document.getElementById('advCASelector');
  if (!selector || !STATE.caMasters) return;
  
  selector.innerHTML = `
    <option value="">-- Select CA --</option>
    ${STATE.caMasters.map(ca => `
      <option value="${ca.id}">
        ${escapeHtml(ca.ca_name)} (${ca.icai_regno})
      </option>
    `).join('')}
  `;
}

async function hashPassword(password) {
  // Simple hash - use bcrypt in production
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ================================================
// 10. EXPORT GLOBAL FUNCTIONS
// ================================================

window.initializeAdvancedPortal = initializeAdvancedPortal;
window.selectClientAndOpenPortals = selectClientAndOpenPortals;
window.openPortalWithAutoLogin = openPortalWithAutoLogin;
window.managePortalCredentialsAdvanced = managePortalCredentialsAdvanced;
window.toggleAdvancedPasswordView = toggleAdvancedPasswordView;
window.saveAdvancedCredentials = saveAdvancedCredentials;
window.generateAdvancedUDIN = generateAdvancedUDIN;
window.copyAdvancedUDIN = copyAdvancedUDIN;
window.printAdvancedUDIN = printAdvancedUDIN;
window.downloadAdvancedUDINPDF = downloadAdvancedUDINPDF;
window.shareAdvancedUDIN = shareAdvancedUDIN;
window.scheduleAutoFiling = scheduleAutoFiling;
window.populateClientSelector = populateClientSelector;
window.populateCASelector = populateCASelector;
window.logPortalSession = logPortalSession;
window.createNotification = createNotification;

console.log('✅ enterprise-portal-advanced.js loaded');
function renderAdvancedPortalCards() {
  const container = document.getElementById('advPortalCardsContainer');
  if (!container) return;

  container.innerHTML = Object.entries(ADVANCED_PORTALS).map(([key, portal]) => `
    <div style="
      background:var(--surface);border:1.5px solid var(--border);
      border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:12px;
    ">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:28px">${portal.icon}</span>
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--text)">${portal.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">Click to open</div>
        </div>
      </div>
      <button
        onclick="openPortalWithAutoLogin('${key}', document.getElementById('advClientSelector')?.value)"
        style="
          width:100%;padding:10px;border:none;border-radius:8px;
          font-weight:600;font-size:13px;cursor:pointer;color:#fff;
          background:${portal.color};
        "
      >
        🔓 Open Portal
      </button>
      <button
        onclick="managePortalCredentialsAdvanced('${key}', document.getElementById('advClientSelector')?.value)"
        style="
          width:100%;padding:8px;background:none;border:1.5px solid var(--border);
          border-radius:8px;font-size:12px;cursor:pointer;color:var(--text-muted);
        "
      >
        🔐 Credentials
      </button>
    </div>
  `).join('');
}

window.renderAdvancedPortalCards = renderAdvancedPortalCards;
