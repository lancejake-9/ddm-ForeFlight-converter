/* service-worker.js */
const CACHE_NAME = 'ddm-ff-v1';

// List every file you want available offline
const ASSETS = [
  '/',                        // root (GitHub Pages will serve index.html here)
  '/index.html',
  '/styles.css',              // rename/remove if different
  '/script.js',               // rename/remove if different
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Helper: expand to full URLs so this works on GitHub Pages too
const toURL = p => new URL(p, self.location).toString();

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.map(toURL)))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Cache-first for same-origin GET requests; fall back to network
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(resp => {
        // Update cache in the background
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return resp;
      }).catch(() => cached); // offline fallback to cache if network fails

      return cached || fetchPromise;
    })
  );
});
