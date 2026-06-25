// Updated: 2026-06-25T13:14:28.158108
// jazzdoit Service Worker
const CACHE = 'jazzdoit-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// Instalar: cachear el shell de la app
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {})));
});

// Activar: limpiar cachés viejos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-FIRST para el HTML (para que los deploys lleguen siempre),
// cache-first para íconos/recursos estáticos.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // No interceptar llamadas a Supabase (datos en vivo) ni a otros dominios
  if (url.origin !== self.location.origin) return;

  // HTML / navegación: red primero, cae a caché si no hay internet
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy).catch(() => {}));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Recursos estáticos: caché primero, red de respaldo
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
      return res;
    }).catch(() => cached))
  );
});
