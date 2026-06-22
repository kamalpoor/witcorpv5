importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCyOtq6L9WIo0emWgdbajBpH_XmUp0Hzko",
  authDomain: "witcorp-dashboard.firebaseapp.com",
  projectId: "witcorp-dashboard",
  storageBucket: "witcorp-dashboard.firebasestorage.app",
  messagingSenderId: "33337027926",
  appId: "1:33337027926:web:bdb1f086990fc4f5bebaf7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || payload.data?.title || 'Witcorp';
  const body  = payload.notification?.body  || payload.data?.body  || '';
  self.registration.showNotification(title, {
    body: body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'witcorp-push',
    renotify: true,
    vibrate: [200, 100, 200]
  });
});
