const CACHE_NAME = 'gpl-mods-pwa-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './store.html',
    './archive.html',
    './manifest.json',
    './favicon.png',
    './logo.png'
];

// Install: pre-cache essential assets
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[SW] Pre-cache warning:', err);
            });
        })
    );
});

// Activate: clean up older caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Network-First with Cache Fallback for dynamic requests, Cache-First for static assets
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // For store.html or index.html navigation, try network then fallback to cache
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    const cloned = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
                    return networkResponse;
                })
                .catch(async () => {
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) return cachedResponse;
                    // Fallback to store.html if navigating
                    return caches.match('./store.html');
                })
        );
        return;
    }

    // For static images, CSS, icons, fonts: Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            const fetchPromise = fetch(request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const cloned = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
                }
                return networkResponse;
            }).catch(() => {/* ignore offline network failure */});

            return cachedResponse || fetchPromise;
        })
    );
});
