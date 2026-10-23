/* Service worker del presskit KEXXY.
   - HTML, content.json y dates.json: primero la red (siempre lo último que publicó el panel); la caché es el respaldo sin conexión.
   - Assets: primero la caché. Los CSS/JS llevan ?v= para invalidarse al cambiar.
   - Videos y pedidos con Range: no se tocan (Safari necesita las respuestas 206 tal cual). */
const CACHE_NAME = 'kexxy-zine-1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/ritual.css?v=3',
  '/assets/js/ritual.js?v=3',
  '/assets/brand/kexxy-sigil.svg',
  '/assets/brand/logo-chrome-800-v2.webp',
  '/assets/brand/logo-glint-800.webp',
  '/assets/zine/logo-sticker-800.webp',
  '/assets/zine/paper.webp',
  '/assets/zine/xerox.webp',
  '/assets/zine/cover-ink.webp',
  '/assets/zine/cover-red.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => { /* sin precache igual funciona */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // el panel y su API nunca pasan por la caché
  if (url.pathname.indexOf('/api/') === 0 || url.pathname === '/admin.html' || url.pathname === '/admin') return;
  if (req.headers.has('range') || /\.(mp4|webm)$/i.test(url.pathname)) return;

  const networkFirst = req.mode === 'navigate' || url.pathname === '/content.json' || url.pathname === '/dates.json';
  if (networkFirst) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/index.html') : undefined)))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }));
    })
  );
});
