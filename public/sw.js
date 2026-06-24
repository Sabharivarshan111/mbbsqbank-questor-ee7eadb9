// App-shell SW. Scoped to same-origin GETs only — never touches Supabase auth,
// RPC, or any cross-origin / POST requests.
const CACHE_NAME = 'mbbs-qb-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GETs. Everything else (POSTs, Supabase, OAuth,
  // analytics, etc.) goes straight to the network with no interception.
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/~oauth')) return;
  if (url.pathname.includes('supabase')) return;

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => (cache !== CACHE_NAME ? caches.delete(cache) : null))
      )
    ).then(() => clients.claim())
  );
});
