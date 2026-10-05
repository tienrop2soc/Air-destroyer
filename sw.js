/* Service worker: la app funciona sin conexión.
 * Sube VERSION cuando cambies archivos para que los móviles descarguen la nueva versión. */
const VERSION = 'air-destroyer-v6';
const SHELL = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/balance.js', './js/sprites.js', './js/audio.js', './js/game.js', './js/pwa.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/apple-touch-icon-152.png', './icons/apple-touch-icon-167.png', './icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Archivos propios: caché primero y actualización en segundo plano.
// Otros orígenes (fuente de Google): red con respaldo en caché.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(req, { ignoreSearch: true }).then((hit) => {
          const fresh = fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || fresh;
        })
      )
    );
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open(VERSION).then((cache) =>
        fetch(req).then((res) => { cache.put(req, res.clone()); return res; })
          .catch(() => cache.match(req))
      )
    );
  }
});
