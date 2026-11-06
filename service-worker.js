/**
 * Moodlify Service Worker
 * @version 2.0.7
 * Estrategias de caché: Cache-First (estáticos) y Network-First con fallback offline (navegación y dinámicos)
 */

const CACHE_NAME = 'moodlify-v2.0.7';
const OFFLINE_URL = 'offline.html';

// Recursos críticos del App Shell para funcionamiento offline inmediato
const PRECACHE_ASSETS = [
  './',
  'index.html',
  'login.html',
  'offline.html',
  '404.html',
  'manifest.json',
  // CSS
  'css/main.css',
  'css/themes.css',
  'css/components.css',
  'css/animations.css',
  // JS Core & Utils
  'js/config.js',
  'js/store.js',
  'js/api.js',
  'js/auth.js',
  'js/error-handler.js',
  'js/security.js',
  'js/themes.js',
  'js/router.js',
  'js/analytics.js',
  'js/moodle-service.js',
  'js/notifications.js',
  'js/webhooks.js',
  'js/app.js',
  // Componentes
  'js/components/toast.js',
  'js/components/modal.js',
  'js/components/skeleton.js',
  'js/components/command-palette.js',
  'js/components/widgets.js',
  // Páginas SPA
  'js/pages/dashboard.js',
  'js/pages/platforms.js',
  'js/pages/users.js',
  'js/pages/courses.js',
  'js/pages/teaching.js',
  'js/pages/periods.js',
  'js/pages/cohorts.js',
  'js/pages/enrollments.js',
  'js/pages/activity.js',
  'js/pages/importer.js',
  'js/pages/automations.js',
  'js/pages/reports.js',
  'js/pages/integrations.js',
  'js/pages/backups.js',
  'js/pages/academic-cases.js',
  'js/pages/incidences.js',
  'js/pages/settings.js'
];

/* ==========================================================================
   CICLO DE VIDA: INSTALL
   ========================================================================== */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Pre-cachear activos locales silenciosamente
        return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })))
          .catch((err) => {
            console.warn('[ServiceWorker] Advertencia en precache inicial:', err);
          });
      })
      .then(() => self.skipWaiting())
  );
});

/* ==========================================================================
   CICLO DE VIDA: ACTIVATE (Limpieza de cachés antiguas)
   ========================================================================== */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.info('[ServiceWorker] Purgando caché obsoleta:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* ==========================================================================
   ESTRATEGIAS DE RED / FETCH
   ========================================================================== */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignorar métodos no GET (POST, PUT, DELETE se gestionan con lógica online)
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar esquemas especiales (chrome-extension, moz-extension, etc.)
  if (!request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // 1. Navegación HTML (SPA) -> Network First con fallback a Cache o a offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clonar y guardar la versión fresca
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // Si no hay red, buscar en caché
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Intentar devolver index.html para soportar rutas virtuales SPA
          const cachedIndex = await caches.match('index.html');
          if (cachedIndex) {
            return cachedIndex;
          }
          // Si todo falla, página de contingencia
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // 2. CDNs externas (Lucide, Chart.js, Google Fonts) -> Cache First con actualización en segundo plano (Stale-While-Revalidate)
  const isCdn = url.hostname.includes('unpkg.com') ||
                url.hostname.includes('cdn.jsdelivr.net') ||
                url.hostname.includes('fonts.googleapis.com') ||
                url.hostname.includes('fonts.gstatic.com');

  if (isCdn) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        }).catch(() => null);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 3. Activos estáticos locales (CSS, JS, JSON, SVG, imágenes) -> Cache First
  const isStatic = request.destination === 'style' ||
                   request.destination === 'script' ||
                   request.destination === 'image' ||
                   request.destination === 'font' ||
                   url.pathname.endsWith('.css') ||
                   url.pathname.endsWith('.js') ||
                   url.pathname.endsWith('.json');

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Opcionalmente actualizar en background
          fetch(request).then((fresh) => {
            if (fresh.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(request, fresh));
            }
          }).catch(() => {});
          return cached;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Peticiones de datos (APIs Moodle, Backend GAS/REST) -> Network Only con captura de error
  event.respondWith(
    fetch(request).catch(async () => {
      const match = await caches.match(request);
      if (match) return match;
      return new Response(JSON.stringify({
        ok: false,
        error: 'offline',
        message: 'No hay conexión a internet disponible para esta solicitud.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    })
  );
});

/* ==========================================================================
   WEB PUSH NOTIFICATIONS
   ========================================================================== */
self.addEventListener('push', (event) => {
  let data = {
    title: 'Moodlify Alerta',
    body: 'Tienes una nueva actualización en tus plataformas Moodle.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%232563eb"/><text x="50" y="65" font-family="Inter,sans-serif" font-size="50" font-weight="bold" fill="white" text-anchor="middle">M</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%232563eb"/></svg>',
    url: 'index.html#dashboard'
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url || 'index.html#dashboard' },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Ver en Moodlify' },
      { action: 'close', title: 'Descartar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || 'index.html#dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta, enfocarla y navegar
      for (let client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Si no hay ventana, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

