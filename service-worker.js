// service-worker.js
const CACHE = 'pwa-v2';
const OFFLINE_URL = './offline.html';

// List files that should be available offline.
// If you don't have style.css or script.js, delete those lines.
// If you have extra images/icons, add them here.
const PRECACHE = [
  './',                       // root (works well on GitHub Pages)
  './index.html',
  './manifest.webmanifest',
  './offline.html',
  './style.css',              // remove if not used
  './script.js',              // remove if not used
  './icons/apple-touch-icon-180.png' // adjust to your actual icon path(s)
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Treat navigations (HTML pages) specially: network-first, then offline fallback
  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        return cached || cache.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Everything else (CSS/JS/images): cache-first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
