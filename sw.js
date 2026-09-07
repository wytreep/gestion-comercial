/**
 * Service Worker — GestiónComercial v1.0
 * Estrategia: Cache-first para assets estáticos,
 * Network-first para llamadas a la API (datos siempre frescos)
 */

const CACHE_NAME    = 'gestion-comercial-v1';
const STATIC_ASSETS = [
  '/pescaderia/',
  '/pescaderia/index.php',
  '/pescaderia/assets/css/app.css',
  '/pescaderia/assets/js/app.js',
  '/pescaderia/assets/js/api.js',
  '/pescaderia/assets/js/utils.js',
  '/pescaderia/assets/img/icon-192.png',
  '/pescaderia/assets/img/icon-512.png',
  '/pescaderia/manifest.json',
];

// ── Instalación: cachear assets estáticos ────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activación: limpiar caches viejos ────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: estrategia según el tipo de recurso ────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API → siempre red (datos en tiempo real)
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ success: false, message: 'Sin conexión a la base de datos. Verifica que XAMPP esté activo.' }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Assets estáticos → cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
