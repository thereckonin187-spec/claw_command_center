// CC Service Worker v4 — Network-only, no caching
// Previous versions caused stale cache issues; this version passes everything through

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  // Nuke ALL caches from any previous version
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Pass all fetches straight to network — no caching
self.addEventListener('fetch', () => {
  // Do nothing — let the browser handle it normally
});
