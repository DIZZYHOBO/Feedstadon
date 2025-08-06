const CACHE_NAME = 'feedstodon-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/components/api.js',
    '/components/Compose.js',
    '/components/Conversations.js',
    '/components/icons.js',
    '/components/Lemmy.js',
    '/components/LemmyPost.js',
    '/components/Notifications.js',
    '/components/Post.js',
    '/components/Profile.js',
    '/components/Search.js',
    '/components/Settings.js',
    '/components/Timeline.js',
    '/components/ui.js',
    '/components/utils.js',
    '/images/logo.png',
    '/images/login.png'
];

// --- Install Event ---
// Caches the application shell.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(error => {
                console.error('Failed to cache app shell:', error);
            })
    );
});

// --- Activate Event ---
// Cleans up old caches.
self.addEventListener('activate', (event) => {
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
        })
    );
    return self.clients.claim();
});

// --- Fetch Event ---
// Implements a Network First, falling back to Cache strategy.
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests for our assets.
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If we get a valid response, cache it and return it.
                if (networkResponse.ok) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                }
                return networkResponse;
            })
            .catch(() => {
                // If the network fails, try to get the response from the cache.
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // If not in cache, and network is down, it's a genuine failure.
                        console.error('Service Worker: Fetch failed; no response in cache.');
                        return new Response("Network error and not in cache", {
                            status: 404,
                            statusText: "Not Found"
                        });
                    });
            })
    );
});
