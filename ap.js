/* =============================================================
   WITCORP DASHBOARD - app.js
   Supabase Connected Version
   ============================================================= */

/* =========================================================
   1. SUPABASE CONFIG — Yahan teri keys hain
   ========================================================= */

const SUPABASE_URL = 'https://yqbvdbsbuycxlsfkijhc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5qNAkAQrO5yzGnDcNERPxg_pm2Jv8bw';

// Supabase REST API helper
async function supabase(table, options = {}) {
  const {
    method = 'GET',
    filters = '',
    body = null,
    select = '*',
    order = 'created_at.desc',
    limit = null
  } = options;

  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
  if (filters) url += `&${filters}`;
  if (order) url += `&order=${order}`;
  if (limit) url += `&limit=${limit}`;

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Supabase error [${table}]:`, err);
    return [];
  }

  if (method === 'DELETE' || method === 'PATCH') return true;
  const data = await res.json();
  return data;
}

async function supabaseInsert(table, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) { console.error('Insert error:', await res.text()); return null; }
  return await res.json();
}

async function supabaseUpdate(table, id, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) { console.error('Update error:', await res.text()); return null; }
  return true;
}

async function supabaseDelete(table, id) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });
  return res.ok;
}

/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

const STATE = {
  currentPage: 'dashboard',
  darkMode: false,
  sidebarOpen: false,
  notifOpen: false,
  activeTheme: 'theme-violet',
  calendar: { month: 4, year: 2025 },
  pagination: { clients: { page: 1, perPage: 10 } },
  filters: { clients: { search: '', status: '', type: '' } },
  activeChatContact: 'rajesh',
  // cached data from DB
  clients: [],
  gstReturns: [],
  rocFilings: [],
  itrFilings: [],
  tdsReturns: [],
  audits: [],
  dscRecords: [],
  accountingEntries: [],
  tasks: [],
  documents: [],
  calendarEvents: [],
  // dashboard stats
  stats: { clients: 0, gstFiled: 0, pendingTasks: 0, upcomingDue: 0, todayFilings: 0 }
};

/* =========================================================
   3. TEAM CHAT (Local — no DB needed)
   ========================================================= */

const TEAM_CONTACTS = [
  { id: 'rajesh', name: 'Rajesh Kumar', initial: 'R', online: true, last: 'Sure, I will check the GST portal' },
  { id: 'anjali', name: 'Anjali Rao', initial: 'A', online: true, last: 'Audit report draft is ready' },
  { id: 'sameer', name: 'Sameer Joshi', initial: 'S', online: false, last: 'Sent the AOC-4 documents' },
  { id: 'priya', name: 'Priya Desai', initial: 'P', online: true, last: 'Thanks for the update!' },
  { id: 'vikram', name: 'Vikram Singh', initial: 'V', online: false, last: 'Will join the call at 4 PM' }
];

const TEAM_MESSAGES = {
  rajesh: [
    { from: 'them', text: 'Hi Karan, the GSTR-1 for Sunrise Textiles is almost ready.', time: '10:02 AM' },
    { from: 'me', text: 'Great, please file it before tomorrow evening.', time: '10:05 AM' },
    { from: 'them', text: 'Sure, I will check the GST portal and confirm once filed.', time: '10:06 AM' }
  ],
  anjali: [
    { from: 'them', text: 'The audit report draft for TechNova is ready for review.', time: '9:40 AM' },
    { from: 'me', text: 'Awesome, send it over, I will review by EOD.', time: '9:42 AM' }
  ],
  sameer: [
    { from: 'them', text: 'Karan, sent the AOC-4 documents for National Plastics.', time: 'Yesterday' },
    { from: 'me', text: 'Got it, thanks Sameer.', time: 'Yesterday' }
  ],
  priya: [
    { from: 'me', text: 'Please update the client master sheet with new entries.', time: 'Yesterday' },
    { from: 'them', text: 'Thanks for the update! Will do it today.', time: 'Yesterday' }
  ],
  vikram: [
    { from: 'them', text: 'We have a client call scheduled at 4 PM today.', time: 'Mon' },
    { from: 'me', text: 'Noted, will join.', time: 'Mon' }
  ]
};

/* =========================================================
   4. AI RESPONSES
   ========================================================= */

function getAIResponse(query) {
  const q = query.toLowerCase().trim();
  const { clients, gstReturns, tasks, tdsReturns } = STATE;

  if (q.includes('gst') && (q.includes('pending') || q.includes('show'))) {
    const pending = gstReturns.filter(g => g.status === 'Pending' || g.status === 'Overdue');
    if (!pending.length) return 'No pending GST returns right now! 🎉';
    let txt = `${pending.length} GST returns need attention:<br><br>`;
    pending.forEach(g => {
      txt += `• <strong>${escapeHtml(g.client_name)}</strong> — ${g.return_type} (${g.period}) — <span style="color:${g.status==='Overdue'?'var(--danger)':'var(--warning)'}">${g.status}</span><br>`;
    });
    return txt;
  }
  if (q.includes('task') || q.includes('pending')) {
    const p = tasks.filter(t => t.column_name !== 'done');
    let txt = `${p.length} tasks pending:<br><br>`;
    p.slice(0, 6).forEach(t => {
      txt += `• <strong>${escapeHtml(t.title)}</strong> — ${t.column_name === 'todo' ? 'To Do' : 'In Progress'}, due ${t.due_date || 'TBD'}<br>`;
    });
    return txt;
  }
  if (q.includes('tds')) {
    const filed = tdsReturns.filter(t => t.status === 'Filed').length;
    const pend = tdsReturns.filter(t => t.status === 'Pending').length;
    return `TDS Summary:<br>✅ Filed: <strong>${filed}</strong><br>⏳ Pending: <strong>${pend}</strong>`;
  }
  if (q.includes('client')) {
    const active = clients.filter(c => c.status === 'Active').length;
    return `Total clients: <strong>${clients.length}</strong><br>Active: <strong>${active}</strong><br>Pending: <strong>${clients.filter(c=>c.status==='Pending').length}</strong>`;
  }
  if (q.includes('upcoming') || q.includes('due') || q.includes('compliance')) {
    return `Check the <strong>Calendar</strong> page for all upcoming due dates. Click 📅 Calendar in the sidebar!`;
  }

  const defaults = [
    'I can help with GST, TDS, ITR, clients, tasks & more. Try asking "show pending GST returns"!',
    'Ask me about: pending tasks, GST status, TDS filings, client list, upcoming compliances.',
    'Namaste! Try: "pending tasks", "GST due this week", "TDS filing status"'
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

/* =========================================================
   5. INITIALIZATION
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setCurrentDate();
  attachGlobalListeners();
  renderTeamContacts();
  renderTeamMessages();

  // Load all data from Supabase
  showPageLoader(true);
  await loadAllData();
  showPageLoader(false);

  // Render everything
  updateDashboardStats();
  renderClientTable();
  renderGSTPage();
  renderROCTable();
  renderITRList();
  renderTDSTable();
  renderAuditTable();
  renderDSCAlerts();
  renderAccountingList();
  renderKanban();
  renderDocuments();
  renderCalendar();
  renderEventList();
  renderDueDates();
  renderActivity();
  renderBarChart();
});

function showPageLoader(show) {
  let loader = document.getElementById('pageLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'pageLoader';
    loader.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(255,255,255,0.85);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      z-index:9999;font-family:Inter,sans-serif;
    `;
    loader.innerHTML = `
      <div class="spinner"></div>
      <div style="margin-top:16px;font-size:14px;font-weight:600;color:#6366f1">Loading WITCORP...</div>
      <div style="font-size:12px;color:#64748b;margin-top:6px">Connecting to database...</div>
    `;
    document.body.appendChild(loader);
  }
  loader.style.display = show ? 'flex' : 'none';
}

async function loadAllData() {
  try {
    const [clients, gst, roc, itr, tds, audits, dsc, acc, tasks, docs, events] = await Promise.all([
      supabase('clients', { order: 'created_at.desc' }),
      supabase('gst_returns', { order: 'created_at.desc' }),
      supabase('roc_filings', { order: 'created_at.desc' }),
      supabase('itr_filings', { order: 'created_at.desc' }),
      supabase('tds_returns', { order: 'created_at.desc' }),
      supabase('audits', { order: 'created_at.desc' }),
      supabase('dsc_records', { order: 'days_left.asc' }),
      supabase('accounting_entries', { order: 'created_at.desc' }),
      supabase('tasks', { order: 'created_at.desc' }),
      supabase('documents', { order: 'created_at.desc' }),
      supabase('calendar_events', { order: 'event_date.asc' }),
    ]);

    STATE.clients = Array.isArray(clients) ? clients : [];
    STATE.gstReturns = Array.isArray(gst) ? gst : [];
    STATE.rocFilings = Array.isArray(roc) ? roc : [];
    STATE.itrFilings = Array.isArray(itr) ? itr : [];
    STATE.tdsReturns = Array.isArray(tds) ? tds : [];
    STATE.audits = Array.isArray(audits) ? audits : [];
    STATE.dscRecords = Array.isArray(dsc) ? dsc : [];
    STATE.accountingEntries = Array.isArray(acc) ? acc : [];
    STATE.tasks = Array.isArray(tasks) ? tasks : [];
    STATE.documents = Array.isArray(docs) ? docs : [];
    STATE.calendarEvents = Array.isArray(events) ? events : [];
  } catch (e) {
    console.error('loadAllData error:', e);
    showToast('Database connection failed. Check console.');
  }
}

/* =========================================================
   6. NAVIGATION
   ========================================================= */

function navigate(page) {
  STATE.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-page') === page);
  });
  if (window.innerWidth <= 768) closeSidebar();
  closeNotifications();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'reports') setTimeout(renderBarChart, 100);
}

/* =========================================================
   7. SIDEBAR TOGGLE
   ========================================================= */

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  STATE.sidebarOpen = !STATE.sidebarOpen;
  sidebar.classList.toggle('open', STATE.sidebarOpen);
  overlay.classList.toggle('show', STATE.sidebarOpen);
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  STATE.sidebarOpen = false;
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}

/* =========================================================
   8. THEME & DARK MODE
   ========================================================= */

function initTheme() {
  setTheme(STATE.activeTheme, false);
}

function setTheme(themeName, persist = true) {
  const themes = ['theme-violet','theme-blue','theme-emerald','theme-rose','theme-amber','theme-cyan','theme-dark','theme-midnight','theme-forest','theme-sunset','theme-sakura','theme-gold'];
  themes.forEach(t => document.body.classList.remove(t));
  document.body.classList.add(themeName);
  STATE.activeTheme = themeName;
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.classList.toggle('active', sw.getAttribute('data-theme') === themeName);
  });
  if (persist) showToast('Theme: ' + themeName.replace('theme-', '').replace(/^\w/, c => c.toUpperCase()));
}

function toggleDarkMode() {
  STATE.darkMode = !STATE.darkMode;
  if (STATE.darkMode) {
    document.body.classList.add('theme-dark');
    showToast('Dark mode enabled');
  } else {
    document.body.classList.remove('theme-dark');
    setTheme(STATE.activeTheme, false);
    showToast('Dark mode disabled');
  }
}

/* =========================================================
   9. DATE
   ========================================================= */

function setCurrentDate() {
  const el = document.getElementById('currentDate');
  if (!el) return;
  const now = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  el.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${days[now.getDay()]}`;
}

/* =========================================================
   10. DASHBOARD STATS
   ========================================================= */

function updateDashboardStats() {
  const totalClients = STATE.clients.length;
  const gstFiled = STATE.gstReturns.filter(g => g.status === 'Filed').length;
  const pendingTasks = STATE.tasks.filter(t => t.column_name !== 'done').length;
  const today = new Date();
  const upcomingDue = STATE.calendarEvents.filter(e => {
    const d = new Date(e.event_date);
    const diff = (d - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;
  const todayStr = today.toISOString().split('T')[0];
  const todayFilings = STATE.calendarEvents.filter(e => e.event_date === todayStr).length;

  // Update stat cards
  const statNums = document.querySelectorAll('.stat-number');
  if (statNums.length >= 5) {
    statNums[0].textContent = totalClients;
    statNums[1].textContent = gstFiled;
    statNums[2].textContent = pendingTasks;
    statNums[3].textContent = upcomingDue;
    statNums[4].textContent = String(todayFilings).padStart(2, '0');
  }
}

/* =========================================================
   11. CLIENT MANAGEMENT
   ========================================================= */

function getFilteredClients() {
  const { search, status, type } = STATE.filters.clients;
  return STATE.clients.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      (c.name || '').toLowerCase().includes(s) ||
      (c.pan || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s);
    const matchStatus = !status || c.status === status;
    const matchType = !type || c.type === type;
    return matchSearch && matchStatus && matchType;
  });
}

function renderClientTable() {
  const tbody = document.getElementById('clientTableBody');
  if (!tbody) return;

  const filtered = getFilteredClients();
  const { page, perPage } = STATE.pagination.clients;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  STATE.pagination.clients.page = safePage;
  const start = (safePage - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  if (!pageItems.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-text">No clients found</div>
      <div class="empty-state-sub">Try adjusting filters or add a new client</div>
    </div></td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map(c => `
      <tr>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${escapeHtml(c.pan || '-')}</td>
        <td>${escapeHtml(c.type || '-')}</td>
        <td>${escapeHtml(c.gst || '-')}</td>
        <td>${escapeHtml(c.email || '-')}</td>
        <td>${escapeHtml(c.phone || '-')}</td>
        <td>${statusBadge(c.status)}</td>
        <td>
          <button class="btn-outline" style="padding:5px 12px;font-size:11.5px;margin-right:4px" onclick="viewClient(${c.id})">View</button>
          <button class="btn-outline" style="padding:5px 12px;font-size:11.5px;margin-right:4px" onclick="editClient(${c.id})">Edit</button>
          <button class="btn-outline" style="padding:5px 12px;font-size:11.5px;border-color:var(--danger);color:var(--danger)" onclick="deleteClientConfirm(${c.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  const pageInfo = document.getElementById('clientPageInfo');
  if (pageInfo) pageInfo.textContent = `Page ${safePage} of ${totalPages} (${filtered.length} clients)`;
}

function filterClients(value) {
  STATE.filters.clients.search = value;
  STATE.pagination.clients.page = 1;
  renderClientTable();
}

function filterClientStatus(value) {
  STATE.filters.clients.status = value;
  STATE.pagination.clients.page = 1;
  renderClientTable();
}

function prevPage(section) {
  if (section === 'clients' && STATE.pagination.clients.page > 1) {
    STATE.pagination.clients.page--;
    renderClientTable();
  }
}

function nextPage(section) {
  if (section === 'clients') {
    const total = Math.ceil(getFilteredClients().length / STATE.pagination.clients.perPage);
    if (STATE.pagination.clients.page < total) {
      STATE.pagination.clients.page++;
      renderClientTable();
    }
  }
}

function viewClient(id) {
  const c = STATE.clients.find(x => x.id === id);
  if (!c) return;
  openModalWithContent(`👥 ${escapeHtml(c.name)}`, `
    <div class="form-group"><label>Client Name</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.name)}</div></div>
    <div class="form-group"><label>PAN</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.pan||'-')}</div></div>
    <div class="form-group"><label>Type</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.type||'-')}</div></div>
    <div class="form-group"><label>GST Number</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.gst||'-')}</div></div>
    <div class="form-group"><label>Email</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.email||'-')}</div></div>
    <div class="form-group"><label>Phone</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.phone||'-')}</div></div>
    <div class="form-group"><label>Status</label><div>${statusBadge(c.status)}</div></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="closeModal()">Close</button>
  `);
}

function editClient(id) {
  const c = STATE.clients.find(x => x.id === id);
  if (!c) return;
  openModalWithContent(`✏️ Edit — ${escapeHtml(c.name)}`, `
    <div class="form-group"><label>Client Name</label><input type="text" class="form-control" id="editClientName" value="${escapeHtml(c.name)}" /></div>
    <div class="form-group"><label>Email</label><input type="text" class="form-control" id="editClientEmail" value="${escapeHtml(c.email||'')}" /></div>
    <div class="form-group"><label>Phone</label><input type="text" class="form-control" id="editClientPhone" value="${escapeHtml(c.phone||'')}" /></div>
    <div class="form-group"><label>GST Number</label><input type="text" class="form-control" id="editClientGST" value="${escapeHtml(c.gst||'')}" /></div>
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="editClientStatus">
        <option ${c.status==='Active'?'selected':''}>Active</option>
        <option ${c.status==='Inactive'?'selected':''}>Inactive</option>
        <option ${c.status==='Pending'?'selected':''}>Pending</option>
      </select>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveClientEdit(${id})">💾 Save Changes</button>
  `);
}

async function saveClientEdit(id) {
  const name = document.getElementById('editClientName').value.trim();
  if (!name) { showToast('Client name required'); return; }
  const updated = {
    name,
    email: document.getElementById('editClientEmail').value.trim(),
    phone: document.getElementById('editClientPhone').value.trim(),
    gst: document.getElementById('editClientGST').value.trim(),
    status: document.getElementById('editClientStatus').value
  };
  const ok = await supabaseUpdate('clients', id, updated);
  if (ok) {
    const idx = STATE.clients.findIndex(c => c.id === id);
    if (idx !== -1) STATE.clients[idx] = { ...STATE.clients[idx], ...updated };
    closeModal();
    renderClientTable();
    updateDashboardStats();
    showToast('✅ Client updated successfully!');
  } else {
    showToast('❌ Update failed. Try again.');
  }
}

function deleteClientConfirm(id) {
  const c = STATE.clients.find(x => x.id === id);
  if (!c) return;
  openModalWithContent('🗑️ Delete Client', `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:40px;margin-bottom:12px">⚠️</div>
      <div style="font-weight:700;font-size:15px;margin-bottom:8px">Delete "${escapeHtml(c.name)}"?</div>
      <div style="color:var(--text-muted);font-size:13px;margin-bottom:20px">Yeh action permanent hai. Undo nahi hoga.</div>
      <div style="display:flex;gap:10px">
        <button class="btn-outline" style="flex:1" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" style="flex:1;background:var(--danger)" onclick="deleteClientConfirmed(${id})">Delete</button>
      </div>
    </div>
  `);
}

async function deleteClientConfirmed(id) {
  const ok = await supabaseDelete('clients', id);
  if (ok) {
    STATE.clients = STATE.clients.filter(c => c.id !== id);
    closeModal();
    renderClientTable();
    updateDashboardStats();
    showToast('🗑️ Client deleted');
  } else {
    showToast('❌ Delete failed');
  }
}

/* =========================================================
   12. GST DASHBOARD
   ========================================================= */

function renderGSTPage() {
  const listEl = document.getElementById('gstReturnList');
  const upcomingEl = document.getElementById('gstUpcoming');

  if (listEl) {
    if (!STATE.gstReturns.length) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No GST returns yet</div></div>';
    } else {
      listEl.innerHTML = STATE.gstReturns.map(g => `
        <div class="gst-item">
          <div>
            <div class="gst-item-name">${escapeHtml(g.client_name)}</div>
            <div class="gst-item-sub">${escapeHtml(g.return_type)} • ${escapeHtml(g.period)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${statusBadge(g.status)}
            <button class="btn-outline" style="padding:4px 10px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteGSTReturn(${g.id})">✕</button>
          </div>
        </div>
      `).join('');
    }
  }

  if (upcomingEl) {
    const upcoming = STATE.calendarEvents.slice(0, 5);
    upcomingEl.innerHTML = upcoming.map(e => `
      <div class="upcoming-item">
        <div>
          <div class="gst-item-name">${escapeHtml(e.title)}</div>
          <div class="gst-item-sub">${escapeHtml(e.event_type)}</div>
        </div>
        <div class="gst-item-sub fw-bold">${escapeHtml(e.event_date)}</div>
      </div>
    `).join('') || '<div class="empty-state"><div class="empty-state-text">No upcoming filings</div></div>';
  }

  // Update GST stats
  const statNums = document.querySelectorAll('#page-gst .stat-number');
  if (statNums.length >= 4) {
    statNums[0].textContent = STATE.gstReturns.filter(g=>g.status==='Filed').length;
    statNums[1].textContent = STATE.gstReturns.filter(g=>g.status==='Pending').length;
    statNums[2].textContent = STATE.gstReturns.filter(g=>g.status==='Overdue').length;
    const totalTax = STATE.gstReturns.reduce((sum, g) => sum + (g.tax_liability || 0), 0);
    statNums[3].textContent = '₹ ' + formatAmount(totalTax);
  }
}

async function submitGSTReturn() {
  const clientEl = document.querySelector('#page-gst select');
  const typeEl = document.querySelectorAll('#page-gst select')[1];
  const periodEl = document.querySelectorAll('#page-gst select')[2];
  const inputs = document.querySelectorAll('#page-gst input[type="text"], #page-gst input[type="number"]');

  const clientName = clientEl ? clientEl.value : '';
  if (!clientName || clientName === 'Select Client') { showToast('Please select a client'); return; }

  const body = {
    client_name: clientName,
    return_type: typeEl ? typeEl.value : 'GSTR-1',
    period: periodEl ? periodEl.value : '',
    gstin: inputs[0] ? inputs[0].value : '',
    total_turnover: inputs[1] ? parseFloat(inputs[1].value) || 0 : 0,
    tax_liability: inputs[2] ? parseFloat(inputs[2].value) || 0 : 0,
    status: 'Filed',
    filed_date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  const result = await supabaseInsert('gst_returns', body);
  if (result && result[0]) {
    STATE.gstReturns.unshift(result[0]);
    renderGSTPage();
    showToast('✅ GST Return filed successfully!');
  } else {
    showToast('❌ Failed to file GST return');
  }
}

async function deleteGSTReturn(id) {
  const ok = await supabaseDelete('gst_returns', id);
  if (ok) {
    STATE.gstReturns = STATE.gstReturns.filter(g => g.id !== id);
    renderGSTPage();
    showToast('🗑️ GST return deleted');
  }
}

/* =========================================================
   13. ROC FILINGS
   ========================================================= */

function renderROCTable() {
  const tbody = document.getElementById('rocTableBody');
  if (!tbody) return;

  if (!STATE.rocFilings.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-text">No ROC filings yet</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = STATE.rocFilings.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.company)}</strong></td>
      <td>${escapeHtml(r.cin||'-')}</td>
      <td>${escapeHtml(r.form||'-')}</td>
      <td>${escapeHtml(r.due_date||'-')}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <button class="btn-outline" style="padding:5px 12px;font-size:11.5px;margin-right:4px" onclick="editROCStatus(${r.id})">Update</button>
        <button class="btn-outline" style="padding:5px 12px;font-size:11.5px;border-color:var(--danger);color:var(--danger)" onclick="deleteROC(${r.id})">Delete</button>
      </td>
    </tr>
  `).join('');

  // Update ROC stats
  const statNums = document.querySelectorAll('#page-roc .stat-number');
  if (statNums.length >= 4) {
    statNums[0].textContent = STATE.rocFilings.filter(r=>r.status==='Filed').length;
    statNums[1].textContent = STATE.rocFilings.filter(r=>r.status==='In Progress').length;
    statNums[2].textContent = STATE.rocFilings.filter(r=>r.status==='Overdue').length;
    statNums[3].textContent = STATE.clients.filter(c=>c.type==='Company').length;
  }
}

function editROCStatus(id) {
  const r = STATE.rocFilings.find(x => x.id === id);
  if (!r) return;
  openModalWithContent(`Update ROC Filing — ${escapeHtml(r.company)}`, `
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="rocStatusSel">
        <option ${r.status==='In Progress'?'selected':''}>In Progress</option>
        <option ${r.status==='Filed'?'selected':''}>Filed</option>
        <option ${r.status==='Overdue'?'selected':''}>Overdue</option>
      </select>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveROCStatus(${id})">Save</button>
  `);
}

async function saveROCStatus(id) {
  const status = document.getElementById('rocStatusSel').value;
  const ok = await supabaseUpdate('roc_filings', id, { status });
  if (ok) {
    const idx = STATE.rocFilings.findIndex(r => r.id === id);
    if (idx !== -1) STATE.rocFilings[idx].status = status;
    closeModal();
    renderROCTable();
    showToast('✅ ROC status updated');
  }
}

async function deleteROC(id) {
  const ok = await supabaseDelete('roc_filings', id);
  if (ok) {
    STATE.rocFilings = STATE.rocFilings.filter(r => r.id !== id);
    renderROCTable();
    showToast('🗑️ ROC filing deleted');
  }
}

/* =========================================================
   14. INCOME TAX
   ========================================================= */

function renderITRList() {
  const el = document.getElementById('itrList');
  if (!el) return;

  if (!STATE.itrFilings.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-text">No ITR filings yet</div></div>';
    return;
  }

  el.innerHTML = STATE.itrFilings.map(itr => `
    <div class="itr-item">
      <div>
        <div class="gst-item-name">${escapeHtml(itr.client_name)}</div>
        <div class="gst-item-sub">${escapeHtml(itr.form)} • AY ${escapeHtml(itr.assessment_year)} • Filed: ${escapeHtml(itr.filed_date||'-')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${statusBadge(itr.status)}
        <button class="btn-outline" style="padding:4px 10px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteITR(${itr.id})">✕</button>
      </div>
    </div>
  `).join('');

  // Update ITR stats
  const statNums = document.querySelectorAll('#page-incometax .stat-number');
  if (statNums.length >= 4) {
    statNums[0].textContent = STATE.itrFilings.filter(i=>i.status==='Filed').length;
    statNums[1].textContent = STATE.itrFilings.filter(i=>i.status==='Pending'||i.status==='In Progress').length;
    const refund = STATE.itrFilings.reduce((s,i) => s + (i.tax_deducted||0), 0);
    statNums[2].textContent = '₹ ' + formatAmount(refund);
    statNums[3].textContent = '₹ ' + formatAmount(STATE.itrFilings.reduce((s,i) => s + (i.gross_income||0)*0.1, 0));
  }
}

async function submitITR() {
  const selects = document.querySelectorAll('#page-incometax select');
  const inputs = document.querySelectorAll('#page-incometax input[type="number"]');
  const clientName = selects[0]?.value;
  if (!clientName || clientName === 'Select Client') { showToast('Please select a client'); return; }

  const body = {
    client_name: clientName,
    assessment_year: selects[1]?.value || '2025-26',
    form: selects[2]?.value || 'ITR-1',
    gross_income: parseFloat(inputs[0]?.value) || 0,
    tax_deducted: parseFloat(inputs[1]?.value) || 0,
    deductions: parseFloat(inputs[2]?.value) || 0,
    status: 'Filed',
    filed_date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  const result = await supabaseInsert('itr_filings', body);
  if (result && result[0]) {
    STATE.itrFilings.unshift(result[0]);
    renderITRList();
    showToast('✅ ITR filed successfully!');
  } else {
    showToast('❌ ITR filing failed');
  }
}

async function deleteITR(id) {
  const ok = await supabaseDelete('itr_filings', id);
  if (ok) {
    STATE.itrFilings = STATE.itrFilings.filter(i => i.id !== id);
    renderITRList();
    showToast('🗑️ ITR filing deleted');
  }
}

/* =========================================================
   15. TDS RETURNS
   ========================================================= */

function renderTDSTable() {
  const tbody = document.getElementById('tdsTableBody');
  if (!tbody) return;

  if (!STATE.tdsReturns.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">No TDS returns yet</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = STATE.tdsReturns.map(t => `
    <tr>
      <td><strong>${escapeHtml(t.deductor)}</strong></td>
      <td>${escapeHtml(t.tan||'-')}</td>
      <td>${escapeHtml(t.quarter||'-')}</td>
      <td>${escapeHtml(t.form_type||'-')}</td>
      <td>₹ ${formatAmount(t.amount||0)}</td>
      <td>
        ${statusBadge(t.status)}
        <button class="btn-outline" style="padding:4px 10px;font-size:11px;margin-left:6px;border-color:var(--danger);color:var(--danger)" onclick="deleteTDS(${t.id})">✕</button>
      </td>
    </tr>
  `).join('');

  const statNums = document.querySelectorAll('#page-tds .stat-number');
  if (statNums.length >= 4) {
    statNums[0].textContent = STATE.tdsReturns.filter(t=>t.status==='Filed').length;
    statNums[1].textContent = STATE.tdsReturns.filter(t=>t.status==='Pending').length;
    statNums[2].textContent = '₹ ' + formatAmount(STATE.tdsReturns.reduce((s,t)=>s+(t.amount||0),0));
    statNums[3].textContent = STATE.tdsReturns.filter(t=>t.status==='Filed').length;
  }
}

async function submitTDS() {
  const inputs = document.querySelectorAll('#page-tds input[type="text"], #page-tds input[type="number"]');
  const selects = document.querySelectorAll('#page-tds select');
  const deductor = inputs[0]?.value.trim();
  if (!deductor) { showToast('Please enter deductor name'); return; }

  const body = {
    deductor,
    tan: inputs[1]?.value.trim(),
    quarter: selects[0]?.value,
    form_type: selects[1]?.value,
    amount: parseFloat(inputs[2]?.value) || 0,
    challan_no: inputs[3]?.value.trim(),
    status: 'Filed'
  };

  const result = await supabaseInsert('tds_returns', body);
  if (result && result[0]) {
    STATE.tdsReturns.unshift(result[0]);
    renderTDSTable();
    showToast('✅ TDS return submitted successfully!');
  } else {
    showToast('❌ TDS submission failed');
  }
}

async function deleteTDS(id) {
  const ok = await supabaseDelete('tds_returns', id);
  if (ok) {
    STATE.tdsReturns = STATE.tdsReturns.filter(t => t.id !== id);
    renderTDSTable();
    showToast('🗑️ TDS return deleted');
  }
}

/* =========================================================
   16. AUDIT & ASSURANCE
   ========================================================= */

function renderAuditTable() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;

  if (!STATE.audits.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🛡️</div><div class="empty-state-text">No audits scheduled yet</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = STATE.audits.map(a => `
    <tr>
      <td><strong>${escapeHtml(a.client)}</strong></td>
      <td>${escapeHtml(a.audit_type||'-')}</td>
      <td>${escapeHtml(a.auditor||'-')}</td>
      <td>${escapeHtml(a.start_date||'-')}</td>
      <td>${escapeHtml(a.end_date||'-')}</td>
      <td>${statusBadge(a.status)}</td>
      <td>
        <button class="btn-outline" style="padding:5px 12px;font-size:11.5px;margin-right:4px" onclick="editAuditStatus(${a.id})">Update</button>
        <button class="btn-outline" style="padding:5px 12px;font-size:11.5px;border-color:var(--danger);color:var(--danger)" onclick="deleteAudit(${a.id})">Delete</button>
      </td>
    </tr>
  `).join('');

  const statNums = document.querySelectorAll('#page-audit .stat-number');
  if (statNums.length >= 4) {
    statNums[0].textContent = STATE.audits.filter(a=>a.status==='In Progress').length;
    statNums[1].textContent = STATE.audits.filter(a=>a.status==='Completed').length;
    statNums[2].textContent = STATE.audits.filter(a=>a.status==='In Review').length;
    statNums[3].textContent = 4;
  }
}

function editAuditStatus(id) {
  const a = STATE.audits.find(x => x.id === id);
  if (!a) return;
  openModalWithContent(`Update Audit — ${escapeHtml(a.client)}`, `
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="auditStatusSel">
        <option ${a.status==='In Progress'?'selected':''}>In Progress</option>
        <option ${a.status==='In Review'?'selected':''}>In Review</option>
        <option ${a.status==='Completed'?'selected':''}>Completed</option>
      </select>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveAuditStatus(${id})">Save</button>
  `);
}

async function saveAuditStatus(id) {
  const status = document.getElementById('auditStatusSel').value;
  const ok = await supabaseUpdate('audits', id, { status });
  if (ok) {
    const idx = STATE.audits.findIndex(a => a.id === id);
    if (idx !== -1) STATE.audits[idx].status = status;
    closeModal();
    renderAuditTable();
    showToast('✅ Audit status updated');
  }
}

async function deleteAudit(id) {
  const ok = await supabaseDelete('audits', id);
  if (ok) {
    STATE.audits = STATE.audits.filter(a => a.id !== id);
    renderAuditTable();
    showToast('🗑️ Audit deleted');
  }
}

/* =========================================================
   17. DSC & ESIGN
   ========================================================= */

function renderDSCAlerts() {
  const el = document.getElementById('dscAlertList');
  if (!el) return;

  if (!STATE.dscRecords.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✍️</div><div class="empty-state-text">No DSC records</div></div>';
    return;
  }

  el.innerHTML = STATE.dscRecords.map(d => `
    <div class="dsc-alert-item">
      <div class="activity-dot ${(d.days_left||99) <= 7 ? 'orange' : 'blue'}">⚠️</div>
      <div style="flex:1">
        <div class="gst-item-name">${escapeHtml(d.client_name)}</div>
        <div class="gst-item-sub">${escapeHtml(d.purpose||'-')} • Expires ${escapeHtml(d.expiry_date||'-')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="badge ${(d.days_left||99) <= 7 ? 'badge-danger' : 'badge-warning'}">${d.days_left||'?'}d left</span>
        <button class="btn-outline" style="padding:4px 10px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteDSC(${d.id})">✕</button>
      </div>
    </div>
  `).join('');

  const statNums = document.querySelectorAll('#page-dsc .stat-number');
  if (statNums.length >= 4) {
    statNums[0].textContent = STATE.dscRecords.filter(d=>d.status==='Active').length;
    statNums[1].textContent = STATE.dscRecords.filter(d=>(d.days_left||99)<=30).length;
    statNums[2].textContent = STATE.dscRecords.length;
    statNums[3].textContent = STATE.dscRecords.filter(d=>(d.days_left||99)<=30).length;
  }
}

async function submitDSC() {
  const inputs = document.querySelectorAll('#page-dsc input[type="text"]');
  const selects = document.querySelectorAll('#page-dsc select');
  const clientName = inputs[0]?.value.trim();
  if (!clientName) { showToast('Please enter client name'); return; }

  const expiryDate = new Date();
  const validity = selects[1]?.value || '2 Years';
  expiryDate.setFullYear(expiryDate.getFullYear() + (parseInt(validity) || 2));
  const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

  const body = {
    client_name: clientName,
    pan: inputs[1]?.value.trim(),
    dsc_type: selects[0]?.value,
    validity,
    purpose: selects[2]?.value,
    expiry_date: expiryDate.toISOString().split('T')[0],
    days_left: daysLeft,
    status: 'Active'
  };

  const result = await supabaseInsert('dsc_records', body);
  if (result && result[0]) {
    STATE.dscRecords.unshift(result[0]);
    renderDSCAlerts();
    showToast('✅ DSC request submitted!');
  } else {
    showToast('❌ DSC submission failed');
  }
}

async function deleteDSC(id) {
  const ok = await supabaseDelete('dsc_records', id);
  if (ok) {
    STATE.dscRecords = STATE.dscRecords.filter(d => d.id !== id);
    renderDSCAlerts();
    showToast('🗑️ DSC record deleted');
  }
}

/* =========================================================
   18. ACCOUNTING HUB
   ========================================================= */

function renderAccountingList() {
  const el = document.getElementById('accountingList');
  if (!el) return;

  if (!STATE.accountingEntries.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧮</div><div class="empty-state-text">No entries yet</div></div>';
    return;
  }

  el.innerHTML = STATE.accountingEntries.map(t => `
    <div class="acc-item">
      <div>
        <div class="gst-item-name">${escapeHtml(t.narration)}</div>
        <div class="gst-item-sub">${escapeHtml(t.entry_date||'')} • ${escapeHtml(t.voucher_type||'')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="acc-amount ${t.entry_type}">${t.entry_type==='credit'?'+':'-'} ₹ ${formatAmount(t.amount||0)}</div>
        <button class="btn-outline" style="padding:4px 10px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteAccEntry(${t.id})">✕</button>
      </div>
    </div>
  `).join('');

  const totalRevenue = STATE.accountingEntries.filter(t=>t.entry_type==='credit').reduce((s,t)=>s+(t.amount||0),0);
  const totalExpense = STATE.accountingEntries.filter(t=>t.entry_type==='debit').reduce((s,t)=>s+(t.amount||0),0);
  const netProfit = totalRevenue - totalExpense;
  const margin = totalRevenue ? Math.round((netProfit/totalRevenue)*100) : 0;

  const statNums = document.querySelectorAll('#page-accounting .stat-number');
  if (statNums.length >= 4) {
    statNums[0].textContent = '₹ ' + formatAmount(totalRevenue);
    statNums[1].textContent = '₹ ' + formatAmount(totalExpense);
    statNums[2].textContent = '₹ ' + formatAmount(netProfit);
    statNums[3].textContent = margin + '%';
  }
}

async function submitJournalEntry() {
  const dateEl = document.querySelector('#page-accounting input[type="date"]');
  const voucherSel = document.querySelector('#page-accounting select');
  const inputs = document.querySelectorAll('#page-accounting input[type="text"], #page-accounting input[type="number"]');
  const textarea = document.querySelector('#page-accounting textarea');

  const narration = textarea?.value.trim();
  const amount = parseFloat(inputs[inputs.length-1]?.value) || 0;
  if (!narration) { showToast('Please enter narration'); return; }
  if (!amount) { showToast('Please enter amount'); return; }

  const voucherType = voucherSel?.value || 'Journal';
  const entryType = ['Receipt','Sales'].includes(voucherType) ? 'credit' : 'debit';

  const body = {
    narration,
    voucher_type: voucherType,
    debit_account: inputs[0]?.value.trim(),
    credit_account: inputs[1]?.value.trim(),
    amount,
    entry_type: entryType,
    entry_date: dateEl?.value || new Date().toISOString().split('T')[0]
  };

  const result = await supabaseInsert('accounting_entries', body);
  if (result && result[0]) {
    STATE.accountingEntries.unshift(result[0]);
    renderAccountingList();
    showToast('✅ Journal entry posted!');
  } else {
    showToast('❌ Entry failed');
  }
}

async function deleteAccEntry(id) {
  const ok = await supabaseDelete('accounting_entries', id);
  if (ok) {
    STATE.accountingEntries = STATE.accountingEntries.filter(t => t.id !== id);
    renderAccountingList();
    showToast('🗑️ Entry deleted');
  }
}

/* =========================================================
   19. TASK MANAGER (KANBAN)
   ========================================================= */

function renderKanban() {
  const cols = ['todo', 'inprogress', 'done'];
  cols.forEach(col => {
    const container = document.getElementById(col + 'Cards');
    const countEl = document.getElementById(col + 'Count');
    if (!container) return;

    const items = STATE.tasks.filter(t => t.column_name === col);
    if (countEl) countEl.textContent = items.length;

    container.innerHTML = items.map(t => `
      <div class="task-card" data-id="${t.id}" draggable="true" ondragstart="dragStart(event)" onclick="openTaskDetail(${t.id})">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">
          ${(t.tags||[]).map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="task-meta">
          <span>👤 ${escapeHtml(t.assignee||'Unassigned')}</span>
          <span>📅 ${escapeHtml(t.due_date||'TBD')}</span>
        </div>
      </div>
    `).join('') || `<div class="empty-state" style="padding:20px 10px"><div class="empty-state-text" style="font-size:13px">No tasks here</div></div>`;

    container.ondragover = (e) => e.preventDefault();
    container.ondrop = (e) => dropTask(e, col);
  });
}

let draggedTaskId = null;

function dragStart(e) {
  const card = e.target.closest('.task-card');
  if (card) draggedTaskId = parseInt(card.getAttribute('data-id'));
}

async function dropTask(e, targetCol) {
  e.preventDefault();
  if (!draggedTaskId) return;
  const task = STATE.tasks.find(t => t.id === draggedTaskId);
  if (task && task.column_name !== targetCol) {
    await supabaseUpdate('tasks', draggedTaskId, { column_name: targetCol });
    task.column_name = targetCol;
    renderKanban();
    updateDashboardStats();
    showToast(`✅ Task moved to ${columnLabel(targetCol)}`);
  }
  draggedTaskId = null;
}

function columnLabel(col) {
  return { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[col] || col;
}

function addTask(col) {
  openModalWithContent(`➕ Add Task to ${columnLabel(col)}`, `
    <div class="form-group"><label>Task Title *</label><input type="text" class="form-control" id="newTaskTitle" placeholder="Enter task title" /></div>
    <div class="form-group"><label>Tags (comma separated)</label><input type="text" class="form-control" id="newTaskTags" placeholder="e.g. GST, High" /></div>
    <div class="form-group"><label>Assignee</label>
      <select class="form-control" id="newTaskAssignee">
        <option>Karan</option><option>Anjali</option><option>Sameer</option><option>Priya</option><option>Vikram</option>
      </select>
    </div>
    <div class="form-group"><label>Due Date</label><input type="text" class="form-control" id="newTaskDue" placeholder="e.g. 28 May" /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="createTask('${col}')">Add Task</button>
  `);
}

async function createTask(col) {
  const title = document.getElementById('newTaskTitle')?.value.trim();
  if (!title) { showToast('Please enter task title'); return; }
  const tagsRaw = document.getElementById('newTaskTags')?.value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const body = {
    title,
    tags,
    assignee: document.getElementById('newTaskAssignee')?.value || 'Karan',
    due_date: document.getElementById('newTaskDue')?.value.trim() || 'TBD',
    column_name: col
  };

  const result = await supabaseInsert('tasks', body);
  if (result && result[0]) {
    STATE.tasks.unshift(result[0]);
    closeModal();
    renderKanban();
    updateDashboardStats();
    showToast('✅ Task added!');
  } else {
    showToast('❌ Failed to add task');
  }
}

function openTaskDetail(id) {
  const task = STATE.tasks.find(t => t.id === id);
  if (!task) return;
  openModalWithContent('📋 Task Details', `
    <div class="form-group"><label>Title</label>
      <input type="text" class="form-control" id="editTaskTitle" value="${escapeHtml(task.title)}" />
    </div>
    <div class="form-group"><label>Assignee</label>
      <select class="form-control" id="taskAssigneeSel">
        ${['Karan','Anjali','Sameer','Priya','Vikram'].map(a=>`<option ${task.assignee===a?'selected':''}>${a}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Due Date</label>
      <input type="text" class="form-control" id="editTaskDue" value="${escapeHtml(task.due_date||'')}" />
    </div>
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="taskStatusSelect">
        <option value="todo" ${task.column_name==='todo'?'selected':''}>To Do</option>
        <option value="inprogress" ${task.column_name==='inprogress'?'selected':''}>In Progress</option>
        <option value="done" ${task.column_name==='done'?'selected':''}>Done</option>
      </select>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn-primary" style="flex:1" onclick="updateTask(${task.id})">💾 Save</button>
      <button class="btn-outline" style="flex:1;border-color:var(--danger);color:var(--danger)" onclick="deleteTask(${task.id})">🗑️ Delete</button>
    </div>
  `);
}

async function updateTask(id) {
  const title = document.getElementById('editTaskTitle')?.value.trim();
  if (!title) { showToast('Task title required'); return; }
  const updated = {
    title,
    assignee: document.getElementById('taskAssigneeSel')?.value,
    due_date: document.getElementById('editTaskDue')?.value.trim(),
    column_name: document.getElementById('taskStatusSelect')?.value
  };
  const ok = await supabaseUpdate('tasks', id, updated);
  if (ok) {
    const idx = STATE.tasks.findIndex(t => t.id === id);
    if (idx !== -1) STATE.tasks[idx] = { ...STATE.tasks[idx], ...updated };
    closeModal();
    renderKanban();
    updateDashboardStats();
    showToast('✅ Task updated!');
  }
}

async function deleteTask(id) {
  const ok = await supabaseDelete('tasks', id);
  if (ok) {
    STATE.tasks = STATE.tasks.filter(t => t.id !== id);
    closeModal();
    renderKanban();
    updateDashboardStats();
    showToast('🗑️ Task deleted');
  }
}

/* =========================================================
   20. REPORTS
   ========================================================= */

function renderBarChart() {
  const el = document.getElementById('barChart');
  if (!el) return;
  const data = [
    { label: 'Jan', value: 62 }, { label: 'Feb', value: 71 },
    { label: 'Mar', value: 58 }, { label: 'Apr', value: 84 },
    { label: 'May', value: 92 }, { label: 'Jun', value: 76 }
  ];
  const max = Math.max(...data.map(d => d.value));
  el.innerHTML = data.map(d => `
    <div class="bar-item">
      <div class="bar-fill" style="height:0%" data-target="${(d.value/max)*100}"></div>
      <div class="bar-label">${d.label}</div>
    </div>
  `).join('');
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll('#barChart .bar-fill').forEach(bar => {
        bar.style.height = bar.getAttribute('data-target') + '%';
      });
    }, 100);
  });

  // Update report stats
  const done = STATE.tasks.filter(t=>t.column_name==='done').length;
  const total = STATE.tasks.length || 1;
  const pct = Math.round((done/total)*100);
  const statNums = document.querySelectorAll('#page-reports .stat-number');
  if (statNums.length >= 4) {
    statNums[0].textContent = STATE.clients.length;
    statNums[1].textContent = STATE.gstReturns.length + STATE.itrFilings.length + STATE.tdsReturns.length + STATE.rocFilings.length;
    statNums[2].textContent = '₹ ' + formatAmount(STATE.accountingEntries.filter(t=>t.entry_type==='credit').reduce((s,t)=>s+(t.amount||0),0));
    statNums[3].textContent = pct + '%';
  }
}

function exportReport() { showToast('📥 Preparing export...'); }
function generateReport() { showToast('✅ Report generated!'); }

/* =========================================================
   21. AI ASSISTANT
   ========================================================= */

function sendAIMessage(presetMsg) {
  const input = document.getElementById('aiInput');
  const msg = presetMsg || input?.value.trim();
  if (!msg) return;
  const chatEl = document.getElementById('chatMessages');
  if (!chatEl) return;

  chatEl.insertAdjacentHTML('beforeend', `
    <div class="chat-msg user">
      <div class="msg-avatar">K</div>
      <div class="msg-content">${escapeHtml(msg)}</div>
    </div>
  `);
  if (input) input.value = '';
  chatEl.scrollTop = chatEl.scrollHeight;

  const typingId = 'typing-' + Date.now();
  chatEl.insertAdjacentHTML('beforeend', `
    <div class="chat-msg bot" id="${typingId}">
      <div class="msg-avatar">🤖</div>
      <div class="msg-content"><em>Thinking...</em></div>
    </div>
  `);
  chatEl.scrollTop = chatEl.scrollHeight;

  setTimeout(() => {
    const el = document.getElementById(typingId);
    if (el) el.querySelector('.msg-content').innerHTML = getAIResponse(msg);
    chatEl.scrollTop = chatEl.scrollHeight;
  }, 700);
}

function aiChip(text) { navigate('ai'); setTimeout(() => sendAIMessage(text), 200); }
function openAI() { navigate('ai'); }

/* =========================================================
   22. DOCUMENTS
   ========================================================= */

function renderDocuments() {
  const el = document.getElementById('docsGrid');
  if (!el) return;

  if (!STATE.documents.length) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📁</div><div class="empty-state-text">No documents yet</div><div class="empty-state-sub">Upload your first document</div></div>';
    return;
  }

  el.innerHTML = STATE.documents.map(d => `
    <div class="doc-card" onclick="showToast('Opening ${escapeHtml(d.name)}...')">
      <div class="doc-icon">${d.icon||'📄'}</div>
      <div class="doc-name">${escapeHtml(d.name)}</div>
      <div class="doc-meta">${escapeHtml(d.client_name||'')} • ${escapeHtml(d.file_size||'')}</div>
      <button class="btn-outline" style="padding:4px 10px;font-size:11px;width:100%;margin-top:6px;border-color:var(--danger);color:var(--danger)" onclick="event.stopPropagation();deleteDoc(${d.id})">Delete</button>
    </div>
  `).join('');
}

async function deleteDoc(id) {
  const ok = await supabaseDelete('documents', id);
  if (ok) {
    STATE.documents = STATE.documents.filter(d => d.id !== id);
    renderDocuments();
    showToast('🗑️ Document deleted');
  }
}

/* =========================================================
   23. CALENDAR
   ========================================================= */

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function renderCalendar() {
  const { month, year } = STATE.calendar;
  const titleEl = document.getElementById('calTitle');
  const gridEl = document.getElementById('calGrid');
  if (!titleEl || !gridEl) return;

  titleEl.textContent = `${MONTH_NAMES[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build event date map from Supabase data
  const eventMap = {};
  STATE.calendarEvents.forEach(e => {
    const d = new Date(e.event_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      if (!eventMap[key]) eventMap[key] = [];
      eventMap[key].push(e);
    }
  });

  const today = new Date();
  let html = '';

  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month">${daysInPrevMonth - i}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const hasEvent = eventMap[d] ? 'has-event' : '';
    const isToday = (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) ? 'today' : '';
    html += `<div class="cal-day ${hasEvent} ${isToday}" onclick="showDayEvents(${d}, ${JSON.stringify(eventMap[d]||[]).replace(/"/g,'&quot;')})">${d}</div>`;
  }

  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month">${d}</div>`;
  }

  gridEl.innerHTML = html;
}

function showDayEvents(day, events) {
  if (!events || !events.length) {
    showToast(`No events on ${day} ${MONTH_NAMES[STATE.calendar.month]}`);
    return;
  }
  openModalWithContent(`📅 Events — ${day} ${MONTH_NAMES[STATE.calendar.month]}`, `
    ${events.map(e => `
      <div class="upcoming-item" style="margin-bottom:10px">
        <div>
          <div class="gst-item-name">${escapeHtml(e.title)}</div>
          <div class="gst-item-sub">${escapeHtml(e.event_type||'')}</div>
        </div>
      </div>
    `).join('')}
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="closeModal()">Close</button>
  `);
}

function changeMonth(delta) {
  STATE.calendar.month += delta;
  if (STATE.calendar.month > 11) { STATE.calendar.month = 0; STATE.calendar.year++; }
  else if (STATE.calendar.month < 0) { STATE.calendar.month = 11; STATE.calendar.year--; }
  renderCalendar();
}

function renderEventList() {
  const el = document.getElementById('eventList');
  if (!el) return;

  const sorted = [...STATE.calendarEvents].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  el.innerHTML = sorted.map(e => `
    <div class="upcoming-item" style="margin-bottom:10px">
      <div>
        <div class="gst-item-name">${escapeHtml(e.title)}</div>
        <div class="gst-item-sub">${escapeHtml(e.event_type||'')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="gst-item-sub fw-bold">${escapeHtml(e.event_date)}</div>
        <button class="btn-outline" style="padding:3px 8px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteEvent(${e.id})">✕</button>
      </div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-state-text">No events</div></div>';
}

async function deleteEvent(id) {
  const ok = await supabaseDelete('calendar_events', id);
  if (ok) {
    STATE.calendarEvents = STATE.calendarEvents.filter(e => e.id !== id);
    renderCalendar();
    renderEventList();
    renderDueDates();
    showToast('🗑️ Event deleted');
  }
}

/* =========================================================
   24. RIGHT PANEL
   ========================================================= */

function renderDueDates() {
  const el = document.getElementById('dueDateList');
  if (!el) return;

  const today = new Date();
  const upcoming = STATE.calendarEvents
    .filter(e => new Date(e.event_date) >= today)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 5);

  el.innerHTML = upcoming.map(e => {
    const d = new Date(e.event_date);
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    const sub = diff === 0 ? 'Due Today' : diff === 1 ? 'Due Tomorrow' : `Due in ${diff} days`;
    const urgent = diff <= 1;
    return `
      <div class="due-item">
        <div class="due-date-badge">
          <div class="due-date-num">${d.getDate()}</div>
          <div class="due-date-mon">${MONTH_NAMES[d.getMonth()].slice(0,3)}</div>
        </div>
        <div style="flex:1">
          <div class="due-title">${escapeHtml(e.title)}</div>
          <div class="due-sub ${urgent ? 'red' : ''}">${sub}</div>
        </div>
      </div>
    `;
  }).join('') || '<div class="empty-state"><div class="empty-state-text">No upcoming dates</div></div>';
}

function renderActivity() {
  const el = document.getElementById('activityList');
  if (!el) return;

  const activities = [];
  STATE.gstReturns.filter(g => g.status === 'Filed').slice(0, 2).forEach(g => {
    activities.push({ icon: '✅', color: 'green', text: `GSTR filed for ${g.client_name}`, time: g.filed_date || 'Recently' });
  });
  STATE.itrFilings.filter(i => i.status === 'Filed').slice(0, 2).forEach(i => {
    activities.push({ icon: '💰', color: 'blue', text: `ITR filed for ${i.client_name}`, time: i.filed_date || 'Recently' });
  });
  STATE.tasks.filter(t => t.column_name === 'done').slice(0, 2).forEach(t => {
    activities.push({ icon: '✅', color: 'orange', text: t.title, time: 'Completed' });
  });

  el.innerHTML = activities.slice(0, 6).map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.color}">${a.icon}</div>
      <div>
        <div class="activity-text">${escapeHtml(a.text)}</div>
        <div class="activity-time">${escapeHtml(a.time)}</div>
      </div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-state-text">No recent activity</div></div>';
}

/* =========================================================
   25. TEAM CHAT
   ========================================================= */

function renderTeamContacts() {
  const el = document.getElementById('chatContacts');
  if (!el) return;
  el.innerHTML = TEAM_CONTACTS.map(c => `
    <div class="contact-item ${c.id === STATE.activeChatContact ? 'active' : ''}" onclick="switchChatContact('${c.id}')">
      <div class="contact-avatar">${c.initial}</div>
      <div style="flex:1;overflow:hidden">
        <div class="contact-name">${escapeHtml(c.name)}</div>
        <div class="contact-last">${c.online ? '🟢 ' : ''}${escapeHtml(c.last)}</div>
      </div>
    </div>
  `).join('');
}

function switchChatContact(id) {
  STATE.activeChatContact = id;
  const contact = TEAM_CONTACTS.find(c => c.id === id);
  const nameEl = document.getElementById('activeChatName');
  if (nameEl && contact) nameEl.textContent = contact.name;
  renderTeamContacts();
  renderTeamMessages();
}

function renderTeamMessages() {
  const el = document.getElementById('teamMessages');
  if (!el) return;
  const messages = TEAM_MESSAGES[STATE.activeChatContact] || [];
  const contact = TEAM_CONTACTS.find(c => c.id === STATE.activeChatContact);
  el.innerHTML = messages.map(m => `
    <div class="chat-msg ${m.from === 'me' ? 'user' : ''}">
      <div class="msg-avatar">${m.from === 'me' ? 'K' : (contact?.initial || '?')}</div>
      <div class="msg-content">${escapeHtml(m.text)}<div style="font-size:10.5px;opacity:.6;margin-top:4px">${escapeHtml(m.time)}</div></div>
    </div>
  `).join('');
  el.scrollTop = el.scrollHeight;
}

function sendTeamMessage() {
  const input = document.getElementById('teamChatInput');
  const text = input?.value.trim();
  if (!text) return;
  const contactId = STATE.activeChatContact;
  if (!TEAM_MESSAGES[contactId]) TEAM_MESSAGES[contactId] = [];
  TEAM_MESSAGES[contactId].push({ from: 'me', text, time: 'Just now' });
  if (input) input.value = '';
  renderTeamMessages();
  setTimeout(() => {
    TEAM_MESSAGES[contactId].push({ from: 'them', text: 'Got it, thanks!', time: 'Just now' });
    renderTeamMessages();
  }, 1200);
}

/* =========================================================
   26. NOTIFICATIONS
   ========================================================= */

function openNotifications() {
  const panel = document.getElementById('notifPanel');
  STATE.notifOpen = !STATE.notifOpen;
  if (panel) panel.classList.toggle('show', STATE.notifOpen);

  // Build notifications from real data
  const notifList = document.getElementById('notifList');
  if (!notifList) return;

  const notifs = [];
  STATE.gstReturns.filter(g=>g.status==='Pending').slice(0,2).forEach(g => {
    notifs.push({ icon: '📊', text: `GSTR pending: ${g.client_name} — ${g.return_type}`, time: 'Pending' });
  });
  STATE.dscRecords.filter(d=>(d.days_left||99)<=30).forEach(d => {
    notifs.push({ icon: '⚠️', text: `DSC expiring: ${d.client_name} in ${d.days_left} days`, time: 'Alert' });
  });
  STATE.tasks.filter(t=>t.column_name==='todo'&&(t.tags||[]).includes('High')).slice(0,2).forEach(t => {
    notifs.push({ icon: '🔴', text: `High priority: ${t.title}`, time: 'Task' });
  });

  notifList.innerHTML = (notifs.length ? notifs : [{icon:'✅', text:'No new notifications', time:''}]).map(n => `
    <div class="notif-item">
      <div class="notif-icon">${n.icon}</div>
      <div>
        <div class="notif-text">${escapeHtml(n.text)}</div>
        <div class="notif-time">${escapeHtml(n.time)}</div>
      </div>
    </div>
  `).join('');

  // Update badge
  const dot = document.querySelector('.notif-dot');
  if (dot) dot.textContent = notifs.length || '0';
}

function closeNotifications() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.remove('show');
  STATE.notifOpen = false;
}

/* =========================================================
   27. MODALS
   ========================================================= */

function openModal(type) {
  const clientOptions = STATE.clients.slice(0, 20).map(c => `<option>${escapeHtml(c.name)}</option>`).join('');

  const configs = {
    addClient: {
      title: '➕ Add New Client',
      body: `
        <div class="form-grid">
          <div class="form-group"><label>Client Name *</label><input type="text" class="form-control" id="addClientName" placeholder="Enter client name" /></div>
          <div class="form-group"><label>PAN / TAN</label><input type="text" class="form-control" id="addClientPAN" placeholder="Enter PAN/TAN" /></div>
          <div class="form-group"><label>Type</label>
            <select class="form-control" id="addClientType">
              <option>Individual</option><option>Company</option><option>LLP</option><option>Partnership</option>
            </select>
          </div>
          <div class="form-group"><label>GST Number</label><input type="text" class="form-control" id="addClientGST" placeholder="Enter GSTIN (optional)" /></div>
          <div class="form-group"><label>Email</label><input type="text" class="form-control" id="addClientEmail" placeholder="Enter email" /></div>
          <div class="form-group"><label>Phone</label><input type="text" class="form-control" id="addClientPhone" placeholder="Enter phone" /></div>
        </div>
        <button class="btn-primary" style="width:100%" onclick="submitAddClient()">✅ Add Client</button>
      `
    },
    gstReturn: { title: '📊 File GST Return', body: `<div style="text-align:center;padding:20px"><div style="font-size:36px">📊</div><p style="margin:12px 0">Use the GST Dashboard form below</p><button class="btn-primary" onclick="closeModal();navigate('gst')">Go to GST Dashboard</button></div>` },
    rocFiling: {
      title: '🏛️ New ROC Filing',
      body: `
        <div class="form-group"><label>Company Name *</label><input type="text" class="form-control" id="rocCompany" placeholder="Enter company name" /></div>
        <div class="form-group"><label>CIN</label><input type="text" class="form-control" id="rocCIN" placeholder="Enter CIN" /></div>
        <div class="form-group"><label>Form Type</label>
          <select class="form-control" id="rocForm"><option>AOC-4</option><option>MGT-7</option><option>ADT-1</option><option>DIR-3 KYC</option><option>MGT-14</option></select>
        </div>
        <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="rocDue" /></div>
        <button class="btn-primary" style="width:100%" onclick="submitROCFiling()">✅ Create Filing</button>
      `
    },
    itrFiling: { title: '💰 File ITR', body: `<div style="text-align:center;padding:20px"><div style="font-size:36px">💰</div><p style="margin:12px 0">Use the Income Tax form</p><button class="btn-primary" onclick="closeModal();navigate('incometax')">Go to Income Tax</button></div>` },
    tdsReturn: { title: '🧾 File TDS', body: `<div style="text-align:center;padding:20px"><div style="font-size:36px">🧾</div><p style="margin:12px 0">Use the TDS Returns form</p><button class="btn-primary" onclick="closeModal();navigate('tds')">Go to TDS Returns</button></div>` },
    newAudit: {
      title: '🛡️ Schedule Audit',
      body: `
        <div class="form-group"><label>Client *</label><select class="form-control" id="auditClient"><option>Select Client</option>${clientOptions}</select></div>
        <div class="form-group"><label>Audit Type</label>
          <select class="form-control" id="auditType"><option>Statutory Audit</option><option>Tax Audit</option><option>Internal Audit</option><option>Stock Audit</option></select>
        </div>
        <div class="form-group"><label>Auditor</label>
          <select class="form-control" id="auditAuditor"><option>Karan Mehta</option><option>Anjali Rao</option><option>Sameer Joshi</option></select>
        </div>
        <div class="form-group"><label>Start Date</label><input type="date" class="form-control" id="auditStart" /></div>
        <div class="form-group"><label>End Date</label><input type="date" class="form-control" id="auditEnd" /></div>
        <button class="btn-primary" style="width:100%" onclick="submitNewAudit()">✅ Schedule Audit</button>
      `
    },
    newDSC: { title: '✍️ New DSC', body: `<div style="text-align:center;padding:20px"><div style="font-size:36px">✍️</div><p style="margin:12px 0">Use the DSC & eSign form</p><button class="btn-primary" onclick="closeModal();navigate('dsc')">Go to DSC & eSign</button></div>` },
    newEntry: { title: '🧮 Journal Entry', body: `<div style="text-align:center;padding:20px"><div style="font-size:36px">🧮</div><p style="margin:12px 0">Use the Accounting Hub form</p><button class="btn-primary" onclick="closeModal();navigate('accounting')">Go to Accounting Hub</button></div>` },
    newTask: {
      title: '✅ Add New Task',
      body: `
        <div class="form-group"><label>Task Title *</label><input type="text" class="form-control" id="newTaskTitleModal" placeholder="Enter task title" /></div>
        <div class="form-group"><label>Tags</label><input type="text" class="form-control" id="newTaskTagsModal" placeholder="e.g. GST, High" /></div>
        <div class="form-group"><label>Assignee</label>
          <select class="form-control" id="newTaskAssigneeModal"><option>Karan</option><option>Anjali</option><option>Sameer</option><option>Priya</option><option>Vikram</option></select>
        </div>
        <div class="form-group"><label>Due Date</label><input type="text" class="form-control" id="newTaskDueModal" placeholder="e.g. 28 May" /></div>
        <div class="form-group"><label>Column</label>
          <select class="form-control" id="newTaskColModal"><option value="todo">To Do</option><option value="inprogress">In Progress</option><option value="done">Done</option></select>
        </div>
        <button class="btn-primary" style="width:100%" onclick="submitNewTaskModal()">✅ Add Task</button>
      `
    },
    uploadDoc: {
      title: '📁 Upload Document',
      body: `
        <div class="form-group"><label>Document Name *</label><input type="text" class="form-control" id="uploadDocName" placeholder="e.g. Balance Sheet FY24-25.pdf" /></div>
        <div class="form-group"><label>Client</label>
          <select class="form-control" id="uploadDocClient"><option>Internal</option>${clientOptions}</select>
        </div>
        <div class="form-group"><label>Type</label>
          <select class="form-control" id="uploadDocType"><option value="PDF">PDF</option><option value="Excel">Excel</option><option value="Word">Word</option><option value="Image">Image</option></select>
        </div>
        <div class="form-group"><label>File Size</label><input type="text" class="form-control" id="uploadDocSize" placeholder="e.g. 2.4 MB" /></div>
        <button class="btn-primary" style="width:100%" onclick="submitUploadDoc()">⬆ Upload</button>
      `
    },
    newEvent: {
      title: '📅 Add Calendar Event',
      body: `
        <div class="form-group"><label>Event Title *</label><input type="text" class="form-control" id="newEventTitle" placeholder="Enter event title" /></div>
        <div class="form-group"><label>Type</label>
          <select class="form-control" id="newEventType"><option>GST</option><option>TDS</option><option>ROC</option><option>DSC</option><option>Income Tax</option><option>PF</option><option>Internal</option></select>
        </div>
        <div class="form-group"><label>Date *</label><input type="date" class="form-control" id="newEventDate" /></div>
        <button class="btn-primary" style="width:100%" onclick="submitNewEvent()">✅ Add Event</button>
      `
    }
  };

  const config = configs[type];
  if (config) openModalWithContent(config.title, config.body);
}

function openModalWithContent(title, bodyHtml) {
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  const overlay = document.getElementById('modalOverlay');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  if (overlay) overlay.classList.add('show');
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('show');
}

/* ---- Modal Submits ---- */

async function submitAddClient() {
  const name = document.getElementById('addClientName')?.value.trim();
  if (!name) { showToast('Client name is required'); return; }
  const body = {
    name,
    pan: document.getElementById('addClientPAN')?.value.trim() || '-',
    type: document.getElementById('addClientType')?.value,
    gst: document.getElementById('addClientGST')?.value.trim() || '-',
    email: document.getElementById('addClientEmail')?.value.trim() || '-',
    phone: document.getElementById('addClientPhone')?.value.trim() || '-',
    status: 'Active'
  };
  const result = await supabaseInsert('clients', body);
  if (result && result[0]) {
    STATE.clients.unshift(result[0]);
    closeModal();
    renderClientTable();
    updateDashboardStats();
    showToast('✅ Client added successfully!');
  } else {
    showToast('❌ Failed to add client');
  }
}

async function submitROCFiling() {
  const company = document.getElementById('rocCompany')?.value.trim();
  if (!company) { showToast('Company name required'); return; }
  const body = {
    company,
    cin: document.getElementById('rocCIN')?.value.trim() || '-',
    form: document.getElementById('rocForm')?.value,
    due_date: document.getElementById('rocDue')?.value || 'TBD',
    status: 'In Progress'
  };
  const result = await supabaseInsert('roc_filings', body);
  if (result && result[0]) {
    STATE.rocFilings.unshift(result[0]);
    closeModal();
    renderROCTable();
    showToast('✅ ROC filing created!');
  } else {
    showToast('❌ ROC filing failed');
  }
}

async function submitNewAudit() {
  const client = document.getElementById('auditClient')?.value;
  if (!client || client === 'Select Client') { showToast('Please select a client'); return; }
  const body = {
    client,
    audit_type: document.getElementById('auditType')?.value,
    auditor: document.getElementById('auditAuditor')?.value,
    start_date: document.getElementById('auditStart')?.value || 'TBD',
    end_date: document.getElementById('auditEnd')?.value || 'TBD',
    status: 'In Progress'
  };
  const result = await supabaseInsert('audits', body);
  if (result && result[0]) {
    STATE.audits.unshift(result[0]);
    closeModal();
    renderAuditTable();
    showToast('✅ Audit scheduled!');
  } else {
    showToast('❌ Audit scheduling failed');
  }
}

async function submitNewTaskModal() {
  const title = document.getElementById('newTaskTitleModal')?.value.trim();
  if (!title) { showToast('Task title required'); return; }
  const tagsRaw = document.getElementById('newTaskTagsModal')?.value.trim();
  const body = {
    title,
    tags: tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : [],
    assignee: document.getElementById('newTaskAssigneeModal')?.value || 'Karan',
    due_date: document.getElementById('newTaskDueModal')?.value.trim() || 'TBD',
    column_name: document.getElementById('newTaskColModal')?.value || 'todo'
  };
  const result = await supabaseInsert('tasks', body);
  if (result && result[0]) {
    STATE.tasks.unshift(result[0]);
    closeModal();
    renderKanban();
    updateDashboardStats();
    showToast('✅ Task added!');
  }
}

async function submitUploadDoc() {
  const name = document.getElementById('uploadDocName')?.value.trim();
  if (!name) { showToast('Document name required'); return; }
  const typeVal = document.getElementById('uploadDocType')?.value || 'PDF';
  const iconMap = { PDF: '📕', Excel: '📗', Word: '📘', Image: '🖼️' };
  const body = {
    name,
    doc_type: typeVal,
    icon: iconMap[typeVal] || '📄',
    client_name: document.getElementById('uploadDocClient')?.value || 'Internal',
    file_size: document.getElementById('uploadDocSize')?.value.trim() || 'Unknown'
  };
  const result = await supabaseInsert('documents', body);
  if (result && result[0]) {
    STATE.documents.unshift(result[0]);
    closeModal();
    renderDocuments();
    showToast('✅ Document uploaded!');
  }
}

async function submitNewEvent() {
  const title = document.getElementById('newEventTitle')?.value.trim();
  const dateVal = document.getElementById('newEventDate')?.value;
  if (!title || !dateVal) { showToast('Please fill all fields'); return; }
  const body = {
    title,
    event_type: document.getElementById('newEventType')?.value,
    event_date: dateVal
  };
  const result = await supabaseInsert('calendar_events', body);
  if (result && result[0]) {
    STATE.calendarEvents.push(result[0]);
    closeModal();
    renderCalendar();
    renderEventList();
    renderDueDates();
    showToast('✅ Event added to calendar!');
  }
}

/* =========================================================
   28. QUICK ACTION
   ========================================================= */

function openQuickAction() {
  openModalWithContent('⚡ Quick Action', `
    <div class="quick-action-grid">
      <button class="qa-btn" onclick="closeModal();openModal('addClient')"><span class="qa-btn-icon">👥</span><span class="qa-btn-label">Add Client</span></button>
      <button class="qa-btn" onclick="closeModal();navigate('gst')"><span class="qa-btn-icon">📊</span><span class="qa-btn-label">File GST Return</span></button>
      <button class="qa-btn" onclick="closeModal();navigate('incometax')"><span class="qa-btn-icon">💰</span><span class="qa-btn-label">File ITR</span></button>
      <button class="qa-btn" onclick="closeModal();navigate('tds')"><span class="qa-btn-icon">🧾</span><span class="qa-btn-label">File TDS Return</span></button>
      <button class="qa-btn" onclick="closeModal();openModal('newAudit')"><span class="qa-btn-icon">🛡️</span><span class="qa-btn-label">Schedule Audit</span></button>
      <button class="qa-btn" onclick="closeModal();openModal('newTask')"><span class="qa-btn-icon">✅</span><span class="qa-btn-label">Add Task</span></button>
      <button class="qa-btn" onclick="closeModal();navigate('dsc')"><span class="qa-btn-icon">✍️</span><span class="qa-btn-label">Request DSC</span></button>
      <button class="qa-btn" onclick="closeModal();openModal('newEvent')"><span class="qa-btn-icon">📅</span><span class="qa-btn-label">Add Event</span></button>
    </div>
  `);
}

/* =========================================================
   29. PROFILE
   ========================================================= */

function openProfile() {
  openModalWithContent('👤 My Profile', `
    <div style="text-align:center;margin-bottom:16px">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;margin:0 auto 12px">K</div>
      <div style="font-weight:700;font-size:16px">Karan Mehta</div>
      <div style="color:var(--text-muted);font-size:13px">Partner — WITCORP India Advisors LLP</div>
    </div>
    <div class="form-group"><label>Email</label><div class="form-control" style="background:var(--bg)">karan@witcorp.in</div></div>
    <div class="form-group"><label>Phone</label><div class="form-control" style="background:var(--bg)">+91 98200 11223</div></div>
    <div class="form-group"><label>Role</label><div class="form-control" style="background:var(--bg)">Partner</div></div>
    <div class="form-group"><label>Total Clients</label><div class="form-control" style="background:var(--bg)">${STATE.clients.length}</div></div>
    <button class="btn-outline" style="width:100%;margin-top:8px;border-color:var(--danger);color:var(--danger)" onclick="showToast('Logged out (demo only)')">Logout</button>
  `);
}

/* =========================================================
   30. GLOBAL SEARCH
   ========================================================= */

function handleSearch(query) {
  if (!query || query.trim().length < 2) return;
  clearTimeout(window._searchTimeout);
  window._searchTimeout = setTimeout(() => {
    const q = query.toLowerCase();
    const clients = STATE.clients.filter(c => (c.name||'').toLowerCase().includes(q)).length;
    const tasks = STATE.tasks.filter(t => (t.title||'').toLowerCase().includes(q)).length;
    let msg = [];
    if (clients) msg.push(`${clients} client(s)`);
    if (tasks) msg.push(`${tasks} task(s)`);
    if (msg.length) showToast(`Found: ${msg.join(', ')}`);
  }, 500);
}

/* =========================================================
   31. TOAST
   ========================================================= */

let toastTimeout = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* =========================================================
   32. KEYBOARD & GLOBAL LISTENERS
   ========================================================= */

function attachGlobalListeners() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('globalSearch')?.focus();
    }
    if (e.key === 'Escape') {
      closeModal();
      closeNotifications();
      if (window.innerWidth <= 768) closeSidebar();
    }
  });

  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    if (panel?.classList.contains('show')) {
      if (!panel.contains(e.target) && !e.target.closest('[onclick*="openNotifications"]')) {
        closeNotifications();
      }
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeSidebar();
  });
}

/* =========================================================
   33. UTILITY
   ========================================================= */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAmount(num) {
  if (!num) return '0';
  if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('en-IN');
}

function statusBadge(status) {
  const map = {
    'Active': 'badge-success', 'Inactive': 'badge-danger', 'Pending': 'badge-warning',
    'Filed': 'badge-success', 'Overdue': 'badge-danger', 'In Progress': 'badge-info',
    'In Review': 'badge-purple', 'Completed': 'badge-success', 'Expiring Soon': 'badge-warning',
    'Expired': 'badge-danger'
  };
  return `<span class="badge ${map[status]||'badge-info'}">${escapeHtml(status)}</span>`;
}

/* =========================================================
   END OF app.js — WITCORP Supabase Edition
   ========================================================= */
