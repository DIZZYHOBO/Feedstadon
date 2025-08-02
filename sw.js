// MODIFIED: The cache name now includes a version number.
const CACHE_NAME = 'feedstadon-v4.2.5'; 
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './components/api.js',
  './components/Compose.js',
  './components/icons.js',
  './components/Notifications.js',
  './components/Post.js',
  './components/Profile.js',
  './components/Search.js',
  './components/Settings.js',
  './components/utils.js'
];

// Install event: cache all the app's assets.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching new assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // ADDED: Force the new service worker to become active immediately.
        return self.skipWaiting();
      })
  );
});

// ADDED: Activate event to clean up old caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If this cache name is not in our whitelist, delete it.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: serve from cache if available, otherwise fetch from network.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Serve from cache
        }
        return fetch(event.request); // Fetch from network
      }
    )
  );
});
