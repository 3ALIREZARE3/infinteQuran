const CACHE_NAME = 'quran-reels-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  // We cache the big data file so it works offline
  'https://unpkg.com/quran-json@latest/json/quran/en.json'
];

// Install Event: Cache files
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch Event: Serve from cache if available
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});