/* SERVICE WORKER KILL SWITCH
   Purpose: blow away ALL caches, unregister this SW, and reload clients so the site fetches fresh files.
   Use temporarily. After it runs once, replace with your normal service-worker.js.
*/
self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1) Delete ALL caches
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {
      // ignore
    }

    // 2) Unregister THIS service worker
    try {
      await self.registration.unregister();
    } catch (e) {
      // ignore
    }

    // 3) Claim clients and force a reload so pages get a fresh, no-SW version
    try {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        client.navigate(client.url);
      }
    } catch (e) {
      // ignore
    }
  })());
});

// 4) While this SW is active, do NOT serve from cache; always go to network
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
