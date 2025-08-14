// service-worker.js (auto-updating, no manual version bumps)
const CACHE_NAME = "foreflight-cache"; // static name — we auto-refresh contents
const OFFLINE_URL = "offline.html";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon-180.png"
  // Add other assets here if needed
];

// Precache core assets, forcing a fresh fetch
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(FILES_TO_CACHE.map((u) => new Request(u, { cache: "reload" })));
    })
  );
  self.skipWaiting();
});

// Take control immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Helper: cache a copy of a successful GET response
async function cachePut(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (e) {
    // ignore (opaque responses, etc.)
  }
}

// Strategy for navigations: network-first, fall back to cache, then offline page
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== "GET") return;

  // Navigations (HTML pages)
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        // Always try network first to pick up fresh HTML
        const networkResp = await fetch(req);
        // Update cache in the background
        event.waitUntil(cachePut(req, networkResp.clone()));
        return networkResp;
      } catch (err) {
        // Offline or failed — fall back to cached page, or offline.html
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        return cached || cache.match(OFFLINE_URL);
      }
    })());
    return;
  }

  // Other requests: stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((networkResp) => {
      // Update cache in background
      event.waitUntil(cachePut(req, networkResp.clone()));
      return networkResp;
    }).catch(() => null);

    // Return cached immediately if present, else wait for network
    return cached || fetchPromise || fetch(req);
  })());
});
