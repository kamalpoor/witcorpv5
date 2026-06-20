/* =============================================================
   WITCORP SW.JS — Service Worker
   PWA Support | Offline Cache | Network First Strategy
   Version: v4 — Matches full codebase (index, login, splash, app, auth, style)
   ============================================================= */

const CACHE_NAME = 'witcorp-v6';

const STATIC_ASSETS = [
  './',
  './splash.html',
  './login.html',
  './index.html',
  './app_enhanced.js',
  './auth.js',
  './style.css',
  './logo.png',
  './manifest.json'
];

const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap'
];

/* ── Install: cache static files ── */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing WITCORP v3...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      /* Cache local assets first — ignore individual failures */
      await Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn('[SW] Could not cache:', url, err.message);
          })
        )
      );

      /* Cache external fonts — best effort */
      await Promise.allSettled(
        EXTERNAL_ASSETS.map((url) =>
          cache.add(new Request(url)).catch((err) => {
            console.warn('[SW] Could not cache external:', url, err.message);
          })
        )
      );

      console.log('[SW] Cache complete.');
    })
  );

  self.skipWaiting();
});

/* ── Activate: remove old caches ── */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating WITCORP v3...');

  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    )
  );

  self.clients.claim();
});

/* ── Fetch: Network first, fallback to cache ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* Only handle GET */
  if (request.method !== 'GET') return;

  /* Skip non-http(s) schemes (chrome-extension etc.) */
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  /* ── Never intercept Supabase API calls — always network ── */
  if (url.hostname.includes('supabase.co')) return;

  /* ── Never intercept Google Fonts CSS (let browser handle) ── */
  if (url.hostname === 'fonts.googleapis.com') return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        /* Cache valid responses */
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== 'opaque'
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(async () => {
        /* Network failed — try cache */
        const cached = await caches.match(request);
        if (cached) {
          console.log('[SW] Serving from cache:', request.url);
          return cached;
        }

        /* HTML fallback — serve index or login */
        const accept = request.headers.get('accept') || '';
        if (accept.includes('text/html')) {
          const fallback =
            (await caches.match('./index.html')) ||
            (await caches.match('./login.html'));
          if (fallback) return fallback;
        }

        /* Nothing available */
        return new Response('Offline — resource not cached.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

/* ── Push notifications ── */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'WITCORP', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'WITCORP', {
      body: data.body || 'You have a new notification.',
      icon: './logo.png',
      badge: './logo.png',
      tag: 'witcorp-push',
      renotify: true,
      data: data.url || './'
    })
  );
});

/* ── Notification click — open app ── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data || './';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(target);
      })
  );
});

/* ── Background sync (future use) ── */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync tag:', event.tag);
});

console.log('[SW] WITCORP Service Worker v3 loaded ✅');
