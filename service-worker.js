/* =========================================================
   FileDetective — Service Worker
   Caches the static app shell so the tool keeps working
   offline after the first visit. GitHub Pages compatible:
   uses relative paths and a scope of the repository root.
   ========================================================= */

const CACHE_NAME = 'filedetective-v1';

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './css/responsive.css',
  './css/animations.css',
  './app.js',
  './js/hash.js',
  './js/image.js',
  './js/audio.js',
  './js/video.js',
  './js/pdf.js',
  './js/export.js',
  './manifest.json',
  './offline.html',
  './404.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests; let everything else
  // (fonts, cross-origin calls) pass straight through to the network.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('./offline.html');
          }
          return undefined;
        });
    })
  );
});
