/* Service Worker for ForeFlight Converter
 * Strategy:
 *  - Navigations: network-first, fallback to offline.html
 *  - Static assets: cache-first
 *  - Precache core files
 * Works on GitHub Pages project sites (handles subpath automatically).
 */

const CACHE_VERSION = 'v-20250814163204';
const RUNTIME_CACHE = 'runtime-' + CACHE_VERSION;

// Resolve a path relative to the SW scope (handles GitHub Pages subpaths)
const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const r = (p) => (scopePath + '/' + p).replace(/\/+/g, '/');

// Core files to precache
const PRECACHE_URLS = [
  r('index.html'),
  r('offline.html'),
  r('manifest.webmanifest'),
  r('icons/apple-touch-icon-180.png'),
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.addAll(PRECACHE_URLS);
    // If navigation preload is supported, enable it
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean up old caches
    const names = await caches.keys();
    await Promise.all(names.map((name) => {
      if (name !== RUNTIME_CACHE) return caches.delete(name);
    }));
    await self.clients.claim();
  })());
});

// Helper: is this a navigation request?
function isNavigationRequest(request) { 
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Runtime fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // HTML navigations: network-first with offline fallback
  if (isNavigationRequest(request)) {
    event.respondWith((async () => {
      try {
        // Use navigation preload response if available
        const preload = await event.preloadResponse;
        if (preload) return preload;

        // Try network
        const networkResp = await fetch(request, { cache: 'no-store' });
        // Update cache in background
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResp.clone());
        return networkResp;
      } catch (err) {
        // Network failed: serve cached page or offline fallback
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        return cached || cache.match(r('offline.html'));
      }
    })());
    return;
  }

  // Static assets (css/js/images/manifest): cache-first
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const resp = await fetch(request);
      // Cache successful GET requests
      if (request.method === 'GET' && resp && resp.status === 200 && resp.type !== 'opaque') {
        cache.put(request, resp.clone());
      }
      return resp;
    } catch (err) {
      // As a last resort, try an offline-friendly asset
      if (request.destination === 'document') {
        return cache.match(r('offline.html'));
      }
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
