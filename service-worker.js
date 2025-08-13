// service-worker.js (GitHub Pages friendly)
const CACHE_NAME = "ddm-ff-v3";

// This computes your repo root on GitHub Pages, e.g. "/ddm-ForeFlight-converter/"
const BASE = new URL(".", self.location).pathname;

// List the key files to guarantee first-load offline
const PRECACHE_URLS = [
  BASE,                          // "/ddm-ForeFlight-converter/"
  BASE + "index.html",
  BASE + "manifest.webmanifest",
  BASE + "favicon.ico",
  BASE + "icons/apple-touch-icon-180.png",
  // Add any other files your app needs to run offline:
  // BASE + "styles.css",
  // BASE + "script.js",
];

self.addEventListener("install", (event) => {
  // Instantly activate this new SW on first load
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  // Take control of open pages immediately
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Cache-first for everything under your repo path, with network fallback.
// Also warms the cache with any new files fetched at runtime.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle requests within your GitHub Pages repo path
  if (!url.pathname.startsWith(BASE)) return;

  // For navigations (address bar / home-screen launches), try cache -> network -> cached index.html
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(BASE + "index.html");
        // Try cache first for instant feel
        if (cached) return cached;

        try {
          const fresh = await fetch(req);
          // If it worked, also save index.html for later
          cache.put(BASE + "index.html", fresh.clone());
          return fresh;
        } catch {
          // Last resort: whatever index.html we have
          return cached || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // For other requests (CSS/JS/icons), cache-first with network fallback + runtime warmup
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        // Warm the cache so future loads are instant offline
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        // If offline and not cached, fail gracefully
        return cached || new Response("Offline", { status: 503 });
      }
    })()
  );
});
