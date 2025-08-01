const CACHE_NAME = 'feedstadon-v1';
// This list should include every file your app uses.
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/components/api.js',
  '/components/Compose.js',
  '/components/icons.js',
  '/components/Notifications.js',
  '/components/Post.js',
  '/components/Profile.js',
  '/components/Search.js',
  '/components/Settings.js',
  '/components/utils.js'
];

// Install the service worker and cache all the app's assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercept fetch requests and serve from cache if available
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request);
      }
    )
  );
});
