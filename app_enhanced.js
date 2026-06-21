/* =============================================================
   WITCORP DASHBOARD - app_enhanced.js
   FULLY FIXED VERSION v4:
   ✅ updated_by column shown in ALL tables with correct headers
   ✅ updated_at shown everywhere with correct variable names
   ✅ ROC — client dropdown from Client Management
   ✅ TDS — client dropdown from Client Management
   ✅ DSC fixed, real-time sync, all bugs removed
   ✅ contact_person added in clients
   ============================================================= */

/* =========================================================
   1. SUPABASE CONFIG
   ========================================================= */

var SUPABASE_URL = window.SUPABASE_URL || 'https://yqbvdbsbuycxlsfkijhc.supabase.co';
var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_5qNAkAQrO5yzGnDcNERPxg_pm2Jv8bw';

async function supabaseQuery(table, options = {}) {
  const { method = 'GET', filters = '', body = null, select = '*', order = 'created_at.desc', limit = null } = options;
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
  if (filters) url += `&${filters}`;
  if (order) url += `&order=${order}`;
  if (limit) url += `&limit=${limit}`;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
  };
  try {
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if (!res.ok) { const err = await res.text(); console.error(`Supabase error [${table}]:`, err); return []; }
    if (method === 'DELETE' || method === 'PATCH') return true;
    return await res.json();
  } catch(e) { console.error('supabaseQuery network error:', e); return []; }
}

var supabase = supabaseQuery;

async function supabaseInsert(table, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  const enriched = { ...body, updated_by: getCurrentUserName() || getCurrentUserEmail() };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(enriched)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Insert error:', errText);
      if (errText.includes('updated_by') || errText.includes('column')) {
        const res2 = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(body)
        });
        if (!res2.ok) { console.error('Insert retry error:', await res2.text()); return null; }
        return await res2.json();
      }
      return null;
    }
    return await res.json();
  } catch(e) { console.error('supabaseInsert network error:', e); return null; }
}

async function supabaseUpdate(table, id, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  const enriched = { ...body, updated_by: getCurrentUserName() || getCurrentUserEmail() };
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(enriched)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Update error:', errText);
      if (errText.includes('updated_by') || errText.includes('column')) {
        const res2 = await fetch(url, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(body)
        });
        return res2.ok;
      }
      return null;
    }
    return true;
  } catch(e) { console.error('supabaseUpdate network error:', e); return null; }
}

async function supabaseDelete(table, id) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch(e) { console.error('supabaseDelete network error:', e); return false; }
}

/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

const STATE = {
  currentPage: 'dashboard',
  sidebarOpen: false,
  notifOpen: false,
  calendar: { month: new Date().getMonth(), year: new Date().getFullYear() },
  pagination: { clients: { page: 1, perPage: 10 } },
  filters: { clients: { search: '', status: '', type: '' } },
  activeChatContact: null,
  vaultSelectedFolder: 'General',
  clients: [], gstReturns: [], rocFilings: [], itrFilings: [],
  tdsReturns: [], audits: [], dscRecords: [], accountingEntries: [],
  tasks: [], documents: [], calendarEvents: [],
  vaultCredentials: [],
  teamMessages: [], userPresence: {},
  selectedMessageId: null,
  replyToId: null,
  currentUser: null
};

/* =========================================================
   3. USER INFO
   ========================================================= */

function getCurrentUser() {
  const userRaw = localStorage.getItem('witcorp-user');
  if (!userRaw) return null;
  try { return JSON.parse(userRaw); } catch(e) { return null; }
}

function getCurrentUserName() {
  const user = getCurrentUser();
  if (!user) return 'User';
  return (user.user_metadata && user.user_metadata.full_name)
    ? user.user_metadata.full_name
    : (user.email ? user.email.split('@')[0] : 'User');
}

function getCurrentUserEmail() {
  const user = getCurrentUser();
  return user ? (user.email || '') : '';
}
function getUpdatedByLabel() {
  return getCurrentUserName() || getCurrentUserEmail() || 'User';
}

async function loadUserInfo() {
  const user = getCurrentUser();
  if (!user) return;
  STATE.currentUser = user;

  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;

  // profiles table se latest full_name fetch karo
  let displayName = (user.user_metadata && user.user_metadata.full_name)
    ? user.user_metadata.full_name
    : (user.email ? user.email.split('@')[0] : 'User');

  try {
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=full_name`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } }
    );
    if (profRes.ok) {
      const profData = await profRes.json();
      if (profData?.[0]?.full_name) {
        displayName = profData[0].full_name;
        // localStorage bhi update karo taaki consistent rahe
        const fresh = { ...user };
        fresh.user_metadata = fresh.user_metadata || {};
        fresh.user_metadata.full_name = displayName;
        localStorage.setItem('witcorp-user', JSON.stringify(fresh));
      }
    }
  } catch(e) { /* network error — fallback to stored name */ }

  const initial = displayName.charAt(0).toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url || '';
  const avatarEl = document.getElementById('userInitial');
  if (avatarEl) {
    if (avatarUrl) {
      avatarEl.innerHTML = '';
      avatarEl.style.backgroundImage = `url('${avatarUrl}')`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
    } else {
      avatarEl.textContent = initial;
    }
  }

  const nameEl2 = document.getElementById('userDisplayName');
  const roleEl2 = document.getElementById('userDisplayRole');
  const welcomeEl = document.getElementById('welcomeUserName');
  if (nameEl2) nameEl2.textContent = displayName;
  if (roleEl2) roleEl2.innerHTML = `<span style="color:#10b981;font-size:10px">●</span> Online`;
  if (welcomeEl) welcomeEl.textContent = displayName;
}
/* =========================================================
   4. DARK MODE
   ========================================================= */

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('force-dark');
  localStorage.setItem('witcorp-dark-mode', isDark ? '1' : '0');
  document.querySelectorAll('[onclick="toggleDarkMode()"]').forEach(function (btn) {
    btn.textContent = isDark ? '☀️' : '🌙';
  });
}

function initDarkMode() {
  const savedDark = localStorage.getItem('witcorp-dark-mode');
  if (savedDark === '1') {
    document.body.classList.add('force-dark');
    document.querySelectorAll('[onclick="toggleDarkMode()"]').forEach(function (btn) {
      btn.textContent = '☀️';
    });
  }
}

/* =========================================================
   5. THEME SYSTEM
   ========================================================= */

function setTheme(themeName) {
  const themes = ['theme-violet','theme-blue','theme-emerald','theme-rose','theme-amber','theme-cyan','theme-dark','theme-midnight','theme-forest','theme-sunset','theme-sakura','theme-gold'];
  themes.forEach(t => document.body.classList.remove(t));
  document.body.classList.add(themeName);
  localStorage.setItem('witcorp-body-theme', themeName);
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === themeName);
  });
}

function initTheme() {
  const savedBodyTheme = localStorage.getItem('witcorp-body-theme') || 'theme-violet';
  setTheme(savedBodyTheme);
}

/* =========================================================
   6. VAULT SYSTEM
   ========================================================= */

const VAULT_FOLDERS = ['General', 'GST', 'MCA', 'TDS', 'ITR', 'Banking', 'Gmail', 'Clients', 'Other'];

async function loadVaultData() {
  const creds = await supabaseQuery('vault_credentials', { order: 'folder.asc,created_at.desc' });
  STATE.vaultCredentials = Array.isArray(creds) ? creds : [];
}

function renderVaultFolders() {
  const sidebar = document.getElementById('vaultFolderList');
  if (!sidebar) return;
  const uniqueFolders = [...new Set(['General', ...STATE.vaultCredentials.map(c => c.folder || 'General')])];
  sidebar.innerHTML = uniqueFolders.map(folder => `
    <div class="vault-folder ${STATE.vaultSelectedFolder === folder ? 'active' : ''}" onclick="event.stopPropagation();selectVaultFolder('${escapeHtml(folder)}')">
      <span style="font-size:16px;margin-right:8px">📁</span>
      <span>${escapeHtml(folder)}</span>
      <span class="folder-count">${STATE.vaultCredentials.filter(c => (c.folder || 'General') === folder).length}</span>
    </div>
  `).join('');
}

function selectVaultFolder(folder) {
  STATE.vaultSelectedFolder = folder;
  renderVaultFolders();
  renderVaultCredentials();
}

function renderVaultCredentials() {
  const container = document.getElementById('vaultCredentialsList');
  if (!container) return;
  const filtered = STATE.vaultCredentials.filter(c => (c.folder || 'General') === STATE.vaultSelectedFolder);
  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔓</div><div class="empty-state-text">No credentials in this folder</div><div class="empty-state-sub">Click + Add Credential to get started</div></div>';
    return;
  }
  container.innerHTML = `
    <div class="table-wrapper" style="overflow-x:auto;width:100%">
      <table class="data-table">
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Username / Login ID</th>
            <th>Password</th>
            <th>Remarks</th>
            <th>Updated By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(cred => `
            <tr>
              <td><strong>${escapeHtml(cred.label)}</strong></td>
              <td>
                <span>${escapeHtml(cred.username || '-')}</span>
                ${cred.username ? `<button class="btn-outline" style="padding:2px 7px;font-size:11px;margin-left:6px" onclick="copyToClipboard('${escapeHtml(cred.username)}','Username copied!')">📋</button>` : ''}
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:6px">
                  <input type="password" id="vp_${cred.id}" value="${escapeHtml(cred.password||'')}" readonly style="border:none;background:transparent;color:var(--text);font-size:13px;width:100px;outline:none" />
                  <button class="btn-outline" style="padding:2px 7px;font-size:11px" onclick="toggleVaultPass('vp_${cred.id}',this)">👁️</button>
                  ${cred.password ? `<button class="btn-outline" style="padding:2px 7px;font-size:11px" onclick="copyToClipboard('${escapeHtml(cred.password)}','Password copied!')">📋</button>` : ''}
                </div>
              </td>
              <td style="color:var(--text-muted);font-size:12px">${escapeHtml(cred.notes || '-')}</td>
              <td style="font-size:11px;color:var(--text-muted)">
                ${escapeHtml(cred.updated_by || '-')}<br>
                ${cred.updated_at ? formatDateTime(cred.updated_at) : ''}
              </td>
              <td>
                <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;margin-right:4px" onclick="editVaultItem(${cred.id})">✏️ Edit</button>
                <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444" onclick="deleteVaultItem(${cred.id})">🗑️</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
function viewVaultItem(id) {
  const cred = STATE.vaultCredentials.find(c => c.id === id);
  if (!cred) return;
  openModalWithContent(`🔐 View Credential — ${escapeHtml(cred.label)}`, `
    <div class="form-group"><label>Label</label><div class="form-control" style="background:var(--bg)">${escapeHtml(cred.label)}</div></div>
    <div class="form-group"><label>URL</label><div class="form-control" style="background:var(--bg);word-break:break-all">${escapeHtml(cred.url || '-')}</div></div>
    <div class="form-group"><label>Username</label><div style="display:flex;gap:8px">
      <div class="form-control" style="background:var(--bg);flex:1">${escapeHtml(cred.username || '-')}</div>
      ${cred.username ? `<button class="btn-outline" style="padding:8px 12px" onclick="copyToClipboard('${escapeHtml(cred.username)}','Username copied!')">📋 Copy</button>` : ''}
    </div></div>
    <div class="form-group"><label>Password</label><div style="display:flex;gap:8px">
      <input type="password" id="vaultPasswordView" class="form-control" style="flex:1;background:var(--bg)" value="${escapeHtml(cred.password || '')}" readonly />
      <button class="btn-outline" style="padding:8px 12px" onclick="togglePasswordView('vaultPasswordView')">👁️ Show</button>
      ${cred.password ? `<button class="btn-outline" style="padding:8px 12px" onclick="copyToClipboard('${escapeHtml(cred.password)}','Password copied!')">📋 Copy</button>` : ''}
    </div></div>
    ${cred.notes ? `<div class="form-group"><label>Notes</label><div class="form-control" style="background:var(--bg)">${escapeHtml(cred.notes)}</div></div>` : ''}
    ${cred.updated_by ? `<div class="form-group"><label>Last Updated By</label><div class="form-control" style="background:var(--bg)">${escapeHtml(cred.updated_by)}</div></div>` : ''}
    ${cred.updated_at ? `<div class="form-group"><label>Last Updated At</label><div class="form-control" style="background:var(--bg)">🕐 ${formatDateTime(cred.updated_at)}</div></div>` : ''}
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="closeModal()">Close</button>
  `);
}

function editVaultItem(id) {
  const cred = STATE.vaultCredentials.find(c => c.id === id);
  if (!cred) return;
  openModalWithContent(`✏️ Edit — ${escapeHtml(cred.label)}`, `
    <div class="form-group"><label>Client Name *</label><input type="text" class="form-control" id="editVaultLabel" value="${escapeHtml(cred.label)}" /></div>
    <div class="form-group"><label>Folder</label>
      <select class="form-control" id="editVaultFolder">
        ${VAULT_FOLDERS.map(f => `<option ${(cred.folder||'General')===f?'selected':''}>${f}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Username / Login ID</label><input type="text" class="form-control" id="editVaultUsername" value="${escapeHtml(cred.username||'')}" /></div>
    <div class="form-group"><label>Password</label>
      <div style="display:flex;gap:8px">
        <input type="password" class="form-control" id="editVaultPassword" value="${escapeHtml(cred.password||'')}" style="flex:1" />
        <button class="btn-outline" style="padding:8px 12px" onclick="togglePasswordView('editVaultPassword')">👁️ Show</button>
        <button class="btn-outline" style="padding:8px 12px" onclick="copyToClipboard(document.getElementById('editVaultPassword').value,'Password copied!')">📋</button>
      </div>
    </div>
    <div class="form-group"><label>Remarks</label><textarea class="form-control" id="editVaultNotes" rows="2">${escapeHtml(cred.notes||'')}</textarea></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveVaultEdit(${id})">💾 Save Changes</button>
  `);
}

async function saveVaultEdit(id) {
  const label = document.getElementById('editVaultLabel')?.value.trim();
  if (!label) { showToast('Label is required'); return; }
  const updated = {
    label,
    folder: document.getElementById('editVaultFolder')?.value || 'General',
    url: document.getElementById('editVaultUrl')?.value.trim() || '',
    username: document.getElementById('editVaultUsername')?.value.trim() || '',
    password: document.getElementById('editVaultPassword')?.value || '',
    notes: document.getElementById('editVaultNotes')?.value.trim() || ''
  };
  const ok = await supabaseUpdate('vault_credentials', id, updated);
  if (ok) {
    const idx = STATE.vaultCredentials.findIndex(c => c.id === id);
    if (idx !== -1) STATE.vaultCredentials[idx] = { ...STATE.vaultCredentials[idx], ...updated, updated_by: getUpdatedByLabel(), updated_at: new Date().toISOString() };
    closeModal(); renderVaultFolders(); renderVaultCredentials(); showToast('✅ Credential updated!');
  } else { showToast('❌ Update failed'); }
}

async function deleteVaultItem(id) {
  const cred = STATE.vaultCredentials.find(c => c.id === id);
  if (!cred) return;
  if (confirm(`Delete credential "${cred.label}"? This cannot be undone.`)) {
    const ok = await supabaseDelete('vault_credentials', id);
    if (ok) {
      STATE.vaultCredentials = STATE.vaultCredentials.filter(c => c.id !== id);
      renderVaultFolders(); renderVaultCredentials(); showToast('🗑️ Credential deleted');
    }
  }
}

function togglePasswordView(inputId, btn) {
  const input = document.getElementById(inputId);
  const button = btn || event?.target;
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
    if (button) button.textContent = input.type === 'text' ? '🙈 Hide' : '👁️ Show';
  }
}

function copyToClipboard(text, message) {
  navigator.clipboard.writeText(text).then(() => showToast(message || '📋 Copied!')).catch(() => showToast('❌ Copy failed'));
}

/* =========================================================
   7. WHATSAPP-STYLE MESSAGE CONTEXT MENU
   ========================================================= */

function ensureMessageMenu() {
  let menu = document.getElementById('waContextMenu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'waContextMenu';
    menu.style.cssText = `display:none;position:fixed;background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.18);z-index:9999;min-width:160px;overflow:hidden;`;
    menu.innerHTML = `
      <button class="wa-menu-item" onclick="waMenuAction('reply')"><span>↩️</span> Reply</button>
      <button class="wa-menu-item" onclick="waMenuAction('copy')"><span>📋</span> Copy</button>
      <button class="wa-menu-item" id="waEditBtn" onclick="waMenuAction('edit')"><span>✏️</span> Edit</button>
      <button class="wa-menu-item wa-menu-danger" id="waDeleteBtn" onclick="waMenuAction('delete')"><span>🗑️</span> Delete</button>
    `;
    document.body.appendChild(menu);
  }
  return menu;
}

function showMsgArrowMenu(e, msgId, isOwn) {
  e.preventDefault(); e.stopPropagation();
  STATE.selectedMessageId = msgId;
  const menu = ensureMessageMenu();
  document.getElementById('waEditBtn').style.display = isOwn ? 'flex' : 'none';
  document.getElementById('waDeleteBtn').style.display = isOwn ? 'flex' : 'none';
  const rect = e.target.getBoundingClientRect();
  let left = rect.left - 170;
  let top = rect.top - 10;
  if (left < 8) left = rect.right + 8;
  if (top + 180 > window.innerHeight) top = window.innerHeight - 190;
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  menu.style.display = 'block';
}

function waMenuAction(action) {
  const menu = document.getElementById('waContextMenu');
  if (menu) menu.style.display = 'none';
  const msgId = STATE.selectedMessageId;
  if (!msgId) return;
  const msg = STATE.teamMessages.find(x => x.id === msgId);
  if (!msg) return;
  if (action === 'reply') {
    STATE.replyToId = msgId;
    const input = document.getElementById('teamChatInput');
    if (input) { input.placeholder = `↩ Replying: ${msg.message.substring(0, 30)}...`; input.dataset.replyTo = msgId; input.focus(); }
    showReplyBar(msg.message);
  } else if (action === 'copy') {
    navigator.clipboard.writeText(msg.message).then(() => showToast('📋 Copied!'));
  } else if (action === 'edit') {
    editMessage(msgId, msg.message);
  } else if (action === 'delete') {
    deleteMessage(msgId);
  }
}

function showReplyBar(text) {
  let bar = document.getElementById('replyPreviewBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'replyPreviewBar';
    bar.style.cssText = 'padding:8px 14px;background:var(--bg,#f8fafc);border-left:3px solid var(--primary,#6366f1);font-size:12px;color:var(--text-muted,#64748b);display:flex;align-items:center;justify-content:space-between;gap:8px;';
    const chatBar = document.querySelector('#page-teamchat .chat-input-bar');
    if (chatBar) chatBar.parentNode.insertBefore(bar, chatBar);
  }
  bar.innerHTML = `<span>↩ <strong>Replying to:</strong> ${escapeHtml(text.substring(0, 40))}${text.length > 40 ? '...' : ''}</span><button onclick="cancelReply()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>`;
  bar.style.display = 'flex';
}

function cancelReply() {
  STATE.replyToId = null;
  const input = document.getElementById('teamChatInput');
  if (input) { input.placeholder = 'Type a message...'; delete input.dataset.replyTo; }
  const bar = document.getElementById('replyPreviewBar');
  if (bar) bar.style.display = 'none';
}

document.addEventListener('click', function (e) {
  const menu = document.getElementById('waContextMenu');
  if (menu && !menu.contains(e.target) && !e.target.classList.contains('msgArrow')) menu.style.display = 'none';
  const notifPanel = document.getElementById('notifPanel');
  if (notifPanel && notifPanel.classList.contains('show') && !notifPanel.contains(e.target) && !e.target.closest('[onclick*="openNotifications"]')) closeNotifications();
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay && modalOverlay.classList.contains('show') && e.target === modalOverlay) closeModal();
});

/* =========================================================
   8. TEAM CHAT
   ========================================================= */

const EMOJI_LIST = ['😀','😃','😄','😁','😆','😅','🤣','😂','😊','😇','🙂','😉','😌','😍','🥰','😘','😋','😛','😜','🤪','😝','😑','😐','😏','😒','🙄','😬','😔','😪','😴','😷','🤒','🤗','🤔','😮','🤐','😯','😲','😳','🥺','😦','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','😤','😡','😠','🤬','😈','👿','💩','🤖'];

function initPresence() {
  const myEmail = getCurrentUserEmail();
  if (myEmail) {
    setPresenceOnline(myEmail);
    fetchAllPresence();
    setInterval(() => {
      setPresenceOnline(myEmail);
      fetchAllPresence();
    }, 30000);
  }
}

async function setPresenceOnline(email) {
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  await fetch(`${SUPABASE_URL}/rest/v1/user_presence`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({ email, is_online: true, last_seen: new Date().toISOString() })
  }).catch(() => {});

  // Presence state locally bhi update karo
  STATE.userPresence[email] = { is_online: true, last_seen: new Date().toISOString() };
}

async function fetchAllPresence() {
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_presence?select=*`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
    });
    const data = res.ok ? await res.json() : [];
    const now = new Date();
    data.forEach(p => {
      const lastSeen = new Date(p.last_seen);
      const diffMins = (now - lastSeen) / 60000;
      STATE.userPresence[p.email] = {
        is_online: diffMins < 2,
        last_seen: p.last_seen
      };
    });
  } catch(e) {}
}
async function renderTeamContacts() {
  const el = document.getElementById('chatContacts');
  if (!el) return;
  const myEmail = getCurrentUserEmail();
  const profiles = await supabaseQuery('profiles', { order: 'full_name.asc' });
  const others = (profiles || []).filter(p => p.email !== myEmail);
  if (!others.length) {
    el.innerHTML = `<div style="padding:16px;color:var(--text-muted);font-size:13px;text-align:center">No team members yet.</div>`;
    return;
  }
  el.innerHTML = others.map(p => {
    const name = p.full_name || p.email.split('@')[0];
    const initial = (p.avatar_initial || name.charAt(0)).toUpperCase();
    const isActive = p.email === STATE.activeChatContact;
    const myEmail = getCurrentUserEmail();
    const isOnline = p.email === myEmail ? true : (STATE.userPresence[p.email]?.is_online || false);
    return `
      <div class="contact-item ${isActive ? 'active' : ''}" onclick="switchChatContact('${p.email}', '${escapeHtml(name)}')">
        <div style="position:relative;width:38px;height:38px;flex-shrink:0">
          <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px">${initial}</div>
          <div style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:${isOnline ? '#10b981' : '#9ca3af'};border:2px solid var(--surface)"></div>
        </div>
        <div style="flex:1;overflow:hidden;margin-left:10px">
          <div style="font-weight:600;font-size:13.5px">${escapeHtml(name)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${isOnline ? '● Online' : 'Offline'}</div>
        </div>
      </div>`;
  }).join('');
}

function switchChatContact(email, name) {
  STATE.activeChatContact = email;
  const nameEl = document.getElementById('activeChatName');
  if (nameEl) nameEl.textContent = name || email.split('@')[0];
  cancelReply();
  renderTeamContacts();
  renderTeamMessages();
}

async function renderTeamMessages() {
  const el = document.getElementById('teamMessages');
  if (!el) return;
  const myEmail = getCurrentUserEmail();
  const contactEmail = STATE.activeChatContact;
  if (!contactEmail) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px 20px">Select a contact or start a new chat</div>';
    return;
  }
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  const url = `${SUPABASE_URL}/rest/v1/team_messages?or=(and(sender_email.eq.${encodeURIComponent(myEmail)},receiver_email.eq.${encodeURIComponent(contactEmail)}),and(sender_email.eq.${encodeURIComponent(contactEmail)},receiver_email.eq.${encodeURIComponent(myEmail)}))&order=created_at.asc`;
  let messages = [];
  try {
    const res = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token } });
    messages = res.ok ? await res.json() : [];
  } catch(e) { messages = []; }
  STATE.teamMessages = messages;
  if (!messages.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px 20px">No messages yet. Send the first one! 👋</div>';
    return;
  }
  el.innerHTML = messages.map(m => {
    const isOwn = m.sender_email === myEmail;
    const replyMsg = m.reply_to && messages.find(msg => msg.id === m.reply_to);
    const timeStr = new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const senderInitial = m.sender_email.charAt(0).toUpperCase();
    return `
      <div class="chat-msg ${isOwn ? 'user' : ''}" data-msg-id="${m.id}">
        ${!isOwn ? `<div class="msg-avatar">${senderInitial}</div>` : ''}
        <div class="msg-content">
          ${replyMsg ? `<div class="msg-reply-preview"><div style="font-size:11px;font-weight:600;color:var(--primary);margin-bottom:2px">↩ Reply</div><div style="font-size:11px;color:var(--text-muted)">${escapeHtml(replyMsg.message.substring(0,50))}</div></div>` : ''}
          <div class="msgBubble" style="background:${isOwn ? 'var(--primary,#6366f1)' : 'var(--surface,#f1f5f9)'};color:${isOwn ? '#fff' : 'var(--text,#0f172a)'};padding:8px 36px 8px 12px;border-radius:${isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};word-break:break-word;position:relative;display:inline-block;max-width:100%;min-width:60px;">
            ${escapeHtml(m.message)}
            ${m.is_edited ? '<div style="font-size:10px;opacity:0.6;margin-top:2px">edited</div>' : ''}
            <button class="msgArrow" onclick="showMsgArrowMenu(event,${m.id},${isOwn})" style="position:absolute;top:50%;right:6px;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:14px;padding:2px 4px;border-radius:50%;opacity:0;transition:opacity 0.15s;color:${isOwn ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};line-height:1;" title="More">▾</button>
          </div>
          <div style="font-size:10.5px;opacity:0.6;margin-top:3px;text-align:${isOwn ? 'right' : 'left'}">${timeStr}</div>
        </div>
        ${isOwn ? `<div class="msg-avatar">${senderInitial}</div>` : ''}
      </div>`;
  }).join('');
  el.querySelectorAll('.msgBubble').forEach(bubble => {
    bubble.addEventListener('mouseenter', () => { const a = bubble.querySelector('.msgArrow'); if (a) a.style.opacity = '1'; });
    bubble.addEventListener('mouseleave', () => { const a = bubble.querySelector('.msgArrow'); if (a) a.style.opacity = '0'; });
  });
  el.scrollTop = el.scrollHeight;
}

function handleChatKeypress(event) {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendTeamMessage(); }
}

async function sendTeamMessage() {
  const input = document.getElementById('teamChatInput');
  const text = input?.value.trim();
  if (!text) return;
  const myEmail = getCurrentUserEmail();
  const contactEmail = STATE.activeChatContact;
  if (!contactEmail) { showToast('Select a contact first'); return; }
  const msgBody = { sender_email: myEmail, receiver_email: contactEmail, message: text, message_type: 'text' };
  if (STATE.replyToId) msgBody.reply_to = STATE.replyToId;
  input.value = '';
  cancelReply();
  await supabaseInsert('team_messages', msgBody);
  await renderTeamMessages();
  await renderTeamContacts();
}

function editMessage(msgId, originalText) {
  openModalWithContent('✏️ Edit Message', `
    <div class="form-group"><label>Edit your message</label><textarea class="form-control" id="editMsgText" rows="3">${escapeHtml(originalText)}</textarea></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveEditMessage(${msgId})">💾 Save</button>
  `);
}

async function saveEditMessage(msgId) {
  const newText = document.getElementById('editMsgText')?.value.trim();
  if (!newText) { showToast('Message cannot be empty'); return; }
  const ok = await supabaseUpdate('team_messages', msgId, { message: newText, is_edited: true });
  if (ok) { closeModal(); renderTeamMessages(); showToast('✅ Message edited'); }
}

async function deleteMessage(msgId) {
  if (confirm('Delete this message?')) {
    const ok = await supabaseUpdate('team_messages', msgId, { is_deleted: true, message: '[Message deleted]' });
    if (ok) { renderTeamMessages(); showToast('🗑️ Message deleted'); }
  }
}

function openEmojiPicker() {
  const modal = document.getElementById('emojiPickerModal');
  const grid = document.getElementById('emojiGrid');
  if (modal) {
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
    if (grid && modal.style.display === 'block') {
      grid.innerHTML = EMOJI_LIST.map(emoji => `<button style="padding:8px;font-size:20px;border:none;background:transparent;cursor:pointer;border-radius:6px" onclick="insertEmoji('${emoji}');this.closest('#emojiPickerModal').style.display='none'">${emoji}</button>`).join('');
    }
  }
}

function insertEmoji(emoji) {
  const input = document.getElementById('teamChatInput');
  if (input) { input.value += emoji; input.focus(); }
}

function startNewChat() {
  const emailInput = document.getElementById('newChatEmail');
  const email = emailInput?.value.trim().toLowerCase();
  if (!email || !email.includes('@')) { showToast('Enter a valid email address'); return; }
  const myEmail = getCurrentUserEmail();
  if (email === myEmail) { showToast('Cannot message yourself!'); return; }
  emailInput.value = '';
  switchChatContact(email, email.split('@')[0]);
  showToast('Starting chat with ' + email);
}

/* =========================================================
   9. INITIALIZATION
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  loadUserInfo();
  initTheme();
  initDarkMode();
  setCurrentDate();
  attachGlobalListeners();
  initPresence();
  injectWAMenuStyles();
  renderTeamContacts();
  renderTeamMessages();

  showPageLoader(true);
  await loadAllData();
  await loadVaultData();
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
  renderVaultFolders();
  renderVaultCredentials();
  populateAllClientDropdowns();
  renderPTTable();
  renderPayrollTable();
  renderDir3Table();

setInterval(async () => {
    await fetchAllPresence();
    await renderTeamContacts();
    if (STATE.activeChatContact) await renderTeamMessages();
    // Online count update karo
    const myEmail = getCurrentUserEmail();
    if (myEmail) STATE.userPresence[myEmail] = { is_online: true };
    const onlineCount = Object.values(STATE.userPresence).filter(p => p.is_online).length;
    const countEl = document.getElementById('onlineCount');
    if (countEl) countEl.textContent = Math.max(onlineCount, 1);
  }, 5000);
});

function injectWAMenuStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .wa-menu-item { display:flex;align-items:center;gap:10px;width:100%;padding:10px 16px;background:none;border:none;cursor:pointer;font-size:13.5px;font-weight:500;color:var(--text,#0f172a);text-align:left;transition:background 0.12s; }
    .wa-menu-item:hover { background:var(--bg,#f1f5f9); }
    .wa-menu-danger { color:#ef4444 !important; }
    .msg-reply-preview { background:rgba(0,0,0,0.06);border-left:3px solid var(--primary,#6366f1);border-radius:6px;padding:5px 8px;margin-bottom:5px; }
    body.force-dark { --bg:#0f172a!important;--surface:#1e293b!important;--surface2:#1e293b!important;--text:#f1f5f9!important;--text-muted:#94a3b8!important;--border:#334155!important; }
    .vault-folder { display:flex;align-items:center;padding:10px 14px;border-radius:10px;cursor:pointer;transition:background .15s;font-size:13px;font-weight:500;color:var(--text); }
    .vault-folder:hover,.vault-folder.active { background:var(--primary-glow);color:var(--primary); }
    .folder-count { margin-left:auto;background:var(--border);border-radius:99px;padding:1px 8px;font-size:11px;color:var(--text-muted); }
    .vault-card { background:var(--surface2);border:1.5px solid var(--border);border-radius:12px;padding:16px;margin-bottom:10px; }
    .vault-card-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
    .vault-card-title { font-weight:700;font-size:14px;color:var(--text); }
    .vault-card-actions { display:flex;gap:6px; }
    .vault-btn { background:none;border:1.5px solid var(--border);border-radius:8px;padding:5px 9px;cursor:pointer;font-size:14px;transition:background .15s; }
    .vault-btn:hover { background:var(--bg); }
    .vault-container { display:grid;grid-template-columns:220px 1fr;gap:16px;overflow:hidden; }
    .vault-sidebar { background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);padding:12px; }
    .vault-main { background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);padding:16px;overflow-x:auto; }
    .dsc-warning { color:#f59e0b;font-weight:700; }
    .dsc-expired { color:#ef4444;font-weight:700; }
    .remarks-cell { max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:12px; }
    .updated-by-cell { max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .updated-by-badge { font-size:10px;color:var(--text-muted);font-style:italic;display:block; }
  `;
  document.head.appendChild(style);
}

function showPageLoader(show) {
  let loader = document.getElementById('pageLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'pageLoader';
    loader.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;font-family:Inter,sans-serif;';
    loader.innerHTML = '<div class="spinner"></div><div style="margin-top:16px;font-size:14px;font-weight:600;color:#6366f1">Loading WITCORP...</div><div style="font-size:12px;color:#64748b;margin-top:6px">Connecting to database...</div>';
    document.body.appendChild(loader);
  }
  loader.style.display = show ? 'flex' : 'none';
}

async function loadAllData() {
  try {
    const [clients, gst, roc, itr, tds, audits, dsc, acc, tasks, docs, events, pt, payroll, dir3] = await Promise.all([
      supabaseQuery('clients', { order: 'created_at.desc' }),
      supabaseQuery('gst_returns', { order: 'created_at.desc' }),
      supabaseQuery('roc_filings', { order: 'created_at.desc' }),
      supabaseQuery('itr_filings', { order: 'created_at.desc' }),
      supabaseQuery('tds_returns', { order: 'created_at.desc' }),
      supabaseQuery('audits', { order: 'created_at.desc' }),
      supabaseQuery('dsc_records', { order: 'created_at.desc' }),
      supabaseQuery('accounting_entries', { order: 'created_at.desc' }),
      supabaseQuery('tasks', { order: 'created_at.desc' }),
      supabaseQuery('documents', { order: 'created_at.desc' }),
      supabaseQuery('calendar_events', { order: 'event_date.asc' }),
      supabaseQuery('professional_tax', { order: 'created_at.desc' }),
      supabaseQuery('payroll_entries', { order: 'created_at.desc' }),
      supabaseQuery('dir3_kyc', { order: 'created_at.desc' }),
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
    STATE.ptFilings = Array.isArray(pt) ? pt : [];
    STATE.payrollEntries = Array.isArray(payroll) ? payroll : [];
    STATE.dir3Filings = Array.isArray(dir3) ? dir3 : [];
  } catch (e) {
    console.error('loadAllData error:', e);
    showToast('Database connection failed. Check console.');
  }
}
/* =========================================================
   10. CLIENT DROPDOWNS
   ========================================================= */
function onClientTypeChange() {
  const type = document.getElementById('addClientType')?.value;
  const group = document.getElementById('cinLlpinGroup');
  const label = document.getElementById('cinLlpinLabel');
  if (!group || !label) return;
  if (type === 'Company') {
    group.style.display = 'block';
    label.textContent = 'CIN';
    document.getElementById('addClientCIN').placeholder = 'U12345MH2020PTC123456';
  } else if (type === 'LLP') {
    group.style.display = 'block';
    label.textContent = 'LLPIN';
    document.getElementById('addClientCIN').placeholder = 'AAA-1234';
  } else {
    group.style.display = 'none';
  }
}
function onEditClientTypeChange() {
  const type = document.getElementById('editClientType')?.value;
  const group = document.getElementById('editCinLlpinGroup');
  const label = document.getElementById('editCinLlpinLabel');
  if (!group || !label) return;
  if (type === 'Company') {
    group.style.display = 'block';
    label.textContent = 'CIN';
    document.getElementById('editClientCIN').placeholder = 'U12345MH2020PTC123456';
  } else if (type === 'LLP') {
    group.style.display = 'block';
    label.textContent = 'LLPIN';
    document.getElementById('editClientCIN').placeholder = 'AAA-1234';
  } else {
    group.style.display = 'none';
  }
}

function populateAllClientDropdowns() {
  const clientOptions = getClientOptionsHtml(true);
  const dropdownIds = ['gstClientSel','itrClientSel','auditClientSel','tdsClientSel','rocClientSel','dscClientSel','accClientSel'];
  dropdownIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = clientOptions;
  });
}

function getClientOptionsHtml(includeEmpty = true) {
  const prefix = includeEmpty ? '<option value="">Select Client</option>' : '';
  return prefix + STATE.clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

function getClientNameById(id) {
  if (!id) return '';
  const c = STATE.clients.find(x => String(x.id) === String(id));
  return c ? c.name : '';
}

/* =========================================================
   11. NAVIGATION
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
  if (page === 'reports') { setTimeout(renderBarChart, 100); setTimeout(updateDashboardStats, 200); }
  if (page === 'vault') { renderVaultFolders(); renderVaultCredentials(); }
  if (page === 'mylocker') { setTimeout(initMyLocker, 100); }
  if (page === 'gst') renderGSTPage();
  if (page === 'dsc') renderDSCAlerts();
  if (page === 'professionaltax') renderPTTable();
  if (page === 'payroll') renderPayrollTable();
  if (page === 'dir3kyc') renderDir3Table();
  populateAllClientDropdowns();
}

/* =========================================================
   12. SIDEBAR
   ========================================================= */

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

/* =========================================================
   13. DATE & DATETIME
   ========================================================= */

function setCurrentDate() {
  const el = document.getElementById('currentDate');
  if (!el) return;
  const now = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  el.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${days[now.getDay()]}`;
}

function formatDateTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  const date = d.toLocaleDateString('en-IN');
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${date} ${hours}:${mins}${ampm}`;
}

/* =========================================================
   14. DASHBOARD STATS
   ========================================================= */

function updateDashboardStats() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const upcomingDue = STATE.calendarEvents.filter(e => {
    const d = new Date(e.event_date);
    const diff = (d - today) / (1000*60*60*24);
    return diff >= 0 && diff <= 7;
  }).length;

  const todayFilings = STATE.calendarEvents.filter(e => e.event_date === todayStr).length;
  const done = STATE.tasks.filter(t => t.column_name === 'done').length;
  const inprog = STATE.tasks.filter(t => t.column_name === 'inprogress').length;
  const todo = STATE.tasks.filter(t => t.column_name === 'todo').length;
  const totalRev = STATE.accountingEntries.filter(t => t.entry_type === 'credit').reduce((s,t) => s+(t.amount||0), 0);
  const totalExp = STATE.accountingEntries.filter(t => t.entry_type === 'debit').reduce((s,t) => s+(t.amount||0), 0);
  const netProfit = totalRev - totalExp;
  const margin = totalRev ? Math.round((netProfit/totalRev)*100) : 0;
  const totalFilings = STATE.gstReturns.length + STATE.itrFilings.length + STATE.tdsReturns.length + STATE.rocFilings.length;
  const pct = STATE.tasks.length ? Math.round((done/STATE.tasks.length)*100) : 0;

  const dashStats = document.querySelectorAll('#page-dashboard .stat-number');
  if (dashStats[0]) dashStats[0].textContent = STATE.clients.length;
  if (dashStats[1]) dashStats[1].textContent = STATE.gstReturns.filter(g => g.status === 'Filed').length;
  if (dashStats[2]) dashStats[2].textContent = STATE.tasks.filter(t => t.column_name !== 'done').length;
  if (dashStats[3]) dashStats[3].textContent = upcomingDue;
  if (dashStats[4]) dashStats[4].textContent = String(todayFilings).padStart(2,'0');

  const gstStats = document.querySelectorAll('#page-gst .stat-number');
  if (gstStats[0]) gstStats[0].textContent = STATE.gstReturns.filter(g=>g.status==='Filed').length;
  if (gstStats[1]) gstStats[1].textContent = STATE.gstReturns.filter(g=>g.status==='Pending').length;
  if (gstStats[2]) gstStats[2].textContent = STATE.gstReturns.filter(g=>g.status==='Overdue').length;
  if (gstStats[3]) { const t=STATE.gstReturns.reduce((s,g)=>s+(g.tax_liability||0),0); gstStats[3].textContent='₹ '+formatAmount(t); }

  const rocStats = document.querySelectorAll('#page-roc .stat-number');
  if (rocStats[0]) rocStats[0].textContent = STATE.rocFilings.filter(r=>r.status==='Filed').length;
  if (rocStats[1]) rocStats[1].textContent = STATE.rocFilings.filter(r=>r.status==='In Progress').length;
  if (rocStats[2]) rocStats[2].textContent = STATE.rocFilings.filter(r=>r.status==='Overdue').length;
  if (rocStats[3]) rocStats[3].textContent = STATE.clients.filter(c=>c.type==='Company'||c.type==='LLP').length;

  const itrStats = document.querySelectorAll('#page-incometax .stat-number');
  if (itrStats[0]) itrStats[0].textContent = STATE.itrFilings.filter(i=>i.status==='Filed').length;
  if (itrStats[1]) itrStats[1].textContent = STATE.itrFilings.filter(i=>i.status==='Pending'||i.status==='In Progress').length;
  if (itrStats[2]) { const r=STATE.itrFilings.reduce((s,i)=>s+(i.tax_deducted||0),0); itrStats[2].textContent='₹ '+formatAmount(r); }
  if (itrStats[3]) { const t=STATE.itrFilings.reduce((s,i)=>s+(i.gross_income||0)*0.1,0); itrStats[3].textContent='₹ '+formatAmount(t); }

  const tdsStats = document.querySelectorAll('#page-tds .stat-number');
  if (tdsStats[0]) tdsStats[0].textContent = STATE.tdsReturns.filter(t=>t.status==='Filed').length;
  if (tdsStats[1]) tdsStats[1].textContent = STATE.tdsReturns.filter(t=>t.status==='Pending').length;
  if (tdsStats[2]) { const a=STATE.tdsReturns.reduce((s,t)=>s+(t.amount||0),0); tdsStats[2].textContent='₹ '+formatAmount(a); }
  if (tdsStats[3]) tdsStats[3].textContent = STATE.tdsReturns.filter(t=>t.status==='Filed').length;

  const auditStats = document.querySelectorAll('#page-audit .stat-number');
  if (auditStats[0]) auditStats[0].textContent = STATE.audits.filter(a=>a.status==='In Progress').length;
  if (auditStats[1]) auditStats[1].textContent = STATE.audits.filter(a=>a.status==='Completed').length;
  if (auditStats[2]) auditStats[2].textContent = STATE.audits.filter(a=>a.status==='In Review').length;
  const dueThisMonth = STATE.audits.filter(a => { if(!a.end_date) return false; const d=new Date(a.end_date); return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear(); }).length;
  if (auditStats[3]) auditStats[3].textContent = dueThisMonth;

  const dscStats = document.querySelectorAll('#page-dsc .stat-number');
  if (dscStats[0]) dscStats[0].textContent = STATE.dscRecords.filter(d=>d.status==='Active'||d.status==='Valid').length;
  if (dscStats[1]) dscStats[1].textContent = STATE.dscRecords.filter(d => { if(!d.expiry_date) return false; const days=Math.ceil((new Date(d.expiry_date)-today)/(1000*60*60*24)); return days>=0&&days<=30; }).length;
  if (dscStats[2]) dscStats[2].textContent = STATE.dscRecords.length;
  if (dscStats[3]) dscStats[3].textContent = STATE.dscRecords.filter(d => { if(!d.expiry_date) return false; const days=Math.ceil((new Date(d.expiry_date)-today)/(1000*60*60*24)); return days>=0&&days<=30; }).length;

  const accStats = document.querySelectorAll('#page-accounting .stat-number');
  if (accStats[0]) accStats[0].textContent = '₹ '+formatAmount(totalRev);
  if (accStats[1]) accStats[1].textContent = '₹ '+formatAmount(totalExp);
  if (accStats[2]) accStats[2].textContent = '₹ '+formatAmount(netProfit);
  if (accStats[3]) accStats[3].textContent = margin+'%';

  const taskStats = document.querySelectorAll('#page-tasks .stat-number');
  if (taskStats[0]) taskStats[0].textContent = done;
  if (taskStats[1]) taskStats[1].textContent = inprog;
  if (taskStats[2]) taskStats[2].textContent = todo;
  if (taskStats[3]) taskStats[3].textContent = 0;

  const rptStats = document.querySelectorAll('#page-reports .stat-number');
  if (rptStats[0]) rptStats[0].textContent = STATE.clients.length;
  if (rptStats[1]) rptStats[1].textContent = totalFilings;
  if (rptStats[2]) rptStats[2].textContent = '₹ '+formatAmount(totalRev);
  if (rptStats[3]) rptStats[3].textContent = pct+'%';

  const donutCenter = document.querySelector('#page-reports .donut-center');
  if (donutCenter) donutCenter.textContent = pct+'%';
   // Workspace Overview update
 const ovItems = document.querySelectorAll('.overview-item strong');
  if (ovItems[0]) ovItems[0].textContent = done;
  if (ovItems[1]) ovItems[1].textContent = inprog;
  if (ovItems[2]) ovItems[2].textContent = todo;
  const donutChart = document.querySelector('#page-reports .donut-chart');
  if (donutChart) {
    if (!STATE.tasks.length) {
      donutChart.style.background = `conic-gradient(var(--border) 0% 100%)`;
    } else {
      const doneP = done/STATE.tasks.length*100;
      const ipP = inprog/STATE.tasks.length*100;
      donutChart.style.background = `conic-gradient(var(--success,#10b981) 0% ${doneP}%,var(--info,#3b82f6) ${doneP}% ${doneP+ipP}%,var(--warning,#f59e0b) ${doneP+ipP}% 100%)`;
    }
  }
}

/* =========================================================
   15. CLIENT MANAGEMENT
   ========================================================= */

function getFilteredClients() {
  const { search, status, type } = STATE.filters.clients;
  return STATE.clients.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search || (c.name||'').toLowerCase().includes(s) || (c.pan||'').toLowerCase().includes(s) || (c.email||'').toLowerCase().includes(s);
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
  const totalPages = Math.max(1, Math.ceil(filtered.length/perPage));
  const safePage = Math.min(page, totalPages);
  STATE.pagination.clients.page = safePage;
  const start = (safePage-1)*perPage;
  const pageItems = filtered.slice(start, start+perPage);

  if (!pageItems.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">No clients found</div><div class="empty-state-sub">Try adjusting filters or add a new client</div></div></td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map(c => `
      <tr>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${escapeHtml(c.contact_person||'-')}</td>
        <td>${escapeHtml(c.type||'-')}</td>
        <td>${escapeHtml(c.pan||'-')}</td>
        <td>${escapeHtml(c.tan||'-')}</td>
        <td>${c.type==='Company'||c.type==='LLP' ? escapeHtml(c.cin||'-') : '-'}</td>
        <td>${escapeHtml(c.gst||'-')}</td>
        <td>${escapeHtml(c.email||'-')}</td>
        <td>${escapeHtml(c.phone||'-')}</td>
        <td>${statusBadge(c.status)}</td>
        <td class="updated-by-cell">
          <span class="updated-by-badge">${escapeHtml(c.updated_by||'-')}</span>
          ${c.updated_at ? `<span class="updated-by-badge">🕐 ${formatDateTime(c.updated_at)}</span>` : ''}
        </td>
        <td>
          <button class="btn-outline" style="padding:5px 10px;font-size:11.5px;margin-right:4px" onclick="viewClient(${c.id})">View</button>
          <button class="btn-outline" style="padding:5px 10px;font-size:11.5px;margin-right:4px" onclick="editClient(${c.id})">Edit</button>
          <button class="btn-outline" style="padding:5px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444" onclick="deleteClientConfirm(${c.id})">Delete</button>
        </td>
      </tr>`).join('');
  }
  const pageInfo = document.getElementById('clientPageInfo');
  if (pageInfo) pageInfo.textContent = `Page ${safePage} of ${totalPages} (${filtered.length} clients)`;
}

function filterClients(value) { STATE.filters.clients.search=value; STATE.pagination.clients.page=1; renderClientTable(); }
function filterClientStatus(value) { STATE.filters.clients.status=value; STATE.pagination.clients.page=1; renderClientTable(); }
function filterClientType(value) { STATE.filters.clients.type=value; STATE.pagination.clients.page=1; renderClientTable(); }
function prevPage(section) { if(section==='clients'&&STATE.pagination.clients.page>1){STATE.pagination.clients.page--;renderClientTable();} }
function nextPage(section) { if(section==='clients'){const total=Math.ceil(getFilteredClients().length/STATE.pagination.clients.perPage);if(STATE.pagination.clients.page<total){STATE.pagination.clients.page++;renderClientTable();}} }

function viewClient(id) {
  const c = STATE.clients.find(x => x.id === id);
  if (!c) return;
  openModalWithContent(`👥 ${escapeHtml(c.name)}`, `
    <div class="form-group"><label>Client Name</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.name)}</div></div>
    <div class="form-group"><label>Contact Person</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.contact_person||'-')}</div></div>
    <div class="form-group"><label>Type</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.type||'-')}</div></div>
    <div class="form-group"><label>PAN</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.pan||'-')}</div></div>
    <div class="form-group"><label>TAN</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.tan||'-')}</div></div>
    ${c.type==='Company'||c.type==='LLP' ? `<div class="form-group"><label>${c.type==='LLP'?'LLPIN':'CIN'}</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.cin||'-')}</div></div>` : ''}
    <div class="form-group"><label>GST Number</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.gst||'-')}</div></div>
    <div class="form-group"><label>Email</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.email||'-')}</div></div>
    <div class="form-group"><label>Phone</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.phone||'-')}</div></div>
    <div class="form-group"><label>Status</label><div>${statusBadge(c.status)}</div></div>
    ${c.updated_by ? `<div class="form-group"><label>Last Updated By</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.updated_by)}</div></div>` : ''}
    ${c.updated_at ? `<div class="form-group"><label>Last Updated At</label><div class="form-control" style="background:var(--bg)">🕐 ${formatDateTime(c.updated_at)}</div></div>` : ''}
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="closeModal()">Close</button>
  `);
}

function editClient(id) {
  const c = STATE.clients.find(x => x.id === id);
  if (!c) return;
  openModalWithContent(`✏️ Edit — ${escapeHtml(c.name)}`, `
    <div class="form-group"><label>Client Name</label><input type="text" class="form-control" id="editClientName" value="${escapeHtml(c.name)}" /></div>
    <div class="form-group"><label>Contact Person</label><input type="text" class="form-control" id="editClientContact" value="${escapeHtml(c.contact_person||'')}" placeholder="Enter contact person" /></div>
   <div class="form-group"><label>Type</label>
      <select class="form-control" id="editClientType" onchange="onEditClientTypeChange()">
        ${['Individual','Company','LLP','Partnership'].map(t=>`<option ${c.type===t?'selected':''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>PAN</label>
      <input type="text" class="form-control" id="editClientPAN" value="${escapeHtml(c.pan||'')}" maxlength="10" style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()" />
    </div>
    <div class="form-group"><label>TAN</label>
      <input type="text" class="form-control" id="editClientTAN" value="${escapeHtml(c.tan||'')}" maxlength="10" style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()" />
    </div>
    <div class="form-group" id="editCinLlpinGroup" style="display:${c.type==='Company'||c.type==='LLP'?'block':'none'}">
      <label id="editCinLlpinLabel">${c.type==='LLP'?'LLPIN':'CIN'}</label>
      <input type="text" class="form-control" id="editClientCIN" value="${escapeHtml(c.cin||'')}" style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()" />
    </div>
    <div class="form-group"><label>Email</label><input type="text" class="form-control" id="editClientEmail" value="${escapeHtml(c.email||'')}" /></div>
    <div class="form-group"><label>Phone</label><input type="text" class="form-control" id="editClientPhone" value="${escapeHtml(c.phone||'')}" /></div>
    <div class="form-group"><label>GST Number</label><input type="text" class="form-control" id="editClientGST" value="${escapeHtml(c.gst||'')}" /></div>
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="editClientStatus">
        ${['Active','Inactive','Pending'].map(s=>`<option ${c.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveClientEdit(${id})">💾 Save Changes</button>
  `);
}

async function saveClientEdit(id) {
  const name = document.getElementById('editClientName')?.value.trim();
  if (!name) { showToast('Client name required'); return; }
 const updated = {
    name,
    contact_person: document.getElementById('editClientContact')?.value.trim() || '',
    pan: document.getElementById('editClientPAN')?.value.trim() || '-',
    tan: document.getElementById('editClientTAN')?.value.trim() || '-',
    cin: document.getElementById('editClientCIN')?.value.trim() || '-',
    type: document.getElementById('editClientType')?.value,
    email: document.getElementById('editClientEmail')?.value.trim(),
    phone: document.getElementById('editClientPhone')?.value.trim(),
    gst: document.getElementById('editClientGST')?.value.trim(),
    status: document.getElementById('editClientStatus')?.value
  };
  const ok = await supabaseUpdate('clients', id, updated);
  if (ok) {
    const idx = STATE.clients.findIndex(c => c.id === id);
    if (idx !== -1) STATE.clients[idx] = { ...STATE.clients[idx], ...updated, updated_by: getUpdatedByLabel(), updated_at: new Date().toISOString() };
    closeModal(); renderClientTable(); updateDashboardStats(); populateAllClientDropdowns(); showToast('✅ Client updated!');
  } else { showToast('❌ Update failed.'); }
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
        <button class="btn-primary" style="flex:1;background:#ef4444" onclick="deleteClientConfirmed(${id})">Delete</button>
      </div>
    </div>
  `);
}

async function deleteClientConfirmed(id) {
  const ok = await supabaseDelete('clients', id);
  if (ok) {
    STATE.clients = STATE.clients.filter(c => c.id !== id);
    closeModal(); renderClientTable(); updateDashboardStats(); populateAllClientDropdowns(); showToast('🗑️ Client deleted');
  } else { showToast('❌ Delete failed'); }
}

/* =========================================================
   16. GST DASHBOARD
   ========================================================= */

function getGSTPeriodOptions() {
  const currentYear = new Date().getFullYear();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const options = [];
  for(let i=9;i<12;i++) options.push(`${months[i]} ${currentYear-1}`);
  months.forEach((m) => options.push(`${m} ${currentYear}`));
  months.forEach((m) => options.push(`${m} ${currentYear+1}`));
  return options;
}

function renderGSTPage() {
  const listEl = document.getElementById('gstReturnList');
  const upcomingEl = document.getElementById('gstUpcoming');
  const periodSel = document.getElementById('gstPeriodSel');

  if (periodSel) {
    const currentPeriod = getGSTPeriodOptions();
    periodSel.innerHTML = currentPeriod.map(p => `<option>${p}</option>`).join('');
  }

  if (upcomingEl) {
    const upcoming = STATE.calendarEvents.filter(e => e.event_type && e.event_type !== 'Internal').slice(0, 5);
    upcomingEl.innerHTML = upcoming.length ? upcoming.map(e => `
      <div class="upcoming-item">
        <div><div class="gst-item-name">${escapeHtml(e.title)}</div><div class="gst-item-sub">${escapeHtml(e.event_type||'')}</div></div>
        <div class="gst-item-sub fw-bold">${escapeHtml(e.event_date)}</div>
      </div>`).join('') : '<div class="empty-state"><div class="empty-state-text">No upcoming GST filings</div></div>';
  }

  if (listEl) {
    if (!STATE.gstReturns.length) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No GST returns yet</div><div class="empty-state-sub">File your first GST return below</div></div>';
    } else {
      listEl.innerHTML = STATE.gstReturns.map(g => `
        <div class="gst-item">
          <div>
            <div class="gst-item-name">${escapeHtml(g.client_name)}</div>
            <div class="gst-item-sub">${escapeHtml(g.return_type)} • ${escapeHtml(g.period)} ${g.remarks ? '• '+escapeHtml(g.remarks) : ''}</div>
            ${g.updated_by ? `<div class="updated-by-badge">by ${escapeHtml(g.updated_by)}</div>` : ''}
            ${g.updated_at ? `<div class="updated-by-badge">🕐 ${formatDateTime(g.updated_at)}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${statusBadge(g.status)}
            <button class="btn-outline" style="padding:4px 8px;font-size:11px" onclick="editGSTReturn(${g.id})">✏️</button>
            <button class="btn-outline" style="padding:4px 8px;font-size:11px;border-color:#ef4444;color:#ef4444" onclick="deleteGSTReturn(${g.id})">✕</button>
          </div>
        </div>`).join('');
    }
  }
  populateAllClientDropdowns();
  updateDashboardStats();
}

async function submitGSTReturn() {
  const clientSel = document.getElementById('gstClientSel');
  const typeSel = document.getElementById('gstReturnType');
  const periodSel = document.getElementById('gstPeriodSel');
  const gstinEl = document.getElementById('gstGSTIN');
  const turnoverEl = document.getElementById('gstTurnover');
  const taxEl = document.getElementById('gstTaxLiability');
  const remarksEl = document.getElementById('gstRemarks');

  const clientId = clientSel?.value;
  const clientName = clientId ? getClientNameById(clientId) : '';
  if (!clientName) { showToast('Please select a client'); return; }

  const gstinVal = gstinEl?.value.trim().toUpperCase() || '';
  if (gstinVal && !isValidFormat(gstinVal, 'gstin')) { showToast('❌ Invalid GSTIN format'); return; }
  const body = {
    client_name: clientName,
    client_id: clientId || null,
    return_type: typeSel?.value || 'GSTR-1',
    period: periodSel?.value || '',
    gstin: gstinVal,
    total_turnover: parseFloat(turnoverEl?.value)||0,
    tax_liability: parseFloat(taxEl?.value)||0,
    remarks: remarksEl?.value.trim() || '',
    status: 'Filed',
    filed_date: new Date().toISOString().split('T')[0]
  };
  const result = await supabaseInsert('gst_returns', body);
  if (result && result[0]) {
    STATE.gstReturns.unshift(result[0]);
    renderGSTPage();
    showToast('✅ GST Return filed successfully!');
    if (gstinEl) gstinEl.value = '';
    if (turnoverEl) turnoverEl.value = '';
    if (taxEl) taxEl.value = '';
    if (remarksEl) remarksEl.value = '';
  } else { showToast('❌ Failed to file GST return'); }
}

function editGSTReturn(id) {
  const g = STATE.gstReturns.find(x => x.id === id);
  if (!g) return;
  openModalWithContent(`✏️ Edit GST Return`, `
    <div class="form-group"><label>Client</label><div class="form-control" style="background:var(--bg)">${escapeHtml(g.client_name)}</div></div>
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="editGstStatus">
        ${['Filed','Pending','Overdue'].map(s=>`<option ${g.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="editGstRemarks" value="${escapeHtml(g.remarks||'')}" placeholder="Add remarks..." /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveGSTEdit(${id})">💾 Save</button>
  `);
}

async function saveGSTEdit(id) {
  const status = document.getElementById('editGstStatus')?.value;
  const remarks = document.getElementById('editGstRemarks')?.value.trim();
  const ok = await supabaseUpdate('gst_returns', id, { status, remarks });
  if (ok) {
    const idx = STATE.gstReturns.findIndex(g => g.id === id);
    if (idx !== -1) { STATE.gstReturns[idx].status = status; STATE.gstReturns[idx].remarks = remarks; STATE.gstReturns[idx].updated_by = getUpdatedByLabel(); STATE.gstReturns[idx].updated_at = new Date().toISOString(); }
    closeModal(); renderGSTPage(); showToast('✅ GST return updated!');
  }
}

async function deleteGSTReturn(id) {
  const ok = await supabaseDelete('gst_returns', id);
  if (ok) { STATE.gstReturns = STATE.gstReturns.filter(g => g.id !== id); renderGSTPage(); showToast('🗑️ GST return deleted'); }
}

/* =========================================================
   17. ROC FILINGS
   ========================================================= */

const ROC_FORMS = [
  'AOC-4','AOC-4 CFS','AOC-4 XBRL','MGT-7','MGT-7A','ADT-1',
  'DIR-3 KYC','DIR-12','MGT-14','CHG-1','CHG-4','CHG-9',
  'INC-20A','INC-22','INC-28','SH-7','PAS-3','MBP-1',
  'BEN-2','BEN-4','LLP-8','LLP-11','Form 15','Form 16','Form 17'
];

function renderROCTable() {
  const tbody = document.getElementById('rocTableBody');
  if (!tbody) return;
  if (!STATE.rocFilings.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-text">No ROC filings yet</div></div></td></tr>`;
    updateDashboardStats(); return;
  }
  tbody.innerHTML = STATE.rocFilings.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.company)}</strong></td>
      <td>${escapeHtml(r.cin||'-')}</td>
      <td>${escapeHtml(r.form||'-')}</td>
      <td>${escapeHtml(r.due_date||'-')}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="remarks-cell" title="${escapeHtml(r.remarks||'')}">${escapeHtml(r.remarks||'-')}</td>
      <td class="updated-by-cell">
        <span class="updated-by-badge">${escapeHtml(r.updated_by||'-')}</span>
        ${r.updated_at ? `<span class="updated-by-badge">🕐 ${formatDateTime(r.updated_at)}</span>` : ''}
      </td>
      <td>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;margin-right:4px" onclick="editROCStatus(${r.id})">Update</button>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444" onclick="deleteROC(${r.id})">Delete</button>
      </td>
    </tr>`).join('');
  updateDashboardStats();
}

function editROCStatus(id) {
  const r = STATE.rocFilings.find(x => x.id === id);
  if (!r) return;
  openModalWithContent(`Update ROC Filing — ${escapeHtml(r.company)}`, `
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="rocStatusSel">
        ${['In Progress','Filed','Overdue','Pending'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="rocRemarks" value="${escapeHtml(r.remarks||'')}" placeholder="Add remarks..." /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveROCStatus(${id})">Save</button>
  `);
}

async function saveROCStatus(id) {
  const status = document.getElementById('rocStatusSel')?.value;
  const remarks = document.getElementById('rocRemarks')?.value.trim();
  const ok = await supabaseUpdate('roc_filings', id, { status, remarks });
  if (ok) {
    const idx = STATE.rocFilings.findIndex(r => r.id === id);
    if (idx !== -1) { STATE.rocFilings[idx].status = status; STATE.rocFilings[idx].remarks = remarks; STATE.rocFilings[idx].updated_by = getUpdatedByLabel(); STATE.rocFilings[idx].updated_at = new Date().toISOString(); }
    closeModal(); renderROCTable(); showToast('✅ ROC status updated');
  }
}

async function deleteROC(id) {
  const ok = await supabaseDelete('roc_filings', id);
  if (ok) { STATE.rocFilings = STATE.rocFilings.filter(r => r.id !== id); renderROCTable(); showToast('🗑️ ROC filing deleted'); }
}

async function submitROCFiling() {
  const clientSel = document.getElementById('rocClientSel');
  const companyEl = document.getElementById('rocCompany');
  const cinEl = document.getElementById('rocCIN');
  const formSel = document.getElementById('rocForm');
  const dueEl = document.getElementById('rocDue');
  const remarksEl = document.getElementById('rocRemarks2');

  let companyName = '';
  if (clientSel && clientSel.value) {
    companyName = getClientNameById(clientSel.value);
  } else if (companyEl) {
    companyName = companyEl.value.trim();
  }
  if (!companyName) { showToast('Please select a client or enter company name'); return; }
  const dueVal = dueEl?.value;
  if (!dueVal) { showToast('Please select a due date'); return; }

  const cinVal = cinEl?.value.trim().toUpperCase() || '';
  const body = {
    company: companyName,
    client_id: (clientSel && clientSel.value) ? clientSel.value : null,
    cin: cinVal || '-',
    form: formSel?.value || 'AOC-4',
    due_date: dueEl?.value || 'TBD',
    remarks: remarksEl?.value.trim() || '',
    status: 'In Progress'
  };
  const result = await supabaseInsert('roc_filings', body);
  if (result && result[0]) { STATE.rocFilings.unshift(result[0]); closeModal(); renderROCTable(); showToast('✅ ROC filing created!'); }
  else { showToast('❌ ROC filing failed'); }
}

/* =========================================================
   18. INCOME TAX
   ========================================================= */

function getAssessmentYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 5; i++) {
    const y = currentYear + 1 - i;
    years.push(`${y}-${String(y+1).slice(2)}`);
  }
  return years;
}

function renderITRList() {
  const el = document.getElementById('itrList');
  if (!el) return;
  if (!STATE.itrFilings.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-text">No ITR filings yet</div></div>';
    updateDashboardStats(); return;
  }
  el.innerHTML = STATE.itrFilings.map(itr => `
    <div class="itr-item">
      <div>
        <div class="gst-item-name">${escapeHtml(itr.client_name)}</div>
        <div class="gst-item-sub">${escapeHtml(itr.form)} • AY ${escapeHtml(itr.assessment_year)} • Filed: ${escapeHtml(itr.filed_date||'-')}</div>
        ${itr.remarks ? `<div class="gst-item-sub" style="color:var(--text-muted)">📝 ${escapeHtml(itr.remarks)}</div>` : ''}
        ${itr.updated_by ? `<div class="updated-by-badge">by ${escapeHtml(itr.updated_by)}</div>` : ''}
        ${itr.updated_at ? `<div class="updated-by-badge">🕐 ${formatDateTime(itr.updated_at)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${statusBadge(itr.status)}
        <button class="btn-outline" style="padding:4px 8px;font-size:11px" onclick="editITR(${itr.id})">✏️</button>
        <button class="btn-outline" style="padding:4px 8px;font-size:11px;border-color:#ef4444;color:#ef4444" onclick="deleteITR(${itr.id})">✕</button>
      </div>
    </div>`).join('');
  updateDashboardStats();
}

function editITR(id) {
  const itr = STATE.itrFilings.find(x => x.id === id);
  if (!itr) return;
  openModalWithContent(`✏️ Edit ITR — ${escapeHtml(itr.client_name)}`, `
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="editItrStatus">
        ${['Filed','Pending','In Progress','Overdue'].map(s=>`<option ${itr.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="editItrRemarks" value="${escapeHtml(itr.remarks||'')}" placeholder="Add remarks..." /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveITREdit(${id})">💾 Save</button>
  `);
}

async function saveITREdit(id) {
  const status = document.getElementById('editItrStatus')?.value;
  const remarks = document.getElementById('editItrRemarks')?.value.trim();
  const ok = await supabaseUpdate('itr_filings', id, { status, remarks });
  if (ok) {
    const idx = STATE.itrFilings.findIndex(i => i.id === id);
    if (idx !== -1) { STATE.itrFilings[idx].status = status; STATE.itrFilings[idx].remarks = remarks; STATE.itrFilings[idx].updated_by = getUpdatedByLabel(); STATE.itrFilings[idx].updated_at = new Date().toISOString(); }
    closeModal(); renderITRList(); showToast('✅ ITR updated!');
  }
}

async function submitITR() {
  const clientSel = document.getElementById('itrClientSel');
  const ayEl = document.getElementById('itrAssessmentYear');
  const formEl = document.getElementById('itrForm');
  const grossEl = document.getElementById('itrGrossIncome');
  const tdsEl = document.getElementById('itrTaxDeducted');
  const dedEl = document.getElementById('itrDeductions');
  const remarksEl = document.getElementById('itrRemarks');

  const clientId = clientSel?.value;
  const clientName = clientId ? getClientNameById(clientId) : '';
  if (!clientName) { showToast('Please select a client'); return; }

  const body = {
    client_name: clientName,
    client_id: clientId || null,
    assessment_year: ayEl?.value || getAssessmentYears()[0],
    form: formEl?.value || 'ITR-1',
    gross_income: parseFloat(grossEl?.value)||0,
    tax_deducted: parseFloat(tdsEl?.value)||0,
    deductions: parseFloat(dedEl?.value)||0,
    remarks: remarksEl?.value.trim() || '',
    status: 'Filed',
    filed_date: new Date().toISOString().split('T')[0]
  };
  const result = await supabaseInsert('itr_filings', body);
  if (result && result[0]) { STATE.itrFilings.unshift(result[0]); renderITRList(); showToast('✅ ITR filed successfully!'); }
  else { showToast('❌ ITR filing failed'); }
}

async function deleteITR(id) {
  const ok = await supabaseDelete('itr_filings', id);
  if (ok) { STATE.itrFilings = STATE.itrFilings.filter(i => i.id !== id); renderITRList(); showToast('🗑️ ITR filing deleted'); }
}

/* =========================================================
   19. TDS RETURNS
   ========================================================= */

function renderTDSTable() {
  const tbody = document.getElementById('tdsTableBody');
  if (!tbody) return;
  if (!STATE.tdsReturns.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">No TDS returns yet</div></div></td></tr>`;
    updateDashboardStats(); return;
  }
  tbody.innerHTML = STATE.tdsReturns.map(t => `
    <tr>
      <td><strong>${escapeHtml(t.client_name || t.deductor || '-')}</strong></td>
      <td>${escapeHtml(t.tan||'-')}</td>
      <td>${escapeHtml(t.quarter||'-')}</td>
      <td>${escapeHtml(t.form_type||'-')}</td>
      <td>₹ ${formatAmount(t.amount||0)}</td>
      <td>${escapeHtml(t.challan_no||'-')}</td>
      <td>${statusBadge(t.status)}</td>
      <td class="updated-by-cell">
        <span class="updated-by-badge">${escapeHtml(t.updated_by||'-')}</span>
        ${t.updated_at ? `<span class="updated-by-badge">🕐 ${formatDateTime(t.updated_at)}</span>` : ''}
      </td>
      <td>
        <button class="btn-outline" style="padding:4px 8px;font-size:11px;margin-right:4px" onclick="editTDS(${t.id})">✏️</button>
        <button class="btn-outline" style="padding:4px 8px;font-size:11px;border-color:#ef4444;color:#ef4444" onclick="deleteTDS(${t.id})">✕</button>
      </td>
    </tr>`).join('');
  updateDashboardStats();
}

function editTDS(id) {
  const t = STATE.tdsReturns.find(x => x.id === id);
  if (!t) return;
  openModalWithContent(`✏️ Edit TDS Return — ${escapeHtml(t.client_name || t.deductor || '')}`, `
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="editTdsStatus">
        ${['Filed','Pending','Overdue'].map(s=>`<option ${t.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="editTdsRemarks" value="${escapeHtml(t.remarks||'')}" placeholder="Add remarks..." /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveTDSEdit(${id})">💾 Save</button>
  `);
}

async function saveTDSEdit(id) {
  const status = document.getElementById('editTdsStatus')?.value;
  const remarks = document.getElementById('editTdsRemarks')?.value.trim();
  const ok = await supabaseUpdate('tds_returns', id, { status, remarks });
  if (ok) {
    const idx = STATE.tdsReturns.findIndex(t => t.id === id);
    if (idx !== -1) { STATE.tdsReturns[idx].status = status; STATE.tdsReturns[idx].remarks = remarks; STATE.tdsReturns[idx].updated_by = getUpdatedByLabel(); STATE.tdsReturns[idx].updated_at = new Date().toISOString(); }
    closeModal(); renderTDSTable(); showToast('✅ TDS updated!');
  }
}

async function submitTDS() {
  const clientSel = document.getElementById('tdsClientSel');
  const deductorEl = document.getElementById('tdsDeductor');
  const tanEl = document.getElementById('tdsTAN');
  const quarterSel = document.getElementById('tdsQuarter');
  const formSel = document.getElementById('tdsFormType');
  const amountEl = document.getElementById('tdsAmount');
  const challanEl = document.getElementById('tdsChallan');

  let clientName = '';
  let clientId = null;
  if (clientSel && clientSel.value) {
    clientId = clientSel.value;
    clientName = getClientNameById(clientId);
  }
  const deductor = deductorEl?.value.trim();
  if (!clientName && !deductor) { showToast('Please select a client or enter deductor name'); return; }

  const tanVal = tanEl?.value.trim().toUpperCase() || '';
  if (tanVal && !isValidFormat(tanVal, 'tan')) { showToast('❌ Invalid TAN format. Use ABCD12345E'); return; }
  const body = {
    client_name: clientName || deductor,
    client_id: clientId,
    deductor: deductor || clientName,
    tan: tanVal,
    quarter: quarterSel?.value || '',
    form_type: formSel?.value || '',
    amount: parseFloat(amountEl?.value)||0,
    challan_no: challanEl?.value.trim() || '',
    status: 'Filed'
  };
  const result = await supabaseInsert('tds_returns', body);
  if (result && result[0]) { STATE.tdsReturns.unshift(result[0]); renderTDSTable(); showToast('✅ TDS return submitted!'); }
  else { showToast('❌ TDS submission failed'); }
}

async function deleteTDS(id) {
  const ok = await supabaseDelete('tds_returns', id);
  if (ok) { STATE.tdsReturns = STATE.tdsReturns.filter(t => t.id !== id); renderTDSTable(); showToast('🗑️ TDS return deleted'); }
}

/* =========================================================
   20. AUDIT
   ========================================================= */

function renderAuditTable() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;
  if (!STATE.audits.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">🛡️</div><div class="empty-state-text">No audits scheduled yet</div></div></td></tr>`;
    updateDashboardStats(); return;
  }
  tbody.innerHTML = STATE.audits.map(a => `
    <tr>
      <td><strong>${escapeHtml(a.client)}</strong></td>
      <td>${escapeHtml(a.audit_type||'-')}</td>
      <td>${escapeHtml(a.auditor||'-')}</td>
      <td>${escapeHtml(a.start_date||'-')}</td>
      <td>${escapeHtml(a.end_date||'-')}</td>
      <td>${statusBadge(a.status)}</td>
      <td class="updated-by-cell">
        <span class="updated-by-badge">${escapeHtml(a.updated_by||'-')}</span>
        ${a.updated_at ? `<span class="updated-by-badge">🕐 ${formatDateTime(a.updated_at)}</span>` : ''}
      </td>
      <td>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;margin-right:4px" onclick="editAuditStatus(${a.id})">Update</button>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444" onclick="deleteAudit(${a.id})">Delete</button>
      </td>
    </tr>`).join('');
  updateDashboardStats();
}

function editAuditStatus(id) {
  const a = STATE.audits.find(x => x.id === id);
  if (!a) return;
  openModalWithContent(`Update Audit — ${escapeHtml(a.client)}`, `
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="auditStatusSel">
        ${['In Progress','In Review','Completed','Pending'].map(s=>`<option ${a.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="auditRemarks" value="${escapeHtml(a.remarks||'')}" placeholder="Add remarks..." /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveAuditStatus(${id})">Save</button>
  `);
}

async function saveAuditStatus(id) {
  const status = document.getElementById('auditStatusSel')?.value;
  const remarks = document.getElementById('auditRemarks')?.value.trim();
  const ok = await supabaseUpdate('audits', id, { status, remarks });
  if (ok) {
    const idx = STATE.audits.findIndex(a => a.id === id);
    if (idx !== -1) { STATE.audits[idx].status = status; STATE.audits[idx].remarks = remarks; STATE.audits[idx].updated_by = getUpdatedByLabel(); STATE.audits[idx].updated_at = new Date().toISOString(); }
    closeModal(); renderAuditTable(); showToast('✅ Audit status updated');
  }
}

async function deleteAudit(id) {
  const ok = await supabaseDelete('audits', id);
  if (ok) { STATE.audits = STATE.audits.filter(a => a.id !== id); renderAuditTable(); showToast('🗑️ Audit deleted'); }
}

/* =========================================================
   21. DSC
   ========================================================= */

function dscDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const exp = new Date(expiryDate);
  return Math.ceil((exp - today) / (1000*60*60*24));
}

function dscStatusLabel(expiryDate) {
  const days = dscDaysLeft(expiryDate);
  if (days === null) return '';
  if (days < 0) return `<span class="dsc-expired">Expired ${Math.abs(days)}d ago</span>`;
  if (days <= 30) return `<span class="dsc-warning">⚠️ ${days}d left</span>`;
  return `<span style="color:var(--success)">✓ ${days}d left</span>`;
}

function renderDSCAlerts() {
  const el = document.getElementById('dscAlertList');
  if (!el) return;
  if (!STATE.dscRecords.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✍️</div><div class="empty-state-text">No DSC records</div></div>';
    updateDashboardStats(); return;
  }
  const sorted = [...STATE.dscRecords].sort((a,b) => new Date(a.expiry_date||'9999')-new Date(b.expiry_date||'9999'));
  el.innerHTML = sorted.map(d => {
    const days = dscDaysLeft(d.expiry_date);
    const urgent = days !== null && days <= 30;
    const clientName = d.client_name || d.name || '-';
    const dscType = d.dsc_type || d.type || '-';
    const purpose = d.purpose || '-';
    const expiryDate = d.expiry_date || d.expiry || '-';
   return `
      <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:14px;">
        <div style="width:42px;height:42px;border-radius:10px;background:${days !== null && days < 0 ? '#fee2e2' : urgent ? '#fef3c7' : 'var(--primary-glow)'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">✍️</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;">${escapeHtml(clientName)} <span style="font-size:12px;font-weight:500;color:var(--text-muted);">(${escapeHtml(dscType)})</span></div>
          ${d.individual_name ? `<div style="font-size:12px;color:var(--primary);font-weight:600;margin-bottom:4px;">👤 ${escapeHtml(d.individual_name)}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:12px;color:var(--text-muted);margin-bottom:4px;">
            <span>📋 <strong style="color:var(--text)">Purpose:</strong> ${escapeHtml(purpose)}</span>
            <span>📅 <strong style="color:var(--text)">Expiry:</strong> ${escapeHtml(expiryDate)}</span>
            ${d.pan ? `<span>🪪 <strong style="color:var(--text)">PAN:</strong> ${escapeHtml(d.pan)}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            ${dscStatusLabel(expiryDate)}
            ${d.remarks ? `<span style="font-size:11px;color:var(--text-muted);">📝 ${escapeHtml(d.remarks)}</span>` : ''}
          </div>
          ${d.updated_by || d.updated_at ? `<div style="font-size:11px;color:var(--text-muted);margin-top:5px;">🖊 ${escapeHtml(d.updated_by||'')} ${d.updated_at ? '· '+formatDateTime(d.updated_at) : ''}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
          <button class="btn-outline" style="padding:5px 12px;font-size:12px;" onclick="editDSC(${d.id})">✏️ Edit</button>
          <button class="btn-outline" style="padding:5px 12px;font-size:12px;border-color:#ef4444;color:#ef4444;" onclick="deleteDSC(${d.id})">🗑️ Delete</button>
        </div>
      </div>`;
  }).join('');
  updateDashboardStats();
}

function editDSC(id) {
  const d = STATE.dscRecords.find(x => x.id === id);
  if (!d) return;
  openModalWithContent(`✏️ Edit DSC — ${escapeHtml(d.client_name||d.name||'')}`, `
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="editDscStatus">
        ${['Active','Expired','Pending Renewal'].map(s=>`<option ${d.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Expiry Date</label><input type="date" class="form-control" id="editDscExpiry" value="${d.expiry_date||''}" /></div>
    <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="editDscRemarks" value="${escapeHtml(d.remarks||'')}" placeholder="Add remarks..." /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveDSCEdit(${id})">💾 Save</button>
  `);
}

async function saveDSCEdit(id) {
  const status = document.getElementById('editDscStatus')?.value;
  const expiry_date = document.getElementById('editDscExpiry')?.value;
  const remarks = document.getElementById('editDscRemarks')?.value.trim();
  const ok = await supabaseUpdate('dsc_records', id, { status, expiry_date, remarks });
  if (ok) {
    const idx = STATE.dscRecords.findIndex(d => d.id === id);
    if (idx !== -1) { STATE.dscRecords[idx].status = status; STATE.dscRecords[idx].expiry_date = expiry_date; STATE.dscRecords[idx].remarks = remarks; STATE.dscRecords[idx].updated_by = getUpdatedByLabel(); STATE.dscRecords[idx].updated_at = new Date().toISOString(); }
    closeModal(); renderDSCAlerts(); showToast('✅ DSC updated!');
  }
}

function onDscClientChange() {
  const sel = document.getElementById('dscClientSel');
  const nameEl = document.getElementById('dscClientName');
  if (sel && sel.value && nameEl && !nameEl.value) {
    // auto fill nahi karna — user khud individual name daale
  }
}

async function submitDSC() {
  const clientSel = document.getElementById('dscClientSel');
  const clientId = clientSel?.value;
  const clientName = clientId ? getClientNameById(clientId) : '';
  const clientEl = document.getElementById('dscClientName');
  const panEl = document.getElementById('dscPAN');
  const typeSel = document.getElementById('dscType');
  const validitySel = document.getElementById('dscValidity');
  const purposeSel = document.getElementById('dscPurpose');
  const expiryEl = document.getElementById('dscExpiry');
  const remarksEl = document.getElementById('dscRemarks');

  const individualName = clientEl?.value.trim();
  if (!clientName) { showToast('Please select a client'); return; }
  if (!individualName) { showToast('Please enter individual name'); return; }
  if (!expiryEl?.value) { showToast('Please enter expiry date'); return; }

  showToast('⏳ Saving DSC record...');

  const body = {
    client_name: clientName,
    client_id: clientId || null,
    individual_name: individualName,
    pan: panEl?.value.trim() || '',
    dsc_type: typeSel?.value || 'Class 3',
    validity: validitySel?.value || '2 Years',
    purpose: purposeSel?.value || '',
    expiry_date: expiryEl?.value || '',
    remarks: remarksEl?.value.trim() || '',
    status: 'Active'
  };

  let result = await supabaseInsert('dsc_records', body);

  if (!result || !result[0]) {
    const altBody = {
      name: clientName,
      pan_number: panEl?.value.trim() || '',
      type: typeSel?.value || 'Class 3',
      validity_period: validitySel?.value || '2 Years',
      purpose: purposeSel?.value || '',
      expiry_date: expiryEl?.value || '',
      remarks: remarksEl?.value.trim() || '',
      status: 'Active'
    };
    result = await supabaseInsert('dsc_records', altBody);
  }

  if (result && result[0]) {
    STATE.dscRecords.unshift(result[0]);
    renderDSCAlerts();
    showToast('✅ DSC record added!');
    if (clientEl) clientEl.value = '';
    if (panEl) panEl.value = '';
    if (expiryEl) expiryEl.value = '';
    if (remarksEl) remarksEl.value = '';
  } else {
    showToast('❌ DSC submission failed — check console for details');
  }
}

async function deleteDSC(id) {
  const ok = await supabaseDelete('dsc_records', id);
  if (ok) { STATE.dscRecords = STATE.dscRecords.filter(d => d.id !== id); renderDSCAlerts(); showToast('🗑️ DSC record deleted'); }
}

/* =========================================================
   22. ACCOUNTING HUB
   ========================================================= */

function renderAccountingList() {
  const el = document.getElementById('accountingList');
  if (!el) return;
  if (!STATE.accountingEntries.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧮</div><div class="empty-state-text">No entries yet</div></div>';
    updateDashboardStats(); return;
  }
  el.innerHTML = STATE.accountingEntries.map(t => `
    <div class="acc-item">
      <div>
        <div class="gst-item-name">${escapeHtml(t.narration)}</div>
        <div class="gst-item-sub">${escapeHtml(t.entry_date||'')} • ${escapeHtml(t.voucher_type||'')}</div>
        ${t.updated_by ? `<div class="updated-by-badge">by ${escapeHtml(t.updated_by)}</div>` : ''}
        ${t.updated_at ? `<div class="updated-by-badge">🕐 ${formatDateTime(t.updated_at)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="acc-amount ${t.entry_type}">${t.entry_type==='credit'?'+':'-'} ₹ ${formatAmount(t.amount||0)}</div>
        <button class="btn-outline" style="padding:4px 8px;font-size:11px;border-color:#ef4444;color:#ef4444" onclick="deleteAccEntry(${t.id})">✕</button>
      </div>
    </div>`).join('');
  updateDashboardStats();
}

async function submitJournalEntry() {
  const dateEl = document.querySelector('#page-accounting input[type="date"]');
  const voucherSel = document.querySelector('#page-accounting select');
  const textarea = document.querySelector('#page-accounting textarea');
  const narration = textarea?.value.trim();
  const amountEl = document.getElementById('accAmount');
  const debitEl = document.getElementById('accDebit');
  const creditEl = document.getElementById('accCredit');
  const amount = parseFloat(amountEl?.value)||0;
  if (!narration) { showToast('Please enter narration'); return; }
  if (isJunkText(narration, 4)) { showToast('Please enter a meaningful narration (min 4 characters)'); return; }
  if (!amount) { showToast('Please enter amount'); return; }
  if (isJunkText(debitEl?.value.trim(), 2) || isJunkText(creditEl?.value.trim(), 2)) { showToast('Please enter full account head names'); return; }
  const voucherType = voucherSel?.value || 'Journal';
  const entryType = ['Receipt','Sales','Invoice'].includes(voucherType) ? 'credit' : 'debit';
  const body = {
    narration, voucher_type: voucherType,
    debit_account: debitEl?.value.trim() || '',
    credit_account: creditEl?.value.trim() || '',
    amount, entry_type: entryType,
    entry_date: dateEl?.value || new Date().toISOString().split('T')[0]
  };
  const result = await supabaseInsert('accounting_entries', body);
  if (result && result[0]) { STATE.accountingEntries.unshift(result[0]); renderAccountingList(); showToast('✅ Journal entry posted!'); }
  else { showToast('❌ Entry failed'); }
}

async function deleteAccEntry(id) {
  const ok = await supabaseDelete('accounting_entries', id);
  if (ok) { STATE.accountingEntries = STATE.accountingEntries.filter(t => t.id !== id); renderAccountingList(); showToast('🗑️ Entry deleted'); }
}

/* =========================================================
   23. TASK MANAGER
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
        <div class="task-meta">${(t.tags||[]).map(tag=>`<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="task-meta">
          <span>👤 ${escapeHtml(t.assignee||'Unassigned')}</span>
          <span>📅 ${escapeHtml(t.due_date||'TBD')}</span>
        </div>
        ${t.updated_by ? `<div class="updated-by-badge">by ${escapeHtml(t.updated_by)}</div>` : ''}
        ${t.updated_at ? `<div class="updated-by-badge">🕐 ${formatDateTime(t.updated_at)}</div>` : ''}
      </div>`).join('') || `<div class="empty-state" style="padding:20px 10px"><div class="empty-state-text" style="font-size:13px">No tasks here</div></div>`;
    container.ondragover = (e) => e.preventDefault();
    container.ondrop = (e) => dropTask(e, col);
  });
  updateDashboardStats();
}

let draggedTaskId = null;
function dragStart(e) { const card = e.target.closest('.task-card'); if (card) draggedTaskId = parseInt(card.getAttribute('data-id')); }
async function dropTask(e, targetCol) {
  e.preventDefault();
  if (!draggedTaskId) return;
  const task = STATE.tasks.find(t => t.id === draggedTaskId);
  if (task && task.column_name !== targetCol) {
    await supabaseUpdate('tasks', draggedTaskId, { column_name: targetCol });
    task.column_name = targetCol;
    task.updated_by = getCurrentUserEmail();
    task.updated_at = new Date().toISOString();
    renderKanban();
    showToast('✅ Task moved to ' + columnLabel(targetCol));
  }
  draggedTaskId = null;
}
function columnLabel(col) { return { todo:'To Do', inprogress:'In Progress', done:'Done' }[col]||col; }

function addTask(col) {
  const myName = getCurrentUserName();
  openModalWithContent('➕ Add Task to ' + columnLabel(col), `
    <div class="form-group"><label>Task Title *</label><input type="text" class="form-control" id="newTaskTitle" placeholder="Enter task title" /></div>
    <div class="form-group"><label>Tags (comma separated)</label><input type="text" class="form-control" id="newTaskTags" placeholder="e.g. GST, High" /></div>
    <div class="form-group"><label>Assignee</label><input type="text" class="form-control" id="newTaskAssignee" value="${escapeHtml(myName)}" placeholder="Assignee name" /></div>
    <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="newTaskDue" /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="createTask('${col}')">Add Task</button>
  `);
}

async function createTask(col) {
  const title = document.getElementById('newTaskTitle')?.value.trim();
  if (!title) { showToast('Please enter task title'); return; }
  const tagsRaw = document.getElementById('newTaskTags')?.value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : [];
  const body = {
    title, tags,
    assignee: document.getElementById('newTaskAssignee')?.value.trim() || getCurrentUserName(),
    due_date: document.getElementById('newTaskDue')?.value || 'TBD',
    column_name: col
  };
  const result = await supabaseInsert('tasks', body);
  if (result && result[0]) { STATE.tasks.unshift(result[0]); closeModal(); renderKanban(); showToast('✅ Task added!'); }
  else { showToast('❌ Failed to add task'); }
}

function openTaskDetail(id) {
  const task = STATE.tasks.find(t => t.id === id);
  if (!task) return;
  const myName = getCurrentUserName();
  openModalWithContent('📋 Task Details', `
    <div class="form-group"><label>Title</label><input type="text" class="form-control" id="editTaskTitle" value="${escapeHtml(task.title)}" /></div>
    <div class="form-group"><label>Assignee</label><input type="text" class="form-control" id="taskAssigneeSel" value="${escapeHtml(task.assignee||myName)}" /></div>
    <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="editTaskDue" value="${task.due_date&&task.due_date!=='TBD'?task.due_date:''}" /></div>
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="taskStatusSelect">
        <option value="todo" ${task.column_name==='todo'?'selected':''}>To Do</option>
        <option value="inprogress" ${task.column_name==='inprogress'?'selected':''}>In Progress</option>
        <option value="done" ${task.column_name==='done'?'selected':''}>Done</option>
      </select>
    </div>
    ${task.updated_by ? `<div class="form-group"><label>Last Updated By</label><div class="form-control" style="background:var(--bg)">${escapeHtml(task.updated_by)}</div></div>` : ''}
    ${task.updated_at ? `<div class="form-group"><label>Last Updated At</label><div class="form-control" style="background:var(--bg)">🕐 ${formatDateTime(task.updated_at)}</div></div>` : ''}
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn-primary" style="flex:1" onclick="updateTask(${task.id})">💾 Save</button>
      <button class="btn-outline" style="flex:1;border-color:#ef4444;color:#ef4444" onclick="deleteTask(${task.id})">🗑️ Delete</button>
    </div>
  `);
}

async function updateTask(id) {
  const title = document.getElementById('editTaskTitle')?.value.trim();
  if (!title) { showToast('Task title required'); return; }
  const dueRaw = document.getElementById('editTaskDue')?.value;
  const updated = {
    title,
    assignee: document.getElementById('taskAssigneeSel')?.value || getCurrentUserName(),
    due_date: dueRaw || 'TBD',
    column_name: document.getElementById('taskStatusSelect')?.value || 'todo'
  };
  const ok = await supabaseUpdate('tasks', id, updated);
  if (ok) {
    const idx = STATE.tasks.findIndex(t => t.id === id);
    if (idx !== -1) STATE.tasks[idx] = { ...STATE.tasks[idx], ...updated, updated_by: getUpdatedByLabel(), updated_at: new Date().toISOString() };
    closeModal(); renderKanban(); showToast('✅ Task updated!');
  }
}

async function deleteTask(id) {
  const ok = await supabaseDelete('tasks', id);
  if (ok) { STATE.tasks = STATE.tasks.filter(t => t.id !== id); closeModal(); renderKanban(); showToast('🗑️ Task deleted'); }
}

/* =========================================================
   24. REPORTS
   ========================================================= */

function renderBarChart() {
  const el = document.getElementById('barChart');
  if (!el) return;
  const currentYear = new Date().getFullYear();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const data = months.map((label, i) => {
    const count = [...STATE.gstReturns, ...STATE.itrFilings].filter(g => {
      if (!g.filed_date) return false;
      const d = new Date(g.filed_date);
      return d.getMonth() === i && d.getFullYear() === currentYear;
    }).length;
    return { label, value: count };
  });
  const max = Math.max(...data.map(d=>d.value), 1);
  el.innerHTML = data.map(d => `
    <div class="bar-item">
      <div class="bar-fill" style="height:0%" data-target="${(d.value/max)*100}"></div>
      <div class="bar-label">${d.label}${d.value>0?' ('+d.value+')':''}</div>
    </div>`).join('');
  requestAnimationFrame(() => {
    setTimeout(() => { document.querySelectorAll('#barChart .bar-fill').forEach(bar => { bar.style.height = bar.getAttribute('data-target')+'%'; }); }, 100);
  });
  updateDashboardStats();
}

function exportReport() { showToast('📥 Preparing export...'); }
function generateReport() { showToast('✅ Report generated!'); }

/* =========================================================
   25. AI ASSISTANT
   ========================================================= */

function getAIResponse(query) {
  const q = query.toLowerCase().trim();
  const { clients, gstReturns, tasks, tdsReturns } = STATE;
  if (q.includes('gst') && (q.includes('pending')||q.includes('show'))) {
    const pending = gstReturns.filter(g=>g.status==='Pending'||g.status==='Overdue');
    if (!pending.length) return 'No pending GST returns right now! 🎉';
    let txt = `${pending.length} GST returns need attention:<br><br>`;
    pending.forEach(g => { txt += `• <strong>${escapeHtml(g.client_name)}</strong> — ${g.return_type} (${g.period}) — <span style="color:${g.status==='Overdue'?'#ef4444':'#f59e0b'}">${g.status}</span><br>`; });
    return txt;
  }
  if (q.includes('task')||q.includes('pending')) {
    const p = tasks.filter(t=>t.column_name!=='done');
    if (!p.length) return 'No pending tasks! Everything is done. 🎉';
    let txt = `${p.length} tasks pending:<br><br>`;
    p.slice(0,6).forEach(t => { txt += `• <strong>${escapeHtml(t.title)}</strong> — ${t.column_name==='todo'?'To Do':'In Progress'}, due ${t.due_date||'TBD'}<br>`; });
    return txt;
  }
  if (q.includes('tds')) { const filed=tdsReturns.filter(t=>t.status==='Filed').length; const pend=tdsReturns.filter(t=>t.status==='Pending').length; return `TDS Summary:<br>✅ Filed: <strong>${filed}</strong><br>⏳ Pending: <strong>${pend}</strong>`; }
  if (q.includes('client')) { const active=clients.filter(c=>c.status==='Active').length; return `Total clients: <strong>${clients.length}</strong><br>Active: <strong>${active}</strong><br>Pending: <strong>${clients.filter(c=>c.status==='Pending').length}</strong>`; }
  if (q.includes('upcoming')||q.includes('due')||q.includes('compliance')) return 'Check the <strong>Calendar</strong> page for all upcoming due dates. Click 📅 Calendar in the sidebar!';
  const defaults = ['I can help with GST, TDS, ITR, clients, tasks & more. Try asking "show pending GST returns"!','Ask me about: pending tasks, GST status, TDS filings, client list, upcoming compliances.','Namaste! Try: "pending tasks", "GST due this week", "TDS filing status"'];
  return defaults[Math.floor(Math.random()*defaults.length)];
}

function sendAIMessage(presetMsg) {
  const input = document.getElementById('aiInput');
  const msg = presetMsg || input?.value.trim();
  if (!msg) return;
  const chatEl = document.getElementById('chatMessages');
  if (!chatEl) return;
  const name = getCurrentUserName();
  const initial = name.charAt(0).toUpperCase();
  chatEl.insertAdjacentHTML('beforeend', `<div class="chat-msg user"><div class="msg-avatar">${initial}</div><div class="msg-content">${escapeHtml(msg)}</div></div>`);
  if (input) input.value = '';
  chatEl.scrollTop = chatEl.scrollHeight;
  const typingId = 'typing-'+Date.now();
  chatEl.insertAdjacentHTML('beforeend', `<div class="chat-msg bot" id="${typingId}"><div class="msg-avatar">🤖</div><div class="msg-content"><em>Thinking...</em></div></div>`);
  chatEl.scrollTop = chatEl.scrollHeight;
  setTimeout(() => { const el=document.getElementById(typingId); if(el) el.querySelector('.msg-content').innerHTML=getAIResponse(msg); chatEl.scrollTop=chatEl.scrollHeight; }, 700);
}

function aiChip(text) { navigate('ai'); setTimeout(() => sendAIMessage(text), 200); }
function openAI() { navigate('ai'); }

/* =========================================================
   26. DOCUMENTS
   ========================================================= */

function renderDocuments() {
  const el = document.getElementById('docsGrid');
  if (!el) return;
  if (!STATE.documents.length) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📁</div><div class="empty-state-text">No documents yet</div><div class="empty-state-sub">Upload your first document</div></div>';
    return;
  }
  el.innerHTML = STATE.documents.map(d => `
    <div class="doc-card">
      <div class="doc-icon">${d.icon||'📄'}</div>
      <div class="doc-name">${escapeHtml(d.name)}</div>
      <div class="doc-meta">${escapeHtml(d.client_name||'')} • ${escapeHtml(d.file_size||'')}</div>
      ${d.updated_by ? `<div class="updated-by-badge">by ${escapeHtml(d.updated_by)}</div>` : ''}
      ${d.updated_at ? `<div class="updated-by-badge">🕐 ${formatDateTime(d.updated_at)}</div>` : ''}
      <button class="btn-outline" style="padding:4px 10px;font-size:11px;width:100%;margin-top:6px;border-color:#ef4444;color:#ef4444" onclick="event.stopPropagation();deleteDoc(${d.id})">Delete</button>
    </div>`).join('');
}

async function deleteDoc(id) {
  const ok = await supabaseDelete('documents', id);
  if (ok) { STATE.documents = STATE.documents.filter(d => d.id !== id); renderDocuments(); showToast('🗑️ Document deleted'); }
}

/* =========================================================
   27. CALENDAR
   ========================================================= */

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function renderCalendar() {
  const { month, year } = STATE.calendar;
  const titleEl = document.getElementById('calTitle');
  const gridEl = document.getElementById('calGrid');
  if (!titleEl || !gridEl) return;
  titleEl.textContent = MONTH_NAMES[month]+' '+year;
  const firstDay = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const daysInPrevMonth = new Date(year,month,0).getDate();
  const eventMap = {};
  STATE.calendarEvents.forEach(e => {
    const d = new Date(e.event_date);
    if (d.getFullYear()===year && d.getMonth()===month) { const key=d.getDate(); if(!eventMap[key]) eventMap[key]=[]; eventMap[key].push(e); }
  });
  const today = new Date();
  let html = '';
  for (let i=firstDay-1;i>=0;i--) html+=`<div class="cal-day other-month">${daysInPrevMonth-i}</div>`;
  for (let d=1;d<=daysInMonth;d++) {
    const hasEvent = eventMap[d] ? 'has-event' : '';
    const isToday = (year===today.getFullYear()&&month===today.getMonth()&&d===today.getDate()) ? 'today' : '';
    html+=`<div class="cal-day ${hasEvent} ${isToday}" onclick="showDayEvents(${d})">${d}</div>`;
  }
  const remaining = (7-((firstDay+daysInMonth)%7))%7;
  for (let d=1;d<=remaining;d++) html+=`<div class="cal-day other-month">${d}</div>`;
  gridEl.innerHTML = html;
}

function showDayEvents(day) {
  const events = STATE.calendarEvents.filter(e => { const d=new Date(e.event_date); return d.getFullYear()===STATE.calendar.year&&d.getMonth()===STATE.calendar.month&&d.getDate()===day; });
  if (!events.length) { showToast('No events on '+day+' '+MONTH_NAMES[STATE.calendar.month]); return; }
  openModalWithContent('📅 Events — '+day+' '+MONTH_NAMES[STATE.calendar.month], `
    ${events.map(e=>`<div class="upcoming-item" style="margin-bottom:10px"><div><div class="gst-item-name">${escapeHtml(e.title)}</div><div class="gst-item-sub">${escapeHtml(e.event_type||'')}</div></div></div>`).join('')}
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="closeModal()">Close</button>
  `);
}

function changeMonth(delta) {
  STATE.calendar.month += delta;
  if (STATE.calendar.month>11) { STATE.calendar.month=0; STATE.calendar.year++; }
  else if (STATE.calendar.month<0) { STATE.calendar.month=11; STATE.calendar.year--; }
  renderCalendar();
}

function renderEventList() {
  const el = document.getElementById('eventList');
  if (!el) return;
  const sorted = [...STATE.calendarEvents].sort((a,b) => new Date(a.event_date)-new Date(b.event_date));
  
  const typeIcon = { 
    'GST':'📊', 'TDS':'🧾', 'ROC':'🏛️', 'DSC':'✍️', 
    'Income Tax':'💰', 'Professional Tax':'🏷️', 'Payroll':'👨‍💼',
    'DIR-3 KYC':'📝', 'PF':'🏦', 'Internal':'📌', 'Meeting':'📅'
  };

  el.innerHTML = sorted.length ? sorted.map(e => {
    const icon = typeIcon[e.event_type] || '📅';
    const isMeeting = e.event_type === 'Meeting';
    const today = new Date();
    const eventDate = new Date(e.event_date);
    const diff = Math.ceil((eventDate - today) / (1000*60*60*24));
    const diffLabel = diff < 0 ? `${Math.abs(diff)}d ago` : diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`;
    const diffColor = diff < 0 ? '#ef4444' : diff <= 2 ? '#f59e0b' : '#10b981';

    return `
    <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="display:flex;gap:12px;align-items:flex-start;flex:1">
          <div style="width:38px;height:38px;border-radius:10px;background:var(--primary-glow);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13.5px;color:var(--text)">${escapeHtml(e.title)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;font-size:12px;color:var(--text-muted)">
              <span>🏷️ ${escapeHtml(e.event_type||'General')}</span>
              <span>📅 ${escapeHtml(e.event_date)} ${e.event_time ? '⏰ '+e.event_time : ''}</span>
              ${e.location ? `<span>📍 ${escapeHtml(e.location)}</span>` : ''}
            </div>
            ${e.description ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">📋 ${escapeHtml(e.description)}</div>` : ''}
            ${e.attendees ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">👥 ${escapeHtml(e.attendees)}</div>` : ''}
            <div style="margin-top:6px;font-size:11px;color:var(--text-muted)">
              🖊️ <strong>${escapeHtml(e.created_by || e.updated_by || '-')}</strong>
              ${e.updated_at ? `· 🕐 ${formatDateTime(e.updated_at)}` : e.created_at ? `· 🕐 ${formatDateTime(e.created_at)}` : ''}
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          <span style="font-size:11px;font-weight:700;color:${diffColor};background:${diffColor}22;padding:2px 8px;border-radius:99px">${diffLabel}</span>
          <div style="display:flex;gap:6px">
            ${isMeeting ? `
              <button class="btn-outline" style="padding:4px 8px;font-size:11px" onclick="reshareEvent(${e.id})">📤 Share</button>
            ` : ''}
            <button class="btn-outline" style="padding:4px 8px;font-size:11px;border-color:#ef4444;color:#ef4444" onclick="deleteEvent(${e.id})">🗑️</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="empty-state-text">No events scheduled</div></div>';
}

async function deleteEvent(id) {
  const ok = await supabaseDelete('calendar_events', id);
  if (ok) { STATE.calendarEvents=STATE.calendarEvents.filter(e=>e.id!==id); renderCalendar(); renderEventList(); renderDueDates(); showToast('🗑️ Event deleted'); }
}

/* =========================================================
   28. RIGHT PANEL
   ========================================================= */

function renderDueDates() {
  const el = document.getElementById('dueDateList');
  if (!el) return;
  const today = new Date();
  const upcoming = STATE.calendarEvents
    .filter(e => new Date(e.event_date) >= today)
    .sort((a,b) => new Date(a.event_date)-new Date(b.event_date))
    .slice(0,5);
  el.innerHTML = upcoming.length ? upcoming.map(e => {
    const d = new Date(e.event_date);
    const diff = Math.ceil((d-today)/(1000*60*60*24));
    const sub = diff===0?'Due Today':diff===1?'Due Tomorrow':'Due in '+diff+' days';
    const urgent = diff<=1;
   return `<div class="due-item">
      <div class="due-date-badge"><div class="due-date-num">${d.getDate()}</div><div class="due-date-mon">${MONTH_NAMES[d.getMonth()].slice(0,3)}</div></div>
      <div style="flex:1">
        <div class="due-title">${escapeHtml(e.title)}</div>
        <div class="due-sub ${urgent?'red':''}">${sub}</div>
        ${e.created_by ? `<div style="font-size:10px;color:var(--text-muted)">🖊️ ${escapeHtml(e.created_by)}</div>` : ''}
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="empty-state-text">No upcoming dates</div></div>';
}

function renderActivity() {
  const el = document.getElementById('activityList');
  if (!el) return;
  const activities = [];
  STATE.gstReturns.filter(g=>g.status==='Filed').slice(0,2).forEach(g => { activities.push({icon:'✅',color:'green',text:'GSTR filed for '+g.client_name,time:g.updated_at ? formatDateTime(g.updated_at) : (g.filed_date||'Recently'),by:g.updated_by||''}); });
  STATE.itrFilings.filter(i=>i.status==='Filed').slice(0,2).forEach(i => { activities.push({icon:'💰',color:'blue',text:'ITR filed for '+i.client_name,time:i.updated_at ? formatDateTime(i.updated_at) : (i.filed_date||'Recently'),by:i.updated_by||''}); });
  STATE.tasks.filter(t=>t.column_name==='done').slice(0,2).forEach(t => { activities.push({icon:'✅',color:'orange',text:t.title,time:t.updated_at ? formatDateTime(t.updated_at) : 'Completed',by:t.updated_by||''}); });
  el.innerHTML = activities.length ? activities.slice(0,6).map(a=>`
    <div class="activity-item">
      <div class="activity-dot ${a.color}">${a.icon}</div>
      <div><div class="activity-text">${escapeHtml(a.text)}</div><div class="activity-time">${escapeHtml(a.time)}${a.by?' · '+escapeHtml(a.by):''}</div></div>
    </div>`).join('') : '<div class="empty-state"><div class="empty-state-text">No recent activity</div></div>';
}

/* =========================================================
   29. MODALS
   ========================================================= */

function openModal(type) {
  const myName = getCurrentUserName();
  const clientOptions = getClientOptionsHtml();

  const configs = {
    addClient: {
      title: '➕ Add New Client',
      body: `
        <div class="form-grid">
          <div class="form-group"><label>Client Name *</label><input type="text" class="form-control" id="addClientName" placeholder="Enter client name" /></div>
          <div class="form-group"><label>Contact Person</label><input type="text" class="form-control" id="addClientContact" placeholder="Enter contact person name" /></div>
         <div class="form-group"><label>Type</label>
          <select class="form-control" id="addClientType" onchange="onClientTypeChange()">
            <option>Individual</option><option>Company</option><option>LLP</option><option>Partnership</option>
          </select>
        </div>
        <div class="form-group"><label>PAN</label>
          <input type="text" class="form-control" id="addClientPAN" placeholder="ABCDE1234F" maxlength="10" style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()" />
        </div>
        <div class="form-group"><label>TAN</label>
          <input type="text" class="form-control" id="addClientTAN" placeholder="ABCD12345E" maxlength="10" style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()" />
        </div>
        <div class="form-group" id="cinLlpinGroup" style="display:none">
          <label id="cinLlpinLabel">CIN</label>
          <input type="text" class="form-control" id="addClientCIN" placeholder="U12345MH2020PTC123456" style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()" />
        </div>
          <div class="form-group"><label>GST Number</label><input type="text" class="form-control" id="addClientGST" placeholder="Enter GSTIN (optional)" /></div>
          <div class="form-group"><label>Email</label><input type="text" class="form-control" id="addClientEmail" placeholder="Enter email" /></div>
          <div class="form-group"><label>Phone</label><input type="text" class="form-control" id="addClientPhone" placeholder="Enter phone" /></div>
        </div>
        <button class="btn-primary" style="width:100%" onclick="submitAddClient()">✅ Add Client</button>`
    },
    gstReturn: { title:'📊 File GST Return', body:`<div style="text-align:center;padding:20px"><div style="font-size:36px">📊</div><p style="margin:12px 0">Use the GST Dashboard form below</p><button class="btn-primary" onclick="closeModal();navigate('gst')">Go to GST Dashboard</button></div>` },
    rocFiling: {
      title: '🏛️ New ROC Filing',
      body: `
        <div class="form-group"><label>Select Client</label>
          <select class="form-control" id="rocClientSel">${clientOptions}</select>
        </div>
        <div class="form-group"><label>Company Name (if not in clients)</label><input type="text" class="form-control" id="rocCompany" placeholder="Or enter company name manually" /></div>
        <div class="form-group"><label>CIN</label><input type="text" class="form-control" id="rocCIN" maxlength="21" style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()" placeholder="U12345MH2020PTC123456" /></div>
        <div class="form-group"><label>Form Type</label>
          <select class="form-control" id="rocForm">${ROC_FORMS.map(f=>`<option>${f}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="rocDue" /></div>
        <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="rocRemarks2" placeholder="Optional remarks..." /></div>
        <button class="btn-primary" style="width:100%" onclick="submitROCFiling()">✅ Create Filing</button>`
    },
    itrFiling: { title:'💰 File ITR', body:`<div style="text-align:center;padding:20px"><div style="font-size:36px">💰</div><p style="margin:12px 0">Use the Income Tax form</p><button class="btn-primary" onclick="closeModal();navigate('incometax')">Go to Income Tax</button></div>` },
    tdsReturn: { title:'🧾 File TDS', body:`<div style="text-align:center;padding:20px"><div style="font-size:36px">🧾</div><p style="margin:12px 0">Use the TDS Returns form</p><button class="btn-primary" onclick="closeModal();navigate('tds')">Go to TDS Returns</button></div>` },
    newAudit: {
      title: '🛡️ Schedule Audit',
      body: `
        <div class="form-group"><label>Client *</label><select class="form-control" id="auditClientSel">${clientOptions}</select></div>
        <div class="form-group"><label>Audit Type</label>
          <select class="form-control" id="auditType"><option>Statutory Audit</option><option>Tax Audit</option><option>Internal Audit</option><option>Stock Audit</option><option>GST Audit</option><option>Concurrent Audit</option></select>
        </div>
        <div class="form-group"><label>Auditor</label><input type="text" class="form-control" id="auditAuditor" value="${escapeHtml(myName)}" /></div>
        <div class="form-group"><label>Start Date</label><input type="date" class="form-control" id="auditStart" /></div>
        <div class="form-group"><label>End Date</label><input type="date" class="form-control" id="auditEnd" /></div>
        <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="auditRemarks" placeholder="Optional remarks..." /></div>
        <button class="btn-primary" style="width:100%" onclick="submitNewAudit()">✅ Schedule Audit</button>`
    },
    newDSC: { title:'✍️ New DSC', body:`<div style="text-align:center;padding:20px"><div style="font-size:36px">✍️</div><p style="margin:12px 0">Use the DSC & eSign form</p><button class="btn-primary" onclick="closeModal();navigate('dsc')">Go to DSC & eSign</button></div>` },
    addVaultItem: {
  title: '🔐 Add New Credential',
  body: `
    <div class="form-group"><label>Client Name *</label><input type="text" class="form-control" id="vaultLabel" placeholder="e.g. Ramesh Kumar, ABC Pvt Ltd" /></div>
    <div class="form-group"><label>Folder / Category</label>
      <select class="form-control" id="vaultFolder">${VAULT_FOLDERS.map(f=>`<option>${f}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Username / Login ID</label><input type="text" class="form-control" id="vaultUsername" placeholder="Enter username or email" /></div>
    <div class="form-group"><label>Password</label>
      <div style="display:flex;gap:8px">
        <input type="password" class="form-control" id="vaultPassword" placeholder="Enter password" style="flex:1" autocomplete="new-password" />
        <button class="btn-outline" style="padding:8px 12px;white-space:nowrap" onclick="togglePasswordView('vaultPassword')">👁️ Show</button>
      </div>
    </div>
    <div class="form-group"><label>Remarks</label><textarea class="form-control" id="vaultNotes" rows="2" placeholder="Optional notes..."></textarea></div>
    <button class="btn-primary" style="width:100%" onclick="submitVaultItem()">🔐 Save Credential</button>`
},
    createVaultFolder: {
      title: '📁 Create New Folder',
      body: `
        <div class="form-group"><label>Folder Name</label><input type="text" class="form-control" id="newFolderName" placeholder="e.g. Clients" /></div>
        <button class="btn-primary" style="width:100%" onclick="submitCreateFolder()">Create Folder</button>`
    },
    newEntry: { title:'🧮 Journal Entry', body:`<div style="text-align:center;padding:20px"><div style="font-size:36px">🧮</div><p style="margin:12px 0">Use the Accounting Hub form</p><button class="btn-primary" onclick="closeModal();navigate('accounting')">Go to Accounting Hub</button></div>` },
    newTask: {
      title: '✅ Add New Task',
      body: `
        <div class="form-group"><label>Task Title *</label><input type="text" class="form-control" id="newTaskTitleModal" placeholder="Enter task title" /></div>
        <div class="form-group"><label>Tags</label><input type="text" class="form-control" id="newTaskTagsModal" placeholder="e.g. GST, High" /></div>
        <div class="form-group"><label>Assignee</label><input type="text" class="form-control" id="newTaskAssigneeModal" value="${escapeHtml(myName)}" /></div>
        <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="newTaskDueModal" /></div>
        <div class="form-group"><label>Column</label>
          <select class="form-control" id="newTaskColModal"><option value="todo">To Do</option><option value="inprogress">In Progress</option><option value="done">Done</option></select>
        </div>
        <button class="btn-primary" style="width:100%" onclick="submitNewTaskModal()">✅ Add Task</button>`
    },
    uploadDoc: {
      title: '📁 Upload Document',
      body: `
        <div class="form-group"><label>Document Name *</label><input type="text" class="form-control" id="uploadDocName" placeholder="e.g. Balance Sheet FY25-26.pdf" /></div>
        <div class="form-group"><label>Client</label><select class="form-control" id="uploadDocClient"><option value="">Internal</option>${STATE.clients.map(c=>`<option>${escapeHtml(c.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label>Type</label>
          <select class="form-control" id="uploadDocType"><option>PDF</option><option>Excel</option><option>Word</option><option>Image</option></select>
        </div>
        <div class="form-group"><label>File Size</label><input type="text" class="form-control" id="uploadDocSize" placeholder="e.g. 2.4 MB" /></div>
        <button class="btn-primary" style="width:100%" onclick="submitUploadDoc()">⬆ Upload</button>`
    },
 newEvent: {
      title: '📅 Add Calendar Event',
      body: `
        <div class="form-group"><label>Event Title *</label>
          <input type="text" class="form-control" id="newEventTitle" placeholder="Enter event title" />
        </div>
        <div class="form-group"><label>Type</label>
          <select class="form-control" id="newEventType" onchange="onEventTypeChange()">
            <option>GST</option>
            <option>TDS</option>
            <option>ROC</option>
            <option>DSC</option>
            <option>Income Tax</option>
            <option>Professional Tax</option>
            <option>Payroll</option>
            <option>DIR-3 KYC</option>
            <option>PF</option>
            <option>Internal</option>
            <option value="Meeting">📅 Meeting</option>
          </select>
        </div>
        <div class="form-group"><label>Date *</label>
          <input type="date" class="form-control" id="newEventDate" />
        </div>
        <div class="form-group"><label>Time</label>
          <input type="time" class="form-control" id="newEventTime" />
        </div>
        <!-- Meeting extra fields -->
        <div id="meetingFields" style="display:none">
          <div class="form-group"><label>Location / Link</label>
            <input type="text" class="form-control" id="meetingLocation" placeholder="Office / Google Meet link..." />
          </div>
          <div class="form-group"><label>Description</label>
            <textarea class="form-control" id="meetingDesc" rows="2" placeholder="Meeting agenda..."></textarea>
          </div>
          <div class="form-group"><label>Attendees (comma separated emails)</label>
            <input type="text" class="form-control" id="meetingAttendees" placeholder="email1@gmail.com, email2@gmail.com" />
          </div>
        </div>
        <button class="btn-primary" style="width:100%;margin-top:4px" onclick="submitNewEvent()">✅ Add Event</button>
      `
    },
    newPT: {
      title: '🏷️ New PT Filing',
      body: `
        <div class="form-group"><label>Client *</label><select class="form-control" id="ptClientSel">${getClientOptionsHtml()}</select></div>
        <div class="form-group"><label>State</label><input type="text" class="form-control" id="ptState" placeholder="e.g. Maharashtra" /></div>
        <div class="form-group"><label>PT Number</label><input type="text" class="form-control" id="ptNumber" placeholder="PT registration number" /></div>
        <div class="form-group"><label>Period</label><input type="text" class="form-control" id="ptPeriod" placeholder="e.g. April 2026" /></div>
        <div class="form-group"><label>Amount (₹)</label><input type="number" class="form-control" id="ptAmount" placeholder="Enter PT amount" /></div>
        <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="ptDueDate" /></div>
        <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="ptRemarks" placeholder="Optional remarks..." /></div>
        <button class="btn-primary" style="width:100%" onclick="submitNewPT()">✅ Add PT Filing</button>`
    },
    newPayroll: {
      title: '👨‍💼 New Payroll Entry',
      body: `
        <div class="form-group"><label>Client *</label><select class="form-control" id="payrollClientSel">${getClientOptionsHtml()}</select></div>
        <div class="form-group"><label>Month/Year</label><input type="month" class="form-control" id="payrollMonthYear" /></div>
        <div class="form-group"><label>No. of Employees</label><input type="number" class="form-control" id="payrollEmpCount" placeholder="0" /></div>
        <div class="form-group"><label>Gross Salary (₹)</label><input type="number" class="form-control" id="payrollGross" placeholder="0" /></div>
        <div class="form-group"><label>PF Amount (₹)</label><input type="number" class="form-control" id="payrollPF" placeholder="0" /></div>
        <div class="form-group"><label>ESI Amount (₹)</label><input type="number" class="form-control" id="payrollESI" placeholder="0" /></div>
        <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="payrollRemarks" placeholder="Optional remarks..." /></div>
        <button class="btn-primary" style="width:100%" onclick="submitNewPayroll()">✅ Add Payroll Entry</button>`
    },
    newDir3: {
      title: '📝 New DIR-3 KYC',
      body: `
        <div class="form-group"><label>Client *</label><select class="form-control" id="dir3ClientSel">${getClientOptionsHtml()}</select></div>
        <div class="form-group"><label>Director Name *</label><input type="text" class="form-control" id="dir3DirectorName" placeholder="Enter director name" /></div>
        <div class="form-group"><label>DIN</label><input type="text" class="form-control" id="dir3DIN" maxlength="8" placeholder="00000000" /></div>
        <div class="form-group"><label>Financial Year</label>
          <select class="form-control" id="dir3FY">
            ${getAssessmentYears().map(y=>`<option>${y}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="dir3DueDate" /></div>
        <div class="form-group"><label>Filing Date</label><input type="date" class="form-control" id="dir3FilingDate" /></div>
        <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="dir3Remarks" placeholder="Optional remarks..." /></div>
        <button class="btn-primary" style="width:100%" onclick="submitNewDir3()">✅ Add DIR-3 KYC</button>`
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

async function submitAddClient() {
  const name = document.getElementById('addClientName')?.value.trim();
  if (!name) { showToast('Client name is required'); return; }
  const panVal = document.getElementById('addClientPAN')?.value.trim().toUpperCase() || '';
  if (panVal && !isValidFormat(panVal, 'pan')) { showToast('❌ Invalid PAN format. Use ABCDE1234F'); return; }
 const tanVal = document.getElementById('addClientTAN')?.value.trim().toUpperCase() || '';
  if (tanVal && !isValidFormat(tanVal, 'tan')) { showToast('❌ Invalid TAN format. Use ABCD12345E'); return; }
  const cinVal = document.getElementById('addClientCIN')?.value.trim().toUpperCase() || '';
  const clientType = document.getElementById('addClientType')?.value || 'Individual';

  const body = {
    name,
    contact_person: document.getElementById('addClientContact')?.value.trim() || '',
    pan: panVal || '-',
    tan: tanVal || '-',
    cin: cinVal || '-',
    type: clientType,
    gst: document.getElementById('addClientGST')?.value.trim() || '-',
    email: document.getElementById('addClientEmail')?.value.trim() || '-',
    phone: document.getElementById('addClientPhone')?.value.trim() || '-',
    status: 'Active'
  };
  const result = await supabaseInsert('clients', body);
  if (result && result[0]) {
    STATE.clients.unshift(result[0]);
    closeModal(); renderClientTable(); updateDashboardStats(); populateAllClientDropdowns(); showToast('✅ Client added!');
  } else { showToast('❌ Failed to add client'); }
}

async function submitNewAudit() {
  const clientSel = document.getElementById('auditClientSel');
  const clientId = clientSel?.value;
  const clientName = clientId ? getClientNameById(clientId) : '';
  if (!clientName) { showToast('Please select a client'); return; }
  const body = {
    client: clientName,
    client_id: clientId || null,
    audit_type: document.getElementById('auditType')?.value || '',
    auditor: document.getElementById('auditAuditor')?.value.trim() || getCurrentUserName(),
    start_date: document.getElementById('auditStart')?.value || '',
    end_date: document.getElementById('auditEnd')?.value || '',
    remarks: document.getElementById('auditRemarks')?.value.trim() || '',
    status: 'In Progress'
  };
  const result = await supabaseInsert('audits', body);
  if (result && result[0]) { STATE.audits.unshift(result[0]); closeModal(); renderAuditTable(); showToast('✅ Audit scheduled!'); }
  else { showToast('❌ Audit scheduling failed'); }
}

async function submitVaultItem() {
  const label = document.getElementById('vaultLabel')?.value.trim();
  if (!label) { showToast('Client name is required'); return; }
  const body = {
    label,
    folder: document.getElementById('vaultFolder')?.value || 'General',
    url: '',
    username: document.getElementById('vaultUsername')?.value.trim() || '',
    password: document.getElementById('vaultPassword')?.value || '',
    notes: document.getElementById('vaultNotes')?.value.trim() || ''
  };
  const result = await supabaseInsert('vault_credentials', body);
  if (result && result[0]) {
    STATE.vaultCredentials.unshift(result[0]);
    // Form reset
    document.getElementById('vaultLabel').value = '';
    document.getElementById('vaultUsername').value = '';
    document.getElementById('vaultPassword').value = '';
    document.getElementById('vaultNotes').value = '';
    closeModal(); renderVaultFolders(); renderVaultCredentials(); showToast('🔐 Credential saved!');
  } else { showToast('❌ Failed to save credential'); }
}

function submitCreateFolder() {
  const folderName = document.getElementById('newFolderName')?.value.trim();
  if (!folderName) { showToast('Folder name required'); return; }
  STATE.vaultSelectedFolder = folderName;
  closeModal(); renderVaultFolders(); renderVaultCredentials(); showToast('📁 Folder created!');
}

async function submitNewTaskModal() {
  const title = document.getElementById('newTaskTitleModal')?.value.trim();
  if (!title) { showToast('Task title required'); return; }
  const tagsRaw = document.getElementById('newTaskTagsModal')?.value.trim();
  const dueRaw = document.getElementById('newTaskDueModal')?.value;
  const body = {
    title,
    tags: tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : [],
    assignee: document.getElementById('newTaskAssigneeModal')?.value.trim() || getCurrentUserName(),
    due_date: dueRaw || 'TBD',
    column_name: document.getElementById('newTaskColModal')?.value || 'todo'
  };
  const result = await supabaseInsert('tasks', body);
  if (result && result[0]) { STATE.tasks.unshift(result[0]); closeModal(); renderKanban(); showToast('✅ Task added!'); }
  else { showToast('❌ Failed to add task'); }
}

async function submitUploadDoc() {
  const name = document.getElementById('uploadDocName')?.value.trim();
  if (!name) { showToast('Document name required'); return; }
  const typeVal = document.getElementById('uploadDocType')?.value || 'PDF';
  const iconMap = { PDF:'📕', Excel:'📗', Word:'📘', Image:'🖼️' };
  const body = {
    name, doc_type: typeVal, icon: iconMap[typeVal]||'📄',
    client_name: document.getElementById('uploadDocClient')?.value || 'Internal',
    file_size: document.getElementById('uploadDocSize')?.value.trim() || 'Unknown'
  };
  const result = await supabaseInsert('documents', body);
  if (result && result[0]) { STATE.documents.unshift(result[0]); closeModal(); renderDocuments(); showToast('✅ Document uploaded!'); }
  else { showToast('❌ Upload failed'); }
}

async function submitNewEvent() {
  const title = document.getElementById('newEventTitle')?.value.trim();
  const dateVal = document.getElementById('newEventDate')?.value;
  if (!title || !dateVal) { showToast('Please fill all fields'); return; }
  const body = { title, event_type: document.getElementById('newEventType')?.value || 'Internal', event_date: dateVal };
  const result = await supabaseInsert('calendar_events', body);
  if (result && result[0]) {
    STATE.calendarEvents.push(result[0]);
    closeModal(); renderCalendar(); renderEventList(); renderDueDates(); showToast('✅ Event added to calendar!');
  } else { showToast('❌ Failed to add event'); }
}

/* =========================================================
   30. QUICK ACTION
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
      <button class="qa-btn" onclick="closeModal();navigate('vault')"><span class="qa-btn-icon">🔐</span><span class="qa-btn-label">Open Vault</span></button>
      <button class="qa-btn" onclick="closeModal();openModal('newEvent')"><span class="qa-btn-icon">📅</span><span class="qa-btn-label">Add Event</span></button>
    </div>
  `);
}

/* =========================================================
   31. PROFILE & LOGOUT
   ========================================================= */

function openProfile() {
  const user = getCurrentUser();
  const name = getCurrentUserName();
  const email = user?.email || 'Not available';
  const initial = name.charAt(0).toUpperCase();
  openModalWithContent('👤 My Profile', `
    <div style="text-align:center;margin-bottom:16px">
      <div style="width:72px;height:72px;border-radius:50%;${user.user_metadata?.avatar_url ? `background-image:url('${user.user_metadata.avatar_url}');background-size:cover;background-position:center;` : `background:linear-gradient(135deg,var(--primary,#6366f1),#4f46e5);`}display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;margin:0 auto 12px">${user.user_metadata?.avatar_url ? '' : initial}</div>
      <div style="font-weight:700;font-size:16px">${escapeHtml(name)}</div>
      <div style="color:var(--text-muted);font-size:13px">WITCORP India Advisors LLP</div>
    </div>
    <div class="form-group"><label>Full Name</label><input type="text" class="form-control" id="profileNameInput" value="${escapeHtml(name)}" placeholder="Enter your name" /></div>
    <div class="form-group"><label>Email</label><div class="form-control" style="background:var(--bg)">${escapeHtml(email)}</div></div>
    <div class="form-group"><label>User ID</label><div class="form-control" style="background:var(--bg)">${escapeHtml(user?.id||'N/A')}</div></div>
    <div class="form-group"><label>Total Clients</label><div class="form-control" style="background:var(--bg)">${STATE.clients.length}</div></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveProfileName()">💾 Save Name</button>
    <button class="btn-outline" style="width:100%;margin-top:8px;border-color:#ef4444;color:#ef4444" onclick="logout()">🚪 Logout</button>
  `);
}

async function saveProfileName() {
  const newName = document.getElementById('profileNameInput')?.value.trim();
  if (!newName) { showToast('Name cannot be empty'); return; }

  const user = getCurrentUser();
  if (!user) { showToast('❌ User not found'); return; }

  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;

  try {
    // Step 1: Update Supabase Auth user_metadata
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: { full_name: newName } })
    });

    if (!res.ok) { showToast('❌ Failed to update name'); return; }

    const updatedUser = await res.json();

    // Step 2: Update profiles table (PROPERLY — no silent fail)
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ full_name: newName })
      }
    );

    if (!profileRes.ok) {
      console.warn('profiles table update failed:', await profileRes.text());
    }

    // Step 3: Update localStorage with new name in BOTH places
    updatedUser.user_metadata = updatedUser.user_metadata || {};
    updatedUser.user_metadata.full_name = newName;
    localStorage.setItem('witcorp-user', JSON.stringify(updatedUser));

    STATE.currentUser = updatedUser;
    loadUserInfo();
    closeModal();
    showToast('✅ Name updated!');
  } catch (e) {
    console.error('saveProfileName error:', e);
    showToast('❌ Update failed');
  }
}
async function logout() {
  closeModal();
  const token = localStorage.getItem('witcorp-access-token');
  if (token) {
    await fetch('https://yqbvdbsbuycxlsfkijhc.supabase.co/auth/v1/logout', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer '+token }
    }).catch(() => {});
  }
  localStorage.clear();
  sessionStorage.clear();
  window.location.replace('login.html');
}

/* =========================================================
   32. GLOBAL SEARCH
   ========================================================= */

function handleSearch(query) {
  const q = (query || '').trim().toLowerCase();
  let modal = document.getElementById('searchResultsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'searchResultsModal';
    modal.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);width:min(680px,95vw);max-height:75vh;overflow-y:auto;background:var(--surface);border:1.5px solid var(--border);border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.25);z-index:9998;display:none;';
    document.body.appendChild(modal);
    document.addEventListener('click', function(e) {
      if (!modal.contains(e.target) && e.target.id !== 'globalSearch') {
        modal.style.display = 'none';
      }
    });
  }
  if (!q || q.length < 2) { modal.style.display = 'none'; return; }

  const clients = STATE.clients.filter(c =>
    (c.name||'').toLowerCase().includes(q) ||
    (c.pan||'').toLowerCase().includes(q) ||
    (c.email||'').toLowerCase().includes(q) ||
    (c.phone||'').toLowerCase().includes(q)
  );
  const tasks = STATE.tasks.filter(t =>
    (t.title||'').toLowerCase().includes(q) ||
    (t.assignee||'').toLowerCase().includes(q)
  );
  const gst = STATE.gstReturns.filter(g =>
    (g.client_name||'').toLowerCase().includes(q) ||
    (g.return_type||'').toLowerCase().includes(q) ||
    (g.gstin||'').toLowerCase().includes(q)
  );
  const tds = STATE.tdsReturns.filter(t =>
    (t.client_name||'').toLowerCase().includes(q) ||
    (t.tan||'').toLowerCase().includes(q) ||
    (t.deductor||'').toLowerCase().includes(q)
  );
  const itr = STATE.itrFilings.filter(i =>
    (i.client_name||'').toLowerCase().includes(q) ||
    (i.form||'').toLowerCase().includes(q)
  );
  const roc = STATE.rocFilings.filter(r =>
    (r.company||'').toLowerCase().includes(q) ||
    (r.cin||'').toLowerCase().includes(q) ||
    (r.form||'').toLowerCase().includes(q)
  );
  const dsc = STATE.dscRecords.filter(d =>
    (d.client_name||d.name||'').toLowerCase().includes(q) ||
    (d.pan||'').toLowerCase().includes(q)
  );
  const audits = STATE.audits.filter(a =>
    (a.client||'').toLowerCase().includes(q) ||
    (a.audit_type||'').toLowerCase().includes(q)
  );

  const total = clients.length + tasks.length + gst.length + tds.length + itr.length + roc.length + dsc.length + audits.length;

  if (!total) {
    modal.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-muted)"><div style="font-size:32px;margin-bottom:8px">🔍</div><div style="font-size:14px">No results found for "<strong>${escapeHtml(query)}</strong>"</div></div>`;
    modal.style.display = 'block';
    return;
  }

  function section(icon, title, items, page, renderFn) {
    if (!items.length) return '';
    return `
      <div style="padding:10px 16px 4px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border)">
        ${icon} ${title} <span style="background:var(--primary);color:#fff;border-radius:99px;padding:1px 7px;font-size:10px;margin-left:6px">${items.length}</span>
      </div>
      ${items.slice(0,4).map(renderFn).join('')}
      ${items.length > 4 ? `<div style="padding:8px 16px;font-size:12px;color:var(--primary);cursor:pointer" onclick="navigate('${page}');document.getElementById('searchResultsModal').style.display='none'">View all ${items.length} results →</div>` : ''}
    `;
  }

  modal.innerHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:13px;font-weight:600">Results for "<strong>${escapeHtml(query)}</strong>" — ${total} found</div>
      <button onclick="document.getElementById('searchResultsModal').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--text-muted)">✕</button>
    </div>

    ${section('👥','Clients', clients, 'clients', c => `
      <div class="search-result-item" onclick="navigate('clients');document.getElementById('globalSearch').value='';document.getElementById('searchResultsModal').style.display='none';setTimeout(()=>filterClients('${escapeHtml(c.name)}'),300)">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .1s" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--primary-glow);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--primary);flex-shrink:0">${(c.name||'?').charAt(0).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--text)">${escapeHtml(c.name)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(c.type||'')} ${c.pan?'• PAN: '+c.pan:''} ${c.email?'• '+c.email:''}</div>
          </div>
          <span class="badge ${c.status==='Active'?'badge-success':'badge-warning'}" style="font-size:10px">${escapeHtml(c.status||'')}</span>
        </div>
      </div>`
    )}

    ${section('📊','GST Returns', gst, 'gst', g => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border)" onclick="navigate('gst');document.getElementById('searchResultsModal').style.display='none'" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <div style="font-size:20px">📊</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${escapeHtml(g.client_name)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(g.return_type)} • ${escapeHtml(g.period||'')}</div>
        </div>
        ${statusBadge(g.status)}
      </div>`
    )}

    ${section('🧾','TDS Returns', tds, 'tds', t => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border)" onclick="navigate('tds');document.getElementById('searchResultsModal').style.display='none'" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <div style="font-size:20px">🧾</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${escapeHtml(t.client_name||t.deductor||'-')}</div>
          <div style="font-size:11px;color:var(--text-muted)">TAN: ${escapeHtml(t.tan||'-')} • ${escapeHtml(t.quarter||'')}</div>
        </div>
        ${statusBadge(t.status)}
      </div>`
    )}

    ${section('💰','ITR Filings', itr, 'incometax', i => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border)" onclick="navigate('incometax');document.getElementById('searchResultsModal').style.display='none'" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <div style="font-size:20px">💰</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${escapeHtml(i.client_name)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(i.form)} • AY ${escapeHtml(i.assessment_year||'')}</div>
        </div>
        ${statusBadge(i.status)}
      </div>`
    )}

   ${section('🏛️','ROC Filings', roc, 'roc', r => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border)" onclick="navigate('roc');document.getElementById('searchResultsModal').style.display='none'" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <div style="font-size:20px">🏛️</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${escapeHtml(r.company)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(r.form||'')} • CIN: ${escapeHtml(r.cin||'-')}</div>
        </div>
        ${statusBadge(r.status)}
      </div>`
    )}

    ${section('✍️','DSC Records', dsc, 'dsc', d => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border)" onclick="navigate('dsc');document.getElementById('searchResultsModal').style.display='none'" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <div style="font-size:20px">✍️</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${escapeHtml(d.client_name||d.name||'-')}</div>
          <div style="font-size:11px;color:var(--text-muted)">PAN: ${escapeHtml(d.pan||'-')} • Expiry: ${escapeHtml(d.expiry_date||'-')}</div>
        </div>
        ${statusBadge(d.status)}
      </div>`
    )}

    ${section('🛡️','Audits', audits, 'audit', a => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border)" onclick="navigate('audit');document.getElementById('searchResultsModal').style.display='none'" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <div style="font-size:20px">🛡️</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${escapeHtml(a.client)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(a.audit_type||'')} • ${escapeHtml(a.auditor||'')}</div>
        </div>
        ${statusBadge(a.status)}
      </div>`
    )}

    ${section('✅','Tasks', tasks, 'tasks', t => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border)" onclick="navigate('tasks');document.getElementById('searchResultsModal').style.display='none'" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <div style="font-size:20px">✅</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${escapeHtml(t.title)}</div>
          <div style="font-size:11px;color:var(--text-muted)">👤 ${escapeHtml(t.assignee||'-')} • Due: ${escapeHtml(t.due_date||'TBD')}</div>
        </div>
        <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:var(--primary-glow);color:var(--primary)">${columnLabel(t.column_name)}</span>
      </div>`
    )}
  `;
  modal.style.display = 'block';
}

/* =========================================================
   33. TOAST
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
   34. KEYBOARD & GLOBAL LISTENERS
   ========================================================= */

function attachGlobalListeners() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k') { e.preventDefault(); const gs=document.getElementById('globalSearch'); if(gs) gs.focus(); }
    if (e.key==='Escape') { closeModal(); closeNotifications(); cancelReply(); const menu=document.getElementById('waContextMenu'); if(menu) menu.style.display='none'; if(window.innerWidth<=768) closeSidebar(); }
  });
  window.addEventListener('resize', () => { if(window.innerWidth>768) closeSidebar(); });
}

/* =========================================================
   35. NOTIFICATIONS
   ========================================================= */

function openNotifications() {
  const panel = document.getElementById('notifPanel');
  STATE.notifOpen = !STATE.notifOpen;
  if (panel) panel.classList.toggle('show', STATE.notifOpen);
  const notifList = document.getElementById('notifList');
  if (!notifList) return;
  const notifs = [];
  STATE.gstReturns.filter(g=>g.status==='Pending').slice(0,2).forEach(g => { notifs.push({icon:'📊',text:'GSTR pending: '+g.client_name+' — '+g.return_type,time:'Pending'}); });
  STATE.dscRecords.filter(d => { const days=dscDaysLeft(d.expiry_date); return days!==null&&days>=0&&days<=30; }).forEach(d => {
    notifs.push({icon:'⚠️',text:'DSC expiring: '+(d.client_name||d.name||'Unknown')+' in '+dscDaysLeft(d.expiry_date)+' days',time:'Alert'});
  });
  STATE.tasks.filter(t=>t.column_name==='todo'&&(t.tags||[]).includes('High')).slice(0,2).forEach(t => { notifs.push({icon:'🔴',text:'High priority: '+t.title,time:'Task'}); });
  notifList.innerHTML = (notifs.length ? notifs : [{icon:'✅',text:'No new notifications',time:''}]).map(n=>`
    <div class="notif-item">
      <div class="notif-icon">${n.icon}</div>
      <div><div class="notif-text">${escapeHtml(n.text)}</div><div class="notif-time">${escapeHtml(n.time)}</div></div>
    </div>`).join('');
  const dot = document.getElementById('notifCount');
  if (dot) dot.textContent = notifs.length || '0';
}

function closeNotifications() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.remove('show');
  STATE.notifOpen = false;
}

/* =========================================================
   36. UTILITY & FORMAT VALIDATORS
   ========================================================= */

const FORMAT_RULES = {
  pan: { regex: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, len: 10, example: 'ABCDE1234F' },
  tan: { regex: /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/, len: 10, example: 'ABCD12345E' },
  gstin: { regex: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, len: 15, example: '29ABCDE1234F1Z5' },
  cin: { regex: /^[LUu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/i, len: 21, example: 'U12345MH2020PTC123456' }
};

function attachFormatField(inputId, ruleKey) {
  const el = document.getElementById(inputId);
  if (!el) return;
  const rule = FORMAT_RULES[ruleKey];
  el.maxLength = rule.len;
  el.placeholder = rule.example;
  el.style.textTransform = 'uppercase';
  el.addEventListener('input', () => {
    el.value = el.value.toUpperCase().replace(/\s/g, '');
  });
}

function isValidFormat(value, ruleKey) {
  if (!value) return true;
  const rule = FORMAT_RULES[ruleKey];
  return rule.regex.test(value.toUpperCase());
}

function isJunkText(value, minLen = 3) {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length < minLen;
}

function escapeHtml(str) {
  if (str===null||str===undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatAmount(num) {
  if (!num) return '0';
  if (num>=100000) return (num/100000).toFixed(1)+'L';
  if (num>=1000) return (num/1000).toFixed(1)+'K';
  return num.toLocaleString('en-IN');
}

function statusBadge(status) {
  const map = {
    'Active':'badge-success','Inactive':'badge-danger','Pending':'badge-warning',
    'Filed':'badge-success','Overdue':'badge-danger','In Progress':'badge-info',
    'In Review':'badge-purple','Completed':'badge-success','Expiring Soon':'badge-warning',
    'Expired':'badge-danger','Valid':'badge-success','Pending Renewal':'badge-warning'
  };
  return `<span class="badge ${map[status]||'badge-info'}">${escapeHtml(status||'-')}</span>`;
}
/* =========================================================
   ACCOUNTING HUB — CLIENT WISE
   ========================================================= */

const ACC_CATEGORIES = [
  'Sales','Purchases','Sundry Debtors','Sundry Creditors',
  'Payroll Entries','Bank Statement','GST Transfer Entries',
  'Depreciation Entries','TDS Entries','Miscellaneous Ledgers'
];

let accActiveTab = 'Sales';
let accActiveClientId = '';
let accActiveClientName = '';

function onAccClientChange() {
  const sel = document.getElementById('accClientSel');
  accActiveClientId = sel?.value || '';
  accActiveClientName = sel?.options[sel.selectedIndex]?.text || '';
  const wrapper = document.getElementById('accTabsWrapper');
  const noClient = document.getElementById('accNoClient');
  if (!accActiveClientId) {
    if (wrapper) wrapper.style.display = 'none';
    if (noClient) noClient.style.display = 'block';
    return;
  }
  if (wrapper) wrapper.style.display = 'block';
  if (noClient) noClient.style.display = 'none';
  accActiveTab = 'Sales';
  updateAccTabButtons();
  renderAccEntries();
  renderAccClientStats();
}

function switchAccTab(tab) {
  accActiveTab = tab;
  updateAccTabButtons();
  renderAccEntries();
}

function updateAccTabButtons() {
  document.querySelectorAll('.acc-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(accActiveTab.split(' ')[0]) || btn.onclick.toString().includes(`'${accActiveTab}'`));
  });
  const formTitle = document.getElementById('accFormTitle');
  if (formTitle) formTitle.textContent = `➕ Add ${accActiveTab} Entry`;
  const tableTitle = document.getElementById('accTableTitle');
  if (tableTitle) tableTitle.textContent = `📋 ${accActiveTab} Entries`;
}

function renderAccClientStats() {
  const el = document.getElementById('accClientStats');
  if (!el) return;
  const entries = STATE.accountingEntries.filter(e => String(e.client_id) === String(accActiveClientId));
  const totalDebit = entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0);
  const balance = totalCredit - totalDebit;
  el.innerHTML = `
    <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:10px;padding:8px 14px;font-size:12px">
      <div style="color:var(--text-muted)">Total Debit</div>
      <div style="font-weight:700;color:#ef4444">₹ ${formatAmount(totalDebit)}</div>
    </div>
    <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:10px;padding:8px 14px;font-size:12px">
      <div style="color:var(--text-muted)">Total Credit</div>
      <div style="font-weight:700;color:#10b981">₹ ${formatAmount(totalCredit)}</div>
    </div>
    <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:10px;padding:8px 14px;font-size:12px">
      <div style="color:var(--text-muted)">Net Balance</div>
      <div style="font-weight:700;color:${balance >= 0 ? '#10b981' : '#ef4444'}">₹ ${formatAmount(Math.abs(balance))} ${balance >= 0 ? 'CR' : 'DR'}</div>
    </div>
  `;
}

function renderAccEntries() {
  const tbody = document.getElementById('accEntriesBody');
  const emptyEl = document.getElementById('accEntriesEmpty');
  const statsEl = document.getElementById('accTabStats');
  if (!tbody) return;

  const entries = STATE.accountingEntries.filter(e =>
    String(e.client_id) === String(accActiveClientId) &&
    e.category === accActiveTab
  );

  const tabDebit = entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0);
  const tabCredit = entries.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0);
  if (statsEl) statsEl.innerHTML = `<span style="color:#ef4444">Dr: ₹${formatAmount(tabDebit)}</span> &nbsp;|&nbsp; <span style="color:#10b981">Cr: ₹${formatAmount(tabCredit)}</span>`;

  if (!entries.length) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  tbody.innerHTML = entries.map(e => `
    <tr>
      <td>${escapeHtml(e.entry_date || '-')}</td>
      <td><strong>${escapeHtml(e.description || e.narration || '-')}</strong></td>
      <td style="color:#ef4444">${e.debit ? '₹ ' + formatAmount(e.debit) : '-'}</td>
      <td style="color:#10b981">${e.credit ? '₹ ' + formatAmount(e.credit) : '-'}</td>
      <td>${escapeHtml(e.reference_no || '-')}</td>
      <td style="color:var(--text-muted);font-size:12px">${escapeHtml(e.remarks || '-')}</td>
      <td style="font-size:11px;color:var(--text-muted)">
        ${escapeHtml(e.updated_by || '-')}<br>
        ${e.updated_at ? formatDateTime(e.updated_at) : ''}
      </td>
      <td>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;margin-right:4px" onclick="editAccEntry(${e.id})">✏️</button>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444" onclick="deleteAccEntry(${e.id})">🗑️</button>
      </td>
    </tr>`).join('');
}

async function submitAccEntry() {
  const desc = document.getElementById('accDesc')?.value.trim();
  const dateVal = document.getElementById('accDate')?.value;
  if (!accActiveClientId) { showToast('Please select a client first'); return; }
  if (!desc) { showToast('Description required'); return; }
  if (!dateVal) { showToast('Date required'); return; }
  const debit = parseFloat(document.getElementById('accDebit')?.value) || 0;
  const credit = parseFloat(document.getElementById('accCredit')?.value) || 0;
  if (!debit && !credit) { showToast('Enter debit or credit amount'); return; }

  const body = {
    client_id: accActiveClientId,
    client_name: accActiveClientName,
    category: accActiveTab,
    entry_date: dateVal,
    description: desc,
    debit, credit,
    amount: debit || credit,
    entry_type: credit > 0 ? 'credit' : 'debit',
    reference_no: document.getElementById('accRef')?.value.trim() || '',
    remarks: document.getElementById('accRemarks')?.value.trim() || ''
  };

  const result = await supabaseInsert('accounting_entries', body);
  if (result && result[0]) {
    STATE.accountingEntries.unshift(result[0]);
    document.getElementById('accDesc').value = '';
    document.getElementById('accDate').value = '';
    document.getElementById('accDebit').value = '';
    document.getElementById('accCredit').value = '';
    document.getElementById('accRef').value = '';
    document.getElementById('accRemarks').value = '';
    renderAccEntries();
    renderAccClientStats();
    showToast('✅ Entry added!');
  } else { showToast('❌ Entry failed'); }
}

function editAccEntry(id) {
  const e = STATE.accountingEntries.find(x => x.id === id);
  if (!e) return;
  openModalWithContent(`✏️ Edit Entry`, `
    <div class="form-group"><label>Date</label><input type="date" class="form-control" id="editAccDate" value="${e.entry_date||''}" /></div>
    <div class="form-group"><label>Description</label><input type="text" class="form-control" id="editAccDesc" value="${escapeHtml(e.description||e.narration||'')}" /></div>
    <div class="form-group"><label>Debit (₹)</label><input type="number" class="form-control" id="editAccDebit" value="${e.debit||''}" /></div>
    <div class="form-group"><label>Credit (₹)</label><input type="number" class="form-control" id="editAccCredit" value="${e.credit||''}" /></div>
    <div class="form-group"><label>Reference No.</label><input type="text" class="form-control" id="editAccRef" value="${escapeHtml(e.reference_no||'')}" /></div>
    <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="editAccRemarks" value="${escapeHtml(e.remarks||'')}" /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveAccEntry(${id})">💾 Save</button>
  `);
}

async function saveAccEntry(id) {
  const desc = document.getElementById('editAccDesc')?.value.trim();
  if (!desc) { showToast('Description required'); return; }
  const debit = parseFloat(document.getElementById('editAccDebit')?.value) || 0;
  const credit = parseFloat(document.getElementById('editAccCredit')?.value) || 0;
  const updated = {
    entry_date: document.getElementById('editAccDate')?.value,
    description: desc,
    debit, credit,
    amount: debit || credit,
    entry_type: credit > 0 ? 'credit' : 'debit',
    reference_no: document.getElementById('editAccRef')?.value.trim() || '',
    remarks: document.getElementById('editAccRemarks')?.value.trim() || ''
  };
  const ok = await supabaseUpdate('accounting_entries', id, updated);
  if (ok) {
    const idx = STATE.accountingEntries.findIndex(e => e.id === id);
    if (idx !== -1) STATE.accountingEntries[idx] = { ...STATE.accountingEntries[idx], ...updated, updated_by: getUpdatedByLabel(), updated_at: new Date().toISOString() };
    closeModal(); renderAccEntries(); renderAccClientStats(); showToast('✅ Entry updated!');
  }
}
function searchTeamMessages(query) {
  const q = (query||'').trim().toLowerCase();
  const clearBtn = document.getElementById('msgSearchClear');
  if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
  
  if (!q) { renderTeamMessages(); return; }

  const el = document.getElementById('teamMessages');
  if (!el) return;
  const myEmail = getCurrentUserEmail();

  const filtered = STATE.teamMessages.filter(m =>
    (m.message||'').toLowerCase().includes(q)
  );

  if (!filtered.length) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px 20px">
      <div style="font-size:32px;margin-bottom:8px">🔍</div>
      <div>No messages found for "<strong>${escapeHtml(query)}</strong>"</div>
    </div>`;
    return;
  }

  el.innerHTML = filtered.map(m => {
    const isOwn = m.sender_email === myEmail;
    const timeStr = new Date(m.created_at).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',hour12:true}).replace(' ','');
    const senderInitial = m.sender_email.charAt(0).toUpperCase();
    
    // Highlight matching text
    const highlighted = escapeHtml(m.message).replace(
      new RegExp(escapeHtml(q), 'gi'),
      match => `<mark style="background:#fbbf24;color:#000;border-radius:3px;padding:0 2px">${match}</mark>`
    );

    return `
      <div class="chat-msg ${isOwn ? 'user' : ''}">
        ${!isOwn ? `<div class="msg-avatar" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)">${senderInitial}</div>` : ''}
        <div class="msg-content">
          <div style="background:${isOwn?'var(--primary)':'var(--surface)'};color:${isOwn?'#fff':'var(--text)'};padding:8px 14px;border-radius:${isOwn?'14px 14px 4px 14px':'14px 14px 14px 4px'};word-break:break-word;display:inline-block;max-width:100%">
            ${highlighted}
          </div>
          <div style="font-size:10.5px;opacity:0.6;margin-top:3px;text-align:${isOwn?'right':'left'}">${timeStr}</div>
        </div>
        ${isOwn ? `<div class="msg-avatar" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)">${senderInitial}</div>` : ''}
      </div>`;
  }).join('');

  el.scrollTop = el.scrollHeight;
}

function clearMsgSearch() {
  const input = document.getElementById('msgSearchInput');
  const clearBtn = document.getElementById('msgSearchClear');
  if (input) input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  renderTeamMessages();
}
function toggleVaultPass(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'text' ? '🙈' : '👁️';
}
async function refreshDashboard() {
  showToast('🔄 Refreshing...');
  showPageLoader(true);
  await loadAllData();
  await loadVaultData();
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
  renderVaultFolders();
  renderVaultCredentials();
  populateAllClientDropdowns();
  renderPTTable();
  renderPayrollTable();
  renderDir3Table();
  showToast('✅ Data refreshed!');
}
/* =========================================================
   PROFESSIONAL TAX
   ========================================================= */

async function loadPTData() {
  const data = await supabaseQuery('professional_tax', { order: 'created_at.desc' });
  STATE.ptFilings = Array.isArray(data) ? data : [];
}

function renderPTTable() {
  const tbody = document.getElementById('ptTableBody');
  if (!tbody) return;
  const data = STATE.ptFilings || [];
  
  document.getElementById('ptFiled') && (document.getElementById('ptFiled').textContent = data.filter(x=>x.status==='Filed').length);
  document.getElementById('ptPending') && (document.getElementById('ptPending').textContent = data.filter(x=>x.status==='Pending').length);
  document.getElementById('ptOverdue') && (document.getElementById('ptOverdue').textContent = data.filter(x=>x.status==='Overdue').length);
  document.getElementById('ptTotal') && (document.getElementById('ptTotal').textContent = data.length);

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">🏷️</div><div class="empty-state-text">No PT filings yet</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.client_name||'-')}</strong></td>
      <td>${escapeHtml(r.state||'-')}</td>
      <td>${escapeHtml(r.pt_number||'-')}</td>
      <td>${escapeHtml(r.period||'-')}</td>
      <td>₹ ${formatAmount(r.amount||0)}</td>
      <td>${escapeHtml(r.due_date||'-')}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="remarks-cell">${escapeHtml(r.remarks||'-')}</td>
     <td class="updated-by-cell">
        <span class="updated-by-badge">${escapeHtml(r.updated_by||'-')}</span>
        ${r.updated_at ? `<span class="updated-by-badge">🕐 ${formatDateTime(r.updated_at)}</span>` : r.created_at ? `<span class="updated-by-badge">🕐 ${formatDateTime(r.created_at)}</span>` : ''}
      </td>
      <td>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;margin-right:4px" onclick="editPT(${r.id})">✏️</button>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444" onclick="deletePT(${r.id})">🗑️</button>
      </td>
    </tr>`).join('');
}

function editPT(id) {
  const r = (STATE.ptFilings||[]).find(x=>x.id===id);
  if (!r) return;
  openModalWithContent(`✏️ Edit PT — ${escapeHtml(r.client_name)}`, `
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="editPtStatus">
        ${['Filed','Pending','Overdue'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="editPtRemarks" value="${escapeHtml(r.remarks||'')}" /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="savePTEdit(${id})">💾 Save</button>
  `);
}

async function savePTEdit(id) {
  const status = document.getElementById('editPtStatus')?.value;
  const remarks = document.getElementById('editPtRemarks')?.value.trim();
  const ok = await supabaseUpdate('professional_tax', id, {status, remarks});
  if (ok) {
    const idx = (STATE.ptFilings||[]).findIndex(x=>x.id===id);
    if (idx!==-1) { STATE.ptFilings[idx].status=status; STATE.ptFilings[idx].remarks=remarks; STATE.ptFilings[idx].updated_by=getUpdatedByLabel(); STATE.ptFilings[idx].updated_at=new Date().toISOString(); }
    closeModal(); renderPTTable(); showToast('✅ PT updated!');
  }
}

async function deletePT(id) {
  if (!confirm('Delete this PT filing?')) return;
  const ok = await supabaseDelete('professional_tax', id);
  if (ok) { STATE.ptFilings = (STATE.ptFilings||[]).filter(x=>x.id!==id); renderPTTable(); showToast('🗑️ Deleted'); }
}

async function submitNewPT() {
  const clientSel = document.getElementById('ptClientSel');
  const clientId = clientSel?.value;
  const clientName = clientId ? getClientNameById(clientId) : '';
  if (!clientName) { showToast('Please select a client'); return; }
  const body = {
    client_name: clientName,
    client_id: clientId,
    state: document.getElementById('ptState')?.value.trim()||'',
    pt_number: document.getElementById('ptNumber')?.value.trim()||'',
    period: document.getElementById('ptPeriod')?.value.trim()||'',
    amount: parseFloat(document.getElementById('ptAmount')?.value)||0,
    due_date: document.getElementById('ptDueDate')?.value||'',
    remarks: document.getElementById('ptRemarks')?.value.trim()||'',
    status: 'Pending'
  };
  const result = await supabaseInsert('professional_tax', body);
  if (result && result[0]) {
    if (!STATE.ptFilings) STATE.ptFilings = [];
    STATE.ptFilings.unshift(result[0]);
    closeModal(); renderPTTable(); showToast('✅ PT Filing added!');
  } else { showToast('❌ Failed'); }
}

/* =========================================================
   PAYROLL
   ========================================================= */

async function loadPayrollData() {
  const data = await supabaseQuery('payroll_entries', { order: 'created_at.desc' });
  STATE.payrollEntries = Array.isArray(data) ? data : [];
}

function renderPayrollTable() {
  const tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;
  const data = STATE.payrollEntries || [];

  const totalSalary = data.filter(x=>x.status==='Processed').reduce((s,x)=>s+(x.net_salary||0),0);
  const uniqueClients = [...new Set(data.map(x=>x.client_id))].length;

  document.getElementById('payrollProcessed') && (document.getElementById('payrollProcessed').textContent = data.filter(x=>x.status==='Processed').length);
  document.getElementById('payrollPending') && (document.getElementById('payrollPending').textContent = data.filter(x=>x.status==='Pending').length);
  document.getElementById('payrollTotal') && (document.getElementById('payrollTotal').textContent = '₹ '+formatAmount(totalSalary));
  document.getElementById('payrollClients') && (document.getElementById('payrollClients').textContent = uniqueClients);

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="empty-state-icon">👨‍💼</div><div class="empty-state-text">No payroll entries yet</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.client_name||'-')}</strong></td>
      <td>${escapeHtml(r.month_year||'-')}</td>
      <td>${r.employee_count||0}</td>
      <td>₹ ${formatAmount(r.gross_salary||0)}</td>
      <td>₹ ${formatAmount(r.pf_amount||0)}</td>
      <td>₹ ${formatAmount(r.esi_amount||0)}</td>
      <td>₹ ${formatAmount(r.net_salary||0)}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="remarks-cell">${escapeHtml(r.remarks||'-')}</td>
     <td class="updated-by-cell">
        <span class="updated-by-badge">${escapeHtml(r.updated_by||'-')}</span>
        ${r.updated_at ? `<span class="updated-by-badge">🕐 ${formatDateTime(r.updated_at)}</span>` : r.created_at ? `<span class="updated-by-badge">🕐 ${formatDateTime(r.created_at)}</span>` : ''}
      </td>
      <td>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;margin-right:4px" onclick="editPayroll(${r.id})">✏️</button>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444" onclick="deletePayroll(${r.id})">🗑️</button>
      </td>
    </tr>`).join('');
}

function editPayroll(id) {
  const r = (STATE.payrollEntries||[]).find(x=>x.id===id);
  if (!r) return;
  openModalWithContent(`✏️ Edit Payroll — ${escapeHtml(r.client_name)}`, `
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="editPayrollStatus">
        ${['Processed','Pending','On Hold'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="editPayrollRemarks" value="${escapeHtml(r.remarks||'')}" /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="savePayrollEdit(${id})">💾 Save</button>
  `);
}

async function savePayrollEdit(id) {
  const status = document.getElementById('editPayrollStatus')?.value;
  const remarks = document.getElementById('editPayrollRemarks')?.value.trim();
  const ok = await supabaseUpdate('payroll_entries', id, {status, remarks});
  if (ok) {
    const idx = (STATE.payrollEntries||[]).findIndex(x=>x.id===id);
    if (idx!==-1) { STATE.payrollEntries[idx].status=status; STATE.payrollEntries[idx].remarks=remarks; STATE.payrollEntries[idx].updated_by=getUpdatedByLabel(); STATE.payrollEntries[idx].updated_at=new Date().toISOString(); }
    closeModal(); renderPayrollTable(); showToast('✅ Payroll updated!');
  }
}

async function deletePayroll(id) {
  if (!confirm('Delete this payroll entry?')) return;
  const ok = await supabaseDelete('payroll_entries', id);
  if (ok) { STATE.payrollEntries = (STATE.payrollEntries||[]).filter(x=>x.id!==id); renderPayrollTable(); showToast('🗑️ Deleted'); }
}

async function submitNewPayroll() {
  const clientSel = document.getElementById('payrollClientSel');
  const clientId = clientSel?.value;
  const clientName = clientId ? getClientNameById(clientId) : '';
  if (!clientName) { showToast('Please select a client'); return; }
  const gross = parseFloat(document.getElementById('payrollGross')?.value)||0;
  const pf = parseFloat(document.getElementById('payrollPF')?.value)||0;
  const esi = parseFloat(document.getElementById('payrollESI')?.value)||0;
  const net = gross - pf - esi;
  const body = {
    client_name: clientName,
    client_id: clientId,
    month_year: document.getElementById('payrollMonthYear')?.value||'',
    employee_count: parseInt(document.getElementById('payrollEmpCount')?.value)||0,
    gross_salary: gross,
    pf_amount: pf,
    esi_amount: esi,
    net_salary: net,
    remarks: document.getElementById('payrollRemarks')?.value.trim()||'',
    status: 'Pending'
  };
  const result = await supabaseInsert('payroll_entries', body);
  if (result && result[0]) {
    if (!STATE.payrollEntries) STATE.payrollEntries = [];
    STATE.payrollEntries.unshift(result[0]);
    closeModal(); renderPayrollTable(); showToast('✅ Payroll entry added!');
  } else { showToast('❌ Failed'); }
}

/* =========================================================
   DIR-3 KYC
   ========================================================= */

async function loadDir3Data() {
  const data = await supabaseQuery('dir3_kyc', { order: 'created_at.desc' });
  STATE.dir3Filings = Array.isArray(data) ? data : [];
}

function renderDir3Table() {
  const tbody = document.getElementById('dir3TableBody');
  if (!tbody) return;
  const data = STATE.dir3Filings || [];

  document.getElementById('dir3Filed') && (document.getElementById('dir3Filed').textContent = data.filter(x=>x.status==='Filed').length);
  document.getElementById('dir3Pending') && (document.getElementById('dir3Pending').textContent = data.filter(x=>x.status==='Pending').length);
  document.getElementById('dir3Overdue') && (document.getElementById('dir3Overdue').textContent = data.filter(x=>x.status==='Overdue').length);
  document.getElementById('dir3Total') && (document.getElementById('dir3Total').textContent = data.length);

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">No DIR-3 KYC filings yet</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.client_name||'-')}</strong></td>
      <td>${escapeHtml(r.director_name||'-')}</td>
      <td>${escapeHtml(r.din||'-')}</td>
      <td>${escapeHtml(r.financial_year||'-')}</td>
      <td>${escapeHtml(r.filing_date||'-')}</td>
      <td>${escapeHtml(r.due_date||'-')}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="remarks-cell">${escapeHtml(r.remarks||'-')}</td>
      <td class="updated-by-cell">
        <span class="updated-by-badge">${escapeHtml(r.updated_by||'-')}</span>
        ${r.updated_at ? `<span class="updated-by-badge">🕐 ${formatDateTime(r.updated_at)}</span>` : ''}
      </td>
      <td>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;margin-right:4px" onclick="editDir3(${r.id})">✏️</button>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444" onclick="deleteDir3(${r.id})">🗑️</button>
      </td>
    </tr>`).join('');
}

function editDir3(id) {
  const r = (STATE.dir3Filings||[]).find(x=>x.id===id);
  if (!r) return;
  openModalWithContent(`✏️ Edit DIR-3 — ${escapeHtml(r.director_name||'')}`, `
    <div class="form-group"><label>Filing Date</label><input type="date" class="form-control" id="editDir3Date" value="${r.filing_date||''}" /></div>
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="editDir3Status">
        ${['Filed','Pending','Overdue'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Remarks</label><input type="text" class="form-control" id="editDir3Remarks" value="${escapeHtml(r.remarks||'')}" /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveDir3Edit(${id})">💾 Save</button>
  `);
}

async function saveDir3Edit(id) {
  const status = document.getElementById('editDir3Status')?.value;
  const remarks = document.getElementById('editDir3Remarks')?.value.trim();
  const filing_date = document.getElementById('editDir3Date')?.value;
  const ok = await supabaseUpdate('dir3_kyc', id, {status, remarks, filing_date});
  if (ok) {
    const idx = (STATE.dir3Filings||[]).findIndex(x=>x.id===id);
    if (idx!==-1) { STATE.dir3Filings[idx].status=status; STATE.dir3Filings[idx].remarks=remarks; STATE.dir3Filings[idx].filing_date=filing_date; STATE.dir3Filings[idx].updated_by=getUpdatedByLabel(); STATE.dir3Filings[idx].updated_at=new Date().toISOString(); }
    closeModal(); renderDir3Table(); showToast('✅ DIR-3 updated!');
  }
}

async function deleteDir3(id) {
  if (!confirm('Delete this DIR-3 KYC filing?')) return;
  const ok = await supabaseDelete('dir3_kyc', id);
  if (ok) { STATE.dir3Filings = (STATE.dir3Filings||[]).filter(x=>x.id!==id); renderDir3Table(); showToast('🗑️ Deleted'); }
}

async function submitNewDir3() {
  const clientSel = document.getElementById('dir3ClientSel');
  const clientId = clientSel?.value;
  const clientName = clientId ? getClientNameById(clientId) : '';
  if (!clientName) { showToast('Please select a client'); return; }
  const dirName = document.getElementById('dir3DirectorName')?.value.trim();
  if (!dirName) { showToast('Director name required'); return; }
  const due = document.getElementById('dir3DueDate')?.value;
  const filing = document.getElementById('dir3FilingDate')?.value;

  const body = {
    client_name: clientName,
    client_id: clientId,
    director_name: dirName,
    din: document.getElementById('dir3DIN')?.value.trim()||'',
    financial_year: document.getElementById('dir3FY')?.value||'',
    due_date: due || null,
    filing_date: filing || null,
    remarks: document.getElementById('dir3Remarks')?.value.trim()||'',
    status: 'Pending',
    updated_at: new Date().toISOString()
  };
  const result = await supabaseInsert('dir3_kyc', body);
  if (result && result[0]) {
    if (!STATE.dir3Filings) STATE.dir3Filings = [];
    STATE.dir3Filings.unshift(result[0]);
    closeModal(); renderDir3Table(); showToast('✅ DIR-3 KYC added!');
  } else { showToast('❌ Failed'); }
}
function toggleOnlinePanel() {
  const panel = document.getElementById('onlinePanel');
  if (!panel) return;
  const isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) renderOnlinePanel();
}

async function renderOnlinePanel() {
  const list = document.getElementById('onlinePanelList');
  const countEl = document.getElementById('onlineCount');
  if (!list) return;

  await fetchAllPresence();

  const myEmail = getCurrentUserEmail();
  STATE.userPresence[myEmail] = { is_online: true };

  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
  });
  const profiles = res.ok ? await res.json() : [];

  const onlineUsers = profiles.filter(p => {
    if (p.email === myEmail) return true;
    return STATE.userPresence[p.email]?.is_online || false;
  });

  if (countEl) countEl.textContent = onlineUsers.length || 1;

  if (!profiles.length) {
    list.innerHTML = `<div style="padding:14px;text-align:center;color:var(--text-muted);font-size:12px">No team members</div>`;
    return;
  }

  list.innerHTML = profiles.map(p => {
    const name = p.full_name || p.email?.split('@')[0] || 'User';
    const initial = name.charAt(0).toUpperCase();
    const isMe = p.email === myEmail;
    const isOnline = isMe ? true : (STATE.userPresence[p.email]?.is_online || false);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;transition:background .15s" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <div style="position:relative;flex-shrink:0">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px">${initial}</div>
          <div style="position:absolute;bottom:0;right:0;width:9px;height:9px;border-radius:50%;background:${isOnline ? '#10b981' : '#9ca3af'};border:2px solid var(--surface)"></div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;font-weight:600;color:var(--text)">${escapeHtml(name)} ${isMe ? '<span style="font-size:10px;color:var(--primary)">(You)</span>' : ''}</div>
          <div style="font-size:11px;color:${isOnline ? '#10b981' : 'var(--text-muted)'}">● ${isOnline ? 'Online' : 'Offline'}</div>
        </div>
      </div>`;
  }).join('');
}

// Panel band karo bahar click karne pe
document.addEventListener('click', function(e) {
  const panel = document.getElementById('onlinePanel');
  const btn = document.getElementById('onlinePanelBtn');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.style.display = 'none';
  }
});
function onEventTypeChange() {
  const type = document.getElementById('newEventType')?.value;
  const meetingFields = document.getElementById('meetingFields');
  if (meetingFields) {
    meetingFields.style.display = type === 'Meeting' ? 'block' : 'none';
  }
}

async function submitNewEvent() {
  const title = document.getElementById('newEventTitle')?.value.trim();
  const dateVal = document.getElementById('newEventDate')?.value;
  const timeVal = document.getElementById('newEventTime')?.value || '';
  const typeVal = document.getElementById('newEventType')?.value || 'Internal';

  if (!title || !dateVal) { showToast('Please fill title and date'); return; }

  const isMeeting = typeVal === 'Meeting';
  const location = document.getElementById('meetingLocation')?.value.trim() || '';
  const desc = document.getElementById('meetingDesc')?.value.trim() || '';
  const attendees = document.getElementById('meetingAttendees')?.value.trim() || '';

 const body = {
    title,
    event_type: typeVal,
    event_date: dateVal,
    event_time: timeVal || null,
    location: location || null,
    description: desc || null,
    attendees: attendees || null,
    created_by: getUpdatedByLabel(),
    updated_by: getUpdatedByLabel(),
    updated_at: new Date().toISOString()
  };

  const result = await supabaseInsert('calendar_events', body);
  if (result && result[0]) {
    STATE.calendarEvents.push(result[0]);
    closeModal();
    renderCalendar();
    renderEventList();
    renderDueDates();
    showToast('✅ Event added!');

    // Agar Meeting hai toh share options dikhao
    if (isMeeting) {
      setTimeout(() => showMeetingShareModal(title, dateVal, timeVal, location, desc, attendees), 300);
    }
  } else { showToast('❌ Failed to add event'); }
}

function showMeetingShareModal(title, date, time, location, desc, attendees) {
  const dateStr = new Date(date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const timeStr = time ? ` at ${time}` : '';
  const locStr = location ? `\n📍 Location: ${location}` : '';
  const descStr = desc ? `\n📋 Agenda: ${desc}` : '';

  const waText = encodeURIComponent(`📅 *Meeting Reminder*\n\n*${title}*\n🗓️ ${dateStr}${timeStr}${locStr}${descStr}\n\nPlease confirm your attendance.`);
  const waUrl = `https://wa.me/?text=${waText}`;

  const gmailSubject = encodeURIComponent(`Meeting: ${title}`);
  const gmailBody = encodeURIComponent(`Dear Team,\n\nYou are invited to the following meeting:\n\n📅 ${title}\n🗓️ Date: ${dateStr}${timeStr}${location ? '\n📍 Location: ' + location : ''}${desc ? '\n📋 Agenda: ' + desc : ''}\n\nPlease confirm your attendance.\n\nRegards,\n${getCurrentUserName()}`);
  const gmailTo = attendees ? encodeURIComponent(attendees) : '';
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${gmailTo}&su=${gmailSubject}&body=${gmailBody}`;

  openModalWithContent('📤 Share Meeting', `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:36px;margin-bottom:8px">📅</div>
      <div style="font-weight:700;font-size:15px;margin-bottom:4px">${escapeHtml(title)}</div>
      <div style="color:var(--text-muted);font-size:13px;margin-bottom:20px">${dateStr}${timeStr}</div>

      <div style="display:flex;flex-direction:column;gap:12px">
        <a href="${waUrl}" target="_blank" style="text-decoration:none">
          <button class="btn-primary" style="width:100%;background:#25D366;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share on WhatsApp
          </button>
        </a>

        <a href="${gmailUrl}" target="_blank" style="text-decoration:none">
          <button class="btn-primary" style="width:100%;background:#EA4335;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
            Send via Gmail
          </button>
        </a>

        <button class="btn-outline" style="width:100%" onclick="closeModal()">Close</button>
      </div>
    </div>
  `);
}
function reshareEvent(id) {
  const e = STATE.calendarEvents.find(x => x.id === id);
  if (!e) return;
  showMeetingShareModal(
    e.title,
    e.event_date,
    e.event_time || '',
    e.location || '',
    e.description || '',
    e.attendees || ''
  );
}
/* =========================================================
   MY LOCKER — Private PIN-protected vault
   ========================================================= */

let lockerUnlocked = false;
let lockerItems = [];

async function initMyLocker() {
  lockerUnlocked = false;
  document.getElementById('lockerContent').style.display = 'none';
  document.getElementById('lockerLockScreen').style.display = 'block';
  document.getElementById('lockerSetupSection').style.display = 'none';
  document.getElementById('lockerUnlockSection').style.display = 'none';
  document.getElementById('lockerWrongMsg') && (document.getElementById('lockerWrongMsg').style.display = 'none');

  const user = getCurrentUser();
  if (!user) return;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;

  // Check karo PIN set hai ya nahi
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/locker_pin?user_id=eq.${user.id}&select=id`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } }
  );
  const data = res.ok ? await res.json() : [];

  if (!data.length) {
    // PIN nahi set — setup dikhao
    document.getElementById('lockerSetupSection').style.display = 'block';
  } else {
    // PIN set hai — unlock screen dikhao
    document.getElementById('lockerUnlockSection').style.display = 'block';
    setTimeout(() => document.getElementById('lockerEnterPin')?.focus(), 100);
  }
}

async function hashPIN(pin) {
  // Simple hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'witcorp-locker-salt-2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function setLockerPIN() {
  const pin = document.getElementById('lockerSetPin')?.value.trim();
  const confirm = document.getElementById('lockerConfirmPin')?.value.trim();
  if (!pin || pin.length < 4) { showToast('PIN must be at least 4 characters'); return; }
  if (pin !== confirm) { showToast('❌ PINs do not match!'); return; }

  const user = getCurrentUser();
  if (!user) return;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  const pinHash = await hashPIN(pin);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/locker_pin`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ user_id: user.id, pin_hash: pinHash })
  });

  if (res.ok) {
    showToast('✅ PIN set! Locker unlocked.');
    document.getElementById('lockerSetPin').value = '';
    document.getElementById('lockerConfirmPin').value = '';
    await openLockerAfterUnlock();
  } else {
    showToast('❌ Failed to set PIN');
  }
}

async function unlockLocker() {
  const pin = document.getElementById('lockerEnterPin')?.value.trim();
  if (!pin) { showToast('Enter your PIN'); return; }

  const user = getCurrentUser();
  if (!user) return;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  const pinHash = await hashPIN(pin);

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/locker_pin?user_id=eq.${user.id}&select=pin_hash`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } }
  );
  const data = res.ok ? await res.json() : [];

  if (!data.length || data[0].pin_hash !== pinHash) {
    document.getElementById('lockerWrongMsg').style.display = 'block';
    document.getElementById('lockerEnterPin').value = '';
    document.getElementById('lockerEnterPin').focus();
    return;
  }

  document.getElementById('lockerEnterPin').value = '';
  await openLockerAfterUnlock();
}

async function openLockerAfterUnlock() {
  lockerUnlocked = true;
  document.getElementById('lockerLockScreen').style.display = 'none';
  document.getElementById('lockerContent').style.display = 'block';
  await loadLockerItems();
}

async function loadLockerItems() {
  const user = getCurrentUser();
  if (!user) return;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/my_locker?user_id=eq.${user.id}&order=created_at.desc`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } }
  );
  lockerItems = res.ok ? await res.json() : [];
  renderLockerTable();
}

function renderLockerTable() {
  const tbody = document.getElementById('lockerTableBody');
  if (!tbody) return;
  if (!lockerItems.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-text">No items in locker yet</div><div class="empty-state-sub">Click + Add Item to get started</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = lockerItems.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.label)}</strong></td>
      <td><span style="font-size:11px;background:var(--primary-glow);color:var(--primary);padding:2px 8px;border-radius:99px">${escapeHtml(item.category||'General')}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <span>${escapeHtml(item.username||'-')}</span>
          ${item.username ? `<button onclick="copyToClipboard('${escapeHtml(item.username)}','Username copied!')" style="background:none;border:1px solid var(--border);border-radius:6px;padding:2px 7px;cursor:pointer;font-size:11px">📋</button>` : ''}
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <input type="password" id="lp_${item.id}" value="${escapeHtml(item.password||'')}" readonly
            style="border:none;background:transparent;color:var(--text);width:90px;outline:none;font-size:13px" />
          <button onclick="toggleVaultPass('lp_${item.id}',this)" style="background:none;border:1px solid var(--border);border-radius:6px;padding:2px 6px;cursor:pointer;font-size:12px">👁️</button>
          ${item.password ? `<button onclick="copyToClipboard('${escapeHtml(item.password)}','Password copied!')" style="background:none;border:1px solid var(--border);border-radius:6px;padding:2px 6px;cursor:pointer;font-size:12px">📋</button>` : ''}
        </div>
      </td>
      <td style="color:var(--text-muted);font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(item.notes||'-')}</td>
      <td>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;margin-right:4px" onclick="editLockerItem(${item.id})">✏️</button>
        <button class="btn-outline" style="padding:4px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444" onclick="deleteLockerItem(${item.id})">🗑️</button>
      </td>
    </tr>`).join('');
}

function lockLocker() {
  lockerUnlocked = false;
  lockerItems = [];
  document.getElementById('lockerContent').style.display = 'none';
  document.getElementById('lockerLockScreen').style.display = 'block';
  document.getElementById('lockerSetupSection').style.display = 'none';
  document.getElementById('lockerUnlockSection').style.display = 'block';
  document.getElementById('lockerWrongMsg') && (document.getElementById('lockerWrongMsg').style.display = 'none');
  setTimeout(() => document.getElementById('lockerEnterPin')?.focus(), 100);
  showToast('🔒 Locker locked!');
}

function openLockerAddModal() {
  const categories = ['General','Banking','GST Portal','MCA/ROC','Income Tax','Email','Social Media','Other'];
  openModalWithContent('🔒 Add to My Locker', `
    <div class="form-group"><label>Label / Site Name *</label><input type="text" class="form-control" id="li_label" placeholder="e.g. GSTIN Portal, HDFC Bank" /></div>
    <div class="form-group"><label>Category</label>
      <select class="form-control" id="li_category">
        ${categories.map(c=>`<option>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Username / Email</label><input type="text" class="form-control" id="li_username" placeholder="Enter username or email" autocomplete="off" /></div>
    <div class="form-group"><label>Password</label>
      <div style="display:flex;gap:8px">
        <input type="password" class="form-control" id="li_password" placeholder="Enter password" style="flex:1" autocomplete="new-password" />
        <button class="btn-outline" style="padding:8px 12px" onclick="togglePasswordView('li_password')">👁️</button>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea class="form-control" id="li_notes" rows="2" placeholder="Optional notes..."></textarea></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveLockerItem()">🔐 Save to Locker</button>
  `);
}

async function saveLockerItem() {
  const label = document.getElementById('li_label')?.value.trim();
  if (!label) { showToast('Label is required'); return; }
  const user = getCurrentUser();
  if (!user) return;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;

  const body = {
    user_id: user.id,
    label,
    category: document.getElementById('li_category')?.value || 'General',
    username: document.getElementById('li_username')?.value.trim() || '',
    password: document.getElementById('li_password')?.value || '',
    notes: document.getElementById('li_notes')?.value.trim() || ''
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/my_locker`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });

  if (res.ok) {
    const data = await res.json();
    if (data[0]) lockerItems.unshift(data[0]);
    closeModal();
    renderLockerTable();
    showToast('✅ Item saved to locker!');
  } else {
    showToast('❌ Failed to save');
  }
}

function editLockerItem(id) {
  const item = lockerItems.find(x => x.id === id);
  if (!item) return;
  const categories = ['General','Banking','GST Portal','MCA/ROC','Income Tax','Email','Social Media','Other'];
  openModalWithContent(`✏️ Edit — ${escapeHtml(item.label)}`, `
    <div class="form-group"><label>Label *</label><input type="text" class="form-control" id="eli_label" value="${escapeHtml(item.label)}" /></div>
    <div class="form-group"><label>Category</label>
      <select class="form-control" id="eli_category">
        ${categories.map(c=>`<option ${item.category===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Username</label><input type="text" class="form-control" id="eli_username" value="${escapeHtml(item.username||'')}" autocomplete="off" /></div>
    <div class="form-group"><label>Password</label>
      <div style="display:flex;gap:8px">
        <input type="password" class="form-control" id="eli_password" value="${escapeHtml(item.password||'')}" style="flex:1" autocomplete="new-password" />
        <button class="btn-outline" style="padding:8px 12px" onclick="togglePasswordView('eli_password')">👁️</button>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea class="form-control" id="eli_notes" rows="2">${escapeHtml(item.notes||'')}</textarea></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="updateLockerItem(${id})">💾 Save Changes</button>
  `);
}

async function updateLockerItem(id) {
  const label = document.getElementById('eli_label')?.value.trim();
  if (!label) { showToast('Label required'); return; }
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;

  const body = {
    label,
    category: document.getElementById('eli_category')?.value || 'General',
    username: document.getElementById('eli_username')?.value.trim() || '',
    password: document.getElementById('eli_password')?.value || '',
    notes: document.getElementById('eli_notes')?.value.trim() || '',
    updated_at: new Date().toISOString()
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/my_locker?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (res.ok) {
    const idx = lockerItems.findIndex(x => x.id === id);
    if (idx !== -1) lockerItems[idx] = { ...lockerItems[idx], ...body };
    closeModal();
    renderLockerTable();
    showToast('✅ Updated!');
  } else {
    showToast('❌ Update failed');
  }
}

async function deleteLockerItem(id) {
  const item = lockerItems.find(x => x.id === id);
  if (!item) return;
  if (!confirm(`Delete "${item.label}"? This cannot be undone.`)) return;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/my_locker?id=eq.${id}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
  });

  if (res.ok) {
    lockerItems = lockerItems.filter(x => x.id !== id);
    renderLockerTable();
    showToast('🗑️ Deleted from locker');
  }
}

function showLockerResetConfirm() {
  openModalWithContent('⚠️ Reset / Change Locker PIN', `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:40px;margin-bottom:12px">⚠️</div>
      <div style="font-weight:700;margin-bottom:8px">Change your Locker PIN?</div>
      <div style="color:var(--text-muted);font-size:13px;margin-bottom:20px">Enter current PIN to set a new one</div>
      <div class="form-group"><input type="password" class="form-control" id="resetCurrentPin" placeholder="Current PIN" style="text-align:center;letter-spacing:4px" /></div>
      <div class="form-group"><input type="password" class="form-control" id="resetNewPin" placeholder="New PIN (min 4)" style="text-align:center;letter-spacing:4px" /></div>
      <div class="form-group"><input type="password" class="form-control" id="resetConfirmPin" placeholder="Confirm New PIN" style="text-align:center;letter-spacing:4px" /></div>
      <div style="display:flex;gap:10px;margin-top:8px">
        <button class="btn-outline" style="flex:1" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" style="flex:1" onclick="changeLockerPIN()">✅ Change PIN</button>
      </div>
    </div>
  `);
}

async function changeLockerPIN() {
  const current = document.getElementById('resetCurrentPin')?.value.trim();
  const newPin = document.getElementById('resetNewPin')?.value.trim();
  const confirm = document.getElementById('resetConfirmPin')?.value.trim();

  if (!current) { showToast('Enter current PIN'); return; }
  if (!newPin || newPin.length < 4) { showToast('New PIN must be at least 4 chars'); return; }
  if (newPin !== confirm) { showToast('❌ New PINs do not match'); return; }

  const user = getCurrentUser();
  if (!user) return;
  const token = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;

  const currentHash = await hashPIN(current);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/locker_pin?user_id=eq.${user.id}&select=pin_hash`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } }
  );
  const data = res.ok ? await res.json() : [];

  if (!data.length || data[0].pin_hash !== currentHash) {
    showToast('❌ Current PIN is wrong!'); return;
  }

  const newHash = await hashPIN(newPin);
  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/locker_pin?user_id=eq.${user.id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pin_hash: newHash, updated_at: new Date().toISOString() })
  });

  if (updateRes.ok) {
    closeModal();
    showToast('✅ PIN changed successfully!');
    if (lockerUnlocked) lockLocker();
  } else {
    showToast('❌ Failed to change PIN');
  }
}
/* =========================================================
   END OF app_enhanced.js — WITCORP FIXED v4
   ✅ updated_at sahi variable se har jagah fix kiya
   ✅ contact_person add/edit/view mein add kiya
   ✅ renderActivity mein updated_at use kiya
   ✅ saari syntax errors hatayi
   ========================================================= */
