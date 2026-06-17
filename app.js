/* =============================================================
   WITCORP DASHBOARD - app.js
   Supabase Connected | Vault Module | Enhanced Team Chat
   Realtime + Polling | Typing | Online/Offline | Emoji | Reply
   ============================================================= */

/* =========================================================
   1. SUPABASE CONFIG
   ========================================================= */

var SUPABASE_URL = window.SUPABASE_URL || 'https://yqbvdbsbuycxlsfkijhc.supabase.co';
var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_5qNAkAQrO5yzGnDcNERPxg_pm2Jv8bw';

async function supabase(table, options = {}) {
  const { method = 'GET', filters = '', body = null, select = '*', order = 'created_at.desc', limit = null } = options;
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
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
  if (!res.ok) { const err = await res.text(); console.error(`Supabase error [${table}]:`, err); return []; }
  if (method === 'DELETE' || method === 'PATCH') return true;
  return await res.json();
}

async function supabaseInsert(table, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!res.ok) { console.error('Insert error:', await res.text()); return null; }
  return await res.json();
}

async function supabaseUpdate(table, id, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!res.ok) { console.error('Update error:', await res.text()); return null; }
  return true;
}

async function supabaseUpdateFilter(table, filter, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  return res.ok;
}

async function supabaseDelete(table, id) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, { method: 'DELETE', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } });
  return res.ok;
}

/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

const STATE = {
  currentPage: 'dashboard',
  sidebarOpen: false,
  notifOpen: false,
  activeTheme: { bg: 'default', sidebar: 'dark-sidebar' },
  calendar: { month: new Date().getMonth(), year: new Date().getFullYear() },
  pagination: { clients: { page: 1, perPage: 10 } },
  filters: { clients: { search: '', status: '', type: '' } },
  activeChatContact: null,
  activeChatContactName: '',
  replyingTo: null,
  editingMessageId: null,
  clients: [], gstReturns: [], rocFilings: [], itrFilings: [],
  tdsReturns: [], audits: [], dscRecords: [], accountingEntries: [],
  tasks: [], documents: [], calendarEvents: [],
  vault: [],
  activeVaultFolder: 'All',
  chatMessages: [],
  typingTimeout: null,
  pollInterval: null,
  realtimeChannel: null,
  myEmail: '',
  myName: ''
};

/* =========================================================
   3. VAULT FOLDERS CONFIG
   ========================================================= */

const VAULT_FOLDERS = [
  { id: 'All',         label: 'All',          icon: '🗂️',  color: '#6366f1' },
  { id: 'GST',         label: 'GST',           icon: '📊',  color: '#10b981' },
  { id: 'MCA',         label: 'MCA / ROC',     icon: '🏛️',  color: '#3b82f6' },
  { id: 'Income Tax',  label: 'Income Tax',    icon: '💰',  color: '#f59e0b' },
  { id: 'TDS',         label: 'TDS',           icon: '🧾',  color: '#8b5cf6' },
  { id: 'Traces',      label: 'TRACES',        icon: '🔍',  color: '#ec4899' },
  { id: 'EPFO',        label: 'EPFO / PF',     icon: '👷',  color: '#14b8a6' },
  { id: 'Bank',        label: 'Bank / Finance', icon: '🏦', color: '#f97316' },
  { id: 'Email',       label: 'Email / Portal', icon: '📧', color: '#06b6d4' },
  { id: 'Other',       label: 'Other',          icon: '📁', color: '#64748b' },
];

/* =========================================================
   4. THEME SYSTEM
   ========================================================= */

const BG_THEMES = [
  { id: 'default',       name: 'Light Mode',      gradient: 'linear-gradient(135deg,#f8fafc,#e2e8f0)',    bg: '#f1f5f9',  surface: '#ffffff', text: '#0f172a',  textMuted: '#64748b', border: '#e2e8f0' },
  { id: 'dark-mode',     name: 'Dark Mode',        gradient: 'linear-gradient(135deg,#0f172a,#1e293b)',    bg: '#0f172a',  surface: '#1e293b', text: '#f1f5f9',  textMuted: '#94a3b8', border: '#334155' },
  { id: 'midnight',      name: 'Midnight',         gradient: 'linear-gradient(135deg,#020617,#0f172a)',    bg: '#020617',  surface: '#0f172a', text: '#f8fafc',  textMuted: '#94a3b8', border: '#1e293b' },
  { id: 'ocean-blue',    name: 'Ocean Blue',       gradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)',    bg: '#eff6ff',  surface: '#ffffff', text: '#1e3a5f',  textMuted: '#3b82f6', border: '#bfdbfe' },
  { id: 'purple-dream',  name: 'Purple Dream',     gradient: 'linear-gradient(135deg,#a855f7,#7c3aed)',    bg: '#faf5ff',  surface: '#ffffff', text: '#3b0764',  textMuted: '#7c3aed', border: '#e9d5ff' },
  { id: 'green-nature',  name: 'Green Nature',     gradient: 'linear-gradient(135deg,#10b981,#047857)',    bg: '#f0fdf4',  surface: '#ffffff', text: '#052e16',  textMuted: '#059669', border: '#bbf7d0' },
  { id: 'sunset',        name: 'Sunset',           gradient: 'linear-gradient(135deg,#f97316,#ef4444)',    bg: '#fff7ed',  surface: '#ffffff', text: '#431407',  textMuted: '#ea580c', border: '#fed7aa' },
  { id: 'sakura',        name: 'Sakura',           gradient: 'linear-gradient(135deg,#fbcfe8,#fda4af)',    bg: '#fdf2f8',  surface: '#ffffff', text: '#500724',  textMuted: '#db2777', border: '#fbcfe8' },
];

const SIDEBAR_THEMES = [
  { id: 'dark-sidebar',   name: 'Classic Dark',    gradient: 'linear-gradient(135deg,#1e1b4b,#312e81)', bg: '#1e1b4b' },
  { id: 'black-sidebar',  name: 'Pure Black',      gradient: 'linear-gradient(135deg,#0a0a0a,#171717)', bg: '#0a0a0a' },
  { id: 'slate-sidebar',  name: 'Slate',           gradient: 'linear-gradient(135deg,#0f172a,#1e293b)', bg: '#0f172a' },
  { id: 'violet-sidebar', name: 'Violet',          gradient: 'linear-gradient(135deg,#4c1d95,#5b21b6)', bg: '#4c1d95' },
  { id: 'blue-sidebar',   name: 'Ocean',           gradient: 'linear-gradient(135deg,#1e3a5f,#1e40af)', bg: '#1e3a5f' },
  { id: 'emerald-sidebar',name: 'Emerald',         gradient: 'linear-gradient(135deg,#052e16,#064e3b)', bg: '#052e16' },
];

function applyBgTheme(themeId) {
  const theme = BG_THEMES.find(t => t.id === themeId) || BG_THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface2', theme.surface);
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--text-muted', theme.textMuted);
  root.style.setProperty('--border', theme.border);
  STATE.activeTheme.bg = themeId;
  localStorage.setItem('witcorp-bg-theme', themeId);
}

function applySidebarTheme(themeId) {
  const theme = SIDEBAR_THEMES.find(t => t.id === themeId) || SIDEBAR_THEMES[0];
  document.documentElement.style.setProperty('--sidebar-bg', theme.bg);
  STATE.activeTheme.sidebar = themeId;
  localStorage.setItem('witcorp-sidebar-theme', themeId);
}

function initTheme() {
  const savedBg = localStorage.getItem('witcorp-bg-theme') || 'default';
  const savedSidebar = localStorage.getItem('witcorp-sidebar-theme') || 'dark-sidebar';
  applyBgTheme(savedBg);
  applySidebarTheme(savedSidebar);
}

function setTheme(themeName) {
  const themes = ['theme-violet','theme-blue','theme-emerald','theme-rose','theme-amber','theme-cyan','theme-dark','theme-midnight','theme-forest','theme-sunset','theme-sakura','theme-gold'];
  themes.forEach(t => document.body.classList.remove(t));
  document.body.classList.add(themeName);
  localStorage.setItem('witcorp-body-theme', themeName);
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.theme === themeName));
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('force-dark');
  localStorage.setItem('witcorp-dark-mode', isDark ? '1' : '0');
  const btn = document.querySelector('[onclick="toggleDarkMode()"]');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

/* =========================================================
   5. INITIALIZATION
   ========================================================= */

function toggleRightPanel() {
  const panel = document.getElementById('rightPanel');
  if (panel) panel.classList.toggle('show-mobile');
}

function initRightPanelMobile() {
  const btn = document.getElementById('toggleRightPanel');
  const handleResize = () => {
    if (window.innerWidth <= 1200) { if (btn) btn.style.display = 'flex'; }
    else { if (btn) btn.style.display = 'none'; const panel = document.getElementById('rightPanel'); if (panel) panel.classList.remove('show-mobile'); }
  };
  handleResize();
  window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', initRightPanelMobile);

document.addEventListener('DOMContentLoaded', async () => {
  // Load user info
  const userRaw = localStorage.getItem('witcorp-user');
  if (userRaw) {
    const user = JSON.parse(userRaw);
    STATE.myEmail = user.email || '';
    STATE.myName = (user.user_metadata && user.user_metadata.full_name) ? user.user_metadata.full_name : (user.email ? user.email.split('@')[0] : 'User');
  }

  loadUserInfo();
  initTheme();

  // Restore saved theme
  const savedTheme = localStorage.getItem('witcorp-body-theme');
  if (savedTheme) setTheme(savedTheme);
  const savedDark = localStorage.getItem('witcorp-dark-mode');
  if (savedDark === '1') {
    document.body.classList.add('force-dark');
    const btn = document.querySelector('[onclick="toggleDarkMode()"]');
    if (btn) btn.textContent = '☀️';
  }

  setCurrentDate();
  attachGlobalListeners();
  renderTeamContacts();
  renderTeamMessages();

  showPageLoader(true);
  await loadAllData();
  showPageLoader(false);

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
  renderVaultPage();
  populateGSTClientDropdown();

  // Mark user online
  await updatePresence(true);
  setInterval(() => updatePresence(true), 30000);

  // Start polling for chat
  startChatPolling();

  // Setup Supabase Realtime for chat
  setupRealtimeChat();

  // On page unload, mark offline
  window.addEventListener('beforeunload', () => updatePresence(false));
});

function showPageLoader(show) {
  let loader = document.getElementById('pageLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'pageLoader';
    loader.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;font-family:Inter,sans-serif;`;
    loader.innerHTML = `<div class="spinner"></div><div style="margin-top:16px;font-size:14px;font-weight:600;color:#6366f1">Loading WITCORP...</div><div style="font-size:12px;color:#64748b;margin-top:6px">Connecting to database...</div>`;
    document.body.appendChild(loader);
  }
  loader.style.display = show ? 'flex' : 'none';
}

async function loadAllData() {
  try {
    const [clients, gst, roc, itr, tds, audits, dsc, acc, tasks, docs, events, vault] = await Promise.all([
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
      supabase('vault_credentials', { order: 'created_at.desc' }),
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
    STATE.vault = Array.isArray(vault) ? vault : [];
  } catch (e) {
    console.error('loadAllData error:', e);
    showToast('Database connection failed.');
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
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.getAttribute('data-page') === page));
  if (window.innerWidth <= 768) closeSidebar();
  closeNotifications();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'reports') setTimeout(renderBarChart, 100);
  if (page === 'vault') renderVaultPage();
  if (page === 'teamchat') { renderTeamContacts(); renderTeamMessages(); }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  STATE.sidebarOpen = !STATE.sidebarOpen;
  if (sidebar) sidebar.classList.toggle('open', STATE.sidebarOpen);
  if (overlay) overlay.classList.toggle('show', STATE.sidebarOpen);
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  STATE.sidebarOpen = false;
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

/* =========================================================
   7. DATE
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
   8. DASHBOARD STATS
   ========================================================= */

function updateDashboardStats() {
  const totalClients = STATE.clients.length;
  const gstFiled = STATE.gstReturns.filter(g => g.status === 'Filed').length;
  const pendingTasks = STATE.tasks.filter(t => t.column_name !== 'done').length;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const upcomingDue = STATE.calendarEvents.filter(e => { const d = new Date(e.event_date); const diff = (d - today) / (1000 * 60 * 60 * 24); return diff >= 0 && diff <= 7; }).length;
  const todayFilings = STATE.calendarEvents.filter(e => e.event_date === todayStr).length;
  const dashStats = document.querySelectorAll('#page-dashboard .stat-number');
  if (dashStats[0]) dashStats[0].textContent = totalClients;
  if (dashStats[1]) dashStats[1].textContent = gstFiled;
  if (dashStats[2]) dashStats[2].textContent = pendingTasks;
  if (dashStats[3]) dashStats[3].textContent = upcomingDue;
  if (dashStats[4]) dashStats[4].textContent = String(todayFilings).padStart(2, '0');

  const done = STATE.tasks.filter(t=>t.column_name==='done').length;
  const inprog = STATE.tasks.filter(t=>t.column_name==='inprogress').length;
  const todo = STATE.tasks.filter(t=>t.column_name==='todo').length;
  const totalRev = STATE.accountingEntries.filter(t=>t.entry_type==='credit').reduce((s,t)=>s+(t.amount||0),0);
  const totalExp = STATE.accountingEntries.filter(t=>t.entry_type==='debit').reduce((s,t)=>s+(t.amount||0),0);
  const netProfit = totalRev - totalExp;
  const margin = totalRev ? Math.round((netProfit/totalRev)*100) : 0;
  const pct = STATE.tasks.length ? Math.round((done/STATE.tasks.length)*100) : 0;

  const gstStats = document.querySelectorAll('#page-gst .stat-number');
  if (gstStats[0]) gstStats[0].textContent = STATE.gstReturns.filter(g=>g.status==='Filed').length;
  if (gstStats[1]) gstStats[1].textContent = STATE.gstReturns.filter(g=>g.status==='Pending').length;
  if (gstStats[2]) gstStats[2].textContent = STATE.gstReturns.filter(g=>g.status==='Overdue').length;
  if (gstStats[3]) { const t = STATE.gstReturns.reduce((s,g)=>s+(g.tax_liability||0),0); gstStats[3].textContent = '₹ ' + formatAmount(t); }

  const rocStats = document.querySelectorAll('#page-roc .stat-number');
  if (rocStats[0]) rocStats[0].textContent = STATE.rocFilings.filter(r=>r.status==='Filed').length;
  if (rocStats[1]) rocStats[1].textContent = STATE.rocFilings.filter(r=>r.status==='In Progress').length;
  if (rocStats[2]) rocStats[2].textContent = STATE.rocFilings.filter(r=>r.status==='Overdue').length;
  if (rocStats[3]) rocStats[3].textContent = STATE.clients.filter(c=>c.type==='Company').length;

  const itrStats = document.querySelectorAll('#page-incometax .stat-number');
  if (itrStats[0]) itrStats[0].textContent = STATE.itrFilings.filter(i=>i.status==='Filed').length;
  if (itrStats[1]) itrStats[1].textContent = STATE.itrFilings.filter(i=>i.status==='Pending'||i.status==='In Progress').length;
  if (itrStats[2]) { const r = STATE.itrFilings.reduce((s,i)=>s+(i.tax_deducted||0),0); itrStats[2].textContent = '₹ ' + formatAmount(r); }
  if (itrStats[3]) { const t = STATE.itrFilings.reduce((s,i)=>s+(i.gross_income||0)*0.1,0); itrStats[3].textContent = '₹ ' + formatAmount(t); }

  const tdsStats = document.querySelectorAll('#page-tds .stat-number');
  if (tdsStats[0]) tdsStats[0].textContent = STATE.tdsReturns.filter(t=>t.status==='Filed').length;
  if (tdsStats[1]) tdsStats[1].textContent = STATE.tdsReturns.filter(t=>t.status==='Pending').length;
  if (tdsStats[2]) { const a = STATE.tdsReturns.reduce((s,t)=>s+(t.amount||0),0); tdsStats[2].textContent = '₹ ' + formatAmount(a); }
  if (tdsStats[3]) tdsStats[3].textContent = STATE.tdsReturns.filter(t=>t.status==='Filed').length;

  const auditStats = document.querySelectorAll('#page-audit .stat-number');
  if (auditStats[0]) auditStats[0].textContent = STATE.audits.filter(a=>a.status==='In Progress').length;
  if (auditStats[1]) auditStats[1].textContent = STATE.audits.filter(a=>a.status==='Completed').length;
  if (auditStats[2]) auditStats[2].textContent = STATE.audits.filter(a=>a.status==='In Review').length;
  const dueThisMonth = STATE.audits.filter(a => { if (!a.end_date) return false; const d = new Date(a.end_date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); }).length;
  if (auditStats[3]) auditStats[3].textContent = dueThisMonth;

  const dscStats = document.querySelectorAll('#page-dsc .stat-number');
  if (dscStats[0]) dscStats[0].textContent = STATE.dscRecords.filter(d=>d.status==='Active').length;
  if (dscStats[1]) dscStats[1].textContent = STATE.dscRecords.filter(d=>(d.days_left||999)<=30).length;
  if (dscStats[2]) dscStats[2].textContent = STATE.dscRecords.length;
  if (dscStats[3]) dscStats[3].textContent = STATE.dscRecords.filter(d=>(d.days_left||999)<=30).length;

  const accStats = document.querySelectorAll('#page-accounting .stat-number');
  if (accStats[0]) accStats[0].textContent = '₹ ' + formatAmount(totalRev);
  if (accStats[1]) accStats[1].textContent = '₹ ' + formatAmount(totalExp);
  if (accStats[2]) accStats[2].textContent = '₹ ' + formatAmount(netProfit);
  if (accStats[3]) accStats[3].textContent = margin + '%';

  const taskStats = document.querySelectorAll('#page-tasks .stat-number');
  if (taskStats[0]) taskStats[0].textContent = done;
  if (taskStats[1]) taskStats[1].textContent = inprog;
  if (taskStats[2]) taskStats[2].textContent = todo;
  if (taskStats[3]) taskStats[3].textContent = 0;

  const rptStats = document.querySelectorAll('#page-reports .stat-number');
  const totalFilings = STATE.gstReturns.length + STATE.itrFilings.length + STATE.tdsReturns.length + STATE.rocFilings.length;
  if (rptStats[0]) rptStats[0].textContent = STATE.clients.length;
  if (rptStats[1]) rptStats[1].textContent = totalFilings;
  if (rptStats[2]) rptStats[2].textContent = '₹ ' + formatAmount(totalRev);
  if (rptStats[3]) rptStats[3].textContent = pct + '%';

  const donutCenter = document.querySelector('#page-reports .donut-center');
  if (donutCenter) donutCenter.textContent = pct + '%';
  const donutChart = document.querySelector('#page-reports .donut-chart');
  if (donutChart && STATE.tasks.length) {
    const doneP = done/STATE.tasks.length*100, ipP = inprog/STATE.tasks.length*100;
    donutChart.style.background = `conic-gradient(var(--success) 0% ${doneP}%, var(--info) ${doneP}% ${doneP+ipP}%, var(--warning) ${doneP+ipP}% 100%)`;
  }
}

/* =========================================================
   9. CLIENT MANAGEMENT
   ========================================================= */

function getFilteredClients() {
  const { search, status, type } = STATE.filters.clients;
  return STATE.clients.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search || (c.name||'').toLowerCase().includes(s) || (c.pan||'').toLowerCase().includes(s) || (c.email||'').toLowerCase().includes(s);
    return matchSearch && (!status || c.status === status) && (!type || c.type === type);
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
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">No clients found</div></div></td></tr>`;
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

function filterClients(value) { STATE.filters.clients.search = value; STATE.pagination.clients.page = 1; renderClientTable(); }
function filterClientStatus(value) { STATE.filters.clients.status = value; STATE.pagination.clients.page = 1; renderClientTable(); }
function filterClientType(value) { STATE.filters.clients.type = value; STATE.pagination.clients.page = 1; renderClientTable(); }

function prevPage(section) {
  if (section === 'clients' && STATE.pagination.clients.page > 1) { STATE.pagination.clients.page--; renderClientTable(); }
}
function nextPage(section) {
  if (section === 'clients') {
    const total = Math.ceil(getFilteredClients().length / STATE.pagination.clients.perPage);
    if (STATE.pagination.clients.page < total) { STATE.pagination.clients.page++; renderClientTable(); }
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
  const updated = { name, email: document.getElementById('editClientEmail').value.trim(), phone: document.getElementById('editClientPhone').value.trim(), gst: document.getElementById('editClientGST').value.trim(), status: document.getElementById('editClientStatus').value };
  const ok = await supabaseUpdate('clients', id, updated);
  if (ok) { const idx = STATE.clients.findIndex(c => c.id === id); if (idx !== -1) STATE.clients[idx] = { ...STATE.clients[idx], ...updated }; closeModal(); renderClientTable(); updateDashboardStats(); showToast('✅ Client updated!'); }
  else { showToast('❌ Update failed.'); }
}

function deleteClientConfirm(id) {
  const c = STATE.clients.find(x => x.id === id);
  if (!c) return;
  openModalWithContent('🗑️ Delete Client', `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:40px;margin-bottom:12px">⚠️</div>
      <div style="font-weight:700;font-size:15px;margin-bottom:8px">Delete "${escapeHtml(c.name)}"?</div>
      <div style="color:var(--text-muted);font-size:13px;margin-bottom:20px">This action is permanent and cannot be undone.</div>
      <div style="display:flex;gap:10px">
        <button class="btn-outline" style="flex:1" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" style="flex:1;background:var(--danger)" onclick="deleteClientConfirmed(${id})">Delete</button>
      </div>
    </div>
  `);
}

async function deleteClientConfirmed(id) {
  const ok = await supabaseDelete('clients', id);
  if (ok) { STATE.clients = STATE.clients.filter(c => c.id !== id); closeModal(); renderClientTable(); updateDashboardStats(); showToast('🗑️ Client deleted'); }
  else { showToast('❌ Delete failed'); }
}

/* =========================================================
   10. GST DASHBOARD
   ========================================================= */

function populateGSTClientDropdown() {
  const gstSel = document.getElementById('gstClientSel');
  if (!gstSel || !STATE.clients.length) return;
  gstSel.innerHTML = '<option value="">Select Client</option>' + STATE.clients.map(c => `<option>${escapeHtml(c.name)}</option>`).join('');
}

function renderGSTPage() {
  const listEl = document.getElementById('gstReturnList');
  const upcomingEl = document.getElementById('gstUpcoming');
  if (listEl) {
    if (!STATE.gstReturns.length) { listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No GST returns yet</div></div>'; }
    else { listEl.innerHTML = STATE.gstReturns.map(g => `<div class="gst-item"><div><div class="gst-item-name">${escapeHtml(g.client_name)}</div><div class="gst-item-sub">${escapeHtml(g.return_type)} • ${escapeHtml(g.period)}</div></div><div style="display:flex;align-items:center;gap:8px">${statusBadge(g.status)}<button class="btn-outline" style="padding:4px 10px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteGSTReturn(${g.id})">✕</button></div></div>`).join(''); }
  }
  if (upcomingEl) {
    const upcoming = STATE.calendarEvents.slice(0, 5);
    upcomingEl.innerHTML = upcoming.length ? upcoming.map(e => `<div class="upcoming-item"><div><div class="gst-item-name">${escapeHtml(e.title)}</div><div class="gst-item-sub">${escapeHtml(e.event_type)}</div></div><div class="gst-item-sub fw-bold">${escapeHtml(e.event_date)}</div></div>`).join('') : '<div class="empty-state"><div class="empty-state-text">No upcoming filings</div></div>';
  }
  updateDashboardStats();
}

async function submitGSTReturn() {
  const gstSelEl = document.getElementById('gstClientSel');
  const typeEl = document.querySelectorAll('#page-gst select')[1];
  const periodEl = document.querySelectorAll('#page-gst select')[2];
  const inputs = document.querySelectorAll('#page-gst input[type="text"], #page-gst input[type="number"]');
  const clientName = gstSelEl ? gstSelEl.value : '';
  if (!clientName || clientName === 'Select Client') { showToast('Please select a client'); return; }
  const body = { client_name: clientName, return_type: typeEl ? typeEl.value : 'GSTR-1', period: periodEl ? periodEl.value : '', gstin: inputs[0] ? inputs[0].value : '', total_turnover: inputs[1] ? parseFloat(inputs[1].value) || 0 : 0, tax_liability: inputs[2] ? parseFloat(inputs[2].value) || 0 : 0, status: 'Filed', filed_date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) };
  const result = await supabaseInsert('gst_returns', body);
  if (result && result[0]) { STATE.gstReturns.unshift(result[0]); renderGSTPage(); showToast('✅ GST Return filed!'); }
  else { showToast('❌ Failed to file GST return'); }
}

async function deleteGSTReturn(id) {
  const ok = await supabaseDelete('gst_returns', id);
  if (ok) { STATE.gstReturns = STATE.gstReturns.filter(g => g.id !== id); renderGSTPage(); showToast('🗑️ GST return deleted'); }
}

/* =========================================================
   11. ROC, ITR, TDS, AUDIT, DSC, ACCOUNTING — (Same as before)
   ========================================================= */

function renderROCTable() {
  const tbody = document.getElementById('rocTableBody');
  if (!tbody) return;
  if (!STATE.rocFilings.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-text">No ROC filings yet</div></div></td></tr>`; updateDashboardStats(); return; }
  tbody.innerHTML = STATE.rocFilings.map(r => `<tr><td><strong>${escapeHtml(r.company)}</strong></td><td>${escapeHtml(r.cin||'-')}</td><td>${escapeHtml(r.form||'-')}</td><td>${escapeHtml(r.due_date||'-')}</td><td>${statusBadge(r.status)}</td><td><button class="btn-outline" style="padding:5px 12px;font-size:11.5px;margin-right:4px" onclick="editROCStatus(${r.id})">Update</button><button class="btn-outline" style="padding:5px 12px;font-size:11.5px;border-color:var(--danger);color:var(--danger)" onclick="deleteROC(${r.id})">Delete</button></td></tr>`).join('');
  updateDashboardStats();
}

function editROCStatus(id) {
  const r = STATE.rocFilings.find(x => x.id === id); if (!r) return;
  openModalWithContent(`Update ROC Filing`, `<div class="form-group"><label>Status</label><select class="form-control" id="rocStatusSel"><option ${r.status==='In Progress'?'selected':''}>In Progress</option><option ${r.status==='Filed'?'selected':''}>Filed</option><option ${r.status==='Overdue'?'selected':''}>Overdue</option></select></div><button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveROCStatus(${id})">Save</button>`);
}
async function saveROCStatus(id) {
  const status = document.getElementById('rocStatusSel').value;
  const ok = await supabaseUpdate('roc_filings', id, { status });
  if (ok) { const idx = STATE.rocFilings.findIndex(r => r.id === id); if (idx !== -1) STATE.rocFilings[idx].status = status; closeModal(); renderROCTable(); showToast('✅ ROC status updated'); }
}
async function deleteROC(id) { const ok = await supabaseDelete('roc_filings', id); if (ok) { STATE.rocFilings = STATE.rocFilings.filter(r => r.id !== id); renderROCTable(); showToast('🗑️ ROC filing deleted'); } }

function renderITRList() {
  const el = document.getElementById('itrList'); if (!el) return;
  if (!STATE.itrFilings.length) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-text">No ITR filings yet</div></div>'; updateDashboardStats(); return; }
  el.innerHTML = STATE.itrFilings.map(itr => `<div class="itr-item"><div><div class="gst-item-name">${escapeHtml(itr.client_name)}</div><div class="gst-item-sub">${escapeHtml(itr.form)} • AY ${escapeHtml(itr.assessment_year)}</div></div><div style="display:flex;align-items:center;gap:8px">${statusBadge(itr.status)}<button class="btn-outline" style="padding:4px 10px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteITR(${itr.id})">✕</button></div></div>`).join('');
  updateDashboardStats();
}
async function submitITR() {
  const selects = document.querySelectorAll('#page-incometax select');
  const inputs = document.querySelectorAll('#page-incometax input[type="number"]');
  const clientName = selects[0]?.value;
  if (!clientName || clientName === 'Select Client') { showToast('Please select a client'); return; }
  const body = { client_name: clientName, assessment_year: selects[1]?.value || '2025-26', form: selects[2]?.value || 'ITR-1', gross_income: parseFloat(inputs[0]?.value)||0, tax_deducted: parseFloat(inputs[1]?.value)||0, deductions: parseFloat(inputs[2]?.value)||0, status: 'Filed', filed_date: new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) };
  const result = await supabaseInsert('itr_filings', body);
  if (result && result[0]) { STATE.itrFilings.unshift(result[0]); renderITRList(); showToast('✅ ITR filed!'); }
}
async function deleteITR(id) { const ok = await supabaseDelete('itr_filings', id); if (ok) { STATE.itrFilings = STATE.itrFilings.filter(i => i.id !== id); renderITRList(); showToast('🗑️ ITR deleted'); } }

function renderTDSTable() {
  const tbody = document.getElementById('tdsTableBody'); if (!tbody) return;
  if (!STATE.tdsReturns.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">No TDS returns yet</div></div></td></tr>`; updateDashboardStats(); return; }
  tbody.innerHTML = STATE.tdsReturns.map(t => `<tr><td><strong>${escapeHtml(t.deductor)}</strong></td><td>${escapeHtml(t.tan||'-')}</td><td>${escapeHtml(t.quarter||'-')}</td><td>${escapeHtml(t.form_type||'-')}</td><td>₹ ${formatAmount(t.amount||0)}</td><td>${statusBadge(t.status)}<button class="btn-outline" style="padding:4px 10px;font-size:11px;margin-left:6px;border-color:var(--danger);color:var(--danger)" onclick="deleteTDS(${t.id})">✕</button></td></tr>`).join('');
  updateDashboardStats();
}
async function submitTDS() {
  const inputs = document.querySelectorAll('#page-tds input[type="text"], #page-tds input[type="number"]');
  const selects = document.querySelectorAll('#page-tds select');
  const deductor = inputs[0]?.value.trim();
  if (!deductor) { showToast('Please enter deductor name'); return; }
  const body = { deductor, tan: inputs[1]?.value.trim(), quarter: selects[0]?.value, form_type: selects[1]?.value, amount: parseFloat(inputs[2]?.value)||0, challan_no: inputs[3]?.value.trim(), status: 'Filed' };
  const result = await supabaseInsert('tds_returns', body);
  if (result && result[0]) { STATE.tdsReturns.unshift(result[0]); renderTDSTable(); showToast('✅ TDS submitted!'); }
}
async function deleteTDS(id) { const ok = await supabaseDelete('tds_returns', id); if (ok) { STATE.tdsReturns = STATE.tdsReturns.filter(t => t.id !== id); renderTDSTable(); showToast('🗑️ TDS deleted'); } }

function renderAuditTable() {
  const tbody = document.getElementById('auditTableBody'); if (!tbody) return;
  if (!STATE.audits.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🛡️</div><div class="empty-state-text">No audits scheduled</div></div></td></tr>`; updateDashboardStats(); return; }
  tbody.innerHTML = STATE.audits.map(a => `<tr><td><strong>${escapeHtml(a.client)}</strong></td><td>${escapeHtml(a.audit_type||'-')}</td><td>${escapeHtml(a.auditor||'-')}</td><td>${escapeHtml(a.start_date||'-')}</td><td>${escapeHtml(a.end_date||'-')}</td><td>${statusBadge(a.status)}</td><td><button class="btn-outline" style="padding:5px 12px;font-size:11.5px;margin-right:4px" onclick="editAuditStatus(${a.id})">Update</button><button class="btn-outline" style="padding:5px 12px;font-size:11.5px;border-color:var(--danger);color:var(--danger)" onclick="deleteAudit(${a.id})">Delete</button></td></tr>`).join('');
  updateDashboardStats();
}
function editAuditStatus(id) {
  const a = STATE.audits.find(x => x.id === id); if (!a) return;
  openModalWithContent(`Update Audit`, `<div class="form-group"><label>Status</label><select class="form-control" id="auditStatusSel"><option ${a.status==='In Progress'?'selected':''}>In Progress</option><option ${a.status==='In Review'?'selected':''}>In Review</option><option ${a.status==='Completed'?'selected':''}>Completed</option></select></div><button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveAuditStatus(${id})">Save</button>`);
}
async function saveAuditStatus(id) {
  const status = document.getElementById('auditStatusSel').value;
  const ok = await supabaseUpdate('audits', id, { status });
  if (ok) { const idx = STATE.audits.findIndex(a => a.id === id); if (idx !== -1) STATE.audits[idx].status = status; closeModal(); renderAuditTable(); showToast('✅ Audit updated'); }
}
async function deleteAudit(id) { const ok = await supabaseDelete('audits', id); if (ok) { STATE.audits = STATE.audits.filter(a => a.id !== id); renderAuditTable(); showToast('🗑️ Audit deleted'); } }

function renderDSCAlerts() {
  const el = document.getElementById('dscAlertList'); if (!el) return;
  if (!STATE.dscRecords.length) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✍️</div><div class="empty-state-text">No DSC records</div></div>'; updateDashboardStats(); return; }
  el.innerHTML = STATE.dscRecords.map(d => { const daysLeft = d.days_left || 999; return `<div class="dsc-alert-item"><div class="activity-dot ${daysLeft<=7?'orange':'blue'}">⚠️</div><div style="flex:1"><div class="gst-item-name">${escapeHtml(d.client_name)}</div><div class="gst-item-sub">${escapeHtml(d.purpose||'-')} • Expires ${escapeHtml(d.expiry_date||'-')}</div></div><div style="display:flex;align-items:center;gap:8px"><span class="badge ${daysLeft<=7?'badge-danger':'badge-warning'}">${daysLeft}d left</span><button class="btn-outline" style="padding:4px 10px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteDSC(${d.id})">✕</button></div></div>`; }).join('');
  updateDashboardStats();
}
async function submitDSC() {
  const inputs = document.querySelectorAll('#page-dsc input[type="text"]');
  const selects = document.querySelectorAll('#page-dsc select');
  const clientName = inputs[0]?.value.trim();
  if (!clientName) { showToast('Please enter client name'); return; }
  const expiryDate = new Date(); const validity = selects[1]?.value || '2 Years'; const years = parseInt(validity)||2; expiryDate.setFullYear(expiryDate.getFullYear()+years);
  const body = { client_name: clientName, pan: inputs[1]?.value.trim(), dsc_type: selects[0]?.value, validity, purpose: selects[2]?.value, expiry_date: expiryDate.toISOString().split('T')[0], days_left: Math.ceil((expiryDate-new Date())/(1000*60*60*24)), status: 'Active' };
  const result = await supabaseInsert('dsc_records', body);
  if (result && result[0]) { STATE.dscRecords.unshift(result[0]); renderDSCAlerts(); showToast('✅ DSC submitted!'); }
}
async function deleteDSC(id) { const ok = await supabaseDelete('dsc_records', id); if (ok) { STATE.dscRecords = STATE.dscRecords.filter(d => d.id !== id); renderDSCAlerts(); showToast('🗑️ DSC deleted'); } }

function renderAccountingList() {
  const el = document.getElementById('accountingList'); if (!el) return;
  if (!STATE.accountingEntries.length) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧮</div><div class="empty-state-text">No entries yet</div></div>'; updateDashboardStats(); return; }
  el.innerHTML = STATE.accountingEntries.map(t => `<div class="acc-item"><div><div class="gst-item-name">${escapeHtml(t.narration)}</div><div class="gst-item-sub">${escapeHtml(t.entry_date||'')} • ${escapeHtml(t.voucher_type||'')}</div></div><div style="display:flex;align-items:center;gap:8px"><div class="acc-amount ${t.entry_type}">${t.entry_type==='credit'?'+':'-'} ₹ ${formatAmount(t.amount||0)}</div><button class="btn-outline" style="padding:4px 10px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteAccEntry(${t.id})">✕</button></div></div>`).join('');
  updateDashboardStats();
}
async function submitJournalEntry() {
  const dateEl = document.querySelector('#page-accounting input[type="date"]');
  const voucherSel = document.querySelector('#page-accounting select');
  const inputs = document.querySelectorAll('#page-accounting input[type="text"], #page-accounting input[type="number"]');
  const textarea = document.querySelector('#page-accounting textarea');
  const narration = textarea?.value.trim(); const amount = parseFloat(inputs[inputs.length-1]?.value)||0;
  if (!narration) { showToast('Please enter narration'); return; }
  if (!amount) { showToast('Please enter amount'); return; }
  const voucherType = voucherSel?.value||'Journal'; const entryType = ['Receipt','Sales','Invoice'].includes(voucherType)?'credit':'debit';
  const body = { narration, voucher_type: voucherType, debit_account: inputs[0]?.value.trim(), credit_account: inputs[1]?.value.trim(), amount, entry_type: entryType, entry_date: dateEl?.value||new Date().toISOString().split('T')[0] };
  const result = await supabaseInsert('accounting_entries', body);
  if (result && result[0]) { STATE.accountingEntries.unshift(result[0]); renderAccountingList(); showToast('✅ Entry posted!'); }
}
async function deleteAccEntry(id) { const ok = await supabaseDelete('accounting_entries', id); if (ok) { STATE.accountingEntries = STATE.accountingEntries.filter(t => t.id !== id); renderAccountingList(); showToast('🗑️ Entry deleted'); } }

/* =========================================================
   12. TASK MANAGER (KANBAN)
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
        <div class="task-meta">${(t.tags||[]).map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="task-meta"><span>👤 ${escapeHtml(t.assignee||'Unassigned')}</span><span>📅 ${escapeHtml(t.due_date||'TBD')}</span></div>
      </div>
    `).join('') || `<div class="empty-state" style="padding:20px 10px"><div class="empty-state-text" style="font-size:13px">No tasks here</div></div>`;
    container.ondragover = (e) => e.preventDefault();
    container.ondrop = (e) => dropTask(e, col);
  });
  updateDashboardStats();
}

let draggedTaskId = null;
function dragStart(e) { const card = e.target.closest('.task-card'); if (card) draggedTaskId = parseInt(card.getAttribute('data-id')); }
async function dropTask(e, targetCol) {
  e.preventDefault(); if (!draggedTaskId) return;
  const task = STATE.tasks.find(t => t.id === draggedTaskId);
  if (task && task.column_name !== targetCol) { await supabaseUpdate('tasks', draggedTaskId, { column_name: targetCol }); task.column_name = targetCol; renderKanban(); showToast('✅ Task moved'); }
  draggedTaskId = null;
}
function columnLabel(col) { return { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[col] || col; }
function addTask(col) {
  openModalWithContent('➕ Add Task', `
    <div class="form-group"><label>Task Title *</label><input type="text" class="form-control" id="newTaskTitle" placeholder="Enter task title" /></div>
    <div class="form-group"><label>Tags</label><input type="text" class="form-control" id="newTaskTags" placeholder="e.g. GST, High" /></div>
    <div class="form-group"><label>Assignee</label><select class="form-control" id="newTaskAssignee"><option>Kamlesh</option><option>Anjali</option><option>Sameer</option><option>Priya</option><option>Vikram</option></select></div>
    <div class="form-group"><label>Due Date</label><input type="text" class="form-control" id="newTaskDue" placeholder="e.g. 28 May" /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="createTask('${col}')">Add Task</button>
  `);
}
async function createTask(col) {
  const title = document.getElementById('newTaskTitle')?.value.trim();
  if (!title) { showToast('Please enter task title'); return; }
  const tagsRaw = document.getElementById('newTaskTags')?.value.trim();
  const body = { title, tags: tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : [], assignee: document.getElementById('newTaskAssignee')?.value||'Kamlesh', due_date: document.getElementById('newTaskDue')?.value.trim()||'TBD', column_name: col };
  const result = await supabaseInsert('tasks', body);
  if (result && result[0]) { STATE.tasks.unshift(result[0]); closeModal(); renderKanban(); showToast('✅ Task added!'); }
}
function openTaskDetail(id) {
  const task = STATE.tasks.find(t => t.id === id); if (!task) return;
  openModalWithContent('📋 Task Details', `
    <div class="form-group"><label>Title</label><input type="text" class="form-control" id="editTaskTitle" value="${escapeHtml(task.title)}" /></div>
    <div class="form-group"><label>Assignee</label><select class="form-control" id="taskAssigneeSel">${['Kamlesh','Punit','Shankar','Ganga','Damini'].map(a=>`<option ${task.assignee===a?'selected':''}>${a}</option>`).join('')}</select></div>
    <div class="form-group"><label>Due Date</label><input type="text" class="form-control" id="editTaskDue" value="${escapeHtml(task.due_date||'')}" /></div>
    <div class="form-group"><label>Status</label><select class="form-control" id="taskStatusSelect"><option value="todo" ${task.column_name==='todo'?'selected':''}>To Do</option><option value="inprogress" ${task.column_name==='inprogress'?'selected':''}>In Progress</option><option value="done" ${task.column_name==='done'?'selected':''}>Done</option></select></div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn-primary" style="flex:1" onclick="updateTask(${task.id})">💾 Save</button>
      <button class="btn-outline" style="flex:1;border-color:var(--danger);color:var(--danger)" onclick="deleteTask(${task.id})">🗑️ Delete</button>
    </div>
  `);
}
async function updateTask(id) {
  const title = document.getElementById('editTaskTitle')?.value.trim();
  if (!title) { showToast('Task title required'); return; }
  const updated = { title, assignee: document.getElementById('taskAssigneeSel')?.value, due_date: document.getElementById('editTaskDue')?.value.trim(), column_name: document.getElementById('taskStatusSelect')?.value };
  const ok = await supabaseUpdate('tasks', id, updated);
  if (ok) { const idx = STATE.tasks.findIndex(t => t.id === id); if (idx !== -1) STATE.tasks[idx] = { ...STATE.tasks[idx], ...updated }; closeModal(); renderKanban(); showToast('✅ Task updated!'); }
}
async function deleteTask(id) { const ok = await supabaseDelete('tasks', id); if (ok) { STATE.tasks = STATE.tasks.filter(t => t.id !== id); closeModal(); renderKanban(); showToast('🗑️ Task deleted'); } }

/* =========================================================
   13. REPORTS
   ========================================================= */

function renderBarChart() {
  const el = document.getElementById('barChart'); if (!el) return;
  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  const data = months.map((label, i) => { const count = STATE.gstReturns.filter(g => { if (!g.filed_date) return false; const d = new Date(g.filed_date); return d.getMonth() === i; }).length + STATE.itrFilings.filter(itr => { if (!itr.filed_date) return false; const d = new Date(itr.filed_date); return d.getMonth() === i; }).length; return { label, value: count }; });
  const max = Math.max(...data.map(d => d.value), 1);
  el.innerHTML = data.map(d => `<div class="bar-item"><div class="bar-fill" style="height:0%" data-target="${(d.value/max)*100}"></div><div class="bar-label">${d.label} ${d.value > 0 ? '('+d.value+')' : ''}</div></div>`).join('');
  requestAnimationFrame(() => { setTimeout(() => { document.querySelectorAll('#barChart .bar-fill').forEach(bar => { bar.style.height = bar.getAttribute('data-target') + '%'; }); }, 100); });
  updateDashboardStats();
}
function exportReport() { showToast('📥 Preparing export...'); }
function generateReport() { showToast('✅ Report generated!'); }

/* =========================================================
   14. AI ASSISTANT
   ========================================================= */

function getAIResponse(query) {
  const q = query.toLowerCase().trim();
  const { clients, gstReturns, tasks, tdsReturns } = STATE;
  if (q.includes('gst') && (q.includes('pending') || q.includes('show'))) {
    const pending = gstReturns.filter(g => g.status === 'Pending' || g.status === 'Overdue');
    if (!pending.length) return 'No pending GST returns right now! 🎉';
    let txt = `${pending.length} GST returns need attention:<br><br>`;
    pending.forEach(g => { txt += `• <strong>${escapeHtml(g.client_name)}</strong> — ${g.return_type} (${g.period}) — <span style="color:${g.status==='Overdue'?'var(--danger)':'var(--warning)'}">${g.status}</span><br>`; });
    return txt;
  }
  if (q.includes('task') || q.includes('pending')) {
    const p = tasks.filter(t => t.column_name !== 'done');
    if (!p.length) return 'No pending tasks! Everything is done. 🎉';
    let txt = `${p.length} tasks pending:<br><br>`;
    p.slice(0, 6).forEach(t => { txt += `• <strong>${escapeHtml(t.title)}</strong> — ${t.column_name === 'todo' ? 'To Do' : 'In Progress'}<br>`; });
    return txt;
  }
  if (q.includes('tds')) { const filed = tdsReturns.filter(t=>t.status==='Filed').length; const pend = tdsReturns.filter(t=>t.status==='Pending').length; return `TDS Summary:<br>✅ Filed: <strong>${filed}</strong><br>⏳ Pending: <strong>${pend}</strong>`; }
  if (q.includes('client')) { const active = clients.filter(c=>c.status==='Active').length; return `Total clients: <strong>${clients.length}</strong><br>Active: <strong>${active}</strong>`; }
  if (q.includes('vault')) return `The Vault stores all your credentials securely. Click <strong>🔐 Vault</strong> in the sidebar to access GST, MCA, Income Tax logins and more!`;
  const defaults = ['I can help with GST, TDS, ITR, clients, tasks & Vault. Try asking "show pending GST returns"!', 'Ask me about: pending tasks, GST status, TDS filings, client list, upcoming compliances.'];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

function sendAIMessage(presetMsg) {
  const input = document.getElementById('aiInput');
  const msg = presetMsg || input?.value.trim();
  if (!msg) return;
  const chatEl = document.getElementById('chatMessages'); if (!chatEl) return;
  chatEl.insertAdjacentHTML('beforeend', `<div class="chat-msg user"><div class="msg-avatar">K</div><div class="msg-content">${escapeHtml(msg)}</div></div>`);
  if (input) input.value = '';
  chatEl.scrollTop = chatEl.scrollHeight;
  const typingId = 'typing-' + Date.now();
  chatEl.insertAdjacentHTML('beforeend', `<div class="chat-msg bot" id="${typingId}"><div class="msg-avatar">🤖</div><div class="msg-content"><em>Thinking...</em></div></div>`);
  chatEl.scrollTop = chatEl.scrollHeight;
  setTimeout(() => { const el = document.getElementById(typingId); if (el) el.querySelector('.msg-content').innerHTML = getAIResponse(msg); chatEl.scrollTop = chatEl.scrollHeight; }, 700);
}
function aiChip(text) { navigate('ai'); setTimeout(() => sendAIMessage(text), 200); }
function openAI() { navigate('ai'); }

/* =========================================================
   15. DOCUMENTS
   ========================================================= */

function renderDocuments() {
  const el = document.getElementById('docsGrid'); if (!el) return;
  if (!STATE.documents.length) { el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📁</div><div class="empty-state-text">No documents yet</div></div>'; return; }
  el.innerHTML = STATE.documents.map(d => `<div class="doc-card" onclick="showToast('Opening ${escapeHtml(d.name)}')"><div class="doc-icon">${d.icon||'📄'}</div><div class="doc-name">${escapeHtml(d.name)}</div><div class="doc-meta">${escapeHtml(d.client_name||'')} • ${escapeHtml(d.file_size||'')}</div><button class="btn-outline" style="padding:4px 10px;font-size:11px;width:100%;margin-top:6px;border-color:var(--danger);color:var(--danger)" onclick="event.stopPropagation();deleteDoc(${d.id})">Delete</button></div>`).join('');
}
async function deleteDoc(id) { const ok = await supabaseDelete('documents', id); if (ok) { STATE.documents = STATE.documents.filter(d => d.id !== id); renderDocuments(); showToast('🗑️ Document deleted'); } }

/* =========================================================
   16. CALENDAR
   ========================================================= */

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function renderCalendar() {
  const { month, year } = STATE.calendar;
  const titleEl = document.getElementById('calTitle'); const gridEl = document.getElementById('calGrid');
  if (!titleEl || !gridEl) return;
  titleEl.textContent = MONTH_NAMES[month] + ' ' + year;
  const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const daysInPrevMonth = new Date(year, month, 0).getDate();
  const eventMap = {}; STATE.calendarEvents.forEach(e => { const d = new Date(e.event_date); if (d.getFullYear() === year && d.getMonth() === month) { const key = d.getDate(); if (!eventMap[key]) eventMap[key] = []; eventMap[key].push(e); } });
  const today = new Date(); let html = '';
  for (let i = firstDay - 1; i >= 0; i--) html += `<div class="cal-day other-month">${daysInPrevMonth - i}</div>`;
  for (let d = 1; d <= daysInMonth; d++) { const hasEvent = eventMap[d] ? 'has-event' : ''; const isToday = (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) ? 'today' : ''; html += `<div class="cal-day ${hasEvent} ${isToday}" onclick="showDayEvents(${d})">${d}</div>`; }
  const totalCells = firstDay + daysInMonth; const remaining = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= remaining; d++) html += `<div class="cal-day other-month">${d}</div>`;
  gridEl.innerHTML = html;
}
function showDayEvents(day) {
  const events = STATE.calendarEvents.filter(e => { const d = new Date(e.event_date); return d.getFullYear()===STATE.calendar.year && d.getMonth()===STATE.calendar.month && d.getDate()===day; });
  if (!events.length) { showToast('No events on ' + day + ' ' + MONTH_NAMES[STATE.calendar.month]); return; }
  openModalWithContent('📅 Events', `${events.map(e=>`<div class="upcoming-item" style="margin-bottom:10px"><div><div class="gst-item-name">${escapeHtml(e.title)}</div><div class="gst-item-sub">${escapeHtml(e.event_type||'')}</div></div></div>`).join('')}<button class="btn-primary" style="width:100%;margin-top:8px" onclick="closeModal()">Close</button>`);
}
function changeMonth(delta) { STATE.calendar.month += delta; if (STATE.calendar.month > 11) { STATE.calendar.month = 0; STATE.calendar.year++; } else if (STATE.calendar.month < 0) { STATE.calendar.month = 11; STATE.calendar.year--; } renderCalendar(); }
function renderEventList() {
  const el = document.getElementById('eventList'); if (!el) return;
  const sorted = [...STATE.calendarEvents].sort((a,b) => new Date(a.event_date)-new Date(b.event_date));
  el.innerHTML = sorted.length ? sorted.map(e => `<div class="upcoming-item" style="margin-bottom:10px"><div><div class="gst-item-name">${escapeHtml(e.title)}</div><div class="gst-item-sub">${escapeHtml(e.event_type||'')}</div></div><div style="display:flex;align-items:center;gap:8px"><div class="gst-item-sub fw-bold">${escapeHtml(e.event_date)}</div><button class="btn-outline" style="padding:3px 8px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteEvent(${e.id})">✕</button></div></div>`).join('') : '<div class="empty-state"><div class="empty-state-text">No events</div></div>';
}
async function deleteEvent(id) { const ok = await supabaseDelete('calendar_events', id); if (ok) { STATE.calendarEvents = STATE.calendarEvents.filter(e => e.id !== id); renderCalendar(); renderEventList(); renderDueDates(); showToast('🗑️ Event deleted'); } }

/* =========================================================
   17. RIGHT PANEL
   ========================================================= */

function renderDueDates() {
  const el = document.getElementById('dueDateList'); if (!el) return;
  const today = new Date();
  const upcoming = STATE.calendarEvents.filter(e => new Date(e.event_date) >= today).sort((a,b) => new Date(a.event_date)-new Date(b.event_date)).slice(0, 5);
  el.innerHTML = upcoming.length ? upcoming.map(e => { const d = new Date(e.event_date); const diff = Math.ceil((d-today)/(1000*60*60*24)); const sub = diff===0?'Due Today':diff===1?'Due Tomorrow':'Due in '+diff+' days'; const urgent = diff<=1; return `<div class="due-item"><div class="due-date-badge"><div class="due-date-num">${d.getDate()}</div><div class="due-date-mon">${MONTH_NAMES[d.getMonth()].slice(0,3)}</div></div><div style="flex:1"><div class="due-title">${escapeHtml(e.title)}</div><div class="due-sub ${urgent?'red':''}">${sub}</div></div></div>`; }).join('') : '<div class="empty-state"><div class="empty-state-text">No upcoming dates</div></div>';
}
function renderActivity() {
  const el = document.getElementById('activityList'); if (!el) return;
  const activities = [];
  STATE.gstReturns.filter(g=>g.status==='Filed').slice(0,2).forEach(g => activities.push({ icon:'✅', color:'green', text:'GSTR filed for '+g.client_name, time: g.filed_date||'Recently' }));
  STATE.itrFilings.filter(i=>i.status==='Filed').slice(0,2).forEach(i => activities.push({ icon:'💰', color:'blue', text:'ITR filed for '+i.client_name, time: i.filed_date||'Recently' }));
  STATE.tasks.filter(t=>t.column_name==='done').slice(0,2).forEach(t => activities.push({ icon:'✅', color:'orange', text: t.title, time:'Completed' }));
  el.innerHTML = activities.length ? activities.slice(0,6).map(a => `<div class="activity-item"><div class="activity-dot ${a.color}">${a.icon}</div><div><div class="activity-text">${escapeHtml(a.text)}</div><div class="activity-time">${escapeHtml(a.time)}</div></div></div>`).join('') : '<div class="empty-state"><div class="empty-state-text">No recent activity</div></div>';
}

/* =========================================================
   18. 🔐 VAULT MODULE — FULL IMPLEMENTATION
   ========================================================= */

function renderVaultPage() {
  const page = document.getElementById('page-vault');
  if (!page) return;

  const activeFolder = STATE.activeVaultFolder || 'All';
  const filtered = activeFolder === 'All' ? STATE.vault : STATE.vault.filter(v => v.folder === activeFolder);

  // Folder tabs
  const folderTabs = VAULT_FOLDERS.map(f => {
    const count = f.id === 'All' ? STATE.vault.length : STATE.vault.filter(v => v.folder === f.id).length;
    return `<button class="vault-folder-tab ${activeFolder === f.id ? 'active' : ''}" onclick="switchVaultFolder('${f.id}')" style="${activeFolder===f.id?`border-color:${f.color};background:${f.color}15;color:${f.color}`:''}">
      <span>${f.icon}</span>
      <span>${f.label}</span>
      ${count > 0 ? `<span class="vault-folder-count">${count}</span>` : ''}
    </button>`;
  }).join('');

  // Credentials grid
  const credsHtml = filtered.length ? filtered.map(v => {
    const folder = VAULT_FOLDERS.find(f => f.id === v.folder) || VAULT_FOLDERS[VAULT_FOLDERS.length-1];
    return `
      <div class="vault-card" data-id="${v.id}">
        <div class="vault-card-header" style="background:${folder.color}18;border-bottom:1px solid ${folder.color}30">
          <div class="vault-card-folder" style="color:${folder.color}">${folder.icon} ${folder.label}</div>
          <div class="vault-card-actions">
            <button class="vault-action-btn" onclick="editVaultEntry(${v.id})" title="Edit">✏️</button>
            <button class="vault-action-btn" onclick="deleteVaultEntry(${v.id})" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="vault-card-body">
          <div class="vault-card-label">${escapeHtml(v.label)}</div>
          ${v.url ? `<div class="vault-card-url"><a href="${escapeHtml(v.url)}" target="_blank" rel="noopener" style="color:var(--primary);font-size:11.5px;text-decoration:none">🔗 ${escapeHtml(v.url.replace(/^https?:\/\//,''))}</a></div>` : ''}
          
          <div class="vault-field">
            <div class="vault-field-label">👤 Username / ID</div>
            <div class="vault-field-value">
              <span class="vault-field-text" id="user_${v.id}">${escapeHtml(v.username||'—')}</span>
              <button class="vault-copy-btn" onclick="copyToClipboard('${escapeHtml(v.username||'')}','Username')" title="Copy Username">📋</button>
            </div>
          </div>
          
          <div class="vault-field">
            <div class="vault-field-label">🔑 Password</div>
            <div class="vault-field-value">
              <span class="vault-field-text vault-password-mask" id="pass_${v.id}" data-val="${escapeHtml(v.password||'')}">••••••••</span>
              <button class="vault-eye-btn" onclick="togglePasswordVisibility(${v.id})" title="Show/Hide Password" id="eyebtn_${v.id}">👁️</button>
              <button class="vault-copy-btn" onclick="copyToClipboard('${escapeHtml(v.password||'')}','Password')" title="Copy Password">📋</button>
            </div>
          </div>
          
          ${v.notes ? `<div class="vault-notes">${escapeHtml(v.notes)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('') : `<div class="vault-empty"><div style="font-size:48px">🔐</div><div style="font-size:16px;font-weight:700;margin:12px 0 8px">No credentials in ${activeFolder === 'All' ? 'Vault' : activeFolder}</div><div style="color:var(--text-muted);font-size:13px">Click "+ Add Credential" to store your first login</div></div>`;

  // Stats
  const totalCreds = STATE.vault.length;
  const foldersUsed = [...new Set(STATE.vault.map(v => v.folder))].length;

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1>🔐 Vault</h1>
        <p>Securely store all credentials — GST, MCA, Income Tax, Bank & more</p>
      </div>
      <div class="page-header-right">
        <div class="vault-stats-mini">
          <span>🔐 <strong>${totalCreds}</strong> credentials</span>
          <span>📁 <strong>${foldersUsed}</strong> folders used</span>
        </div>
        <button class="btn-primary" onclick="openAddVaultModal()">+ Add Credential</button>
      </div>
    </div>

    <div class="vault-folders-bar">
      ${folderTabs}
    </div>

    <div class="vault-search-bar">
      <span>🔍</span>
      <input type="text" placeholder="Search credentials by label, username..." oninput="searchVault(this.value)" id="vaultSearch" />
    </div>

    <div class="vault-grid" id="vaultGrid">
      ${credsHtml}
    </div>
  `;
}

function switchVaultFolder(folderId) {
  STATE.activeVaultFolder = folderId;
  renderVaultPage();
}

function searchVault(query) {
  const q = query.toLowerCase().trim();
  const filtered = STATE.vault.filter(v => {
    if (!q) return STATE.activeVaultFolder === 'All' || v.folder === STATE.activeVaultFolder;
    return (v.label||'').toLowerCase().includes(q) || (v.username||'').toLowerCase().includes(q) || (v.folder||'').toLowerCase().includes(q) || (v.notes||'').toLowerCase().includes(q);
  });
  const grid = document.getElementById('vaultGrid');
  if (!grid) return;
  if (!filtered.length) { grid.innerHTML = `<div class="vault-empty"><div style="font-size:36px">🔍</div><div style="font-size:15px;font-weight:600;margin-top:8px">No results for "${escapeHtml(query)}"</div></div>`; return; }
  grid.innerHTML = filtered.map(v => {
    const folder = VAULT_FOLDERS.find(f => f.id === v.folder) || VAULT_FOLDERS[VAULT_FOLDERS.length-1];
    return `
      <div class="vault-card" data-id="${v.id}">
        <div class="vault-card-header" style="background:${folder.color}18;border-bottom:1px solid ${folder.color}30">
          <div class="vault-card-folder" style="color:${folder.color}">${folder.icon} ${folder.label}</div>
          <div class="vault-card-actions">
            <button class="vault-action-btn" onclick="editVaultEntry(${v.id})">✏️</button>
            <button class="vault-action-btn" onclick="deleteVaultEntry(${v.id})">🗑️</button>
          </div>
        </div>
        <div class="vault-card-body">
          <div class="vault-card-label">${escapeHtml(v.label)}</div>
          <div class="vault-field"><div class="vault-field-label">👤 Username / ID</div><div class="vault-field-value"><span class="vault-field-text">${escapeHtml(v.username||'—')}</span><button class="vault-copy-btn" onclick="copyToClipboard('${escapeHtml(v.username||'')}','Username')">📋</button></div></div>
          <div class="vault-field"><div class="vault-field-label">🔑 Password</div><div class="vault-field-value"><span class="vault-field-text vault-password-mask" id="pass_${v.id}" data-val="${escapeHtml(v.password||'')}">••••••••</span><button class="vault-eye-btn" onclick="togglePasswordVisibility(${v.id})" id="eyebtn_${v.id}">👁️</button><button class="vault-copy-btn" onclick="copyToClipboard('${escapeHtml(v.password||'')}','Password')">📋</button></div></div>
          ${v.notes ? `<div class="vault-notes">${escapeHtml(v.notes)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function togglePasswordVisibility(id) {
  const passEl = document.getElementById('pass_' + id);
  const btnEl = document.getElementById('eyebtn_' + id);
  if (!passEl) return;
  const isHidden = passEl.classList.contains('vault-password-mask');
  if (isHidden) {
    passEl.textContent = passEl.getAttribute('data-val') || '(empty)';
    passEl.classList.remove('vault-password-mask');
    if (btnEl) btnEl.textContent = '🙈';
  } else {
    passEl.textContent = '••••••••';
    passEl.classList.add('vault-password-mask');
    if (btnEl) btnEl.textContent = '👁️';
  }
}

function copyToClipboard(text, label) {
  if (!text) { showToast(`No ${label} to copy`); return; }
  navigator.clipboard.writeText(text).then(() => {
    showToast(`✅ ${label} copied to clipboard!`);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast(`✅ ${label} copied!`); }
    catch(e) { showToast(`❌ Copy failed`); }
    document.body.removeChild(ta);
  });
}

function openAddVaultModal() {
  const folderOptions = VAULT_FOLDERS.filter(f => f.id !== 'All').map(f => `<option value="${f.id}">${f.icon} ${f.label}</option>`).join('');
  openModalWithContent('🔐 Add Credential', `
    <div class="form-group">
      <label>Folder / Category *</label>
      <select class="form-control" id="vaultFolder">${folderOptions}</select>
    </div>
    <div class="form-group">
      <label>Label / Name *</label>
      <input type="text" class="form-control" id="vaultLabel" placeholder="e.g. ABC Pvt Ltd - GST Portal" />
    </div>
    <div class="form-group">
      <label>Website URL</label>
      <input type="text" class="form-control" id="vaultUrl" placeholder="e.g. https://gst.gov.in" />
    </div>
    <div class="form-group">
      <label>Username / User ID</label>
      <input type="text" class="form-control" id="vaultUsername" placeholder="Enter username or user ID" autocomplete="off" />
    </div>
    <div class="form-group">
      <label>Password</label>
      <div style="position:relative">
        <input type="password" class="form-control" id="vaultPassword" placeholder="Enter password" autocomplete="new-password" style="padding-right:44px" />
        <button onclick="toggleInputPassword('vaultPassword')" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">👁️</button>
      </div>
    </div>
    <div class="form-group">
      <label>Notes</label>
      <textarea class="form-control" id="vaultNotes" rows="2" placeholder="Optional notes (e.g. 2FA enabled, contact person...)"></textarea>
    </div>
    <button class="btn-primary" style="width:100%" onclick="submitAddVault()">🔐 Save Credential</button>
  `);
}

function toggleInputPassword(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function submitAddVault() {
  const folder = document.getElementById('vaultFolder')?.value;
  const label = document.getElementById('vaultLabel')?.value.trim();
  if (!label) { showToast('Please enter a label'); return; }
  const body = {
    folder, label,
    url: document.getElementById('vaultUrl')?.value.trim() || null,
    username: document.getElementById('vaultUsername')?.value.trim() || null,
    password: document.getElementById('vaultPassword')?.value || null,
    notes: document.getElementById('vaultNotes')?.value.trim() || null,
    created_by: STATE.myEmail
  };
  const result = await supabaseInsert('vault_credentials', body);
  if (result && result[0]) {
    STATE.vault.unshift(result[0]);
    closeModal(); renderVaultPage(); showToast('✅ Credential saved in Vault!');
  } else { showToast('❌ Failed to save credential'); }
}

function editVaultEntry(id) {
  const v = STATE.vault.find(x => x.id === id);
  if (!v) return;
  const folderOptions = VAULT_FOLDERS.filter(f => f.id !== 'All').map(f => `<option value="${f.id}" ${v.folder===f.id?'selected':''}>${f.icon} ${f.label}</option>`).join('');
  openModalWithContent('✏️ Edit Credential', `
    <div class="form-group"><label>Folder *</label><select class="form-control" id="editVaultFolder">${folderOptions}</select></div>
    <div class="form-group"><label>Label *</label><input type="text" class="form-control" id="editVaultLabel" value="${escapeHtml(v.label)}" /></div>
    <div class="form-group"><label>Website URL</label><input type="text" class="form-control" id="editVaultUrl" value="${escapeHtml(v.url||'')}" /></div>
    <div class="form-group"><label>Username / User ID</label><input type="text" class="form-control" id="editVaultUsername" value="${escapeHtml(v.username||'')}" autocomplete="off" /></div>
    <div class="form-group"><label>Password</label>
      <div style="position:relative">
        <input type="password" class="form-control" id="editVaultPassword" value="${escapeHtml(v.password||'')}" autocomplete="new-password" style="padding-right:44px" />
        <button onclick="toggleInputPassword('editVaultPassword')" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">👁️</button>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea class="form-control" id="editVaultNotes" rows="2">${escapeHtml(v.notes||'')}</textarea></div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn-primary" style="flex:1" onclick="saveVaultEdit(${id})">💾 Save Changes</button>
      <button class="btn-outline" style="flex:1;border-color:var(--danger);color:var(--danger)" onclick="deleteVaultEntry(${id})">🗑️ Delete</button>
    </div>
  `);
}

async function saveVaultEdit(id) {
  const label = document.getElementById('editVaultLabel')?.value.trim();
  if (!label) { showToast('Label required'); return; }
  const updated = {
    folder: document.getElementById('editVaultFolder')?.value,
    label,
    url: document.getElementById('editVaultUrl')?.value.trim() || null,
    username: document.getElementById('editVaultUsername')?.value.trim() || null,
    password: document.getElementById('editVaultPassword')?.value || null,
    notes: document.getElementById('editVaultNotes')?.value.trim() || null,
  };
  const ok = await supabaseUpdate('vault_credentials', id, updated);
  if (ok) {
    const idx = STATE.vault.findIndex(v => v.id === id);
    if (idx !== -1) STATE.vault[idx] = { ...STATE.vault[idx], ...updated };
    closeModal(); renderVaultPage(); showToast('✅ Credential updated!');
  } else { showToast('❌ Update failed'); }
}

async function deleteVaultEntry(id) {
  const v = STATE.vault.find(x => x.id === id);
  if (!v) return;
  openModalWithContent('🗑️ Delete Credential', `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:40px;margin-bottom:12px">⚠️</div>
      <div style="font-weight:700;font-size:15px;margin-bottom:8px">Delete "${escapeHtml(v.label)}"?</div>
      <div style="color:var(--text-muted);font-size:13px;margin-bottom:20px">This action cannot be undone.</div>
      <div style="display:flex;gap:10px">
        <button class="btn-outline" style="flex:1" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" style="flex:1;background:var(--danger)" onclick="confirmDeleteVault(${id})">Delete</button>
      </div>
    </div>
  `);
}
async function confirmDeleteVault(id) {
  const ok = await supabaseDelete('vault_credentials', id);
  if (ok) { STATE.vault = STATE.vault.filter(v => v.id !== id); closeModal(); renderVaultPage(); showToast('🗑️ Credential deleted'); }
  else { showToast('❌ Delete failed'); }
}

/* =========================================================
   19. 💬 ENHANCED TEAM CHAT
   ========================================================= */

// Emoji sets
const EMOJI_SET = ['😀','😂','😍','🥰','😎','🤔','👍','👎','🙏','💪','🔥','❤️','⭐','✅','❌','⚠️','📊','💰','🏛️','📋','🧾','🛡️','✍️','🧮','📁','📅','💬','🎉','🚀','💡','📌','🔔','📞','📧','🔐','🔑'];

const STICKER_SET = [
  { emoji: '🎉', label: 'Congrats' },
  { emoji: '👍🏼', label: 'Good Job' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '✅', label: 'Done' },
  { emoji: '⏰', label: 'Urgent' },
  { emoji: '💡', label: 'Idea' },
  { emoji: '📌', label: 'Note' },
  { emoji: '🚀', label: 'Let\'s Go' },
  { emoji: '😂', label: 'LOL' },
  { emoji: '🙏', label: 'Thanks' },
  { emoji: '💪', label: 'Strong' },
  { emoji: '❤️', label: 'Love' },
];

async function updatePresence(isOnline) {
  if (!STATE.myEmail) return;
  const url = `${SUPABASE_URL}/rest/v1/user_presence?email=eq.${encodeURIComponent(STATE.myEmail)}`;
  const body = { email: STATE.myEmail, is_online: isOnline, last_seen: new Date().toISOString() };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
  if (res.status === 404 || !res.ok) {
    await supabaseInsert('user_presence', body);
  }
}

async function getOnlineUsers() {
  const cutoff = new Date(Date.now() - 45000).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/user_presence?is_online=eq.true&last_seen=gte.${cutoff}`;
  const res = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } });
  return res.ok ? await res.json() : [];
}

async function renderTeamContacts() {
  const el = document.getElementById('chatContacts');
  if (!el) return;
  const myEmail = STATE.myEmail;
  const profiles = await supabase('profiles', { order: 'full_name.asc' });
  const onlineUsers = await getOnlineUsers();
  const onlineEmails = new Set((onlineUsers||[]).map(u => u.email));
  const others = (profiles||[]).filter(p => p.email !== myEmail);
  if (!others.length) {
    el.innerHTML = `<div style="padding:16px;color:var(--text-muted);font-size:13px;text-align:center">No team members yet.<br>Use the email field above to start a new chat.</div>`;
    return;
  }
  el.innerHTML = others.map(p => {
    const name = p.full_name || p.email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    const isActive = p.email === STATE.activeChatContact;
    const isOnline = onlineEmails.has(p.email);
    return `
      <div class="contact-item ${isActive ? 'active' : ''}" onclick="switchChatContact('${p.email}', '${escapeHtml(name)}')">
        <div style="position:relative;flex-shrink:0">
          <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#4f46e5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px">${initial}</div>
          <div style="position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;background:${isOnline?'#10b981':'#94a3b8'};border:2px solid var(--surface)"></div>
        </div>
        <div style="flex:1;overflow:hidden;margin-left:10px">
          <div style="font-weight:600;font-size:13.5px">${escapeHtml(name)}</div>
          <div style="font-size:11px;color:${isOnline?'#10b981':'var(--text-muted)'}">● ${isOnline ? 'Online' : 'Offline'}</div>
        </div>
      </div>
    `;
  }).join('');
}

function switchChatContact(email, name) {
  STATE.activeChatContact = email;
  STATE.activeChatContactName = name || email.split('@')[0];
  STATE.replyingTo = null;
  STATE.editingMessageId = null;
  const nameEl = document.getElementById('activeChatName');
  if (nameEl) nameEl.textContent = STATE.activeChatContactName;
  const avatarEl = document.querySelector('.chat-avatar-sm');
  if (avatarEl) avatarEl.textContent = STATE.activeChatContactName.charAt(0).toUpperCase();
  hideEmojiPicker(); hideStickerPicker(); clearReplyUI();
  renderTeamContacts();
  renderTeamMessages();
}

function startNewChat() {
  const emailInput = document.getElementById('newChatEmail');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) { showToast('Enter a valid email address'); return; }
  if (email === STATE.myEmail) { showToast('Cannot message yourself!'); return; }
  emailInput.value = '';
  switchChatContact(email, email.split('@')[0]);
  showToast('Starting chat with ' + email);
}

// Typing indicator
async function sendTypingIndicator() {
  if (!STATE.activeChatContact || !STATE.myEmail) return;
  await supabaseInsert('typing_indicators', { sender_email: STATE.myEmail, receiver_email: STATE.activeChatContact, updated_at: new Date().toISOString() });
}

async function checkTypingIndicator() {
  if (!STATE.activeChatContact || !STATE.myEmail) return;
  const cutoff = new Date(Date.now() - 3000).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/typing_indicators?sender_email=eq.${encodeURIComponent(STATE.activeChatContact)}&receiver_email=eq.${encodeURIComponent(STATE.myEmail)}&updated_at=gte.${cutoff}`;
  const res = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } });
  const data = res.ok ? await res.json() : [];
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.style.display = data.length > 0 ? 'flex' : 'none';
    if (data.length > 0) indicator.querySelector('.typing-name').textContent = STATE.activeChatContactName + ' is typing...';
  }
}

async function renderTeamMessages() {
  const el = document.getElementById('teamMessages');
  if (!el) return;
  const myEmail = STATE.myEmail;
  const contactEmail = STATE.activeChatContact;
  if (!contactEmail) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px 20px">Select a contact to start chatting</div>';
    return;
  }
  const url = `${SUPABASE_URL}/rest/v1/team_messages?or=(and(sender_email.eq.${encodeURIComponent(myEmail)},receiver_email.eq.${encodeURIComponent(contactEmail)}),and(sender_email.eq.${encodeURIComponent(contactEmail)},receiver_email.eq.${encodeURIComponent(myEmail)}))&order=created_at.asc`;
  const res = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } });
  const messages = res.ok ? await res.json() : [];
  STATE.chatMessages = messages;
  const prevScroll = el.scrollTop;
  const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;

  if (!messages.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px 20px">No messages yet. Send the first one! 👋</div>';
    return;
  }

  // Group messages by date
  let lastDate = '';
  el.innerHTML = messages.map(m => {
    if (m.is_deleted) return `<div class="chat-msg ${m.sender_email===myEmail?'user':''} deleted-msg"><div class="msg-avatar">${m.sender_email.charAt(0).toUpperCase()}</div><div class="msg-content deleted-content">🚫 This message was deleted</div></div>`;
    
    const msgDate = new Date(m.created_at).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'});
    const dateSep = msgDate !== lastDate ? `<div class="chat-date-sep"><span>${msgDate}</span></div>` : '';
    lastDate = msgDate;

    const isMe = m.sender_email === myEmail;
    const timeStr = new Date(m.created_at).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
    const reactions = m.reactions || {};
    const reactHtml = Object.entries(reactions).map(([emoji, users]) => users.length > 0 ? `<button class="msg-reaction" onclick="toggleReaction(${m.id},'${emoji}')">${emoji} ${users.length}</button>` : '').join('');

    const replyPreview = m.reply_to && m.reply_preview ? `<div class="msg-reply-preview">↩️ ${escapeHtml(m.reply_preview.slice(0,60))}${m.reply_preview.length>60?'...':''}</div>` : '';
    
    const msgType = m.message_type || 'text';
    let contentHtml = '';
    if (msgType === 'sticker') {
      contentHtml = `<div class="sticker-msg">${escapeHtml(m.message)}</div>`;
    } else {
      contentHtml = escapeHtml(m.message) + (m.is_edited ? ' <span class="edited-tag">(edited)</span>' : '');
    }

    return `${dateSep}<div class="chat-msg ${isMe?'user':''}" id="msg_${m.id}">
      <div class="msg-avatar">${m.sender_email.charAt(0).toUpperCase()}</div>
      <div class="msg-bubble-wrap">
        ${replyPreview}
        <div class="msg-content">
          ${contentHtml}
          <div class="msg-meta"><span class="msg-time">${timeStr}</span>${isMe?'<span class="msg-status">✓✓</span>':''}</div>
        </div>
        ${reactHtml ? `<div class="msg-reactions">${reactHtml}</div>` : ''}
        <div class="msg-hover-actions">
          <button onclick="setReply(${m.id})" title="Reply">↩️</button>
          <button onclick="openEmojiReact(${m.id})" title="React">😊</button>
          ${isMe ? `<button onclick="startEditMessage(${m.id})" title="Edit">✏️</button>` : ''}
          ${isMe ? `<button onclick="deleteMessage(${m.id})" title="Delete">🗑️</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  if (wasAtBottom) el.scrollTop = el.scrollHeight;
}

// Reply
function setReply(msgId) {
  const msg = STATE.chatMessages.find(m => m.id === msgId);
  if (!msg) return;
  STATE.replyingTo = msg;
  const replyBar = document.getElementById('replyBar');
  if (replyBar) {
    replyBar.style.display = 'flex';
    replyBar.querySelector('.reply-preview-text').textContent = msg.message?.slice(0,80) || '...';
  }
  document.getElementById('teamChatInput')?.focus();
}
function clearReplyUI() {
  STATE.replyingTo = null;
  const replyBar = document.getElementById('replyBar');
  if (replyBar) replyBar.style.display = 'none';
}

// Emoji picker
function toggleEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  if (!picker) return;
  const isVisible = picker.style.display === 'block';
  hideStickerPicker();
  picker.style.display = isVisible ? 'none' : 'block';
}
function hideEmojiPicker() { const p = document.getElementById('emojiPicker'); if (p) p.style.display = 'none'; }
function insertEmoji(emoji) {
  const input = document.getElementById('teamChatInput');
  if (input) { input.value += emoji; input.focus(); }
  hideEmojiPicker();
}

// Sticker picker
function toggleStickerPicker() {
  const picker = document.getElementById('stickerPicker');
  if (!picker) return;
  const isVisible = picker.style.display === 'block';
  hideEmojiPicker();
  picker.style.display = isVisible ? 'none' : 'block';
}
function hideStickerPicker() { const p = document.getElementById('stickerPicker'); if (p) p.style.display = 'none'; }
async function sendSticker(emoji) {
  hideStickerPicker();
  const contactEmail = STATE.activeChatContact;
  if (!contactEmail) return;
  await supabaseInsert('team_messages', { sender_email: STATE.myEmail, receiver_email: contactEmail, message: emoji, message_type: 'sticker' });
  await renderTeamMessages();
}

// Mention
function insertMention() {
  const input = document.getElementById('teamChatInput');
  if (!input) return;
  input.value += '@' + STATE.activeChatContactName + ' ';
  input.focus();
}

// React to message
async function toggleReaction(msgId, emoji) {
  const msg = STATE.chatMessages.find(m => m.id === msgId);
  if (!msg) return;
  const reactions = msg.reactions || {};
  if (!reactions[emoji]) reactions[emoji] = [];
  const idx = reactions[emoji].indexOf(STATE.myEmail);
  if (idx === -1) reactions[emoji].push(STATE.myEmail);
  else reactions[emoji].splice(idx, 1);
  await supabaseUpdate('team_messages', msgId, { reactions });
  await renderTeamMessages();
}

function openEmojiReact(msgId) {
  const quickEmojis = ['👍','❤️','😂','😮','😢','🔥','✅','🙏'];
  openModalWithContent('React to message', `
    <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:10px">
      ${quickEmojis.map(e => `<button onclick="toggleReaction(${msgId},'${e}');closeModal()" style="font-size:28px;background:none;border:1px solid var(--border);border-radius:10px;padding:8px 12px;cursor:pointer;transition:transform .15s" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${e}</button>`).join('')}
    </div>
  `);
}

// Edit message
function startEditMessage(msgId) {
  const msg = STATE.chatMessages.find(m => m.id === msgId);
  if (!msg) return;
  STATE.editingMessageId = msgId;
  const input = document.getElementById('teamChatInput');
  if (input) { input.value = msg.message; input.focus(); }
  const editBar = document.getElementById('editBar');
  if (editBar) { editBar.style.display = 'flex'; editBar.querySelector('.edit-preview-text').textContent = 'Editing: ' + (msg.message?.slice(0,50)||''); }
}
function cancelEdit() {
  STATE.editingMessageId = null;
  const editBar = document.getElementById('editBar');
  if (editBar) editBar.style.display = 'none';
  const input = document.getElementById('teamChatInput');
  if (input) input.value = '';
}

// Delete message
async function deleteMessage(msgId) {
  const ok = await supabaseUpdate('team_messages', msgId, { is_deleted: true, message: '[deleted]' });
  if (ok) { await renderTeamMessages(); showToast('🗑️ Message deleted'); }
}

async function sendTeamMessage() {
  const input = document.getElementById('teamChatInput');
  const text = input?.value.trim();
  if (!text) return;
  const contactEmail = STATE.activeChatContact;
  if (!contactEmail) { showToast('Select a contact first'); return; }

  // Editing mode
  if (STATE.editingMessageId) {
    const ok = await supabaseUpdate('team_messages', STATE.editingMessageId, { message: text, is_edited: true });
    if (ok) { input.value = ''; cancelEdit(); await renderTeamMessages(); showToast('✏️ Message edited'); }
    return;
  }

  const msgBody = {
    sender_email: STATE.myEmail,
    receiver_email: contactEmail,
    message: text,
    message_type: 'text',
    reply_to: STATE.replyingTo ? STATE.replyingTo.id : null,
    reply_preview: STATE.replyingTo ? STATE.replyingTo.message?.slice(0,100) : null,
  };
  input.value = '';
  clearReplyUI();
  hideEmojiPicker(); hideStickerPicker();
  await supabaseInsert('team_messages', msgBody);
  await renderTeamMessages();
  await renderTeamContacts();
}

// Polling for realtime
function startChatPolling() {
  if (STATE.pollInterval) clearInterval(STATE.pollInterval);
  STATE.pollInterval = setInterval(async () => {
    if (STATE.currentPage === 'teamchat' && STATE.activeChatContact) {
      await renderTeamMessages();
      await checkTypingIndicator();
    }
    // Refresh contact presence every 30s
    if (STATE.currentPage === 'teamchat') await renderTeamContacts();
  }, 3000);
}

// Supabase Realtime
function setupRealtimeChat() {
  try {
    const wsUrl = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket?vsn=1.0.0&apikey=' + SUPABASE_ANON_KEY;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ topic: 'realtime:public:team_messages', event: 'phx_join', payload: {}, ref: '1' }));
    };
    ws.onmessage = async (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.event === 'INSERT' && STATE.currentPage === 'teamchat') {
          await renderTeamMessages();
        }
      } catch(e) {}
    };
    ws.onerror = () => {}; // Silent fail, polling handles it
    STATE.realtimeChannel = ws;
  } catch(e) {}
}

/* =========================================================
   20. NOTIFICATIONS
   ========================================================= */

function openNotifications() {
  const panel = document.getElementById('notifPanel');
  STATE.notifOpen = !STATE.notifOpen;
  if (panel) panel.classList.toggle('show', STATE.notifOpen);
  const notifList = document.getElementById('notifList'); if (!notifList) return;
  const notifs = [];
  STATE.gstReturns.filter(g=>g.status==='Pending').slice(0,2).forEach(g => notifs.push({ icon:'📊', text:'GSTR pending: '+g.client_name+' — '+g.return_type, time:'Pending' }));
  STATE.dscRecords.filter(d=>(d.days_left||99)<=30).forEach(d => notifs.push({ icon:'⚠️', text:'DSC expiring: '+d.client_name+' in '+d.days_left+' days', time:'Alert' }));
  STATE.tasks.filter(t=>t.column_name==='todo'&&(t.tags||[]).includes('High')).slice(0,2).forEach(t => notifs.push({ icon:'🔴', text:'High priority: '+t.title, time:'Task' }));
  notifList.innerHTML = (notifs.length ? notifs : [{icon:'✅', text:'No new notifications', time:''}]).map(n => `<div class="notif-item"><div class="notif-icon">${n.icon}</div><div><div class="notif-text">${escapeHtml(n.text)}</div><div class="notif-time">${escapeHtml(n.time)}</div></div></div>`).join('');
  const dot = document.querySelector('.notif-dot'); if (dot) dot.textContent = notifs.length || '0';
}
function closeNotifications() { const panel = document.getElementById('notifPanel'); if (panel) panel.classList.remove('show'); STATE.notifOpen = false; }

/* =========================================================
   21. MODALS
   ========================================================= */

function openModal(type) {
  const clientOptions = STATE.clients.slice(0, 30).map(c => `<option>${escapeHtml(c.name)}</option>`).join('');
  const configs = {
    addClient: { title: '➕ Add New Client', body: `<div class="form-grid"><div class="form-group"><label>Client Name *</label><input type="text" class="form-control" id="addClientName" placeholder="Enter client name" /></div><div class="form-group"><label>PAN / TAN</label><input type="text" class="form-control" id="addClientPAN" placeholder="Enter PAN/TAN" /></div><div class="form-group"><label>Type</label><select class="form-control" id="addClientType"><option>Individual</option><option>Company</option><option>LLP</option><option>Partnership</option></select></div><div class="form-group"><label>GST Number</label><input type="text" class="form-control" id="addClientGST" placeholder="GSTIN" /></div><div class="form-group"><label>Email</label><input type="text" class="form-control" id="addClientEmail" placeholder="Email" /></div><div class="form-group"><label>Phone</label><input type="text" class="form-control" id="addClientPhone" placeholder="Phone" /></div></div><button class="btn-primary" style="width:100%" onclick="submitAddClient()">✅ Add Client</button>` },
    rocFiling: { title: '🏛️ New ROC Filing', body: `<div class="form-group"><label>Company Name *</label><input type="text" class="form-control" id="rocCompany" /></div><div class="form-group"><label>CIN</label><input type="text" class="form-control" id="rocCIN" /></div><div class="form-group"><label>Form Type</label><select class="form-control" id="rocForm"><option>AOC-4</option><option>MGT-7</option><option>ADT-1</option><option>DIR-3 KYC</option></select></div><div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="rocDue" /></div><button class="btn-primary" style="width:100%" onclick="submitROCFiling()">✅ Create Filing</button>` },
    newAudit: { title: '🛡️ Schedule Audit', body: `<div class="form-group"><label>Client *</label><select class="form-control" id="auditClient"><option>Select Client</option>${clientOptions}</select></div><div class="form-group"><label>Audit Type</label><select class="form-control" id="auditType"><option>Statutory Audit</option><option>Tax Audit</option><option>Internal Audit</option><option>Stock Audit</option></select></div><div class="form-group"><label>Auditor</label><select class="form-control" id="auditAuditor"><option>Kamlesh Yadav</option><option>Anjali Rao</option><option>Sameer Joshi</option></select></div><div class="form-group"><label>Start Date</label><input type="date" class="form-control" id="auditStart" /></div><div class="form-group"><label>End Date</label><input type="date" class="form-control" id="auditEnd" /></div><button class="btn-primary" style="width:100%" onclick="submitNewAudit()">✅ Schedule</button>` },
    newTask: { title: '✅ Add New Task', body: `<div class="form-group"><label>Task Title *</label><input type="text" class="form-control" id="newTaskTitleModal" /></div><div class="form-group"><label>Tags</label><input type="text" class="form-control" id="newTaskTagsModal" placeholder="GST, High" /></div><div class="form-group"><label>Assignee</label><select class="form-control" id="newTaskAssigneeModal"><option>Kamlesh</option><option>Anjali</option><option>Sameer</option></select></div><div class="form-group"><label>Due Date</label><input type="text" class="form-control" id="newTaskDueModal" /></div><div class="form-group"><label>Column</label><select class="form-control" id="newTaskColModal"><option value="todo">To Do</option><option value="inprogress">In Progress</option><option value="done">Done</option></select></div><button class="btn-primary" style="width:100%" onclick="submitNewTaskModal()">✅ Add Task</button>` },
    uploadDoc: { title: '📁 Upload Document', body: `<div class="form-group"><label>Document Name *</label><input type="text" class="form-control" id="uploadDocName" /></div><div class="form-group"><label>Client</label><select class="form-control" id="uploadDocClient"><option>Internal</option>${clientOptions}</select></div><div class="form-group"><label>Type</label><select class="form-control" id="uploadDocType"><option>PDF</option><option>Excel</option><option>Word</option><option>Image</option></select></div><div class="form-group"><label>File Size</label><input type="text" class="form-control" id="uploadDocSize" /></div><button class="btn-primary" style="width:100%" onclick="submitUploadDoc()">⬆ Upload</button>` },
    newEvent: { title: '📅 Add Calendar Event', body: `<div class="form-group"><label>Event Title *</label><input type="text" class="form-control" id="newEventTitle" /></div><div class="form-group"><label>Type</label><select class="form-control" id="newEventType"><option>GST</option><option>TDS</option><option>ROC</option><option>DSC</option><option>Income Tax</option><option>Internal</option></select></div><div class="form-group"><label>Date *</label><input type="date" class="form-control" id="newEventDate" /></div><button class="btn-primary" style="width:100%" onclick="submitNewEvent()">✅ Add Event</button>` },
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
function closeModal() { const overlay = document.getElementById('modalOverlay'); if (overlay) overlay.classList.remove('show'); }

async function submitAddClient() {
  const name = document.getElementById('addClientName')?.value.trim();
  if (!name) { showToast('Client name is required'); return; }
  const body = { name, pan: document.getElementById('addClientPAN')?.value.trim()||'-', type: document.getElementById('addClientType')?.value, gst: document.getElementById('addClientGST')?.value.trim()||'-', email: document.getElementById('addClientEmail')?.value.trim()||'-', phone: document.getElementById('addClientPhone')?.value.trim()||'-', status: 'Active' };
  const result = await supabaseInsert('clients', body);
  if (result && result[0]) { STATE.clients.unshift(result[0]); closeModal(); renderClientTable(); updateDashboardStats(); populateGSTClientDropdown(); showToast('✅ Client added!'); }
  else { showToast('❌ Failed to add client'); }
}
async function submitROCFiling() {
  const company = document.getElementById('rocCompany')?.value.trim();
  if (!company) { showToast('Company name required'); return; }
  const body = { company, cin: document.getElementById('rocCIN')?.value.trim()||'-', form: document.getElementById('rocForm')?.value, due_date: document.getElementById('rocDue')?.value||'TBD', status: 'In Progress' };
  const result = await supabaseInsert('roc_filings', body);
  if (result && result[0]) { STATE.rocFilings.unshift(result[0]); closeModal(); renderROCTable(); showToast('✅ ROC filing created!'); }
}
async function submitNewAudit() {
  const client = document.getElementById('auditClient')?.value;
  if (!client || client==='Select Client') { showToast('Please select a client'); return; }
  const body = { client, audit_type: document.getElementById('auditType')?.value, auditor: document.getElementById('auditAuditor')?.value, start_date: document.getElementById('auditStart')?.value||'TBD', end_date: document.getElementById('auditEnd')?.value||'TBD', status: 'In Progress' };
  const result = await supabaseInsert('audits', body);
  if (result && result[0]) { STATE.audits.unshift(result[0]); closeModal(); renderAuditTable(); showToast('✅ Audit scheduled!'); }
}
async function submitNewTaskModal() {
  const title = document.getElementById('newTaskTitleModal')?.value.trim();
  if (!title) { showToast('Task title required'); return; }
  const tagsRaw = document.getElementById('newTaskTagsModal')?.value.trim();
  const body = { title, tags: tagsRaw?tagsRaw.split(',').map(t=>t.trim()).filter(Boolean):[], assignee: document.getElementById('newTaskAssigneeModal')?.value||'Kamlesh', due_date: document.getElementById('newTaskDueModal')?.value.trim()||'TBD', column_name: document.getElementById('newTaskColModal')?.value||'todo' };
  const result = await supabaseInsert('tasks', body);
  if (result && result[0]) { STATE.tasks.unshift(result[0]); closeModal(); renderKanban(); showToast('✅ Task added!'); }
}
async function submitUploadDoc() {
  const name = document.getElementById('uploadDocName')?.value.trim();
  if (!name) { showToast('Document name required'); return; }
  const typeVal = document.getElementById('uploadDocType')?.value||'PDF';
  const iconMap = { PDF:'📕', Excel:'📗', Word:'📘', Image:'🖼️' };
  const body = { name, doc_type: typeVal, icon: iconMap[typeVal]||'📄', client_name: document.getElementById('uploadDocClient')?.value||'Internal', file_size: document.getElementById('uploadDocSize')?.value.trim()||'Unknown' };
  const result = await supabaseInsert('documents', body);
  if (result && result[0]) { STATE.documents.unshift(result[0]); closeModal(); renderDocuments(); showToast('✅ Document uploaded!'); }
}
async function submitNewEvent() {
  const title = document.getElementById('newEventTitle')?.value.trim(); const dateVal = document.getElementById('newEventDate')?.value;
  if (!title || !dateVal) { showToast('Please fill all fields'); return; }
  const body = { title, event_type: document.getElementById('newEventType')?.value, event_date: dateVal };
  const result = await supabaseInsert('calendar_events', body);
  if (result && result[0]) { STATE.calendarEvents.push(result[0]); closeModal(); renderCalendar(); renderEventList(); renderDueDates(); showToast('✅ Event added!'); }
}

/* =========================================================
   22. QUICK ACTION & PROFILE
   ========================================================= */

function openQuickAction() {
  openModalWithContent('⚡ Quick Action', `
    <div class="quick-action-grid">
      <button class="qa-btn" onclick="closeModal();openModal('addClient')"><span class="qa-btn-icon">👥</span><span class="qa-btn-label">Add Client</span></button>
      <button class="qa-btn" onclick="closeModal();navigate('gst')"><span class="qa-btn-icon">📊</span><span class="qa-btn-label">File GST</span></button>
      <button class="qa-btn" onclick="closeModal();navigate('incometax')"><span class="qa-btn-icon">💰</span><span class="qa-btn-label">File ITR</span></button>
      <button class="qa-btn" onclick="closeModal();navigate('tds')"><span class="qa-btn-icon">🧾</span><span class="qa-btn-label">File TDS</span></button>
      <button class="qa-btn" onclick="closeModal();openModal('newAudit')"><span class="qa-btn-icon">🛡️</span><span class="qa-btn-label">Schedule Audit</span></button>
      <button class="qa-btn" onclick="closeModal();openModal('newTask')"><span class="qa-btn-icon">✅</span><span class="qa-btn-label">Add Task</span></button>
      <button class="qa-btn" onclick="closeModal();openAddVaultModal()"><span class="qa-btn-icon">🔐</span><span class="qa-btn-label">Add to Vault</span></button>
      <button class="qa-btn" onclick="closeModal();openModal('newEvent')"><span class="qa-btn-icon">📅</span><span class="qa-btn-label">Add Event</span></button>
    </div>
  `);
}

function loadUserInfo() {
  const userRaw = localStorage.getItem('witcorp-user'); if (!userRaw) return;
  const user = JSON.parse(userRaw);
  const name = (user.user_metadata && user.user_metadata.full_name) ? user.user_metadata.full_name : (user.email ? user.email.split('@')[0] : 'User');
  const initial = name.charAt(0).toUpperCase();
  const initEl = document.getElementById('userInitial'); const nameEl = document.getElementById('userDisplayName');
  if (initEl) initEl.textContent = initial; if (nameEl) nameEl.textContent = name;
  const welcomeEl = document.getElementById('welcomeUserName'); if (welcomeEl) welcomeEl.textContent = name;
}

function loadUserInfoExtended() {
  const userRaw = localStorage.getItem('witcorp-user'); if (!userRaw) return;
  const user = JSON.parse(userRaw); const meta = user.user_metadata || {};
  const name = meta.full_name || (user.email ? user.email.split('@')[0] : 'User');
  const role = meta.role || 'Member'; const initial = name.charAt(0).toUpperCase();
  const initEl = document.getElementById('userInitial'); const nameEl = document.getElementById('userDisplayName'); const roleEl = document.getElementById('userDisplayRole');
  if (initEl) initEl.textContent = initial; if (nameEl) nameEl.textContent = name; if (roleEl) roleEl.textContent = role;
}
document.addEventListener('DOMContentLoaded', loadUserInfoExtended);

function openProfile() {
  const userRaw = localStorage.getItem('witcorp-user'); const user = userRaw ? JSON.parse(userRaw) : {};
  const name = (user.user_metadata && user.user_metadata.full_name) ? user.user_metadata.full_name : (user.email ? user.email.split('@')[0] : 'User');
  const email = user.email || 'Not available'; const initial = name.charAt(0).toUpperCase();
  openModalWithContent('👤 My Profile', `
    <div style="text-align:center;margin-bottom:16px">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;margin:0 auto 12px">${initial}</div>
      <div style="font-weight:700;font-size:16px">${escapeHtml(name)}</div>
      <div style="color:var(--text-muted);font-size:13px">WITCORP India Advisors LLP</div>
    </div>
    <div class="form-group"><label>Email</label><div class="form-control" style="background:var(--bg)">${escapeHtml(email)}</div></div>
    <div class="form-group"><label>Total Clients</label><div class="form-control" style="background:var(--bg)">${STATE.clients.length}</div></div>
    <div class="form-group"><label>Vault Credentials</label><div class="form-control" style="background:var(--bg)">${STATE.vault.length}</div></div>
    <button class="btn-outline" style="width:100%;margin-top:8px;border-color:var(--danger);color:var(--danger)" onclick="logout()">🚪 Logout</button>
  `);
}

async function logout() {
  if (typeof closeModal === 'function') closeModal();
  await updatePresence(false);
  if (STATE.pollInterval) clearInterval(STATE.pollInterval);
  const token = localStorage.getItem('witcorp-access-token');
  if (token) await fetch('https://yqbvdbsbuycxlsfkijhc.supabase.co/auth/v1/logout', { method:'POST', headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+token} }).catch(()=>{});
  localStorage.clear(); sessionStorage.clear(); window.location.replace('login.html');
}

/* =========================================================
   23. GLOBAL SEARCH, TOAST, LISTENERS
   ========================================================= */

function handleSearch(query) {
  if (!query || query.trim().length < 2) return;
  clearTimeout(window._searchTimeout);
  window._searchTimeout = setTimeout(() => {
    const q = query.toLowerCase();
    const clients = STATE.clients.filter(c => (c.name||'').toLowerCase().includes(q)).length;
    const tasks = STATE.tasks.filter(t => (t.title||'').toLowerCase().includes(q)).length;
    const vault = STATE.vault.filter(v => (v.label||'').toLowerCase().includes(q) || (v.username||'').toLowerCase().includes(q)).length;
    const msg = [];
    if (clients) msg.push(clients + ' client(s)');
    if (tasks) msg.push(tasks + ' task(s)');
    if (vault) msg.push(vault + ' vault entry(ies)');
    if (msg.length) showToast('Found: ' + msg.join(', '));
  }, 500);
}

let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('toast'); if (!toast) return;
  toast.textContent = message; toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

function attachGlobalListeners() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
    if (e.key === 'Escape') { closeModal(); closeNotifications(); hideEmojiPicker(); hideStickerPicker(); if (window.innerWidth <= 768) closeSidebar(); }
    if (e.key === 'Enter' && STATE.currentPage === 'teamchat' && document.activeElement?.id === 'teamChatInput') sendTeamMessage();
  });
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    if (panel && panel.classList.contains('show') && !panel.contains(e.target) && !e.target.closest('[onclick*="openNotifications"]')) closeNotifications();
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay && modalOverlay.classList.contains('show') && e.target === modalOverlay) closeModal();
    // Close emoji/sticker pickers on outside click
    const emojiPicker = document.getElementById('emojiPicker');
    const stickerPicker = document.getElementById('stickerPicker');
    if (emojiPicker && !emojiPicker.contains(e.target) && !e.target.closest('[onclick*="toggleEmojiPicker"]')) hideEmojiPicker();
    if (stickerPicker && !stickerPicker.contains(e.target) && !e.target.closest('[onclick*="toggleStickerPicker"]')) hideStickerPicker();
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 768) closeSidebar(); });

  // Typing indicator on chat input
  const chatInput = document.getElementById('teamChatInput');
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      if (STATE.activeChatContact) {
        sendTypingIndicator();
        clearTimeout(STATE.typingTimeout);
        STATE.typingTimeout = setTimeout(() => {}, 2000);
      }
    });
  }
}

/* =========================================================
   24. UTILITY
   ========================================================= */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function formatAmount(num) {
  if (!num) return '0';
  if (num >= 100000) return (num/100000).toFixed(1)+'L';
  if (num >= 1000) return (num/1000).toFixed(1)+'K';
  return num.toLocaleString('en-IN');
}
function statusBadge(status) {
  const map = {'Active':'badge-success','Inactive':'badge-danger','Pending':'badge-warning','Filed':'badge-success','Overdue':'badge-danger','In Progress':'badge-info','In Review':'badge-purple','Completed':'badge-success','Expiring Soon':'badge-warning','Expired':'badge-danger'};
  return `<span class="badge ${map[status]||'badge-info'}">${escapeHtml(status)}</span>`;
}

/* =========================================================
   END OF app.js — WITCORP | Vault + Enhanced Chat
   ========================================================= */
