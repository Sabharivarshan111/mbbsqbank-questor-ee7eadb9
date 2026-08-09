// Bump this on every meaningful change so old caches are evicted on activate.
const SW_VERSION = 'v2-2026-08-09';
const CACHE_NAME = `mbbs-qb-${SW_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Don't fail the whole install if one URL is missing.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.allSettled(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      (request.headers.get('accept') || '').includes('text/html'))
  );
}

function isHashedAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)
  );
}

// Network-first: always try the network so new deploys land immediately.
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(fallbackUrl || request, response.clone());
    }
    return response;
  } catch (error) {
    const cached =
      (fallbackUrl ? await cache.match(fallbackUrl) : null) ||
      (await cache.match(request));
    if (cached) return cached;
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Stale-while-revalidate for content-hashed static assets.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchAndUpdate = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    fetchAndUpdate;
    return cached;
  }
  const fresh = await fetchAndUpdate;
  return (
    fresh ||
    new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    })
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept cross-origin, OAuth, or API traffic.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/~oauth')) return;

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  if (isHashedAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

// Allow the app to trigger an immediate update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
