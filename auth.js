/* =============================================================
   WITCORP AUTH SYSTEM — auth.js  (FIXED v2)
   Supabase Auth | Google OAuth PKCE | Email/Password | Forgot Password
   ============================================================= */

var SUPABASE_URL = 'https://yqbvdbsbuycxlsfkijhc.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_5qNAkAQrO5yzGnDcNERPxg_pm2Jv8bw';

/* =========================================================
   AUTH API HELPER
   ========================================================= */

async function authRequest(endpoint, body) {
  try {
    var res = await fetch(SUPABASE_URL + '/auth/v1/' + endpoint, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    var data = await res.json();
    return { ok: res.ok, data: data };
  } catch (e) {
    console.error('authRequest error:', e);
    return { ok: false, data: { error_description: 'Network error. Please try again.' } };
  }
}

/* =========================================================
   SESSION MANAGEMENT
   ========================================================= */

async function getSession() {
  var token = null;
  try { token = localStorage.getItem('witcorp-access-token'); } catch (e) { return null; }
  if (!token) return null;
  try {
    var res = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token
      }
    });
    if (!res.ok) { clearSession(); return null; }
    var user = await res.json();
    /* Also save latest user data so profile modal can read it */
    try { localStorage.setItem('witcorp-user', JSON.stringify(user)); } catch(e) {}
    return user;
  } catch (e) {
    clearSession();
    return null;
  }
}

function saveSession(session) {
  try {
    if (session.access_token)  localStorage.setItem('witcorp-access-token',  session.access_token);
    if (session.refresh_token) localStorage.setItem('witcorp-refresh-token', session.refresh_token);
    /* session.user may come directly or nested */
    var u = session.user || session;
    if (u && (u.email || u.id)) {
      localStorage.setItem('witcorp-user', JSON.stringify(u));
    }
  } catch (e) {
    console.error('saveSession error:', e);
  }
}

function clearSession() {
  try {
    localStorage.removeItem('witcorp-access-token');
    localStorage.removeItem('witcorp-refresh-token');
    localStorage.removeItem('witcorp-user');
  } catch (e) {}
}

/* =========================================================
   GET CURRENT USER (from localStorage, fast)
   ========================================================= */

function getCurrentUser() {
  try {
    var raw = localStorage.getItem('witcorp-user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/* =========================================================
   LOGIN WITH EMAIL + PASSWORD
   ========================================================= */

async function loginWithEmail(email, password) {
  showAuthLoader(true);
  hideAuthError();
  var result = await authRequest('token?grant_type=password', { email: email, password: password });
  showAuthLoader(false);
  if (!result.ok) {
    var msg = (result.data && (result.data.error_description || result.data.msg || result.data.error))
      || 'Login failed. Check your credentials.';
    showAuthError(msg);
    return;
  }
  saveSession(result.data);
  redirectToDashboard();
}

/* =========================================================
   GOOGLE OAUTH LOGIN
   ========================================================= */

function loginWithGoogle() {
  var redirectTo = encodeURIComponent('https://kamalpoor.github.io/witcorpv5/');
  var url = SUPABASE_URL + '/auth/v1/authorize?provider=google&redirect_to=' + redirectTo;
  try {
    window.location.assign(url);
  } catch(e) {
    window.location.href = url;
  }
}

/* =========================================================
   HANDLE OAUTH CALLBACK — FIXED (was using await in non-async)
   Returns a Promise<boolean>
   ========================================================= */

async function handleOAuthCallback() {

  /* ── NEW PKCE flow: ?code=... ── */
  var searchParams = new URLSearchParams(window.location.search);
  var code = searchParams.get('code');

  if (code) {
    try {
      var res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=pkce', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ auth_code: code })
      });
      var data = await res.json();
      if (res.ok && data.access_token) {
        saveSession(data);
        try { window.history.replaceState({}, document.title, window.location.pathname); } catch(e) {}
        return true;
      }
    } catch(e) {
      console.error('PKCE code exchange failed:', e);
    }
    return false;
  }

  /* ── OLD implicit flow: #access_token=... ── */
  var hash = window.location.hash;
  if (!hash) return false;

  var params = new URLSearchParams(hash.replace('#', ''));
  var access_token  = params.get('access_token');
  var refresh_token = params.get('refresh_token');
  var error         = params.get('error');

  if (error) {
    console.error('OAuth error:', error, params.get('error_description'));
    return false;
  }
  if (!access_token) return false;

  try {
    var parts = access_token.split('.');
    if (parts.length < 2) return false;

    var payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );

    /* Build user object from JWT payload */
    var user = {
      id:    payload.sub   || '',
      email: payload.email || '',
      user_metadata: payload.user_metadata || {}
    };

    saveSession({
      access_token:  access_token,
      refresh_token: refresh_token || '',
      user:          user
    });

    /* Fetch full user profile from Supabase to get name etc. */
    try {
      var uRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + access_token
        }
      });
      if (uRes.ok) {
        var fullUser = await uRes.json();
        localStorage.setItem('witcorp-user', JSON.stringify(fullUser));
      }
    } catch(ue) { /* non-fatal */ }

  } catch (e) {
    console.error('Token parse error:', e);
    return false;
  }

  try { window.history.replaceState({}, document.title, window.location.pathname); } catch(e) {}
  return true;
}

/* =========================================================
   TOKEN REFRESH
   ========================================================= */

async function refreshToken() {
  var refreshTok = null;
  try { refreshTok = localStorage.getItem('witcorp-refresh-token'); } catch (e) {}
  if (!refreshTok) return false;

  try {
    var res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshTok })
    });
    if (!res.ok) { clearSession(); return false; }
    var data = await res.json();
    saveSession(data);
    return true;
  } catch (e) {
    return false;
  }
}

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

async function sendPasswordReset(email) {
  if (!email || !email.includes('@')) {
    showForgotError('Please enter a valid email address.');
    return;
  }
  showForgotLoader(true);
  hideForgotMessages();

  var redirectTo = 'https://kamalpoor.github.io/witcorpv5/login.html?type=recovery';
  var result = await authRequest('recover', {
    email: email,
    gotrue_meta_security: {},
    redirect_to: redirectTo
  });
  showForgotLoader(false);

  if (!result.ok) {
    var msg = (result.data && (result.data.error_description || result.data.msg || result.data.error))
      || 'Could not send reset email. Try again.';
    showForgotError(msg);
    return;
  }
  showForgotSuccess();
}

/* =========================================================
   UPDATE PASSWORD (after reset link)
   ========================================================= */

async function updatePassword(newPassword) {
  var token = null;
  try { token = localStorage.getItem('witcorp-access-token'); } catch (e) {}
  if (!token) {
    showResetError('Session expired. Please request a new reset link.');
    return;
  }
  try {
    var res = await fetch(SUPABASE_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: newPassword })
    });
    var data = await res.json();
    if (!res.ok) {
      showResetError(data.error_description || data.msg || 'Password update failed.');
      return;
    }
    showResetSuccess();
  } catch (e) {
    showResetError('Network error. Please try again.');
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {
  if (typeof closeModal === 'function') { try { closeModal(); } catch (e) {} }
  var token = null;
  try { token = localStorage.getItem('witcorp-access-token'); } catch (e) {}
  if (token) {
    try {
      await fetch(SUPABASE_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + token
        }
      });
    } catch (e) {}
  }
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {}
  window.location.replace('login.html');
}

/* =========================================================
   AUTH GUARD — call at top of index.html
   ========================================================= */

async function requireAuth() {
  /* Check OAuth callback first */
  var isCallback = await handleOAuthCallback();
  if (isCallback) { redirectToDashboard(); return; }

  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('type') === 'recovery') {
    window.location.href = 'login.html?type=recovery';
    return;
  }

  var user = await getSession();
  if (!user) {
    var refreshed = await refreshToken();
    if (!refreshed) { window.location.href = 'login.html'; }
  }
}

function redirectToDashboard() {
  window.location.replace('index.html');
}

/* =========================================================
   GET DISPLAY NAME — resolves in priority order
   1. profiles table (full_name)
   2. user_metadata.full_name / name
   3. email prefix
   ========================================================= */

async function getUserDisplayName() {
  var user = getCurrentUser();
  if (!user) return 'User';

  /* Try profiles table */
  var token = null;
  try { token = localStorage.getItem('witcorp-access-token'); } catch(e) {}
  if (token && user.id) {
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/profiles?id=eq.' + user.id + '&select=full_name,avatar_initial',
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        }
      );
      if (res.ok) {
        var rows = await res.json();
        if (rows && rows[0] && rows[0].full_name) {
          return rows[0].full_name;
        }
      }
    } catch(e) {}
  }

  /* Fallback: user_metadata */
  var meta = user.user_metadata || {};
  if (meta.full_name) return meta.full_name;
  if (meta.name)      return meta.name;

  /* Fallback: email prefix */
  if (user.email) return user.email.split('@')[0];

  return 'User';
}

/* =========================================================
   OPEN PROFILE MODAL (call this from index.html)
   ========================================================= */

async function openProfileModal() {
  var user = getCurrentUser();

  /* Refresh user data from server */
  var token = null;
  try { token = localStorage.getItem('witcorp-access-token'); } catch(e) {}
  if (token) {
    try {
      var res = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token }
      });
      if (res.ok) {
        user = await res.json();
        try { localStorage.setItem('witcorp-user', JSON.stringify(user)); } catch(e) {}
      }
    } catch(e) {}
  }

  /* Resolve display name */
  var displayName = await getUserDisplayName();
  var email = (user && user.email) ? user.email : 'Not available';
  var uid   = (user && user.id)    ? user.id    : 'N/A';

  /* Count clients (if table exists) */
  var clientCount = 'Loading…';
  if (token) {
    try {
      var cRes = await fetch(SUPABASE_URL + '/rest/v1/clients?select=id', {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + token,
          'Prefer': 'count=exact',
          'Range': '0-0'
        }
      });
      var contentRange = cRes.headers.get('Content-Range');
      if (contentRange) {
        var total = contentRange.split('/')[1];
        clientCount = total !== '*' ? total : '—';
      } else {
        clientCount = '—';
      }
    } catch(e) { clientCount = '—'; }
  }

  /* Avatar initial */
  var initial = displayName.charAt(0).toUpperCase() || 'U';

  /* Build / update modal */
  var existing = document.getElementById('witcorp-profile-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'witcorp-profile-modal';
  modal.style.cssText = [
    'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center',
    'background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);animation:fadeInBg 0.2s ease'
  ].join(';');

  modal.innerHTML = `
    <style>
      @keyframes fadeInBg { from{opacity:0} to{opacity:1} }
      @keyframes slideUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      #witcorp-profile-modal .pm-card {
        background:#1e293b;border:1px solid #334155;border-radius:20px;
        padding:32px 28px;width:100%;max-width:420px;margin:16px;
        box-shadow:0 24px 64px rgba(0,0,0,0.45);
        animation:slideUp 0.25s ease;font-family:'Inter',sans-serif;color:#f1f5f9;
      }
      #witcorp-profile-modal .pm-header {
        display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;
      }
      #witcorp-profile-modal .pm-title {
        font-size:16px;font-weight:700;color:#f1f5f9;display:flex;align-items:center;gap:8px;
      }
      #witcorp-profile-modal .pm-close {
        background:none;border:1px solid #334155;border-radius:8px;color:#94a3b8;
        width:32px;height:32px;cursor:pointer;font-size:16px;line-height:1;
        display:flex;align-items:center;justify-content:center;transition:all 0.15s;
      }
      #witcorp-profile-modal .pm-close:hover { border-color:#6366f1;color:#f1f5f9; }
      #witcorp-profile-modal .pm-avatar {
        width:72px;height:72px;border-radius:50%;
        background:linear-gradient(135deg,#6366f1,#4f46e5);
        display:flex;align-items:center;justify-content:center;
        font-size:28px;font-weight:800;color:#fff;margin:0 auto 12px;
        box-shadow:0 0 0 4px rgba(99,102,241,0.2);
      }
      #witcorp-profile-modal .pm-name {
        text-align:center;font-size:18px;font-weight:700;color:#f1f5f9;margin-bottom:4px;
      }
      #witcorp-profile-modal .pm-org {
        text-align:center;font-size:12px;color:#94a3b8;margin-bottom:24px;
      }
      #witcorp-profile-modal .pm-field-label {
        font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;
        letter-spacing:0.6px;margin-bottom:6px;
      }
      #witcorp-profile-modal .pm-field-value {
        background:#0f172a;border:1.5px solid #334155;border-radius:10px;
        padding:10px 14px;font-size:14px;color:#f1f5f9;margin-bottom:16px;
        word-break:break-all;
      }
      #witcorp-profile-modal .pm-logout {
        width:100%;padding:12px;background:transparent;
        border:1.5px solid #ef4444;border-radius:10px;color:#ef4444;
        font-size:14px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;
        display:flex;align-items:center;justify-content:center;gap:8px;
        transition:all 0.2s;margin-top:4px;
      }
      #witcorp-profile-modal .pm-logout:hover {
        background:rgba(239,68,68,0.1);
      }
    </style>
    <div class="pm-card">
      <div class="pm-header">
        <div class="pm-title">👤 My Profile</div>
        <button class="pm-close" onclick="closeProfileModal()">✕</button>
      </div>
      <div class="pm-avatar">${initial}</div>
      <div class="pm-name">${_escHtml(displayName)}</div>
      <div class="pm-org">WITCORP India Advisors LLP</div>

      <div class="pm-field-label">Email Address</div>
      <div class="pm-field-value">${_escHtml(email)}</div>

      <div class="pm-field-label">User ID</div>
      <div class="pm-field-value" style="font-size:12px;color:#64748b;">${_escHtml(uid)}</div>

      <div class="pm-field-label">Total Clients</div>
      <div class="pm-field-value" id="pm-client-count">${_escHtml(String(clientCount))}</div>

      <button class="pm-logout" onclick="logout()">🚪 Logout</button>
    </div>
  `;

  /* Close on backdrop click */
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeProfileModal();
  });

  document.body.appendChild(modal);
}

function closeProfileModal() {
  var m = document.getElementById('witcorp-profile-modal');
  if (m) m.remove();
}

function _escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* =========================================================
   POPULATE TOPBAR USER INFO (call after DOM ready in index.html)
   ========================================================= */

async function populateTopbarUser() {
  var displayName = await getUserDisplayName();
  var user = getCurrentUser();
  var initial = displayName.charAt(0).toUpperCase() || 'U';

  /* Update any element with id="topbar-username" */
  var nameEl = document.getElementById('topbar-username');
  if (nameEl) nameEl.textContent = displayName;

  /* Update any avatar element with id="topbar-avatar" */
  var avatarEl = document.getElementById('topbar-avatar');
  if (avatarEl) {
    /* If it's an img tag with no valid src, replace with initial */
    if (user && user.user_metadata && user.user_metadata.avatar_url) {
      if (avatarEl.tagName === 'IMG') {
        avatarEl.src = user.user_metadata.avatar_url;
      } else {
        avatarEl.textContent = initial;
      }
    } else {
      if (avatarEl.tagName !== 'IMG') avatarEl.textContent = initial;
    }
  }

  /* Also update any element with class "user-initial-badge" */
  document.querySelectorAll('.user-initial-badge').forEach(function(el) {
    el.textContent = initial;
  });

  /* Update elements with class "user-display-name" */
  document.querySelectorAll('.user-display-name').forEach(function(el) {
    el.textContent = displayName;
  });
}

/* =========================================================
   UI HELPERS
   ========================================================= */

function showAuthLoader(show) {
  var btn = document.getElementById('loginBtn');
  if (!btn) return;
  btn.disabled = show;
  btn.innerHTML = show
    ? '<span class="auth-spinner"></span> Signing in...'
    : 'Sign In →';
}

function showAuthError(msg) {
  var el = document.getElementById('authError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideAuthError() {
  var el = document.getElementById('authError');
  if (el) el.style.display = 'none';
}

function showForgotLoader(show) {
  var btn = document.getElementById('forgotBtn');
  if (!btn) return;
  btn.disabled = show;
  btn.innerHTML = show
    ? '<span class="auth-spinner"></span> Sending...'
    : 'Send Reset Email';
}

function showForgotError(msg) {
  var el = document.getElementById('forgotError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  var s = document.getElementById('forgotSuccess');
  if (s) s.style.display = 'none';
}

function showForgotSuccess() {
  var el = document.getElementById('forgotSuccess');
  if (el) el.style.display = 'block';
  var e = document.getElementById('forgotError');
  if (e) e.style.display = 'none';
  var btn = document.getElementById('forgotBtn');
  if (btn) { btn.textContent = '✓ Email Sent!'; btn.disabled = true; }
}

function hideForgotMessages() {
  var e = document.getElementById('forgotError');
  var s = document.getElementById('forgotSuccess');
  if (e) e.style.display = 'none';
  if (s) s.style.display = 'none';
}

function showResetError(msg) {
  var el = document.getElementById('resetError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  var s = document.getElementById('resetSuccess');
  if (s) s.style.display = 'none';
}

function showResetSuccess() {
  var el = document.getElementById('resetSuccess');
  if (el) el.style.display = 'block';
  var e = document.getElementById('resetError');
  if (e) e.style.display = 'none';
  setTimeout(function () { window.location.replace('index.html'); }, 2000);
}

function showToastAuth(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3000);
}

/* =========================================================
   END OF auth.js
   ========================================================= */
