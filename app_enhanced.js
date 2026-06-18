/* =============================================================
   WITCORP DASHBOARD - app_enhanced.js
   Enterprise Edition — WhatsApp Chat + Vault Table + Dark Mode Fix
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
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  return res.ok;
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
  activeChatName: '',
  vaultSelectedFolder: 'All',
  clients: [], gstReturns: [], rocFilings: [], itrFilings: [],
  tdsReturns: [], audits: [], dscRecords: [], accountingEntries: [],
  tasks: [], documents: [], calendarEvents: [],
  vaultCredentials: [], vaultFolders: [],
  teamMessages: [], userPresence: {},
  replyToMsg: null,
  chatReactions: {}
};

/* =========================================================
   3. DARK MODE — FIXED
   ========================================================= */

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('force-dark');
  localStorage.setItem('witcorp-dark-mode', isDark ? '1' : '0');
  const btn = document.getElementById('darkModeBtn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

function initDarkMode() {
  const saved = localStorage.getItem('witcorp-dark-mode');
  const btn = document.getElementById('darkModeBtn');
  if (saved === '1') {
    document.body.classList.add('force-dark');
    if (btn) btn.textContent = '☀️';
  } else {
    document.body.classList.remove('force-dark');
    if (btn) btn.textContent = '🌙';
  }
}

/* =========================================================
   4. THEME SYSTEM
   ========================================================= */

function setTheme(themeName) {
  const themes = ['theme-violet','theme-blue','theme-emerald','theme-rose','theme-amber','theme-cyan','theme-dark','theme-midnight','theme-forest','theme-sunset','theme-sakura','theme-gold'];
  themes.forEach(t => document.body.classList.remove(t));
  document.body.classList.add(themeName);
  localStorage.setItem('witcorp-body-theme', themeName);
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.theme === themeName));
}

function initTheme() {
  const saved = localStorage.getItem('witcorp-body-theme') || 'theme-violet';
  setTheme(saved);
}

/* =========================================================
   5. VAULT SYSTEM — PROFESSIONAL TABLE VIEW
   ========================================================= */

const VAULT_FOLDERS_DEFAULT = ['All', 'General', 'GST', 'MCA', 'TDS', 'ITR', 'Banking', 'Clients', 'Other'];

async function loadVaultData() {
  const creds = await supabase('vault_credentials', { order: 'folder.asc,created_at.desc' });
  STATE.vaultCredentials = Array.isArray(creds) ? creds : [];
}

function getVaultFolders() {
  const custom = [...new Set(STATE.vaultCredentials.map(c => c.folder || 'General'))];
  const base = ['All', 'General', 'GST', 'MCA', 'TDS', 'ITR', 'Banking', 'Clients', 'Other'];
  const merged = [...new Set([...base, ...custom])];
  return merged;
}

function renderVaultFolders() {
  const sidebar = document.getElementById('vaultFolderList');
  if (!sidebar) return;
  const folders = getVaultFolders();
  sidebar.innerHTML = folders.map(folder => {
    const count = folder === 'All'
      ? STATE.vaultCredentials.length
      : STATE.vaultCredentials.filter(c => (c.folder || 'General') === folder).length;
    const icons = { 'All': '🗂️', 'General': '📁', 'GST': '📊', 'MCA': '🏛️', 'TDS': '🧾', 'ITR': '💰', 'Banking': '🏦', 'Clients': '👥', 'Other': '📋' };
    const icon = icons[folder] || '📁';
    return `
      <div class="vault-folder ${STATE.vaultSelectedFolder === folder ? 'active' : ''}" onclick="selectVaultFolder('${escapeHtml(folder)}')">
        <span style="font-size:15px">${icon}</span>
        <span>${escapeHtml(folder)}</span>
        <span class="folder-count">${count}</span>
      </div>
    `;
  }).join('');
}

function selectVaultFolder(folder) {
  STATE.vaultSelectedFolder = folder;
  renderVaultFolders();
  renderVaultTable();
}

function filterVaultTable(query) {
  renderVaultTable(query);
}

function renderVaultTable(searchQuery) {
  const tbody = document.getElementById('vaultTableBody');
  const emptyState = document.getElementById('vaultEmptyState');
  const countEl = document.getElementById('vaultCount');
  if (!tbody) return;

  const q = (searchQuery || document.getElementById('vaultSearchInput')?.value || '').toLowerCase().trim();

  let filtered = STATE.vaultCredentials.filter(c => {
    const folderMatch = STATE.vaultSelectedFolder === 'All' || (c.folder || 'General') === STATE.vaultSelectedFolder;
    const searchMatch = !q ||
      (c.label || '').toLowerCase().includes(q) ||
      (c.username || '').toLowerCase().includes(q) ||
      (c.url || '').toLowerCase().includes(q) ||
      (c.folder || '').toLowerCase().includes(q);
    return folderMatch && searchMatch;
  });

  if (countEl) countEl.textContent = filtered.length + ' item' + (filtered.length !== 1 ? 's' : '');

  if (!filtered.length) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  tbody.innerHTML = filtered.map(cred => {
    const accessBadgeClass = {
      'GST': 'gst', 'MCA': 'mca', 'TDS': 'tds', 'ITR': 'itr',
      'Banking': 'bank', 'General': 'other', 'Clients': 'other', 'Other': 'other'
    }[cred.folder || 'General'] || 'other';

    const initials = (cred.label || '?').charAt(0).toUpperCase();
    const colorHue = (cred.label || '').charCodeAt(0) * 7 % 360;

    return `
      <tr>
        <td>
          <div class="vault-client-cell">
            <div class="vault-client-avatar" style="background:hsl(${colorHue},55%,50%)">${initials}</div>
            <div>
              <div class="vault-client-name">${escapeHtml(cred.label)}</div>
              ${cred.url ? `<div class="vault-client-url">${escapeHtml(cred.url.replace(/^https?:\/\//, '').split('/')[0])}</div>` : ''}
            </div>
          </div>
        </td>
        <td>
          <span class="access-badge ${accessBadgeClass}">${escapeHtml(cred.folder || 'General')}</span>
        </td>
        <td>
          <div class="vault-username">
            <span>${escapeHtml(cred.username || '—')}</span>
            ${cred.username ? `<button class="copy-btn" title="Copy username" onclick="copyToClipboard('${escapeHtml(cred.username).replace(/'/g,"\\'")}','✅ Username copied!')">⧉</button>` : ''}
          </div>
        </td>
        <td>
          <div class="vault-password-cell">
            <span class="vault-password-dots" id="pwDots_${cred.id}">••••••••••</span>
            <span class="vault-password-text" id="pwText_${cred.id}">${escapeHtml(cred.password || '')}</span>
            <button class="eye-btn" id="eyeBtn_${cred.id}" onclick="toggleVaultPassword(${cred.id})" title="Show/hide password">👁</button>
            ${cred.password ? `<button class="copy-btn" title="Copy password" onclick="copyToClipboard('${escapeHtml(cred.password).replace(/'/g,"\\'")}','🔑 Password copied!')">⧉</button>` : ''}
          </div>
        </td>
        <td>
          <div class="vault-actions">
            <button class="vault-action-btn" title="Edit" onclick="editVaultItem(${cred.id})">✏️</button>
            <button class="vault-action-btn" title="View notes" onclick="viewVaultItem(${cred.id})">ℹ️</button>
            <button class="vault-action-btn del" title="Delete" onclick="deleteVaultItem(${cred.id})">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function toggleVaultPassword(id) {
  const dots = document.getElementById('pwDots_' + id);
  const text = document.getElementById('pwText_' + id);
  const btn = document.getElementById('eyeBtn_' + id);
  if (!dots || !text) return;
  const isHidden = dots.style.display !== 'none';
  dots.style.display = isHidden ? 'none' : 'inline';
  text.style.display = isHidden ? 'inline' : 'none';
  if (btn) btn.textContent = isHidden ? '🙈' : '👁';
}

function viewVaultItem(id) {
  const cred = STATE.vaultCredentials.find(c => c.id === id);
  if (!cred) return;
  openModalWithContent(`ℹ️ ${escapeHtml(cred.label)}`, `
    <div class="form-group"><label>Label</label><div class="form-control" style="background:var(--bg)">${escapeHtml(cred.label)}</div></div>
    <div class="form-group"><label>Folder</label><div class="form-control" style="background:var(--bg)">${escapeHtml(cred.folder || 'General')}</div></div>
    ${cred.url ? `<div class="form-group"><label>URL</label><div class="form-control" style="background:var(--bg);word-break:break-all">${escapeHtml(cred.url)}</div></div>` : ''}
    <div class="form-group"><label>Username / Email</label>
      <div style="display:flex;gap:8px">
        <div class="form-control" style="background:var(--bg);flex:1">${escapeHtml(cred.username || '—')}</div>
        ${cred.username ? `<button class="btn-outline" style="padding:8px 12px;white-space:nowrap" onclick="copyToClipboard('${escapeHtml(cred.username).replace(/'/g,"\\'")}','✅ Username copied!')">📋 Copy</button>` : ''}
      </div>
    </div>
    <div class="form-group"><label>Password</label>
      <div style="display:flex;gap:8px">
        <input type="password" id="vaultPwView_${id}" class="form-control" style="flex:1;background:var(--bg)" value="${escapeHtml(cred.password || '')}" readonly />
        <button class="btn-outline" style="padding:8px 12px;white-space:nowrap" onclick="togglePwViewModal('vaultPwView_${id}',this)">👁 Show</button>
        ${cred.password ? `<button class="btn-outline" style="padding:8px 12px;white-space:nowrap" onclick="copyToClipboard('${escapeHtml(cred.password).replace(/'/g,"\\'")}','🔑 Password copied!')">📋 Copy</button>` : ''}
      </div>
    </div>
    ${cred.notes ? `<div class="form-group"><label>Notes</label><div class="form-control" style="background:var(--bg);white-space:pre-wrap">${escapeHtml(cred.notes)}</div></div>` : ''}
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="closeModal()">Close</button>
  `);
}

function togglePwViewModal(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.textContent = isPassword ? '🙈 Hide' : '👁 Show';
}

function editVaultItem(id) {
  const cred = STATE.vaultCredentials.find(c => c.id === id);
  if (!cred) return;
  const folders = getVaultFolders().filter(f => f !== 'All');
  openModalWithContent(`✏️ Edit — ${escapeHtml(cred.label)}`, `
    <div class="form-group"><label>Label *</label><input type="text" class="form-control" id="editVaultLabel" value="${escapeHtml(cred.label)}" /></div>
    <div class="form-group"><label>Folder</label>
      <select class="form-control" id="editVaultFolder">
        ${folders.map(f => `<option ${(cred.folder || 'General') === f ? 'selected' : ''}>${f}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>URL</label><input type="text" class="form-control" id="editVaultUrl" value="${escapeHtml(cred.url || '')}" placeholder="https://..." /></div>
    <div class="form-group"><label>Username / Email</label><input type="text" class="form-control" id="editVaultUsername" value="${escapeHtml(cred.username || '')}" /></div>
    <div class="form-group"><label>Password</label>
      <div class="input-with-action">
        <input type="password" class="form-control" id="editVaultPassword" value="${escapeHtml(cred.password || '')}" />
        <button class="btn-icon-sm" onclick="togglePwViewModal('editVaultPassword',this)" title="Show/hide">👁</button>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea class="form-control" id="editVaultNotes" rows="2">${escapeHtml(cred.notes || '')}</textarea></div>
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
    if (idx !== -1) STATE.vaultCredentials[idx] = { ...STATE.vaultCredentials[idx], ...updated };
    closeModal(); renderVaultFolders(); renderVaultTable(); showToast('✅ Credential updated!');
  } else { showToast('❌ Update failed'); }
}

async function deleteVaultItem(id) {
  const cred = STATE.vaultCredentials.find(c => c.id === id);
  if (!cred) return;
  openModalWithContent('🗑️ Delete Credential', `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:40px;margin-bottom:12px">⚠️</div>
      <div style="font-weight:700;font-size:15px;margin-bottom:8px">Delete "${escapeHtml(cred.label)}"?</div>
      <div style="color:var(--text-muted);font-size:13px;margin-bottom:20px">This cannot be undone.</div>
      <div style="display:flex;gap:10px">
        <button class="btn-outline" style="flex:1" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" style="flex:1;background:var(--danger)" onclick="confirmDeleteVault(${id})">🗑️ Delete</button>
      </div>
    </div>
  `);
}

async function confirmDeleteVault(id) {
  const ok = await supabaseDelete('vault_credentials', id);
  if (ok) {
    STATE.vaultCredentials = STATE.vaultCredentials.filter(c => c.id !== id);
    closeModal(); renderVaultFolders(); renderVaultTable(); showToast('🗑️ Credential deleted');
  }
}

function copyToClipboard(text, message) {
  navigator.clipboard.writeText(text).then(() => showToast(message || '📋 Copied!'))
    .catch(() => showToast('❌ Copy failed'));
}

/* =========================================================
   6. ENHANCED TEAM CHAT — WHATSAPP STYLE
   ========================================================= */

const EMOJI_REACTIONS = ['👍','❤️','😂','😮','😢','🙏'];
const EMOJI_LIST = ['😀','😃','😄','😁','😆','😅','🤣','😂','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😚','😙','😋','😛','😜','🤪','😝','😑','😐','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤑','🤗','🤭','🤫','🤔','🤨','😮','🤐','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾'];

let chatReactions = {}; // { msgId: { emoji: count } }
let pinnedMessages = {};
let starredMessages = {};
let selectedMessages = new Set();

function initPresence() {
  const userRaw = localStorage.getItem('witcorp-user');
  const myEmail = userRaw ? JSON.parse(userRaw).email : '';
  if (myEmail) {
    setPresenceOnline(myEmail);
    setInterval(() => setPresenceOnline(myEmail), 30000);
  }
}

async function setPresenceOnline(email) {
  await supabaseInsert('user_presence', { email, is_online: true, last_seen: new Date().toISOString() }).catch(() => {});
}

async function renderTeamContacts() {
  const el = document.getElementById('chatContacts');
  if (!el) return;
  const userRaw = localStorage.getItem('witcorp-user');
  const myEmail = userRaw ? JSON.parse(userRaw).email : '';
  const profiles = await supabase('profiles', { order: 'full_name.asc' });
  const others = (profiles || []).filter(p => p.email !== myEmail);

  if (!others.length) {
    el.innerHTML = `<div style="padding:24px 16px;color:var(--text-muted);font-size:13px;text-align:center">
      <div style="font-size:32px;margin-bottom:8px">👥</div>
      No team members yet.<br>Enter an email above to start.
    </div>`;
    return;
  }

  el.innerHTML = others.map(p => {
    const name = p.full_name || p.email.split('@')[0];
    const initial = (name.charAt(0)).toUpperCase();
    const isActive = p.email === STATE.activeChatContact;
    const isOnline = STATE.userPresence[p.email]?.is_online || false;
    return `
      <div class="contact-item ${isActive ? 'active' : ''}" onclick="switchChatContact('${escapeHtml(p.email)}', '${escapeHtml(name)}')">
        <div style="position:relative;width:42px;height:42px;flex-shrink:0">
          <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px">${initial}</div>
          <div style="position:absolute;bottom:1px;right:1px;width:11px;height:11px;border-radius:50%;background:${isOnline ? '#10b981' : '#94a3b8'};border:2px solid var(--surface)"></div>
        </div>
        <div style="flex:1;overflow:hidden">
          <div style="font-weight:600;font-size:13.5px;margin-bottom:2px">${escapeHtml(name)}</div>
          <div style="font-size:11.5px;color:var(--text-muted)">${isOnline ? '🟢 Online' : '⚪ Offline'}</div>
        </div>
      </div>
    `;
  }).join('');
}

function switchChatContact(email, name) {
  STATE.activeChatContact = email;
  STATE.activeChatName = name || email.split('@')[0];
  const nameEl = document.getElementById('activeChatName');
  const statusEl = document.getElementById('onlineStatus');
  const indicator = document.getElementById('onlineIndicator');
  const avatarEl = document.getElementById('activeChatAvatar');
  if (nameEl) nameEl.textContent = STATE.activeChatName;
  if (avatarEl) avatarEl.textContent = STATE.activeChatName.charAt(0).toUpperCase();
  const isOnline = STATE.userPresence[email]?.is_online || false;
  if (statusEl) statusEl.textContent = isOnline ? 'Online' : 'Offline';
  if (indicator) indicator.style.color = isOnline ? '#10b981' : '#94a3b8';
  renderTeamContacts();
  renderTeamMessages();
}

async function renderTeamMessages() {
  const el = document.getElementById('teamMessages');
  if (!el) return;
  const userRaw = localStorage.getItem('witcorp-user');
  const myEmail = userRaw ? JSON.parse(userRaw).email : '';
  const contactEmail = STATE.activeChatContact;

  if (!contactEmail) {
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);text-align:center;padding:40px 20px">
      <div style="font-size:52px;margin-bottom:16px">💬</div>
      <div style="font-weight:600;font-size:14px;margin-bottom:6px">Select a contact</div>
      <div style="font-size:12px">Choose from the list or start a new chat</div>
    </div>`;
    return;
  }

  const url = `${SUPABASE_URL}/rest/v1/team_messages?or=(and(sender_email.eq.${encodeURIComponent(myEmail)},receiver_email.eq.${encodeURIComponent(contactEmail)}),and(sender_email.eq.${encodeURIComponent(contactEmail)},receiver_email.eq.${encodeURIComponent(myEmail)}))&order=created_at.asc`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  });
  const messages = res.ok ? await res.json() : [];
  STATE.teamMessages = messages;

  if (!messages.length) {
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);text-align:center;padding:40px">
      <div style="font-size:52px;margin-bottom:12px">👋</div>
      <div style="font-weight:600">Say hello!</div>
      <div style="font-size:12px;margin-top:4px">No messages yet</div>
    </div>`;
    return;
  }

  // Group messages by date
  let lastDate = '';
  el.innerHTML = messages.map(m => {
    const isOwn = m.sender_email === myEmail;
    const msgDate = new Date(m.created_at);
    const dateStr = msgDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = msgDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const replyMsg = m.reply_to && messages.find(msg => msg.id === m.reply_to);
    const reactions = (chatReactions[m.id] || {});
    const isStarred = starredMessages[m.id];
    const isPinned = pinnedMessages[m.id];
    const isSelected = selectedMessages.has(m.id);
    const isDeleted = m.is_deleted;

    let dateDivider = '';
    if (dateStr !== lastDate) {
      lastDate = dateStr;
      dateDivider = `<div style="text-align:center;margin:12px 0"><span style="background:rgba(0,0,0,.08);color:var(--text-muted);font-size:11.5px;font-weight:600;padding:4px 14px;border-radius:20px">${dateStr}</span></div>`;
    }

    const reactionsHtml = Object.keys(reactions).length ? `
      <div class="wachat-reactions">
        ${Object.entries(reactions).map(([emoji, count]) => `
          <div class="reaction-pill" onclick="toggleReaction(${m.id},'${emoji}')">
            ${emoji} <span class="reaction-count">${count}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    return `${dateDivider}
      <div class="wachat-msg ${isOwn ? 'mine' : 'theirs'} ${isSelected ? 'msg-selected' : ''}" id="msg_${m.id}"
           oncontextmenu="showMsgContextMenu(event,${m.id},${isOwn})"
           ondblclick="replyToMessage(${m.id},'${escapeHtml((m.message||'').substring(0,30))}')"
      >
        <div class="wachat-bubble">
          ${isPinned ? '<div style="font-size:10px;color:var(--primary);margin-bottom:4px">📌 Pinned</div>' : ''}
          ${isStarred ? '<div style="font-size:10px;color:#f59e0b;margin-bottom:4px">⭐ Starred</div>' : ''}
          ${m.is_forwarded ? '<div class="forwarded-label">↗️ Forwarded</div>' : ''}
          ${replyMsg ? `
            <div class="wachat-reply-preview">
              <div class="reply-from">${replyMsg.sender_email === myEmail ? 'You' : escapeHtml(STATE.activeChatName)}</div>
              <div class="reply-text">${escapeHtml((replyMsg.message || '').substring(0, 60))}${(replyMsg.message || '').length > 60 ? '...' : ''}</div>
            </div>
          ` : ''}
          <div style="word-break:break-word">
            ${isDeleted ? '<span class="wachat-deleted">🚫 This message was deleted</span>' : escapeHtml(m.message || '')}
          </div>
          <div class="wachat-meta" style="justify-content:${isOwn ? 'flex-end' : 'flex-start'}">
            ${m.is_edited && !isDeleted ? '<span class="edited-label">edited</span>' : ''}
            <span class="wachat-time">${timeStr}</span>
            ${isOwn ? '<span class="wachat-ticks">✓✓</span>' : ''}
          </div>
        </div>
        ${reactionsHtml}
      </div>
    `;
  }).join('');

  el.scrollTop = el.scrollHeight;
}

/* ---- WhatsApp Context Menu ---- */

function showMsgContextMenu(e, msgId, isOwn) {
  e.preventDefault();
  e.stopPropagation();
  closeContextMenu();

  const menu = document.getElementById('waContextMenu');
  if (!menu) return;

  const msg = STATE.teamMessages.find(m => m.id === msgId);
  const msgText = msg ? (msg.message || '') : '';

  menu.innerHTML = `
    <!-- Emoji quick-react row -->
    <div class="ctx-emoji-row">
      ${EMOJI_REACTIONS.map(emoji => `
        <button class="ctx-emoji-btn" onclick="reactToMessage(${msgId},'${emoji}');closeContextMenu()" title="${emoji}">${emoji}</button>
      `).join('')}
      <button class="ctx-emoji-btn" onclick="closeContextMenu();openFullEmojiReact(${msgId})" title="More">➕</button>
    </div>
    <!-- Actions -->
    <button class="ctx-action" onclick="replyToMessage(${msgId},'${escapeHtml(msgText.substring(0,25))}');closeContextMenu()">
      <span class="ctx-icon">↩️</span> Reply
    </button>
    <button class="ctx-action" onclick="copyMsgText(${msgId});closeContextMenu()">
      <span class="ctx-icon">📋</span> Copy
    </button>
    <button class="ctx-action" onclick="forwardMessage(${msgId});closeContextMenu()">
      <span class="ctx-icon">↗️</span> Forward
    </button>
    <button class="ctx-action" onclick="pinMessage(${msgId});closeContextMenu()">
      <span class="ctx-icon">📌</span> ${pinnedMessages[msgId] ? 'Unpin' : 'Pin'}
    </button>
    <button class="ctx-action" onclick="starMessage(${msgId});closeContextMenu()">
      <span class="ctx-icon">⭐</span> ${starredMessages[msgId] ? 'Unstar' : 'Star'}
    </button>
    <button class="ctx-action" onclick="selectMessage(${msgId});closeContextMenu()">
      <span class="ctx-icon">☑️</span> Select
    </button>
    ${isOwn && !msg?.is_deleted ? `
    <button class="ctx-action" onclick="editMessagePrompt(${msgId},'${escapeHtml(msgText.replace(/'/g,"\\'")||'')}');closeContextMenu()">
      <span class="ctx-icon">✏️</span> Edit
    </button>
    ` : ''}
    <button class="ctx-action" onclick="reportMessage(${msgId});closeContextMenu()">
      <span class="ctx-icon">🚩</span> Report
    </button>
    ${isOwn && !msg?.is_deleted ? `
    <button class="ctx-action danger" onclick="deleteMessageConfirm(${msgId});closeContextMenu()">
      <span class="ctx-icon">🗑️</span> Delete
    </button>
    ` : ''}
  `;

  // Smart positioning
  const menuW = 220, menuH = 380;
  let x = e.clientX, y = e.clientY;
  if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
  if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.display = 'block';

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', closeContextMenu, { once: true });
  }, 10);
}

function closeContextMenu() {
  const menu = document.getElementById('waContextMenu');
  if (menu) menu.style.display = 'none';
}

function reactToMessage(msgId, emoji) {
  if (!chatReactions[msgId]) chatReactions[msgId] = {};
  if (chatReactions[msgId][emoji]) {
    chatReactions[msgId][emoji]++;
  } else {
    chatReactions[msgId][emoji] = 1;
  }
  renderTeamMessages();
}

function openFullEmojiReact(msgId) {
  openModalWithContent('😊 React with Emoji', `
    <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;max-height:240px;overflow-y:auto">
      ${EMOJI_LIST.map(e => `
        <button onclick="reactToMessage(${msgId},'${e}');closeModal()" style="font-size:24px;padding:8px;border:none;background:transparent;cursor:pointer;border-radius:8px;transition:.15s" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='transparent'">${e}</button>
      `).join('')}
    </div>
  `);
}

function copyMsgText(msgId) {
  const msg = STATE.teamMessages.find(m => m.id === msgId);
  if (msg) copyToClipboard(msg.message || '', '📋 Message copied!');
}

function forwardMessage(msgId) {
  const msg = STATE.teamMessages.find(m => m.id === msgId);
  if (!msg) return;
  openModalWithContent('↗️ Forward Message', `
    <div style="background:var(--bg);border-radius:8px;padding:12px;font-size:13px;margin-bottom:16px;border-left:3px solid var(--primary)">${escapeHtml((msg.message || '').substring(0, 100))}</div>
    <div class="form-group"><label>Forward to (Email)</label><input type="text" class="form-control" id="fwdEmail" placeholder="Enter recipient email" /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="sendForwardedMessage(${msgId})">↗️ Forward</button>
  `);
}

async function sendForwardedMessage(origMsgId) {
  const email = document.getElementById('fwdEmail')?.value.trim();
  if (!email || !email.includes('@')) { showToast('Enter valid email'); return; }
  const msg = STATE.teamMessages.find(m => m.id === origMsgId);
  const userRaw = localStorage.getItem('witcorp-user');
  const myEmail = userRaw ? JSON.parse(userRaw).email : '';
  await supabaseInsert('team_messages', {
    sender_email: myEmail,
    receiver_email: email,
    message: msg?.message || '',
    message_type: 'text',
    is_forwarded: true
  });
  closeModal();
  showToast('↗️ Message forwarded!');
}

function pinMessage(msgId) {
  pinnedMessages[msgId] = !pinnedMessages[msgId];
  renderTeamMessages();
  showToast(pinnedMessages[msgId] ? '📌 Message pinned' : '📌 Message unpinned');
}

function starMessage(msgId) {
  starredMessages[msgId] = !starredMessages[msgId];
  renderTeamMessages();
  showToast(starredMessages[msgId] ? '⭐ Message starred' : '⭐ Message unstarred');
}

function selectMessage(msgId) {
  if (selectedMessages.has(msgId)) {
    selectedMessages.delete(msgId);
  } else {
    selectedMessages.add(msgId);
  }
  renderTeamMessages();
  showToast(selectedMessages.size ? `${selectedMessages.size} message(s) selected` : 'Selection cleared');
}

function reportMessage(msgId) {
  showToast('🚩 Message reported to admin');
}

function replyToMessage(msgId, preview) {
  STATE.replyToMsg = { id: msgId, preview };
  const bar = document.getElementById('replyBar');
  const fromEl = document.getElementById('replyBarFrom');
  const textEl = document.getElementById('replyBarText');
  if (bar) bar.classList.add('show');
  if (fromEl) fromEl.textContent = 'Replying to message';
  if (textEl) textEl.textContent = preview + (preview.length >= 25 ? '...' : '');
  document.getElementById('teamChatInput')?.focus();
}

function clearReply() {
  STATE.replyToMsg = null;
  const bar = document.getElementById('replyBar');
  if (bar) bar.classList.remove('show');
}

function editMessagePrompt(msgId, originalText) {
  openModalWithContent('✏️ Edit Message', `
    <div class="form-group"><label>Edit your message</label><textarea class="form-control" id="editMsgText" rows="3">${escapeHtml(originalText)}</textarea></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveEditMessage(${msgId})">💾 Save Edit</button>
  `);
}

async function saveEditMessage(msgId) {
  const newText = document.getElementById('editMsgText')?.value.trim();
  if (!newText) { showToast('Message cannot be empty'); return; }
  const ok = await supabaseUpdate('team_messages', msgId, { message: newText, is_edited: true });
  if (ok) {
    closeModal();
    renderTeamMessages();
    showToast('✅ Message edited');
  }
}

function deleteMessageConfirm(msgId) {
  openModalWithContent('🗑️ Delete Message', `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:36px;margin-bottom:10px">🗑️</div>
      <div style="font-weight:700;margin-bottom:8px">Delete this message?</div>
      <div style="color:var(--text-muted);font-size:13px;margin-bottom:18px">This message will be deleted for everyone.</div>
      <div style="display:flex;gap:10px">
        <button class="btn-outline" style="flex:1" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" style="flex:1;background:var(--danger)" onclick="confirmDeleteMessage(${msgId})">Delete</button>
      </div>
    </div>
  `);
}

async function confirmDeleteMessage(msgId) {
  const ok = await supabaseUpdate('team_messages', msgId, { is_deleted: true, message: '[Message deleted]' });
  if (ok) { closeModal(); renderTeamMessages(); showToast('🗑️ Message deleted'); }
}

/* ---- Chat input / send ---- */

function handleChatKeypress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendTeamMessage();
  }
}

function notifyTyping() {
  const userRaw = localStorage.getItem('witcorp-user');
  const myEmail = userRaw ? JSON.parse(userRaw).email : '';
  const contactEmail = STATE.activeChatContact;
  if (!myEmail || !contactEmail) return;
  clearTimeout(window._typingTimer);
  window._typingTimer = setTimeout(() => {}, 3000);
}

async function sendTeamMessage() {
  const input = document.getElementById('teamChatInput');
  const text = input?.value.trim();
  if (!text) return;
  const userRaw = localStorage.getItem('witcorp-user');
  const myEmail = userRaw ? JSON.parse(userRaw).email : '';
  const contactEmail = STATE.activeChatContact;
  if (!contactEmail) { showToast('Select a contact first'); return; }

  const msgBody = {
    sender_email: myEmail,
    receiver_email: contactEmail,
    message: text,
    message_type: 'text'
  };
  if (STATE.replyToMsg) {
    msgBody.reply_to = STATE.replyToMsg.id;
  }

  input.value = '';
  clearReply();
  await supabaseInsert('team_messages', msgBody);
  await renderTeamMessages();
  await renderTeamContacts();
}

function openEmojiPicker() {
  const modal = document.getElementById('emojiPickerModal');
  if (!modal) return;
  const isVisible = modal.style.display !== 'none' && modal.style.display !== '';
  modal.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    const grid = document.getElementById('emojiGrid');
    if (grid) {
      grid.innerHTML = EMOJI_LIST.map(emoji => `
        <button class="emoji-btn" onclick="insertEmoji('${emoji}')">${emoji}</button>
      `).join('');
    }
  }
}

function filterEmoji(query) {
  // Simple filter — show all since we don't have names
  const grid = document.getElementById('emojiGrid');
  if (grid) {
    grid.innerHTML = EMOJI_LIST.map(emoji => `
      <button class="emoji-btn" onclick="insertEmoji('${emoji}')">${emoji}</button>
    `).join('');
  }
}

function insertEmoji(emoji) {
  const input = document.getElementById('teamChatInput');
  if (input) {
    const pos = input.selectionStart || input.value.length;
    input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
    input.focus();
    const newPos = pos + emoji.length;
    input.setSelectionRange(newPos, newPos);
  }
  const modal = document.getElementById('emojiPickerModal');
  if (modal) modal.style.display = 'none';
}

function attachFile() {
  showToast('📎 File attachment coming soon');
}

function startNewChat() {
  const emailInput = document.getElementById('newChatEmail');
  const email = emailInput?.value.trim().toLowerCase();
  if (!email || !email.includes('@')) { showToast('Enter a valid email address'); return; }
  const userRaw = localStorage.getItem('witcorp-user');
  const myEmail = userRaw ? JSON.parse(userRaw).email : '';
  if (email === myEmail) { showToast('Cannot message yourself!'); return; }
  emailInput.value = '';
  switchChatContact(email, email.split('@')[0]);
  showToast('💬 Chat started with ' + email);
}

/* =========================================================
   7. INITIALIZATION
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  initDarkMode();
  initTheme();
  loadUserInfo();
  setCurrentDate();
  attachGlobalListeners();
  initPresence();

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
  renderVaultTable();
  populateGSTClientDropdown();

  // Team chat polling
  renderTeamContacts();
  setInterval(async () => {
    await renderTeamContacts();
    if (STATE.activeChatContact) await renderTeamMessages();
  }, 5000);
});

function showPageLoader(show) {
  let loader = document.getElementById('pageLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'pageLoader';
    loader.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,.92);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;font-family:Inter,sans-serif';
    loader.innerHTML = `
      <div style="width:48px;height:48px;border:3px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:16px"></div>
      <div style="font-size:15px;font-weight:700;color:#6366f1">Loading WITCORP...</div>
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
    showToast('⚠️ Database connection issue. Check console.');
  }
}

/* =========================================================
   8. NAVIGATION
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
  closeContextMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'reports') setTimeout(renderBarChart, 100);
  if (page === 'vault') { renderVaultFolders(); renderVaultTable(); }
  if (page === 'teamchat') { renderTeamContacts(); renderTeamMessages(); }
}

/* =========================================================
   9. SIDEBAR TOGGLE
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
    if (btn) btn.style.display = window.innerWidth <= 1200 ? 'flex' : 'none';
    if (window.innerWidth > 1200) {
      document.getElementById('rightPanel')?.classList.remove('show-mobile');
    }
  };
  handleResize();
  window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', initRightPanelMobile);

/* =========================================================
   10. DATE
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
   11. DASHBOARD STATS
   ========================================================= */

function updateDashboardStats() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const totalClients = STATE.clients.length;
  const gstFiled = STATE.gstReturns.filter(g => g.status === 'Filed').length;
  const pendingTasks = STATE.tasks.filter(t => t.column_name !== 'done').length;
  const upcomingDue = STATE.calendarEvents.filter(e => {
    const diff = (new Date(e.event_date) - today) / (1000*60*60*24);
    return diff >= 0 && diff <= 7;
  }).length;
  const todayFilings = STATE.calendarEvents.filter(e => e.event_date === todayStr).length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('dash-total-clients', totalClients);
  set('dash-gst-filed', gstFiled);
  set('dash-pending-tasks', pendingTasks);
  set('dash-upcoming-due', upcomingDue);
  set('dash-today-filings', String(todayFilings).padStart(2, '0'));

  // GST Stats
  set('gst-filed', STATE.gstReturns.filter(g=>g.status==='Filed').length);
  set('gst-pending', STATE.gstReturns.filter(g=>g.status==='Pending').length);
  set('gst-overdue', STATE.gstReturns.filter(g=>g.status==='Overdue').length);
  set('gst-tax', '₹ ' + formatAmount(STATE.gstReturns.reduce((s,g)=>s+(g.tax_liability||0),0)));

  // ROC Stats
  set('roc-filed', STATE.rocFilings.filter(r=>r.status==='Filed').length);
  set('roc-inprog', STATE.rocFilings.filter(r=>r.status==='In Progress').length);
  set('roc-overdue', STATE.rocFilings.filter(r=>r.status==='Overdue').length);
  set('roc-companies', STATE.clients.filter(c=>c.type==='Company').length);

  // ITR Stats
  set('itr-filed', STATE.itrFilings.filter(i=>i.status==='Filed').length);
  set('itr-pending', STATE.itrFilings.filter(i=>i.status==='Pending'||i.status==='In Progress').length);
  set('itr-refund', '₹ ' + formatAmount(STATE.itrFilings.reduce((s,i)=>s+(i.tax_deducted||0),0)));
  set('itr-tax', '₹ ' + formatAmount(STATE.itrFilings.reduce((s,i)=>s+(i.gross_income||0)*0.1,0)));

  // TDS Stats
  set('tds-filed', STATE.tdsReturns.filter(t=>t.status==='Filed').length);
  set('tds-pending', STATE.tdsReturns.filter(t=>t.status==='Pending').length);
  set('tds-amount', '₹ ' + formatAmount(STATE.tdsReturns.reduce((s,t)=>s+(t.amount||0),0)));
  set('tds-challans', STATE.tdsReturns.filter(t=>t.status==='Filed').length);

  // Audit Stats
  set('audit-active', STATE.audits.filter(a=>a.status==='In Progress').length);
  set('audit-done', STATE.audits.filter(a=>a.status==='Completed').length);
  set('audit-review', STATE.audits.filter(a=>a.status==='In Review').length);
  set('audit-month', STATE.audits.filter(a => {
    if (!a.end_date) return false;
    const d = new Date(a.end_date);
    return d.getMonth()===today.getMonth() && d.getFullYear()===today.getFullYear();
  }).length);

  // DSC Stats
  set('dsc-active', STATE.dscRecords.filter(d=>d.status==='Active').length);
  set('dsc-expiring', STATE.dscRecords.filter(d=>(d.days_left||999)<=30).length);
  set('dsc-total', STATE.dscRecords.length);
  set('dsc-renewal', STATE.dscRecords.filter(d=>(d.days_left||999)<=30).length);

  // Accounting Stats
  const totalRev = STATE.accountingEntries.filter(t=>t.entry_type==='credit').reduce((s,t)=>s+(t.amount||0),0);
  const totalExp = STATE.accountingEntries.filter(t=>t.entry_type==='debit').reduce((s,t)=>s+(t.amount||0),0);
  const netProfit = totalRev - totalExp;
  const margin = totalRev ? Math.round((netProfit/totalRev)*100) : 0;
  set('acc-rev', '₹ ' + formatAmount(totalRev));
  set('acc-exp', '₹ ' + formatAmount(totalExp));
  set('acc-profit', '₹ ' + formatAmount(netProfit));
  set('acc-margin', margin + '%');

  // Task Stats
  const done = STATE.tasks.filter(t=>t.column_name==='done').length;
  const inprog = STATE.tasks.filter(t=>t.column_name==='inprogress').length;
  const todo = STATE.tasks.filter(t=>t.column_name==='todo').length;
  set('task-done', done);
  set('task-inprog', inprog);
  set('task-todo', todo);

  // Reports Stats
  const totalFilings = STATE.gstReturns.length+STATE.itrFilings.length+STATE.tdsReturns.length+STATE.rocFilings.length;
  const pct = STATE.tasks.length ? Math.round((done/STATE.tasks.length)*100) : 0;
  set('rpt-clients', STATE.clients.length);
  set('rpt-filings', totalFilings);
  set('rpt-revenue', '₹ ' + formatAmount(totalRev));
  set('rpt-pct', pct + '%');
  set('donutCenter', pct + '%');

  // Workspace overview
  set('ov-done', done);
  set('ov-inprog', inprog);
  set('ov-todo', todo);

  // Donut chart
  const donutChart = document.querySelector('#page-reports .donut-chart');
  if (donutChart && STATE.tasks.length) {
    const doneP = (done/STATE.tasks.length)*100;
    const ipP = (inprog/STATE.tasks.length)*100;
    donutChart.style.background = `conic-gradient(var(--success) 0% ${doneP}%, var(--info) ${doneP}% ${doneP+ipP}%, var(--warning) ${doneP+ipP}% 100%)`;
  }

  // Notif badge
  const pendingNotifs = STATE.gstReturns.filter(g=>g.status==='Pending').length + STATE.dscRecords.filter(d=>(d.days_left||999)<=30).length;
  const dot = document.getElementById('notifCount');
  if (dot) dot.textContent = pendingNotifs || '0';
}

/* =========================================================
   12. CLIENT MANAGEMENT
   ========================================================= */

function getFilteredClients() {
  const { search, status, type } = STATE.filters.clients;
  return STATE.clients.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search || (c.name||'').toLowerCase().includes(s) || (c.pan||'').toLowerCase().includes(s) || (c.email||'').toLowerCase().includes(s);
    return matchSearch && (!status||c.status===status) && (!type||c.type===type);
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

  tbody.innerHTML = pageItems.length ? pageItems.map(c => `
    <tr>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td>${escapeHtml(c.pan||'-')}</td>
      <td>${escapeHtml(c.type||'-')}</td>
      <td>${escapeHtml(c.gst||'-')}</td>
      <td>${escapeHtml(c.email||'-')}</td>
      <td>${escapeHtml(c.phone||'-')}</td>
      <td>${statusBadge(c.status)}</td>
      <td>
        <button class="btn-outline" style="padding:5px 10px;font-size:11.5px;margin-right:4px" onclick="viewClient(${c.id})">View</button>
        <button class="btn-outline" style="padding:5px 10px;font-size:11.5px;margin-right:4px" onclick="editClient(${c.id})">Edit</button>
        <button class="btn-outline" style="padding:5px 10px;font-size:11.5px;border-color:var(--danger);color:var(--danger)" onclick="deleteClientConfirm(${c.id})">Delete</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">No clients found</div><div class="empty-state-sub">Try adjusting filters or add a new client</div></div></td></tr>`;

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

function filterClientType(value) {
  STATE.filters.clients.type = value;
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
    <div class="form-grid">
      <div class="form-group"><label>Client Name</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.name)}</div></div>
      <div class="form-group"><label>PAN/TAN</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.pan||'-')}</div></div>
      <div class="form-group"><label>Type</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.type||'-')}</div></div>
      <div class="form-group"><label>GST Number</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.gst||'-')}</div></div>
      <div class="form-group"><label>Email</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.email||'-')}</div></div>
      <div class="form-group"><label>Phone</label><div class="form-control" style="background:var(--bg)">${escapeHtml(c.phone||'-')}</div></div>
    </div>
    <div class="form-group"><label>Status</label><div>${statusBadge(c.status)}</div></div>
    <button class="btn-primary" style="width:100%;margin-top:12px" onclick="closeModal()">Close</button>
  `);
}

function editClient(id) {
  const c = STATE.clients.find(x => x.id === id);
  if (!c) return;
  openModalWithContent(`✏️ Edit — ${escapeHtml(c.name)}`, `
    <div class="form-grid">
      <div class="form-group"><label>Client Name</label><input type="text" class="form-control" id="editClientName" value="${escapeHtml(c.name)}" /></div>
      <div class="form-group"><label>Email</label><input type="text" class="form-control" id="editClientEmail" value="${escapeHtml(c.email||'')}" /></div>
      <div class="form-group"><label>Phone</label><input type="text" class="form-control" id="editClientPhone" value="${escapeHtml(c.phone||'')}" /></div>
      <div class="form-group"><label>GST Number</label><input type="text" class="form-control" id="editClientGST" value="${escapeHtml(c.gst||'')}" /></div>
    </div>
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="editClientStatus">
        <option ${c.status==='Active'?'selected':''}>Active</option>
        <option ${c.status==='Inactive'?'selected':''}>Inactive</option>
        <option ${c.status==='Pending'?'selected':''}>Pending</option>
      </select>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:12px" onclick="saveClientEdit(${id})">💾 Save Changes</button>
  `);
}

async function saveClientEdit(id) {
  const name = document.getElementById('editClientName')?.value.trim();
  if (!name) { showToast('Client name required'); return; }
  const updated = {
    name,
    email: document.getElementById('editClientEmail')?.value.trim(),
    phone: document.getElementById('editClientPhone')?.value.trim(),
    gst: document.getElementById('editClientGST')?.value.trim(),
    status: document.getElementById('editClientStatus')?.value
  };
  const ok = await supabaseUpdate('clients', id, updated);
  if (ok) {
    const idx = STATE.clients.findIndex(c => c.id === id);
    if (idx !== -1) STATE.clients[idx] = { ...STATE.clients[idx], ...updated };
    closeModal(); renderClientTable(); updateDashboardStats(); showToast('✅ Client updated!');
  } else { showToast('❌ Update failed'); }
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
  if (ok) {
    STATE.clients = STATE.clients.filter(c => c.id !== id);
    closeModal(); renderClientTable(); updateDashboardStats(); showToast('🗑️ Client deleted');
  }
}

/* =========================================================
   13. GST DASHBOARD
   ========================================================= */

function populateGSTClientDropdown() {
  ['gstClientSel', 'itrClientSel'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel || !STATE.clients.length) return;
    sel.innerHTML = '<option value="">Select Client</option>' + STATE.clients.map(c => `<option>${escapeHtml(c.name)}</option>`).join('');
  });
}

function renderGSTPage() {
  const listEl = document.getElementById('gstReturnList');
  const upcomingEl = document.getElementById('gstUpcoming');
  if (listEl) {
    listEl.innerHTML = STATE.gstReturns.length ? STATE.gstReturns.map(g => `
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
    `).join('') : '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No GST returns yet</div></div>';
  }
  if (upcomingEl) {
    const upcoming = STATE.calendarEvents.slice(0, 5);
    upcomingEl.innerHTML = upcoming.length ? upcoming.map(e => `
      <div class="upcoming-item">
        <div><div class="gst-item-name">${escapeHtml(e.title)}</div><div class="gst-item-sub">${escapeHtml(e.event_type||'')}</div></div>
        <div class="gst-item-sub fw-bold">${escapeHtml(e.event_date)}</div>
      </div>
    `).join('') : '<div class="empty-state"><div class="empty-state-text">No upcoming filings</div></div>';
  }
  updateDashboardStats();
}

async function submitGSTReturn() {
  const gstSelEl = document.getElementById('gstClientSel');
  const clientName = gstSelEl?.value;
  if (!clientName || clientName === 'Select Client') { showToast('Please select a client'); return; }
  const selects = document.querySelectorAll('#page-gst select');
  const inputs = document.querySelectorAll('#page-gst input[type="text"], #page-gst input[type="number"]');
  const body = {
    client_name: clientName,
    return_type: selects[1]?.value || 'GSTR-1',
    period: selects[2]?.value || '',
    gstin: inputs[0]?.value || '',
    total_turnover: parseFloat(inputs[1]?.value) || 0,
    tax_liability: parseFloat(inputs[2]?.value) || 0,
    status: 'Filed',
    filed_date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  };
  const result = await supabaseInsert('gst_returns', body);
  if (result?.[0]) { STATE.gstReturns.unshift(result[0]); renderGSTPage(); showToast('✅ GST Return filed!'); }
  else showToast('❌ Failed to file GST return');
}

async function deleteGSTReturn(id) {
  const ok = await supabaseDelete('gst_returns', id);
  if (ok) { STATE.gstReturns = STATE.gstReturns.filter(g => g.id !== id); renderGSTPage(); showToast('🗑️ GST return deleted'); }
}

/* =========================================================
   14. ROC FILINGS
   ========================================================= */

function renderROCTable() {
  const tbody = document.getElementById('rocTableBody');
  if (!tbody) return;
  tbody.innerHTML = STATE.rocFilings.length ? STATE.rocFilings.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.company)}</strong></td>
      <td>${escapeHtml(r.cin||'-')}</td>
      <td>${escapeHtml(r.form||'-')}</td>
      <td>${escapeHtml(r.due_date||'-')}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <button class="btn-outline" style="padding:5px 10px;font-size:11.5px;margin-right:4px" onclick="editROCStatus(${r.id})">Update</button>
        <button class="btn-outline" style="padding:5px 10px;font-size:11.5px;border-color:var(--danger);color:var(--danger)" onclick="deleteROC(${r.id})">Delete</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-text">No ROC filings yet</div></div></td></tr>`;
  updateDashboardStats();
}

function editROCStatus(id) {
  const r = STATE.rocFilings.find(x => x.id === id);
  if (!r) return;
  openModalWithContent(`Update ROC — ${escapeHtml(r.company)}`, `
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
  const status = document.getElementById('rocStatusSel')?.value;
  const ok = await supabaseUpdate('roc_filings', id, { status });
  if (ok) {
    const idx = STATE.rocFilings.findIndex(r => r.id === id);
    if (idx !== -1) STATE.rocFilings[idx].status = status;
    closeModal(); renderROCTable(); showToast('✅ ROC status updated');
  }
}

async function deleteROC(id) {
  const ok = await supabaseDelete('roc_filings', id);
  if (ok) { STATE.rocFilings = STATE.rocFilings.filter(r => r.id !== id); renderROCTable(); showToast('🗑️ ROC filing deleted'); }
}

/* =========================================================
   15. INCOME TAX
   ========================================================= */

function renderITRList() {
  const el = document.getElementById('itrList');
  if (!el) return;
  el.innerHTML = STATE.itrFilings.length ? STATE.itrFilings.map(itr => `
    <div class="itr-item">
      <div>
        <div class="gst-item-name">${escapeHtml(itr.client_name)}</div>
        <div class="gst-item-sub">${escapeHtml(itr.form)} • AY ${escapeHtml(itr.assessment_year)} • ${escapeHtml(itr.filed_date||'-')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${statusBadge(itr.status)}
        <button class="btn-outline" style="padding:4px 10px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteITR(${itr.id})">✕</button>
      </div>
    </div>
  `).join('') : '<div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-text">No ITR filings yet</div></div>';
  updateDashboardStats();
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
  if (result?.[0]) { STATE.itrFilings.unshift(result[0]); renderITRList(); showToast('✅ ITR filed!'); }
  else showToast('❌ ITR filing failed');
}

async function deleteITR(id) {
  const ok = await supabaseDelete('itr_filings', id);
  if (ok) { STATE.itrFilings = STATE.itrFilings.filter(i => i.id !== id); renderITRList(); showToast('🗑️ ITR deleted'); }
}

/* =========================================================
   16. TDS RETURNS
   ========================================================= */

function renderTDSTable() {
  const tbody = document.getElementById('tdsTableBody');
  if (!tbody) return;
  tbody.innerHTML = STATE.tdsReturns.length ? STATE.tdsReturns.map(t => `
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
  `).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">No TDS returns yet</div></div></td></tr>`;
  updateDashboardStats();
}

async function submitTDS() {
  const inputs = document.querySelectorAll('#page-tds input[type="text"], #page-tds input[type="number"]');
  const selects = document.querySelectorAll('#page-tds select');
  const deductor = inputs[0]?.value.trim();
  if (!deductor) { showToast('Please enter deductor name'); return; }
  const body = {
    deductor,
    tan: inputs[1]?.value.trim() || '',
    quarter: selects[0]?.value || '',
    form_type: selects[1]?.value || '',
    amount: parseFloat(inputs[2]?.value) || 0,
    challan_no: inputs[3]?.value.trim() || '',
    status: 'Filed'
  };
  const result = await supabaseInsert('tds_returns', body);
  if (result?.[0]) { STATE.tdsReturns.unshift(result[0]); renderTDSTable(); showToast('✅ TDS return submitted!'); }
  else showToast('❌ TDS submission failed');
}

async function deleteTDS(id) {
  const ok = await supabaseDelete('tds_returns', id);
  if (ok) { STATE.tdsReturns = STATE.tdsReturns.filter(t => t.id !== id); renderTDSTable(); showToast('🗑️ TDS deleted'); }
}

/* =========================================================
   17. AUDIT & ASSURANCE
   ========================================================= */

function renderAuditTable() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;
  tbody.innerHTML = STATE.audits.length ? STATE.audits.map(a => `
    <tr>
      <td><strong>${escapeHtml(a.client)}</strong></td>
      <td>${escapeHtml(a.audit_type||'-')}</td>
      <td>${escapeHtml(a.auditor||'-')}</td>
      <td>${escapeHtml(a.start_date||'-')}</td>
      <td>${escapeHtml(a.end_date||'-')}</td>
      <td>${statusBadge(a.status)}</td>
      <td>
        <button class="btn-outline" style="padding:5px 10px;font-size:11.5px;margin-right:4px" onclick="editAuditStatus(${a.id})">Update</button>
        <button class="btn-outline" style="padding:5px 10px;font-size:11.5px;border-color:var(--danger);color:var(--danger)" onclick="deleteAudit(${a.id})">Delete</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🛡️</div><div class="empty-state-text">No audits scheduled yet</div></div></td></tr>`;
  updateDashboardStats();
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
  const status = document.getElementById('auditStatusSel')?.value;
  const ok = await supabaseUpdate('audits', id, { status });
  if (ok) {
    const idx = STATE.audits.findIndex(a => a.id === id);
    if (idx !== -1) STATE.audits[idx].status = status;
    closeModal(); renderAuditTable(); showToast('✅ Audit status updated');
  }
}

async function deleteAudit(id) {
  const ok = await supabaseDelete('audits', id);
  if (ok) { STATE.audits = STATE.audits.filter(a => a.id !== id); renderAuditTable(); showToast('🗑️ Audit deleted'); }
}

/* =========================================================
   18. DSC & ESIGN
   ========================================================= */

function renderDSCAlerts() {
  const el = document.getElementById('dscAlertList');
  if (!el) return;
  el.innerHTML = STATE.dscRecords.length ? STATE.dscRecords.map(d => {
    const daysLeft = d.days_left || 999;
    return `
      <div class="dsc-alert-item">
        <div class="activity-dot ${daysLeft<=7?'orange':'blue'}">${daysLeft<=7?'⚠️':'🔐'}</div>
        <div style="flex:1">
          <div class="gst-item-name">${escapeHtml(d.client_name)}</div>
          <div class="gst-item-sub">${escapeHtml(d.purpose||'-')} • Expires ${escapeHtml(d.expiry_date||'-')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge ${daysLeft<=7?'badge-danger':'badge-warning'}">${daysLeft}d left</span>
          <button class="btn-outline" style="padding:4px 10px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteDSC(${d.id})">✕</button>
        </div>
      </div>
    `;
  }).join('') : '<div class="empty-state"><div class="empty-state-icon">✍️</div><div class="empty-state-text">No DSC records</div></div>';
  updateDashboardStats();
}

async function submitDSC() {
  const inputs = document.querySelectorAll('#page-dsc input[type="text"]');
  const selects = document.querySelectorAll('#page-dsc select');
  const clientName = inputs[0]?.value.trim();
  if (!clientName) { showToast('Please enter client name'); return; }
  const validity = selects[1]?.value || '2 Years';
  const years = parseInt(validity) || 2;
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + years);
  const daysLeft = Math.ceil((expiryDate - new Date()) / (1000*60*60*24));
  const body = {
    client_name: clientName,
    pan: inputs[1]?.value.trim() || '',
    dsc_type: selects[0]?.value || '',
    validity,
    purpose: selects[2]?.value || '',
    expiry_date: expiryDate.toISOString().split('T')[0],
    days_left: daysLeft,
    status: 'Active'
  };
  const result = await supabaseInsert('dsc_records', body);
  if (result?.[0]) { STATE.dscRecords.unshift(result[0]); renderDSCAlerts(); showToast('✅ DSC request submitted!'); }
  else showToast('❌ DSC submission failed');
}

async function deleteDSC(id) {
  const ok = await supabaseDelete('dsc_records', id);
  if (ok) { STATE.dscRecords = STATE.dscRecords.filter(d => d.id !== id); renderDSCAlerts(); showToast('🗑️ DSC deleted'); }
}

/* =========================================================
   19. ACCOUNTING HUB
   ========================================================= */

function renderAccountingList() {
  const el = document.getElementById('accountingList');
  if (!el) return;
  el.innerHTML = STATE.accountingEntries.length ? STATE.accountingEntries.map(t => `
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
  `).join('') : '<div class="empty-state"><div class="empty-state-icon">🧮</div><div class="empty-state-text">No entries yet</div></div>';
  updateDashboardStats();
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
  const entryType = ['Receipt','Sales','Invoice'].includes(voucherType) ? 'credit' : 'debit';
  const body = {
    narration, voucher_type: voucherType,
    debit_account: inputs[0]?.value.trim() || '',
    credit_account: inputs[1]?.value.trim() || '',
    amount, entry_type: entryType,
    entry_date: dateEl?.value || new Date().toISOString().split('T')[0]
  };
  const result = await supabaseInsert('accounting_entries', body);
  if (result?.[0]) { STATE.accountingEntries.unshift(result[0]); renderAccountingList(); showToast('✅ Journal entry posted!'); }
  else showToast('❌ Entry failed');
}

async function deleteAccEntry(id) {
  const ok = await supabaseDelete('accounting_entries', id);
  if (ok) { STATE.accountingEntries = STATE.accountingEntries.filter(t => t.id !== id); renderAccountingList(); showToast('🗑️ Entry deleted'); }
}

/* =========================================================
   20. TASK MANAGER (KANBAN)
   ========================================================= */

function renderKanban() {
  ['todo','inprogress','done'].forEach(col => {
    const container = document.getElementById(col + 'Cards');
    const countEl = document.getElementById(col + 'Count');
    if (!container) return;
    const items = STATE.tasks.filter(t => t.column_name === col);
    if (countEl) countEl.textContent = items.length;
    container.innerHTML = items.length ? items.map(t => `
      <div class="task-card" data-id="${t.id}" draggable="true" ondragstart="dragStart(event)" onclick="openTaskDetail(${t.id})">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">${(t.tags||[]).map(tag=>`<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="task-meta">
          <span>👤 ${escapeHtml(t.assignee||'Unassigned')}</span>
          <span>📅 ${escapeHtml(t.due_date||'TBD')}</span>
        </div>
      </div>
    `).join('') : `<div class="empty-state" style="padding:20px 10px"><div class="empty-state-text" style="font-size:13px">No tasks here</div></div>`;
    container.ondragover = e => e.preventDefault();
    container.ondrop = e => dropTask(e, col);
  });
  updateDashboardStats();
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
    showToast('✅ Task moved to ' + { todo:'To Do', inprogress:'In Progress', done:'Done' }[targetCol]);
  }
  draggedTaskId = null;
}

function addTask(col) {
  openModalWithContent('➕ Add Task', `
    <div class="form-group"><label>Task Title *</label><input type="text" class="form-control" id="newTaskTitle" placeholder="Enter task title" /></div>
    <div class="form-group"><label>Tags (comma separated)</label><input type="text" class="form-control" id="newTaskTags" placeholder="e.g. GST, High" /></div>
    <div class="form-group"><label>Assignee</label>
      <select class="form-control" id="newTaskAssignee"><option>Kamlesh</option><option>Anjali</option><option>Sameer</option><option>Priya</option><option>Vikram</option></select>
    </div>
    <div class="form-group"><label>Due Date</label><input type="text" class="form-control" id="newTaskDue" placeholder="e.g. 28 May" /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="createTask('${col}')">Add Task</button>
  `);
}

async function createTask(col) {
  const title = document.getElementById('newTaskTitle')?.value.trim();
  if (!title) { showToast('Please enter task title'); return; }
  const tagsRaw = document.getElementById('newTaskTags')?.value.trim();
  const body = {
    title,
    tags: tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : [],
    assignee: document.getElementById('newTaskAssignee')?.value || 'Kamlesh',
    due_date: document.getElementById('newTaskDue')?.value.trim() || 'TBD',
    column_name: col
  };
  const result = await supabaseInsert('tasks', body);
  if (result?.[0]) { STATE.tasks.unshift(result[0]); closeModal(); renderKanban(); showToast('✅ Task added!'); }
  else showToast('❌ Failed to add task');
}

function openTaskDetail(id) {
  const task = STATE.tasks.find(t => t.id === id);
  if (!task) return;
  openModalWithContent('📋 Task Details', `
    <div class="form-group"><label>Title</label><input type="text" class="form-control" id="editTaskTitle" value="${escapeHtml(task.title)}" /></div>
    <div class="form-group"><label>Assignee</label>
      <select class="form-control" id="taskAssigneeSel">
        ${['Kamlesh','Punit','Shankar','Ganga','Damini'].map(a=>`<option ${task.assignee===a?'selected':''}>${a}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Due Date</label><input type="text" class="form-control" id="editTaskDue" value="${escapeHtml(task.due_date||'')}" /></div>
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
    assignee: document.getElementById('taskAssigneeSel')?.value || '',
    due_date: document.getElementById('editTaskDue')?.value.trim() || '',
    column_name: document.getElementById('taskStatusSelect')?.value || 'todo'
  };
  const ok = await supabaseUpdate('tasks', id, updated);
  if (ok) {
    const idx = STATE.tasks.findIndex(t => t.id === id);
    if (idx !== -1) STATE.tasks[idx] = { ...STATE.tasks[idx], ...updated };
    closeModal(); renderKanban(); showToast('✅ Task updated!');
  }
}

async function deleteTask(id) {
  const ok = await supabaseDelete('tasks', id);
  if (ok) { STATE.tasks = STATE.tasks.filter(t => t.id !== id); closeModal(); renderKanban(); showToast('🗑️ Task deleted'); }
}

/* =========================================================
   21. REPORTS
   ========================================================= */

function renderBarChart() {
  const el = document.getElementById('barChart');
  if (!el) return;
  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  const data = months.map((label, i) => {
    const count = STATE.gstReturns.filter(g => g.filed_date && new Date(g.filed_date).getMonth()===i).length +
                  STATE.itrFilings.filter(itr => itr.filed_date && new Date(itr.filed_date).getMonth()===i).length;
    return { label, value: count };
  });
  const max = Math.max(...data.map(d=>d.value), 1);
  el.innerHTML = data.map(d => `
    <div class="bar-item">
      <div class="bar-fill" style="height:0%" data-target="${(d.value/max)*100}"></div>
      <div class="bar-label">${d.label}${d.value > 0 ? ' ('+d.value+')' : ''}</div>
    </div>
  `).join('');
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll('#barChart .bar-fill').forEach(bar => {
        bar.style.height = bar.getAttribute('data-target') + '%';
      });
    }, 100);
  });
  updateDashboardStats();
}

function exportReport() { showToast('📥 Preparing export...'); }
function generateReport() { showToast('✅ Report generated!'); }

/* =========================================================
   22. AI ASSISTANT
   ========================================================= */

function getAIResponse(query) {
  const q = query.toLowerCase().trim();
  const { clients, gstReturns, tasks, tdsReturns } = STATE;

  if (q.includes('gst') && (q.includes('pending')||q.includes('show'))) {
    const pending = gstReturns.filter(g => g.status==='Pending'||g.status==='Overdue');
    if (!pending.length) return 'No pending GST returns right now! 🎉';
    return `${pending.length} GST returns need attention:<br><br>` +
      pending.map(g => `• <strong>${escapeHtml(g.client_name)}</strong> — ${g.return_type} (${g.period}) — <span style="color:${g.status==='Overdue'?'var(--danger)':'var(--warning)'}">${g.status}</span>`).join('<br>');
  }
  if (q.includes('task')||q.includes('pending')) {
    const p = tasks.filter(t => t.column_name!=='done');
    if (!p.length) return 'No pending tasks! Everything is done. 🎉';
    return `${p.length} tasks pending:<br><br>` +
      p.slice(0,6).map(t => `• <strong>${escapeHtml(t.title)}</strong> — ${t.column_name==='todo'?'To Do':'In Progress'}, due ${t.due_date||'TBD'}`).join('<br>');
  }
  if (q.includes('tds')) {
    return `TDS Summary:<br>✅ Filed: <strong>${tdsReturns.filter(t=>t.status==='Filed').length}</strong><br>⏳ Pending: <strong>${tdsReturns.filter(t=>t.status==='Pending').length}</strong>`;
  }
  if (q.includes('client')) {
    return `Total clients: <strong>${clients.length}</strong><br>Active: <strong>${clients.filter(c=>c.status==='Active').length}</strong><br>Pending: <strong>${clients.filter(c=>c.status==='Pending').length}</strong>`;
  }
  if (q.includes('upcoming')||q.includes('due')||q.includes('compliance')) {
    return 'Check the <strong>Calendar</strong> page for all upcoming due dates. Click 📅 Calendar in the sidebar!';
  }
  const defaults = [
    'I can help with GST, TDS, ITR, clients, tasks & more. Try asking "show pending GST returns"!',
    'Ask me about: pending tasks, GST status, TDS filings, client list, upcoming compliances.',
    'Namaste! Try: "pending tasks", "GST due this week", "TDS filing status"'
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

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
  chatEl.insertAdjacentHTML('beforeend', `<div class="chat-msg bot" id="${typingId}"><div class="msg-avatar">🤖</div><div class="msg-content"><em>Thinking...</em></div></div>`);
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
   23. DOCUMENTS
   ========================================================= */

function renderDocuments() {
  const el = document.getElementById('docsGrid');
  if (!el) return;
  el.innerHTML = STATE.documents.length ? STATE.documents.map(d => `
    <div class="doc-card" onclick="showToast('Opening ${escapeHtml(d.name)}')">
      <div class="doc-icon">${d.icon||'📄'}</div>
      <div class="doc-name">${escapeHtml(d.name)}</div>
      <div class="doc-meta">${escapeHtml(d.client_name||'')} • ${escapeHtml(d.file_size||'')}</div>
      <button class="btn-outline" style="padding:4px 10px;font-size:11px;width:100%;margin-top:6px;border-color:var(--danger);color:var(--danger)" onclick="event.stopPropagation();deleteDoc(${d.id})">Delete</button>
    </div>
  `).join('') : '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📁</div><div class="empty-state-text">No documents yet</div><div class="empty-state-sub">Upload your first document</div></div>';
}

async function deleteDoc(id) {
  const ok = await supabaseDelete('documents', id);
  if (ok) { STATE.documents = STATE.documents.filter(d => d.id !== id); renderDocuments(); showToast('🗑️ Document deleted'); }
}

/* =========================================================
   24. CALENDAR
   ========================================================= */

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function renderCalendar() {
  const { month, year } = STATE.calendar;
  const titleEl = document.getElementById('calTitle');
  const gridEl = document.getElementById('calGrid');
  if (!titleEl || !gridEl) return;
  titleEl.textContent = MONTH_NAMES[month] + ' ' + year;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const eventMap = {};
  STATE.calendarEvents.forEach(e => {
    const d = new Date(e.event_date);
    if (d.getFullYear()===year && d.getMonth()===month) {
      eventMap[d.getDate()] = true;
    }
  });
  let html = '';
  for (let i=firstDay-1; i>=0; i--) html += `<div class="cal-day other-month">${daysInPrevMonth-i}</div>`;
  for (let d=1; d<=daysInMonth; d++) {
    const isToday = year===today.getFullYear() && month===today.getMonth() && d===today.getDate();
    html += `<div class="cal-day ${eventMap[d]?'has-event':''} ${isToday?'today':''}" onclick="showDayEvents(${d})">${d}</div>`;
  }
  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - (totalCells%7)) % 7;
  for (let d=1; d<=remaining; d++) html += `<div class="cal-day other-month">${d}</div>`;
  gridEl.innerHTML = html;
}

function showDayEvents(day) {
  const events = STATE.calendarEvents.filter(e => {
    const d = new Date(e.event_date);
    return d.getFullYear()===STATE.calendar.year && d.getMonth()===STATE.calendar.month && d.getDate()===day;
  });
  if (!events.length) { showToast('No events on ' + day + ' ' + MONTH_NAMES[STATE.calendar.month]); return; }
  openModalWithContent('📅 ' + day + ' ' + MONTH_NAMES[STATE.calendar.month], `
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
  const sorted = [...STATE.calendarEvents].sort((a,b) => new Date(a.event_date)-new Date(b.event_date));
  el.innerHTML = sorted.length ? sorted.map(e => `
    <div class="upcoming-item" style="margin-bottom:10px">
      <div><div class="gst-item-name">${escapeHtml(e.title)}</div><div class="gst-item-sub">${escapeHtml(e.event_type||'')}</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="gst-item-sub fw-bold">${escapeHtml(e.event_date)}</div>
        <button class="btn-outline" style="padding:3px 8px;font-size:11px;border-color:var(--danger);color:var(--danger)" onclick="deleteEvent(${e.id})">✕</button>
      </div>
    </div>
  `).join('') : '<div class="empty-state"><div class="empty-state-text">No events</div></div>';
}

async function deleteEvent(id) {
  const ok = await supabaseDelete('calendar_events', id);
  if (ok) {
    STATE.calendarEvents = STATE.calendarEvents.filter(e => e.id !== id);
    renderCalendar(); renderEventList(); renderDueDates(); showToast('🗑️ Event deleted');
  }
}

/* =========================================================
   25. RIGHT PANEL
   ========================================================= */

function renderDueDates() {
  const el = document.getElementById('dueDateList');
  if (!el) return;
  const today = new Date();
  const upcoming = STATE.calendarEvents
    .filter(e => new Date(e.event_date) >= today)
    .sort((a,b) => new Date(a.event_date)-new Date(b.event_date))
    .slice(0, 5);
  el.innerHTML = upcoming.length ? upcoming.map(e => {
    const d = new Date(e.event_date);
    const diff = Math.ceil((d-today)/(1000*60*60*24));
    const sub = diff===0?'Due Today':diff===1?'Due Tomorrow':'Due in '+diff+' days';
    return `
      <div class="due-item">
        <div class="due-date-badge"><div class="due-date-num">${d.getDate()}</div><div class="due-date-mon">${MONTH_NAMES[d.getMonth()].slice(0,3)}</div></div>
        <div style="flex:1"><div class="due-title">${escapeHtml(e.title)}</div><div class="due-sub ${diff<=1?'red':''}">${sub}</div></div>
      </div>
    `;
  }).join('') : '<div class="empty-state"><div class="empty-state-text">No upcoming dates</div></div>';
}

function renderActivity() {
  const el = document.getElementById('activityList');
  if (!el) return;
  const activities = [];
  STATE.gstReturns.filter(g=>g.status==='Filed').slice(0,2).forEach(g => {
    activities.push({ icon:'✅', color:'green', text:'GSTR filed for '+g.client_name, time:g.filed_date||'Recently' });
  });
  STATE.itrFilings.filter(i=>i.status==='Filed').slice(0,2).forEach(i => {
    activities.push({ icon:'💰', color:'blue', text:'ITR filed for '+i.client_name, time:i.filed_date||'Recently' });
  });
  STATE.tasks.filter(t=>t.column_name==='done').slice(0,2).forEach(t => {
    activities.push({ icon:'✅', color:'orange', text:t.title, time:'Completed' });
  });
  el.innerHTML = activities.length ? activities.slice(0,6).map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.color}">${a.icon}</div>
      <div><div class="activity-text">${escapeHtml(a.text)}</div><div class="activity-time">${escapeHtml(a.time)}</div></div>
    </div>
  `).join('') : '<div class="empty-state"><div class="empty-state-text">No recent activity</div></div>';
}

/* =========================================================
   26. MODALS
   ========================================================= */

function openModal(type) {
  const clientOptions = STATE.clients.slice(0,30).map(c => `<option>${escapeHtml(c.name)}</option>`).join('');
  const configs = {
    addClient: {
      title: '➕ Add New Client',
      body: `
        <div class="form-grid">
          <div class="form-group"><label>Client Name *</label><input type="text" class="form-control" id="addClientName" placeholder="Enter client name" /></div>
          <div class="form-group"><label>PAN / TAN</label><input type="text" class="form-control" id="addClientPAN" placeholder="Enter PAN/TAN" /></div>
          <div class="form-group"><label>Type</label>
            <select class="form-control" id="addClientType"><option>Individual</option><option>Company</option><option>LLP</option><option>Partnership</option></select>
          </div>
          <div class="form-group"><label>GST Number</label><input type="text" class="form-control" id="addClientGST" placeholder="GSTIN (optional)" /></div>
          <div class="form-group"><label>Email</label><input type="text" class="form-control" id="addClientEmail" placeholder="Enter email" /></div>
          <div class="form-group"><label>Phone</label><input type="text" class="form-control" id="addClientPhone" placeholder="Enter phone" /></div>
        </div>
        <button class="btn-primary" style="width:100%" onclick="submitAddClient()">✅ Add Client</button>
      `
    },
    gstReturn: { title:'📊 File GST Return', body:`<div style="text-align:center;padding:20px"><div style="font-size:36px">📊</div><p style="margin:12px 0">Use the GST Dashboard form</p><button class="btn-primary" onclick="closeModal();navigate('gst')">Go to GST Dashboard</button></div>` },
    rocFiling: {
      title:'🏛️ New ROC Filing',
      body:`
        <div class="form-group"><label>Company Name *</label><input type="text" class="form-control" id="rocCompany" placeholder="Enter company name" /></div>
        <div class="form-group"><label>CIN</label><input type="text" class="form-control" id="rocCIN" placeholder="Enter CIN" /></div>
        <div class="form-group"><label>Form Type</label>
          <select class="form-control" id="rocForm"><option>AOC-4</option><option>MGT-7</option><option>ADT-1</option><option>DIR-3 KYC</option><option>MGT-14</option></select>
        </div>
        <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="rocDue" /></div>
        <button class="btn-primary" style="width:100%" onclick="submitROCFiling()">✅ Create Filing</button>
      `
    },
    itrFiling: { title:'💰 File ITR', body:`<div style="text-align:center;padding:20px"><div style="font-size:36px">💰</div><p style="margin:12px 0">Use the Income Tax form</p><button class="btn-primary" onclick="closeModal();navigate('incometax')">Go to Income Tax</button></div>` },
    tdsReturn: { title:'🧾 File TDS', body:`<div style="text-align:center;padding:20px"><div style="font-size:36px">🧾</div><p style="margin:12px 0">Use the TDS Returns form</p><button class="btn-primary" onclick="closeModal();navigate('tds')">Go to TDS Returns</button></div>` },
    newAudit: {
      title:'🛡️ Schedule Audit',
      body:`
        <div class="form-group"><label>Client *</label><select class="form-control" id="auditClient"><option>Select Client</option>${clientOptions}</select></div>
        <div class="form-group"><label>Audit Type</label>
          <select class="form-control" id="auditType"><option>Statutory Audit</option><option>Tax Audit</option><option>Internal Audit</option><option>Stock Audit</option></select>
        </div>
        <div class="form-group"><label>Auditor</label>
          <select class="form-control" id="auditAuditor"><option>Kamlesh Yadav</option><option>Anjali Rao</option><option>Sameer Joshi</option></select>
        </div>
        <div class="form-group"><label>Start Date</label><input type="date" class="form-control" id="auditStart" /></div>
        <div class="form-group"><label>End Date</label><input type="date" class="form-control" id="auditEnd" /></div>
        <button class="btn-primary" style="width:100%" onclick="submitNewAudit()">✅ Schedule Audit</button>
      `
    },
    newDSC: { title:'✍️ New DSC', body:`<div style="text-align:center;padding:20px"><div style="font-size:36px">✍️</div><p style="margin:12px 0">Use the DSC & eSign form</p><button class="btn-primary" onclick="closeModal();navigate('dsc')">Go to DSC & eSign</button></div>` },
    addVaultItem: {
      title:'🔐 Add New Credential',
      body:`
        <div class="form-group"><label>Label *</label><input type="text" class="form-control" id="vaultLabel" placeholder="e.g. Gmail, Income Tax Portal" /></div>
        <div class="form-group"><label>Folder</label>
          <select class="form-control" id="vaultFolder">
            ${getVaultFolders().filter(f=>f!=='All').map(f=>`<option ${f===STATE.vaultSelectedFolder?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>URL</label><input type="text" class="form-control" id="vaultUrl" placeholder="https://..." /></div>
        <div class="form-group"><label>Username / Email</label><input type="text" class="form-control" id="vaultUsername" /></div>
        <div class="form-group"><label>Password</label>
          <div class="input-with-action">
            <input type="password" class="form-control" id="vaultPassword" />
            <button class="btn-icon-sm" onclick="togglePwViewModal('vaultPassword',this)" title="Show/hide">👁</button>
          </div>
        </div>
        <div class="form-group"><label>Notes</label><textarea class="form-control" id="vaultNotes" rows="2" placeholder="Additional notes..."></textarea></div>
        <button class="btn-primary" style="width:100%" onclick="submitVaultItem()">🔐 Save Credential</button>
      `
    },
    createVaultFolder: {
      title:'📁 Create New Folder',
      body:`
        <div class="form-group"><label>Folder Name *</label><input type="text" class="form-control" id="newFolderName" placeholder="e.g. Clients, Custom" /></div>
        <button class="btn-primary" style="width:100%" onclick="submitCreateFolder()">Create Folder</button>
      `
    },
    newEntry: { title:'🧮 Journal Entry', body:`<div style="text-align:center;padding:20px"><div style="font-size:36px">🧮</div><p style="margin:12px 0">Use the Accounting Hub form</p><button class="btn-primary" onclick="closeModal();navigate('accounting')">Go to Accounting Hub</button></div>` },
    newTask: {
      title:'✅ Add New Task',
      body:`
        <div class="form-group"><label>Task Title *</label><input type="text" class="form-control" id="newTaskTitleModal" placeholder="Enter task title" /></div>
        <div class="form-group"><label>Tags (comma separated)</label><input type="text" class="form-control" id="newTaskTagsModal" placeholder="e.g. GST, High" /></div>
        <div class="form-group"><label>Assignee</label>
          <select class="form-control" id="newTaskAssigneeModal"><option>Kamlesh</option><option>Anjali</option><option>Sameer</option><option>Priya</option><option>Vikram</option></select>
        </div>
        <div class="form-group"><label>Due Date</label><input type="text" class="form-control" id="newTaskDueModal" placeholder="e.g. 28 May" /></div>
        <div class="form-group"><label>Column</label>
          <select class="form-control" id="newTaskColModal"><option value="todo">To Do</option><option value="inprogress">In Progress</option><option value="done">Done</option></select>
        </div>
        <button class="btn-primary" style="width:100%" onclick="submitNewTaskModal()">✅ Add Task</button>
      `
    },
    uploadDoc: {
      title:'📁 Upload Document',
      body:`
        <div class="form-group"><label>Document Name *</label><input type="text" class="form-control" id="uploadDocName" placeholder="e.g. Balance Sheet FY24-25.pdf" /></div>
        <div class="form-group"><label>Client</label><select class="form-control" id="uploadDocClient"><option>Internal</option>${clientOptions}</select></div>
        <div class="form-group"><label>Type</label>
          <select class="form-control" id="uploadDocType"><option value="PDF">PDF</option><option value="Excel">Excel</option><option value="Word">Word</option><option value="Image">Image</option></select>
        </div>
        <div class="form-group"><label>File Size</label><input type="text" class="form-control" id="uploadDocSize" placeholder="e.g. 2.4 MB" /></div>
        <button class="btn-primary" style="width:100%" onclick="submitUploadDoc()">⬆ Upload</button>
      `
    },
    newEvent: {
      title:'📅 Add Calendar Event',
      body:`
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

/* ---- Submit Handlers ---- */

async function submitAddClient() {
  const name = document.getElementById('addClientName')?.value.trim();
  if (!name) { showToast('Client name is required'); return; }
  const body = {
    name,
    pan: document.getElementById('addClientPAN')?.value.trim() || '-',
    type: document.getElementById('addClientType')?.value || 'Individual',
    gst: document.getElementById('addClientGST')?.value.trim() || '-',
    email: document.getElementById('addClientEmail')?.value.trim() || '-',
    phone: document.getElementById('addClientPhone')?.value.trim() || '-',
    status: 'Active'
  };
  const result = await supabaseInsert('clients', body);
  if (result?.[0]) {
    STATE.clients.unshift(result[0]);
    closeModal(); renderClientTable(); updateDashboardStats(); populateGSTClientDropdown(); showToast('✅ Client added!');
  } else showToast('❌ Failed to add client');
}

async function submitROCFiling() {
  const company = document.getElementById('rocCompany')?.value.trim();
  if (!company) { showToast('Company name required'); return; }
  const body = {
    company,
    cin: document.getElementById('rocCIN')?.value.trim() || '-',
    form: document.getElementById('rocForm')?.value || 'AOC-4',
    due_date: document.getElementById('rocDue')?.value || 'TBD',
    status: 'In Progress'
  };
  const result = await supabaseInsert('roc_filings', body);
  if (result?.[0]) { STATE.rocFilings.unshift(result[0]); closeModal(); renderROCTable(); showToast('✅ ROC filing created!'); }
  else showToast('❌ ROC filing failed');
}

async function submitNewAudit() {
  const client = document.getElementById('auditClient')?.value;
  if (!client || client==='Select Client') { showToast('Please select a client'); return; }
  const body = {
    client,
    audit_type: document.getElementById('auditType')?.value || '',
    auditor: document.getElementById('auditAuditor')?.value || '',
    start_date: document.getElementById('auditStart')?.value || 'TBD',
    end_date: document.getElementById('auditEnd')?.value || 'TBD',
    status: 'In Progress'
  };
  const result = await supabaseInsert('audits', body);
  if (result?.[0]) { STATE.audits.unshift(result[0]); closeModal(); renderAuditTable(); showToast('✅ Audit scheduled!'); }
  else showToast('❌ Audit scheduling failed');
}

async function submitVaultItem() {
  const label = document.getElementById('vaultLabel')?.value.trim();
  if (!label) { showToast('Label is required'); return; }
  const body = {
    label,
    folder: document.getElementById('vaultFolder')?.value || 'General',
    url: document.getElementById('vaultUrl')?.value.trim() || '',
    username: document.getElementById('vaultUsername')?.value.trim() || '',
    password: document.getElementById('vaultPassword')?.value || '',
    notes: document.getElementById('vaultNotes')?.value.trim() || ''
  };
  const result = await supabaseInsert('vault_credentials', body);
  if (result?.[0]) {
    STATE.vaultCredentials.unshift(result[0]);
    closeModal(); renderVaultFolders(); renderVaultTable(); showToast('🔐 Credential saved!');
  } else showToast('❌ Failed to save credential');
}

async function submitCreateFolder() {
  const folderName = document.getElementById('newFolderName')?.value.trim();
  if (!folderName) { showToast('Folder name required'); return; }
  STATE.vaultSelectedFolder = folderName;
  closeModal(); renderVaultFolders(); renderVaultTable(); showToast('📁 Folder "' + folderName + '" created!');
}

async function submitNewTaskModal() {
  const title = document.getElementById('newTaskTitleModal')?.value.trim();
  if (!title) { showToast('Task title required'); return; }
  const tagsRaw = document.getElementById('newTaskTagsModal')?.value.trim();
  const body = {
    title,
    tags: tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : [],
    assignee: document.getElementById('newTaskAssigneeModal')?.value || 'Kamlesh',
    due_date: document.getElementById('newTaskDueModal')?.value.trim() || 'TBD',
    column_name: document.getElementById('newTaskColModal')?.value || 'todo'
  };
  const result = await supabaseInsert('tasks', body);
  if (result?.[0]) { STATE.tasks.unshift(result[0]); closeModal(); renderKanban(); showToast('✅ Task added!'); }
  else showToast('❌ Failed to add task');
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
  if (result?.[0]) { STATE.documents.unshift(result[0]); closeModal(); renderDocuments(); showToast('✅ Document uploaded!'); }
  else showToast('❌ Upload failed');
}

async function submitNewEvent() {
  const title = document.getElementById('newEventTitle')?.value.trim();
  const dateVal = document.getElementById('newEventDate')?.value;
  if (!title || !dateVal) { showToast('Please fill all fields'); return; }
  const body = {
    title,
    event_type: document.getElementById('newEventType')?.value || 'Internal',
    event_date: dateVal
  };
  const result = await supabaseInsert('calendar_events', body);
  if (result?.[0]) {
    STATE.calendarEvents.push(result[0]);
    closeModal(); renderCalendar(); renderEventList(); renderDueDates(); showToast('✅ Event added!');
  } else showToast('❌ Failed to add event');
}

/* =========================================================
   27. QUICK ACTION
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
   28. PROFILE & LOGOUT
   ========================================================= */

function loadUserInfo() {
  const userRaw = localStorage.getItem('witcorp-user');
  if (!userRaw) return;
  const user = JSON.parse(userRaw);
  const meta = user.user_metadata || {};
  const name = meta.full_name || (user.email ? user.email.split('@')[0] : 'User');
  const initial = name.charAt(0).toUpperCase();
  const initEl = document.getElementById('userInitial');
  const nameEl = document.getElementById('userDisplayName');
  const roleEl = document.getElementById('userDisplayRole');
  const welcomeEl = document.getElementById('welcomeUserName');
  if (initEl) initEl.textContent = initial;
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = meta.role || 'Member';
  if (welcomeEl) welcomeEl.textContent = name;
}

// Alias for compatibility
function loadUserInfoExtended() { loadUserInfo(); }

function openProfile() {
  const userRaw = localStorage.getItem('witcorp-user');
  const user = userRaw ? JSON.parse(userRaw) : {};
  const meta = user.user_metadata || {};
  const name = meta.full_name || (user.email ? user.email.split('@')[0] : 'User');
  const initial = name.charAt(0).toUpperCase();
  openModalWithContent('👤 My Profile', `
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;margin:0 auto 12px">${initial}</div>
      <div style="font-weight:700;font-size:16px">${escapeHtml(name)}</div>
      <div style="color:var(--text-muted);font-size:13px">WITCORP India Advisors LLP</div>
    </div>
    <div class="form-group"><label>Email</label><div class="form-control" style="background:var(--bg)">${escapeHtml(user.email||'Not available')}</div></div>
    <div class="form-group"><label>Role</label><div class="form-control" style="background:var(--bg)">${escapeHtml(meta.role||'Member')}</div></div>
    <div class="form-group"><label>Total Clients</label><div class="form-control" style="background:var(--bg)">${STATE.clients.length}</div></div>
    <div class="form-group"><label>Total Tasks</label><div class="form-control" style="background:var(--bg)">${STATE.tasks.length}</div></div>
    <button class="btn-outline" style="width:100%;margin-top:12px;border-color:var(--danger);color:var(--danger)" onclick="logout()">🚪 Logout</button>
  `);
}

async function logout() {
  if (typeof closeModal === 'function') closeModal();
  const token = localStorage.getItem('witcorp-access-token');
  if (token) {
    await fetch('https://yqbvdbsbuycxlsfkijhc.supabase.co/auth/v1/logout', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token }
    }).catch(() => {});
  }
  localStorage.clear();
  sessionStorage.clear();
  window.location.replace('login.html');
}

/* =========================================================
   29. GLOBAL SEARCH
   ========================================================= */

function handleSearch(query) {
  if (!query || query.trim().length < 2) return;
  clearTimeout(window._searchTimeout);
  window._searchTimeout = setTimeout(() => {
    const q = query.toLowerCase();
    const clients = STATE.clients.filter(c => (c.name||'').toLowerCase().includes(q)).length;
    const tasks = STATE.tasks.filter(t => (t.title||'').toLowerCase().includes(q)).length;
    const msg = [];
    if (clients) msg.push(clients + ' client(s)');
    if (tasks) msg.push(tasks + ' task(s)');
    if (msg.length) showToast('Found: ' + msg.join(', '));
  }, 500);
}

/* =========================================================
   30. TOAST
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
   31. KEYBOARD & GLOBAL LISTENERS
   ========================================================= */

function attachGlobalListeners() {
  document.addEventListener('keydown', e => {
    if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k') {
      e.preventDefault();
      document.getElementById('globalSearch')?.focus();
    }
    if (e.key === 'Escape') {
      closeModal();
      closeNotifications();
      closeContextMenu();
      const emojiModal = document.getElementById('emojiPickerModal');
      if (emojiModal) emojiModal.style.display = 'none';
      if (window.innerWidth <= 768) closeSidebar();
    }
  });
  document.addEventListener('click', e => {
    // Close notifications
    const panel = document.getElementById('notifPanel');
    if (panel?.classList.contains('show') && !panel.contains(e.target) && !e.target.closest('[onclick*="openNotifications"]')) {
      closeNotifications();
    }
    // Close emoji picker
    const emojiModal = document.getElementById('emojiPickerModal');
    if (emojiModal?.style.display !== 'none' && !emojiModal.contains(e.target) && !e.target.closest('[onclick*="openEmojiPicker"]')) {
      emojiModal.style.display = 'none';
    }
    // Close modal on backdrop
    const overlay = document.getElementById('modalOverlay');
    if (overlay?.classList.contains('show') && e.target === overlay) closeModal();
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 768) closeSidebar(); });
}

/* =========================================================
   32. NOTIFICATIONS
   ========================================================= */

function openNotifications() {
  const panel = document.getElementById('notifPanel');
  const isOpen = panel?.classList.contains('show');
  if (isOpen) { closeNotifications(); return; }
  if (panel) panel.classList.add('show');

  const notifList = document.getElementById('notifList');
  if (!notifList) return;
  const notifs = [];
  STATE.gstReturns.filter(g=>g.status==='Pending').slice(0,3).forEach(g => {
    notifs.push({ icon:'📊', text:'GSTR pending: ' + g.client_name + ' — ' + g.return_type, time:'Pending' });
  });
  STATE.dscRecords.filter(d=>(d.days_left||99)<=30).forEach(d => {
    notifs.push({ icon:'⚠️', text:'DSC expiring: ' + d.client_name + ' in ' + d.days_left + ' days', time:'Alert' });
  });
  STATE.tasks.filter(t=>t.column_name==='todo'&&(t.tags||[]).includes('High')).slice(0,2).forEach(t => {
    notifs.push({ icon:'🔴', text:'High priority: ' + t.title, time:'Task' });
  });

  notifList.innerHTML = (notifs.length ? notifs : [{ icon:'✅', text:'No new notifications', time:'' }]).map(n => `
    <div class="notif-item">
      <div class="notif-icon">${n.icon}</div>
      <div><div class="notif-text">${escapeHtml(n.text)}</div><div class="notif-time">${escapeHtml(n.time)}</div></div>
    </div>
  `).join('');

  const dot = document.getElementById('notifCount');
  if (dot) dot.textContent = notifs.length || '0';
}

function closeNotifications() {
  document.getElementById('notifPanel')?.classList.remove('show');
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
  if (num >= 100000) return (num/100000).toFixed(1) + 'L';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toLocaleString('en-IN');
}

function statusBadge(status) {
  const map = {
    'Active':'badge-success','Inactive':'badge-danger','Pending':'badge-warning',
    'Filed':'badge-success','Overdue':'badge-danger','In Progress':'badge-info',
    'In Review':'badge-purple','Completed':'badge-success','Expiring Soon':'badge-warning','Expired':'badge-danger'
  };
  return `<span class="badge ${map[status]||'badge-info'}">${escapeHtml(status||'—')}</span>`;
}

/* =========================================================
   END OF app_enhanced.js — WITCORP Enterprise Edition v2
   WhatsApp-style Chat + Professional Vault Table + Fixed Dark Mode
   ========================================================= */
