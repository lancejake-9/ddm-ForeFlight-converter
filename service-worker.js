const CACHE_NAME = "ddm-ff-v1";
const ASSETS = [
  "/ddm-ForeFlight-converter/", // main page
  "/ddm-ForeFlight-converter/index.html",
  "/ddm-ForeFlight-converter/manifest.webmanifest"
];

// On install: cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

// Network-first for HTML; cache-first for others
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/ddm-ForeFlight-converter/index.html"))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((hit) => hit || fetch(event.request))
    );
  }
});
