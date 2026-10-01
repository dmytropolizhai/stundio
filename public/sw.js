/**
 * Stundio PWA Service Worker.
 *
 * Provides offline app shell caching (HTML/JS/CSS/assets) so the app opens
 * reliably without network connectivity. Does NOT cache /api-edupage calls,
 * which are handled by Stundio's dedicated IndexedDB sync cache.
 *
 * `BUILD_ID` and `BUILD_ASSETS` are placeholders: `vite build` rewrites them in
 * dist/sw.js (the `precacheManifest` plugin in vite.config.ts) with every file the
 * bundle emitted. Precaching only what index.html names was not enough — lazy
 * chunks (Capacitor's web plugin shims, fonts, onboarding art) were then cached
 * only if they happened to load while online, so an offline launch could need a
 * file the worker had never seen. A new build also means a new cache name, so the
 * worker reinstalls and precaches the new assets on every deploy.
 */

const BUILD_ID = "dev";
const BUILD_ASSETS = [];

const CACHE_NAME = `stundio-shell-${BUILD_ID}`;

/** The SPA's one document. Every navigation is answered with it. */
const SHELL_URL = "/";

/**
 * How long a navigation waits on the network before the cached shell answers.
 * "Connected but no internet" (captive portals, a dead mobile link) never fails
 * fast — without a cap the app would sit on a blank page instead of opening offline.
 */
const NAVIGATION_TIMEOUT_MS = 3000;

// Not "/index.html": Cloudflare Pages answers it with a 308 to "/", and Safari refuses to
// render a redirected response handed to it by a service worker.
const PRECACHE_URLS = [
  SHELL_URL,
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
      .then((cache) => cache.addAll([...PRECACHE_URLS, ...BUILD_ASSETS]))
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

  // Navigations: network-first with a timeout, falling back to the cached shell. Stored
  // under SHELL_URL whatever the query (`/?tab=day&date=…` from a notification), so the
  // fallback is always the latest shell this device saw rather than a per-URL copy.
  if (request.mode === "navigate") {
    event.respondWith(navigate(event));
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

const navigate = (event) => {
  const network = fetch(event.request).then((response) => {
    if (response.status === 200 && !response.redirected) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy)));
    }
    return response;
  });
  // Keep the network copy landing in the cache even when the timeout answers first.
  event.waitUntil(network.catch(() => undefined));

  const timeout = new Promise((resolve) => setTimeout(resolve, NAVIGATION_TIMEOUT_MS));
  const cachedShell = () => caches.match(SHELL_URL);

  return Promise.race([network, timeout.then(() => null)])
    .catch(() => null)
    .then(async (response) => {
      if (response) return response;
      const cached = await cachedShell();
      if (cached) return cached;
      // No shell cached yet (very first visit): keep waiting on the network after all.
      return network.catch(() => new Response("Offline", { status: 503, statusText: "Offline" }));
    });
};

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
