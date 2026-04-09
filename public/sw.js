const CACHE = 'et-cache-v2';
const CACHE_PREFIX = 'et-cache-';
const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'image', 'manifest']);

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  const isDocumentRequest =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      if (isDocumentRequest) {
        try {
          const fresh = await fetch(request, { cache: 'no-store' });
          if (fresh.ok) {
            await cache.put(request, fresh.clone());
          }
          return fresh;
        } catch (error) {
          const cached = await cache.match(request);
          if (cached) {
            return cached;
          }
          throw error;
        }
      }

      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }

      const fresh = await fetch(request);
      if (fresh.ok && STATIC_DESTINATIONS.has(request.destination)) {
        await cache.put(request, fresh.clone());
      }
      return fresh;
    })()
  );
});
