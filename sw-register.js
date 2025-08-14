// sw-register.js
(function(){
  if (!('serviceWorker' in navigator)) return;

  const version = String(Date.now()); // cache-busting param to ensure fresh SW
  const swUrl = `${location.origin}/service-worker.js?v=${version}`;

  async function register() {
    try {
      const reg = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      // If waiting, ask it to activate immediately
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      // When a new SW takes control, reload to get new HTML/JS
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Avoid reload loops
        if (!window.__reloaded) { window.__reloaded = true; location.reload(); }
      });
    } catch (e) {
      // no-op
    }
  }

  register();

  // Expose a helper to fully reset offline caches and unregister SWs
  window.resetOfflineCache = async function(){
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      regs.forEach(r => r.active && r.active.postMessage({ type: 'RESET_CACHES' }));
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      await Promise.all(regs.map(r => r.unregister()));
      alert('Offline cache cleared. Reloading…');
      location.reload();
    } catch (e) {
      alert('Tried to clear offline cache, but something went wrong.');
    }
  };
})();
