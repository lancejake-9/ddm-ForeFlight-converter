/* ForeFlight DD converter service worker */
// Unique version — bump this to force an update
const VERSION = 'ff-dd-v3-2025-08-14-01';
const CACHE_NAME = `ffc-dd-cache-${VERSION}`;

// Core assets to cache for offline
const CORE_ASSETS = [
  './',
  './index.html',
  './sw.js'
  // Add './offline.html', './manifest.webmanifest', './icons/...png' if you have them
];

self.addEventListener('install', (event) => {
  // Activate the new SW immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // Remove old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME && key.startsWith('ffc-dd-cache-')) {
          return caches.delete(key);
        }
      }))
    ).then(() => self.clients.claim())
  );
});

// Strategy:
// - For navigations (HTML): network-first, fallback to cache (so you can get updates when online)
// - For other GETs: cache-first, fallback to network (so it works offline)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

async function networkFirst(req){
  try{
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  }catch(err){
    const cached = await caches.match(req, { ignoreSearch:true });
    if (cached) return cached;
    // If you create an offline.html file, return it here as a final fallback:
    // return caches.match('./offline.html');
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(req){
  const cached = await caches.match(req, { ignoreSearch:true });
  if (cached) return cached;
  const fresh = await fetch(req);
  const cache = await caches.open(CACHE_NAME);
  cache.put(req, fresh.clone());
  return fresh;
}
