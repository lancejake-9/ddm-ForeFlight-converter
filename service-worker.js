/* v3 – unified offline for PWA + Safari tabs (ROOT SITE VERSION) */
const CACHE = 'ff-converter-v3';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/apple-touch-icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // add your main JS/CSS here:
  '/main.js',
  '/styles.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k))))
  );
  self.clients.claim();
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok && new URL(request.url).origin === location.origin) {
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return cached;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE);
        const cachedPage = await cache.match(req, { ignoreVary: true });
        return cachedPage || (await cache.match('/offline.html'));
      }
    })());
    return;
  }
  if (req.method === 'GET') {
    event.respondWith(cacheFirst(req));
  }
});
