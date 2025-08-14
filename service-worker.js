/* Latlonger™ Service Worker */
const CACHE_NAME = 'latlonger™-v1';
const OFFLINE_URL = './offline.html';

const CORE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './sw.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await cache.add(new Request(OFFLINE_URL, {cache: 'reload'}));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) return preloadResp;

        const networkResp = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', networkResp.clone());
        return networkResp;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(OFFLINE_URL);
        return cached || new Response('Offline', {status: 200, headers: {'Content-Type': 'text/plain'}});
      }
    })());
  } else {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const resp = await fetch(event.request);
        if (resp && resp.status === 200 && resp.type === 'basic') {
          cache.put(event.request, resp.clone());
        }
        return resp;
      } catch (e) {
        return cached || Response.error();
      }
    })());
  }
});
