const CACHE_NAME = 'mbbs-qb-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event handler
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching Files');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Cache Failed:', error);
        throw error; // Re-throw to ensure installation fails on error
      })
  );
  // Force waiting Service Worker to become active
  self.skipWaiting();
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
  console.log('Service Worker: Fetching', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('Service Worker: Found in Cache', event.request.url);
          return response;
        }
        console.log('Service Worker: Not Found in Cache', event.request.url);
        return fetch(event.request).catch(error => {
          console.error('Service Worker: Fetch Failed:', error);
          return new Response('Network error happened', {
            status: 404,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});

// Activate event handler
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Take control of all clients as soon as it activates
      return clients.claim();
    })
  );
});