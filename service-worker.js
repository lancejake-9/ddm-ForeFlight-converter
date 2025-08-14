/* Simple, robust offline service worker for GitHub Pages
   Scope: the folder where this file lives.
*/
const CACHE_VERSION = 'v4-2025-08-14';
const CACHE_NAME = `ddm-ff-cache-${CACHE_VERSION}`;

// Core files to precache (relative to this service worker)
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

// Helper: detect navigation requests (HTML pages)
function isNavRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' &&
          request.headers.get('accept') &&
          request.headers.get('accept').includes('text/html'));
}

// Try network, fall back to cache, then to offline.html
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

// Cache-first for static assets; update cache in background
async function cacheFirst(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  if (cached) return cached;

  try {
    const fresh = await fetch(event.request, { credentials: 'same-origin' });
    cache.put(event.request, fresh.clone());
    return fresh;
  } catch (err) {
    // As a last resort, show offline page for images/fonts/html that fail
    if (event.request.destination === 'document') {
      return cache.match('./offline.html');
    }
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  if (isNavRequest(req)) {
    event.respondWith(networkFirst(event));
    return;
  }

  // For others (script, style, image, json, etc.)
  event.respondWith(cacheFirst(event));
});
