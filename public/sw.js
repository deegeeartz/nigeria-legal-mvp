// Wigally PWA Service Worker
const CACHE_VERSION = 'wigally-v1';
const DATA_CACHE_NAME = 'wigally-data-v1';

const STATIC_ASSETS = [
  '/',
  '/community',
  '/search',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png'
];

// Install Event: Precaching static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-caching assets warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION && cacheName !== DATA_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent multi-tier caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests for standard caching (e.g. POST/PUT to API)
  if (request.method !== 'GET') {
    return;
  }

  // 1. Legal Community & Search APIs -> StaleWhileRevalidate for instant offline availability
  if (url.pathname.startsWith('/api/community') || url.pathname.startsWith('/api/intake')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse); // If network fails, return cached response

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 2. Navigation Requests (Page loads) -> Network-first with Cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_VERSION);
          const cachedPage = await cache.match(request);
          if (cachedPage) return cachedPage;

          // If specific page not cached, check if root or community is available
          if (url.pathname.startsWith('/community')) {
            const cachedCommunity = await cache.match('/community');
            if (cachedCommunity) return cachedCommunity;
          }
          if (url.pathname.startsWith('/search')) {
            const cachedSearch = await cache.match('/search');
            if (cachedSearch) return cachedSearch;
          }
          const cachedHome = await cache.match('/');
          if (cachedHome) return cachedHome;

          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <title>Wigally - Offline</title>
                <style>
                  body { font-family: system-ui, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 24px; text-align: center; }
                  .card { max-width: 420px; padding: 32px; background: #1e293b; border-radius: 16px; border: 1px solid #334155; }
                  h1 { font-size: 22px; margin-bottom: 12px; color: #fbbf24; }
                  p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
                  .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #10b981; color: white; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>You are currently offline</h1>
                  <p>Wigally cached your previously viewed legal questions and lawyers. Check your connection or return to your cached sections.</p>
                  <a href="/community" class="btn">View Cached Forum Topics</a>
                </div>
              </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 3. Static assets (Images, CSS, Fonts, Next scripts) -> Stale-while-revalidate / Cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: Network with Cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Listen for message from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
