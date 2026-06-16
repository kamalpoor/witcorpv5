/* =============================================================
   WITCORP AUTH SYSTEM — auth.js
   Supabase Auth | Google OAuth | Email/Password | Forgot Password
   ============================================================= */

const SUPABASE_URL = 'https://yqbvdbsbuycxlsfkijhc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5qNAkAQrO5yzGnDcNERPxg_pm2Jv8bw';

/* ── Auth API helpers ── */

async function authRequest(endpoint, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function getSession() {
  const token = localStorage.getItem('witcorp-access-token');
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) { clearSession(); return null; }
  return await res.json();
}

function saveSession(session) {
  localStorage.setItem('witcorp-access-token', session.access_token);
  localStorage.setItem('witcorp-refresh-token', session.refresh_token || '');
  localStorage.setItem('witcorp-user', JSON.stringify(session.user || {}));
}

function clearSession() {
  localStorage.removeItem('witcorp-access-token');
  localStorage.removeItem('witcorp-refresh-token');
  localStorage.removeItem('witcorp-user');
}

/* ── Login with Email + Password ── */

async function loginWithEmail(email, password) {
  showAuthLoader(true);
  const { ok, data } = await authRequest('token?grant_type=password', { email, password });
  showAuthLoader(false);
  if (!ok) {
    showAuthError(data.error_description || data.msg || 'Login failed. Check credentials.');
    return;
  }
  saveSession(data);
  redirectToDashboard();
}

/* ── Google OAuth Login ── */

function loginWithGoogle() {
  const redirectTo = encodeURIComponent(
  'https://kamalpoor.github.io/witcorpv5/'
);
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
}

/* ── Handle OAuth Callback (tokens in URL hash) ── */

function handleOAuthCallback() {
  const hash = window.location.hash;
  if (!hash) return false;

  const params = new URLSearchParams(hash.replace('#', ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token) return false;

  try {
    const payload = JSON.parse(atob(access_token.split('.')[1]));
    saveSession({
      access_token,
      refresh_token,
      user: {
        id: payload.sub,
        email: payload.email,
        user_metadata: payload.user_metadata || {}
      }
    });
  } catch (e) {
    console.error('Token parse error:', e);
    return false;
  }

  window.history.replaceState({}, document.title, window.location.pathname);
  return true;
}
/* ── Forgot Password ── */

async function sendPasswordReset(email) {
  if (!email) { showForgotError('Please enter your email.'); return; }
  showForgotLoader(true);
  const redirectTo = window.location.origin + '/login.html?type=recovery';
  const { ok, data } = await authRequest('recover', {
    email,
    gotrue_meta_security: {},
    redirect_to: redirectTo
  });
  showForgotLoader(false);
  if (!ok) {
    showForgotError(data.error_description || 'Could not send reset email.');
    return;
  }
  showForgotSuccess();
}

/* ── Update Password (after reset link) ── */

async function updatePassword(newPassword) {
  const token = localStorage.getItem('witcorp-access-token');
  if (!token) { showToastAuth('Session expired. Please login again.'); return; }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: newPassword })
  });
  const data = await res.json();
  if (!res.ok) { showResetError(data.error_description || 'Password update failed.'); return; }
  showResetSuccess();
}

/* ── Logout ── */

async function logout() {
  const token = localStorage.getItem('witcorp-access-token');
  if (token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    }).catch(() => {});
  }
  clearSession();
  window.location.href = 'login.html';
}

/* ── Guard: call at top of index.html ── */

async function requireAuth() {
  // Handle OAuth redirect
  if (handleOAuthCallback()) { redirectToDashboard(); return; }

  // Handle password recovery redirect
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('type') === 'recovery') {
    window.location.href = 'login.html?type=recovery';
    return;
  }

  const user = await getSession();
  if (!user) { window.location.href = 'login.html'; }
}

function redirectToDashboard() {
  window.location.href = 'index.html';
}

/* ── UI Helpers ── */

function showAuthLoader(show) {
  const btn = document.getElementById('loginBtn');
  if (!btn) return;
  btn.disabled = show;
  btn.innerHTML = show
    ? '<span class="auth-spinner"></span> Signing in...'
    : 'Sign In';
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
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
  document.getElementById('forgotSuccess')?.style && (document.getElementById('forgotSuccess').style.display = 'none');
}

function showForgotSuccess() {
  const el = document.getElementById('forgotSuccess');
  if (el) el.style.display = 'block';
  document.getElementById('forgotError')?.style && (document.getElementById('forgotError').style.display = 'none');
  document.getElementById('forgotBtn').textContent = '✅ Email Sent!';
}

function showResetError(msg) {
  const el = document.getElementById('resetError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function showResetSuccess() {
  const el = document.getElementById('resetSuccess');
  if (el) el.style.display = 'block';
  setTimeout(() => { window.location.href = 'login.html'; }, 2000);
}

function showToastAuth(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
