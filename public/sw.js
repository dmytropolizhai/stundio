/**
 * Stundio PWA Service Worker.
 *
 * Provides offline app shell caching (HTML/JS/CSS/assets) so the app opens
 * reliably without network connectivity. Does NOT cache /api-edupage calls,
 * which are handled by Stundio's dedicated IndexedDB sync cache.
 */

const CACHE_NAME = "stundio-shell-v3";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.png",
  "/favicon.ico",
  "/mark.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/apple-touch-icon-180.png",
  "/icons/apple-touch-icon-167.png",
  "/icons/apple-touch-icon-152.png",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(PRECACHE_URLS);
        // Opportunistically precache current build assets referenced in index.html
        try {
          const indexResponse = await fetch("/index.html");
          if (indexResponse.ok) {
            const html = await indexResponse.text();
            const assetMatches = html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g);
            const assetsToCache = Array.from(new Set(Array.from(assetMatches, (m) => m[1])));
            if (assetsToCache.length > 0) {
              await cache.addAll(assetsToCache);
            }
          }
        } catch {
          // Offline or network error during opportunistic precache
        }
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Do not intercept or cache EduPage API proxy or serverless push endpoints
  if (url.pathname.startsWith("/api-")) return;

  // Never cache service worker script updates
  if (url.pathname === "/sw.js") return;

  // For navigation requests (HTML pages): Network-First, fall back to cached index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match("/index.html");
          if (fallback) return fallback;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }),
    );
    return;
  }

  // Only handle same-origin static assets
  if (url.origin !== self.location.origin) return;

  // Static assets (Vite hashed bundles, images, fonts): Cache-First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return new Response("Asset unavailable offline", { status: 503, statusText: "Offline" });
        });
    }),
  );
});

/* ------------------------------------------------------------------ *
 * Web Push Notifications
 * ------------------------------------------------------------------ */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Stundio", body: event.data.text() };
  }

  const title = payload.title || "Stundio — Izmaiņas sarakstā";
  const options = {
    body: payload.body || "Ir atjaunināts stundu saraksts.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url: payload.url || (payload.date ? `/?tab=day&date=${payload.date}` : "/"),
      date: payload.date,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          if (event.notification.data?.date) {
            client.postMessage({
              type: "NAVIGATE_DAY",
              date: event.notification.data.date,
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
