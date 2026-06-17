/* =============================================================
   WITCORP SW.JS — Service Worker
   PWA Support | Offline Cache | Background Sync
   ============================================================= */

const CACHE_NAME = 'witcorp-v1';
const STATIC_ASSETS = [
  './',
   './splash.html',
  './login.html',
   './index.html',
  './app.js',
  './auth.js',
  './style.css',
  './logo.png',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap'
];

/* ── Install: cache static files ── */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing WITCORP Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch((err) => {
        console.warn('[SW] Cache addAll failed (some assets may not exist yet):', err);
      })
  );
  self.skipWaiting();
});

/* ── Activate: remove old caches ── */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating WITCORP Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

/* ── Fetch: Network first, fallback to cache ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET requests */
  if (request.method !== 'GET') return;

  /* Skip Supabase API calls — always fresh from network */
  if (url.hostname.includes('supabase.co')) return;

  /* Skip chrome-extension and other non-http requests */
  if (!request.url.startsWith('http')) return;

  event.respondWith(
    /* Network first strategy */
    fetch(request)
      .then((networkResponse) => {
        /* Clone and cache successful responses */
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        /* Network failed — serve from cache */
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', request.url);
              return cachedResponse;
            }
            /* Last resort: offline page for HTML requests */
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('./index.html');
            }
          });
      })
  );
});

/* ── Background sync (future use) ── */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});

/* ── Push notifications (future use) ── */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'WITCORP', {
    body: data.body || 'New notification',
    icon: './logo.png',
    badge: './logo.png',
    tag: 'witcorp-notification',
    renotify: true
  });
});

console.log('[SW] WITCORP Service Worker loaded ✅');
