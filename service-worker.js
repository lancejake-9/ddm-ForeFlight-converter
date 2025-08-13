/* service-worker.js */
const CACHE_NAME = 'ddm-ff-v1';

// List the files you want cached for offline.
// If any of these don't exist, the install will still succeed (we skip missing ones).
const ASSETS = [
  '/',                       // root
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',

  // icons
  '/icons/icon-192.png',
  '/icons/icon-512.png',

  // your app files (rename/remove if different)
  '/styles.css',
  '/script.js',
];

// Convert to absolute URLs so it works on GitHub Pages subpaths
const toURL = (p) => new URL(p, self.location).toString();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const urls = ASSETS.map(toURL);
      // Add each asset but don't fail the install if some are missing
      const results = await Promise.allSettled(urls.map((u) => cache.add(u)));
      // Optional: log misses to help debugging
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn('SW skipped missing asset:', urls[i]);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Cache-first for same-origin GET requests. Network updates cache in background.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(() => cached); // offline fallback

      return cached || fetchPromise;
    })
  );
});
