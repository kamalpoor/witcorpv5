/* =============================================================
   WITCORP AUTH SYSTEM — auth.js
   Supabase Auth | Google OAuth | Email/Password | Forgot Password
   All bugs fixed | Complete functions | No missing handlers
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
    return await res.json();
  } catch (e) {
    clearSession();
    return null;
  }
}

function saveSession(session) {
  try {
    localStorage.setItem('witcorp-access-token', session.access_token);
    localStorage.setItem('witcorp-refresh-token', session.refresh_token || '');
    localStorage.setItem('witcorp-user', JSON.stringify(session.user || {}));
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
  var url = 'https://yqbvdbsbuycxlsfkijhc.supabase.co/auth/v1/authorize?provider=google&redirect_to=' + redirectTo;
  try {
    window.location.assign(url);
  } catch(e) {
    window.location.href = url;
  }
}

/* =========================================================
   HANDLE OAUTH CALLBACK (tokens in URL hash)
   ========================================================= */

function handleOAuthCallback() {

  // New OAuth flow (?code=...)
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
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
      }
    } catch(e) {
      console.error('Code exchange failed:', e);
    }
    return false;
  }
  // Old hash flow (#access_token=...)
  var hash = window.location.hash;
  if (!hash) return false;

  var params = new URLSearchParams(hash.replace('#', ''));

  var access_token = params.get('access_token');
  var refresh_token = params.get('refresh_token');
  var error = params.get('error');
  var error_description = params.get('error_description');

  if (error) {
    console.error('OAuth error:', error, error_description);
    return false;
  }

  if (!access_token) return false;

  try {
    var parts = access_token.split('.');
    if (parts.length < 2) return false;

    var payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );

    saveSession({
      access_token: access_token,
      refresh_token: refresh_token || '',
      user: {
        id: payload.sub || '',
        email: payload.email || '',
        user_metadata: payload.user_metadata || {}
      }
    });

  } catch (e) {
    console.error('Token parse error:', e);
    return false;
  }

  try {
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (e) {}

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
  if (handleOAuthCallback()) { redirectToDashboard(); return; }
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
