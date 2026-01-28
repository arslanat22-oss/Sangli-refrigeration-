
const CACHE_NAME = 'sangli-pos-v2';

// Install event: Skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: Claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch event: Network-first, falling back to cache, but cache all successful responses
// This strategy ensures we get the latest version if online, but use cache if offline.
// It also dynamically caches all resources visited.
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests or non-GET requests if necessary, but for this app we cache everything we can
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If network fetch is successful, cache a copy of the response
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // If network fails (offline), return from cache
        return caches.match(event.request);
      })
  );
});
