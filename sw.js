const CACHE_NAME = 'feedstodon-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    './index.html',
    './style.css',
    './app.js',
    './components/api.js',
    './components/Compose.js',
    './components/icons.js',
    './components/Lemmy.js',
    './components/LemmyPost.js',
    './components/LemmyCommunity.js',
    './components/Notifications.js',
    './components/Post.js',
    './components/Profile.js',
    './components/Search.js',
    './components/Settings.js',
    './components/utils.js',
    './images/logo.png',
    './images/login.png'
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
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip caching for:
    // - Non-GET requests
    // - API calls
    // - OAuth/auth endpoints
    // - External domains (not same origin)
    if (request.method !== 'GET' || 
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/oauth/') ||
        url.pathname.includes('.well-known') ||
        url.origin !== location.origin) {
        return;
    }
    
    // Skip service worker for certain file types that shouldn't be cached
    if (url.pathname.endsWith('.ico') || 
        url.pathname.endsWith('.webmanifest') ||
        url.pathname.includes('hot-update')) {
        return;
    }
    
    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                // If we get a valid response, cache it and return it.
                if (networkResponse && networkResponse.ok) {
                    // Only cache responses from our own domain
                    if (url.origin === location.origin) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                            })
                            .catch(() => {
                                // Silently fail if we can't cache
                            });
                    }
                }
                return networkResponse;
            })
            .catch(() => {
                // If the network fails, try to get the response from the cache.
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        // For navigation requests (HTML pages), return the cached index.html
                        if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
                            return caches.match('./index.html');
                        }
                        
                        // For images, return the logo as a fallback
                        if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
                            return caches.match('./images/logo.png');
                        }
                        
                        // For JavaScript modules that failed, return empty module
                        if (url.pathname.endsWith('.js')) {
                            return new Response('// Module not available offline', {
                                status: 200,
                                headers: { 'Content-Type': 'application/javascript' }
                            });
                        }
                        
                        // For CSS that failed, return empty stylesheet
                        if (url.pathname.endsWith('.css')) {
                            return new Response('/* Stylesheet not available offline */', {
                                status: 200,
                                headers: { 'Content-Type': 'text/css' }
                            });
                        }
                        
                        // For everything else, fail silently with a proper response
                        // Don't log to console to avoid noise
                        return new Response('', {
                            status: 200,
                            statusText: 'OK',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Optional: Add message handler for cache management
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(() => {
                console.log('Service Worker: Cache cleared by user request');
            })
        );
    }
});
