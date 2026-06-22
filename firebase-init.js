/* =========================================================
   FIREBASE FCM INIT — WITCORP
   ========================================================= */

const VAPID_KEY = "BNoAYlGcNvqRzphzwE63BcGrqdi_CaqczQe3rY3hBoxa6FB2B66nmbcJLsKxqz8dUJfS4YucvSOGkfz0q_Pm_Ho";

firebase.initializeApp({
  apiKey: "AIzaSyCyOtq6L9WIo0emWgdbajBpH_XmUp0Hzko",
  authDomain: "witcorp-dashboard.firebaseapp.com",
  projectId: "witcorp-dashboard",
  storageBucket: "witcorp-dashboard.firebasestorage.app",
  messagingSenderId: "33337027926",
  appId: "1:33337027926:web:bdb1f086990fc4f5bebaf7"
});

const fcmMessaging = firebase.messaging();

/* ---------------------------------------------------------
   FCM Token lo aur Supabase mein save karo
   --------------------------------------------------------- */
window.getFCMToken = async function() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const token = await fcmMessaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg
    });
    if (token) {
      console.log('✅ FCM Token mila');
      await saveFCMTokenToSupabase(token);
      return token;
    }
  } catch(e) {
    console.warn('FCM token error:', e);
  }
  return null;
};

/* ---------------------------------------------------------
   Token Supabase mein save karo
   --------------------------------------------------------- */
async function saveFCMTokenToSupabase(token) {
  const user = getCurrentUser();
  if (!user) return;
  const authToken = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/fcm_tokens`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        user_id: user.id,
        token: token,
        updated_at: new Date().toISOString()
      })
    });
    console.log('✅ FCM token saved');
  } catch(e) {
    console.warn('FCM save error:', e);
  }
}

/* ---------------------------------------------------------
   App OPEN ho tab notification
   --------------------------------------------------------- */
fcmMessaging.onMessage(function(payload) {
  const title = payload.notification?.title || 'Witcorp';
  const body  = payload.notification?.body  || '';
  if (typeof showToast === 'function') showToast(`🔔 ${title}`);
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/logo.png' });
  }
});

/* ---------------------------------------------------------
   Sabko FCM push bhejo — V1 API via Supabase Edge Function
   --------------------------------------------------------- */
window.sendFCMPushToAll = async function(title, body) {
  try {
    const authToken = localStorage.getItem('witcorp-access-token') || SUPABASE_ANON_KEY;
    await fetch('https://yqbvdbsbuycxlsfkijhc.supabase.co/functions/v1/send-push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body })
    });
    console.log('✅ Push bheja');
  } catch(e) {
    console.warn('FCM push error:', e);
  }
};
