self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
const CACHE = 'et-cache-v1';
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const res = await fetch(event.request);
        if (event.request.method === 'GET' && res.ok) {
          cache.put(event.request, res.clone());
        }
        return res;
      } catch (err) {
        return cached || Promise.reject(err);
      }
    })
  );
});
