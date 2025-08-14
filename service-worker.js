/* Normal offline-capable service worker for DDM → ForeFlight Converter */
const CACHE_VERSION = 'v4-2025-08-14';
const CACHE_NAME = `ddm-ff-cache-${CACHE_VERSION}`;

// Core files to precache
const CORE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null))
    ).then(() => self.clients.claim())
  );
});

function isNavRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' &&
          request.headers.get('accept') &&
          request.headers.get('accept').includes('text/html'));
}

async function networkFirst(event) {
  try {
    const fresh = await fetch(event.request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(event.request, fresh.clone());
    return fresh;
  } catch (err) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    return cached || cache.match('./offline.html');
  }
}

async function cacheFirst(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  if (cached) return cached;
  try {
    const fresh = await fetch(event.request, { credentials: 'same-origin' });
    cache.put(event.request, fresh.clone());
    return fresh;
  } catch (err) {
    if (event.request.destination === 'document') {
      return cache.match('./offline.html');
    }
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (isNavRequest(req)) {
    event.respondWith(networkFirst(event));
    return;
  }
  event.respondWith(cacheFirst(event));
});
