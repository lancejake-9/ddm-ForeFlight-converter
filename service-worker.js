// service-worker.js (enhanced auto-update + old cache cleanup)
const CACHE_NAME = "foreflight-cache";
const OFFLINE_URL = "offline.html";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon-180.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(FILES_TO_CACHE.map((u) => new Request(u, { cache: "reload" })));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Remove any old caches from previous implementations
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

async function cachePut(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch {}
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const networkResp = await fetch(req);
        event.waitUntil(cachePut(req, networkResp.clone()));
        return networkResp;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        return cached || cache.match(OFFLINE_URL);
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((resp) => {
      event.waitUntil(cachePut(req, resp.clone()));
      return resp;
    }).catch(() => null);
    return cached || fetchPromise || fetch(req);
  })());
});

// Receive commands from the page
self.addEventListener("message", (event) => {
  const { type } = event.data || {};
  if (type === "SKIP_WAITING") self.skipWaiting();
  if (type === "RESET_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => caches.delete(k)))
      )
    );
  }
});
