// service-worker.js
const CACHE_VERSION = 'v3';
const CACHE_NAME = `ddm-foreflight-${CACHE_VERSION}`;

// If your site is at https://lancejake-9.github.io/ddm-ForeFlight-converter/
// keep BASE = '/ddm-ForeFlight-converter/'. If you ever move to a root domain,
// set BASE = '/'.
const BASE = '/ddm-ForeFlight-converter/';

const ASSETS = [
  `${BASE}`,
  `${BASE}index.html`,
  `${BASE}offline.html`,
  `${BASE}manifest.webmanifest`,
  // icons (adjust if filenames differ)
  `${BASE}icons/apple-touch-icon-180.png`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
  // your JS/CSS (add any additional files you have)
  `${BASE}service-worker.js`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Network-first for HTML; cache-first for everything else
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isHTML =
    req.headers.get('accept')?.includes('text/html') ||
    req.destination === 'document';

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // update cache copy
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(req, { ignoreSearch: true });
          return cached || cache.match(`${BASE}offline.html`);
        })
    );
    return;
  }

  // cache-first for assets
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => caches.match(`${BASE}offline.html`))
    )
  );
});
