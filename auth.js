/* =============================================================
   WITCORP AUTH SYSTEM — auth.js (PRODUCTION v3.1 FIXED)
   Supabase Auth | Google OAuth PKCE | Email/Password | Forgot Password
   ✅ All errors fixed
   ============================================================= */

var SUPABASE_URL = 'https://yqbvdbsbuycxlsfkijhc.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_5qNAkAQrO5yzGnDcNERPxg_pm2Jv8bw';
var REDIRECT_URL = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/') + '/';

/* =========================================================
   AUTH API HELPER
   ========================================================= */

async function authRequest(endpoint, body) {
  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/' + endpoint, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data: data };
  } catch (e) {
    console.error('[authRequest]', endpoint, e);
    return { ok: false, status: 0, data: { error_description: 'Network error. Please try again.' } };
  }
}

/* =========================================================
   SESSION MANAGEMENT
   ========================================================= */

async function getSession() {
  let token = null;
  try { 
    token = localStorage.getItem('witcorp-access-token'); 
  } catch (e) { 
    return null; 
  }
  
  if (!token) return null;
  
  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token
      }
    });
    
    if (!res.ok) { 
      clearSession(); 
      return null; 
    }
    
    const user = await res.json();
    try { 
      localStorage.setItem('witcorp-user', JSON.stringify(user)); 
    } catch(e) {}
    
    return user;
  } catch (e) {
    console.error('[getSession]', e);
    clearSession();
    return null;
  }
}

function saveSession(session) {
  if (!session) return;
  
  try {
    if (session.access_token) {
      localStorage.setItem('witcorp-access-token', session.access_token);
    }
    if (session.refresh_token) {
      localStorage.setItem('witcorp-refresh-token', session.refresh_token);
    }
    
    const u = session.user || session;
    if (u && (u.email || u.id)) {
      localStorage.setItem('witcorp-user', JSON.stringify(u));
    }
  } catch (e) {
    console.error('[saveSession]', e);
  }
}

function clearSession() {
  try {
    localStorage.removeItem('witcorp-access-token');
    localStorage.removeItem('witcorp-refresh-token');
    localStorage.removeItem('witcorp-user');
  } catch (e) {}
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('witcorp-user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { 
    return null; 
  }
}

/* =========================================================
   LOGIN WITH EMAIL + PASSWORD
   ========================================================= */

async function loginWithEmail(email, password) {
  if (!email || !password) {
    showAuthError('Email and password are required.');
    return;
  }

  showAuthLoader(true);
  hideAuthError();

  try {
    const result = await authRequest('token?grant_type=password', { 
      email: email.trim(), 
      password: password 
    });

    showAuthLoader(false);

    if (!result.ok) {
      let msg = 'Login failed. Please check your credentials.';
      if (result.data) {
        msg = result.data.error_description || result.data.msg || result.data.error || msg;
      }
      showAuthError(msg);
      return;
    }

    if (!result.data.access_token) {
      showAuthError('Invalid response from server.');
      return;
    }

    saveSession(result.data);
    redirectToDashboard();
  } catch (e) {
    console.error('[loginWithEmail]', e);
    showAuthLoader(false);
    showAuthError('An error occurred. Please try again.');
  }
}

/* =========================================================
   GOOGLE OAUTH LOGIN
   ========================================================= */

function loginWithGoogle() {
  try {
    const redirectTo = encodeURIComponent(REDIRECT_URL);
    const url = SUPABASE_URL + '/auth/v1/authorize?provider=google&redirect_to=' + redirectTo;
    window.location.href = url;
  } catch (e) {
    console.error('[loginWithGoogle]', e);
    showAuthError('Could not initiate Google login. Please try again.');
  }
}

/* =========================================================
   HANDLE OAUTH CALLBACK (PKCE + Implicit Flow)
   ========================================================= */

async function handleOAuthCallback() {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');

    if (code) {
      try {
        const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=pkce', {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ auth_code: code })
        });

        if (!res.ok) {
          console.error('[handleOAuthCallback PKCE] Failed:', res.status);
          return false;
        }

        const data = await res.json();
        if (data.access_token) {
          saveSession(data);
          
          try { 
            window.history.replaceState({}, document.title, window.location.pathname); 
          } catch(e) {}
          
          return true;
        }
      } catch(e) {
        console.error('[handleOAuthCallback PKCE error]', e);
      }
      return false;
    }

    const hash = window.location.hash;
    if (!hash) return false;

    const params = new URLSearchParams(hash.replace('#', ''));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const error = params.get('error');

    if (error) {
      console.error('[handleOAuthCallback] OAuth error:', error, params.get('error_description'));
      return false;
    }

    if (!access_token) return false;

    try {
      const parts = access_token.split('.');
      if (parts.length < 2) {
        console.error('[handleOAuthCallback] Invalid token format');
        return false;
      }

      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );

      const user = {
        id: payload.sub || '',
        email: payload.email || '',
        user_metadata: payload.user_metadata || {}
      };

      saveSession({
        access_token: access_token,
        refresh_token: refresh_token || '',
        user: user
      });

      try {
        const uRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + access_token
          }
        });
        
        if (uRes.ok) {
          const fullUser = await uRes.json();
          localStorage.setItem('witcorp-user', JSON.stringify(fullUser));
        }
      } catch(ue) { 
        console.error('[handleOAuthCallback] Could not fetch full user:', ue);
      }

      try { 
        window.history.replaceState({}, document.title, window.location.pathname); 
      } catch(e) {}

      return true;

    } catch (e) {
      console.error('[handleOAuthCallback] Token parse error:', e);
      return false;
    }
  } catch (e) {
    console.error('[handleOAuthCallback]', e);
    return false;
  }
}

/* =========================================================
   TOKEN REFRESH
   ========================================================= */

async function refreshToken() {
  let refreshTok = null;
  
  try { 
    refreshTok = localStorage.getItem('witcorp-refresh-token'); 
  } catch (e) {}

  if (!refreshTok) {
    console.warn('[refreshToken] No refresh token found');
    return false;
  }

  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshTok })
    });

    if (!res.ok) { 
      clearSession(); 
      return false; 
    }

    const data = await res.json();
    saveSession(data);
    return true;

  } catch (e) {
    console.error('[refreshToken]', e);
    return false;
  }
}

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

async function sendPasswordReset(email) {
  email = (email || '').trim();

  if (!email || !email.includes('@')) {
    showForgotError('Please enter a valid email address.');
    return;
  }

  showForgotLoader(true);
  hideForgotMessages();

  try {
    const redirectTo = REDIRECT_URL + 'login.html?type=recovery';
    const result = await authRequest('recover', {
      email: email,
      gotrue_meta_security: {},
      redirect_to: redirectTo
    });

    showForgotLoader(false);

    if (!result.ok) {
      let msg = 'Could not send reset email. Try again.';
      if (result.data) {
        msg = result.data.error_description || result.data.msg || result.data.error || msg;
      }
      showForgotError(msg);
      return;
    }

    showForgotSuccess();
  } catch (e) {
    console.error('[sendPasswordReset]', e);
    showForgotLoader(false);
    showForgotError('An error occurred. Please try again.');
  }
}

/* =========================================================
   UPDATE PASSWORD (after reset link)
   ========================================================= */

async function updatePassword(newPassword) {
  let token = null;
  
  try { 
    token = localStorage.getItem('witcorp-access-token'); 
  } catch (e) {}

  if (!token) {
    showResetError('Session expired. Please request a new reset link.');
    return;
  }

  if (!newPassword || newPassword.length < 8) {
    showResetError('Password must be at least 8 characters.');
    return;
  }

  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: newPassword })
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data.error_description || data.msg || 'Password update failed.';
      showResetError(msg);
      return;
    }

    showResetSuccess();
  } catch (e) {
    console.error('[updatePassword]', e);
    showResetError('Network error. Please try again.');
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {
  try {
    if (typeof closeProfileModal === 'function') { 
      closeProfileModal(); 
    }
  } catch (e) {}

  let token = null;
  try { 
    token = localStorage.getItem('witcorp-access-token'); 
  } catch (e) {}

  if (token) {
    try {
      await fetch(SUPABASE_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + token
        }
      });
    } catch (e) {
      console.error('[logout] Server logout failed:', e);
    }
  }

  clearSession();
  window.location.replace(REDIRECT_URL + 'login.html');
}

/* =========================================================
   AUTH GUARD — call at top of index.html
   ========================================================= */

async function requireAuth() {
  try {
    const isCallback = await handleOAuthCallback();
    
    if (isCallback) {
      let cbToken = null;
      try { cbToken = localStorage.getItem('witcorp-access-token'); } catch(e) {}
      
      if (!cbToken) { window.location.href = REDIRECT_URL + 'login.html'; return; }

      const userRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cbToken }
      });

      if (!userRes.ok) { clearSession(); window.location.href = REDIRECT_URL + 'login.html'; return; }

      const cbUser = await userRes.json();
      try { localStorage.setItem('witcorp-user', JSON.stringify(cbUser)); } catch(e) {}

      const cbRes = await fetch(
        SUPABASE_URL + '/rest/v1/profiles?id=eq.' + cbUser.id + '&select=status',
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cbToken } }
      );
      const cbProfile = await cbRes.json();
      const cbStatus = cbProfile?.[0]?.status;

      if (cbStatus === 'approved') {
        return true;
      } else {
        clearSession();
        window.location.href = REDIRECT_URL + 'login.html?error=not_approved';
        return;
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('type') === 'recovery') {
      window.location.href = REDIRECT_URL + 'login.html?type=recovery';
      return;
    }

    const user = await getSession();
    if (!user) {
      const refreshed = await refreshToken();
      if (!refreshed) { 
        window.location.href = REDIRECT_URL + 'login.html'; 
        return;
      }
      return true;
    }

    let token = null;
    try { token = localStorage.getItem('witcorp-access-token'); } catch(e) {}

    const profileRes = await fetch(
      SUPABASE_URL + '/rest/v1/profiles?id=eq.' + user.id + '&select=status',
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token } }
    );
    const profile = await profileRes.json();
    const status = profile?.[0]?.status;

    if (status !== 'approved') {
      clearSession();
      window.location.href = REDIRECT_URL + 'login.html';
      return;
    }

    return true;

  } catch (e) {
    console.error('[requireAuth]', e);
    window.location.href = REDIRECT_URL + 'login.html';
  }
}

function redirectToDashboard() {
  window.location.replace(REDIRECT_URL + 'index.html');
}

/* =========================================================
   GET DISPLAY NAME
   ========================================================= */

async function getUserDisplayName() {
  const user = getCurrentUser();
  if (!user) return 'User';

  let token = null;
  try { 
    token = localStorage.getItem('witcorp-access-token'); 
  } catch(e) {}

  if (token && user.id) {
    try {
      const res = await fetch(
        SUPABASE_URL + '/rest/v1/profiles?id=eq.' + encodeURIComponent(user.id) + '&select=full_name,avatar_initial',
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows[0] && rows[0].full_name) {
          return rows[0].full_name;
        }
      }
    } catch(e) {
      console.error('[getUserDisplayName] Profiles fetch failed:', e);
    }
  }

  const meta = user.user_metadata || {};
  if (meta.full_name) return meta.full_name;
  if (meta.name) return meta.name;

  if (user.email) return user.email.split('@')[0];

  return 'User';
}

/* =========================================================
   PROFILE MODAL
   ========================================================= */

async function openProfileModal() {
  let user = getCurrentUser();

  let token = null;
  try { 
    token = localStorage.getItem('witcorp-access-token'); 
  } catch(e) {}

  if (token) {
    try {
      const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { 
          'apikey': SUPABASE_ANON_KEY, 
          'Authorization': 'Bearer ' + token 
        }
      });
      
      if (res.ok) {
        user = await res.json();
        try { 
          localStorage.setItem('witcorp-user', JSON.stringify(user)); 
        } catch(e) {}
      }
    } catch(e) {
      console.error('[openProfileModal] Refresh failed:', e);
    }
  }

  const displayName = await getUserDisplayName();
  const email = (user && user.email) ? user.email : 'Not available';
  const uid = (user && user.id) ? user.id : 'N/A';

  let clientCount = '—';
  if (token) {
    try {
      const cRes = await fetch(SUPABASE_URL + '/rest/v1/clients?select=id', {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + token,
          'Prefer': 'count=exact',
          'Range': '0-0'
        }
      });
      
      const contentRange = cRes.headers.get('Content-Range');
      if (contentRange) {
        const total = contentRange.split('/')[1];
        clientCount = total !== '*' ? total : '—';
      }
    } catch(e) { 
      console.error('[openProfileModal] Client count failed:', e);
    }
  }

  const initial = displayName.charAt(0).toUpperCase() || 'U';

  const existing = document.getElementById('witcorp-profile-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
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
      <div class="pm-avatar">${_escHtml(initial)}</div>
      <div class="pm-name">${_escHtml(displayName)}</div>
      <div class="pm-org">WITCORP India Advisors LLP</div>

      <div class="pm-field-label">Email Address</div>
      <div class="pm-field-value">${_escHtml(email)}</div>

      <div class="pm-field-label">User ID</div>
      <div class="pm-field-value" style="font-size:12px;color:#64748b;">${_escHtml(uid)}</div>

      <div class="pm-field-label">Total Clients</div>
      <div class="pm-field-value">${_escHtml(String(clientCount))}</div>

      <button class="pm-logout" onclick="logout()">🚪 Logout</button>
    </div>
  `;

  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeProfileModal();
  });

  document.body.appendChild(modal);
}

function closeProfileModal() {
  const m = document.getElementById('witcorp-profile-modal');
  if (m) m.remove();
}

function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* =========================================================
   POPULATE TOPBAR
   ========================================================= */

async function populateTopbarUser() {
  const displayName = await getUserDisplayName();
  const user = getCurrentUser();
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  const nameEl = document.getElementById('topbar-username');
  if (nameEl) nameEl.textContent = displayName;

  const avatarEl = document.getElementById('topbar-avatar');
  if (avatarEl) {
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

  document.querySelectorAll('.user-initial-badge').forEach(function(el) {
    el.textContent = initial;
  });

  document.querySelectorAll('.user-display-name').forEach(function(el) {
    el.textContent = displayName;
  });
}

/* =========================================================
   UI HELPERS FOR LOGIN PAGE
   ========================================================= */

function showAuthLoader(show) {
  const btn = document.getElementById('loginBtn');
  if (!btn) return;
  btn.disabled = show;
  btn.innerHTML = show ? '<span class="auth-spinner"></span> Signing in...' : 'Sign In →';
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideAuthError() {
  const el = document.getElementById('authError');
  if (el) el.style.display = 'none';
}

function showForgotLoader(show) {
  const btn = document.getElementById('forgotBtn');
  if (!btn) return;
  btn.disabled = show;
  btn.innerHTML = show ? '<span class="auth-spinner"></span> Sending...' : 'Send Reset Email';
}

function showForgotError(msg) {
  const el = document.getElementById('forgotError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  const s = document.getElementById('forgotSuccess');
  if (s) s.style.display = 'none';
}

function showForgotSuccess() {
  const el = document.getElementById('forgotSuccess');
  if (el) el.style.display = 'block';
  const e = document.getElementById('forgotError');
  if (e) e.style.display = 'none';
  const btn = document.getElementById('forgotBtn');
  if (btn) { btn.textContent = '✓ Email Sent!'; btn.disabled = true; }
}

function hideForgotMessages() {
  const e = document.getElementById('forgotError');
  const s = document.getElementById('forgotSuccess');
  if (e) e.style.display = 'none';
  if (s) s.style.display = 'none';
}

function showResetError(msg) {
  const el = document.getElementById('resetError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  const s = document.getElementById('resetSuccess');
  if (s) s.style.display = 'none';
}

function showResetSuccess() {
  const el = document.getElementById('resetSuccess');
  if (el) el.style.display = 'block';
  const e = document.getElementById('resetError');
  if (e) e.style.display = 'none';
  setTimeout(function () { window.location.replace(REDIRECT_URL + 'index.html'); }, 2000);
}

function showToastAuth(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3000);
}

/* =========================================================
   END OF auth.js (v3.1 FIXED)
   ========================================================= */
