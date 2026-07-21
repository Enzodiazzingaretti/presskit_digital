const CACHE_NAME = 'kexxy-v3-20260720';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css?v=20260720b',
  '/script.js?v=20260720b',
  '/kexxy-logo-black.png',
  '/kexxy-logo-white.png',
  '/hero-bg.webp',
  '/bio-photo.webp',
  '/live-photo.webp',
  '/rider-bg.webp',
  '/rider-diagram.webp'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.log('Cache install failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first for pages, cache-first for assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations (HTML) and dates.json go network-first so visitors
  // always get the latest version; cache is only the offline fallback.
  if (event.request.mode === 'navigate' || url.pathname === '/dates.json') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache API requests
            if (event.request.url.includes('api.')) {
              return networkResponse;
            }
            // Cache new requests
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          })
          .catch(() => {
            // Return offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});
