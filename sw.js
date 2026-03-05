// ARIA Service Worker v18 — auto-update à chaque déploiement
// Le numéro de version DOIT changer à chaque mise à jour de l'app
const CACHE_VERSION = 'aria-v18';
const ASSETS = ['./'];

// Installation : met en cache la nouvelle version
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting()) // active immédiatement sans attendre
  );
});

// Activation : supprime les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => {
          console.log('[SW] Suppression ancien cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim()) // prend le contrôle immédiatement
  );
});

// Fetch : réseau en priorité, cache en fallback
self.addEventListener('fetch', e => {
  // Google Scripts → toujours réseau
  if (e.request.url.includes('script.google.com') || 
      e.request.url.includes('googleusercontent.com')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // App principale → réseau en priorité, met à jour le cache en arrière-plan
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Met à jour le cache avec la version fraîche
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        return response;
      })
      .catch(() => {
        // Pas de réseau → sert depuis le cache
        return caches.match(e.request);
      })
  );
});

// Message de l'app pour forcer la mise à jour
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
