// service-worker.js
const CACHE_VERSION = 'v7';
const STATIC_CACHE = `static-${CACHE_VERSION}`;

const BASE = '/ddm-ForeFlight-converter'; // your repo name
const PRECACHE = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/offline.html`,
  `${BASE}/manifest.webmanifest`,
  // add your icons / css / js here too:
  // `${BASE}/icons/apple-touch-icon-180.png`,
  // `${BASE}/icons/icon-192.png`,
  // `${BASE}/icons/icon-512.png`,
  // `${BASE}/style.css`,
  // `${BASE}/app.js`,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== STATIC_CACHE ? caches.delete(k) : 0)))
    ).then(() => self.clients.claim())
  );
});

// Handle navigations (browser refresh / address bar) and static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin
  if (new URL(request.url).origin !== self.location.origin) return;

  // 1) Navigations: network-first → cached index.html → offline.html
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const copy = fresh.clone();
        (await caches.open(STATIC_CACHE)).put(request, copy);
        return fresh;
      } catch {
        // Serve app shell so refresh works offline
        const cachedShell =
          (await caches.match(`${BASE}/index.html`)) ||
          (await caches.match(`${BASE}/`));
        if (cachedShell) return cachedShell;
        return (await caches.match(`${BASE}/offline.html`));
      }
    })());
    return;
  }

  // 2) Static assets: cache-first, then update in background
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const fetchAndUpdate = fetch(request).then(async (res) => {
      const copy = res.clone();
      (await caches.open(STATIC_CACHE)).put(request, copy);
      return res;
    }).catch(() => cached);
    return cached || fetchAndUpdate;
  })());
});
