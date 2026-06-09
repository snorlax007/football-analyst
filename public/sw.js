const CACHE_VERSION = "fa-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const REPORT_CACHE = `${CACHE_VERSION}-reports`;

const PRECACHE_URLS = ["/offline.html", "/manifest.json", "/icon.svg"];

// ── Install: precache offline shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== REPORT_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: caching strategy ───────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip API routes — always go to network
  if (url.pathname.startsWith("/api/")) return;

  // Next.js static assets: cache-first (filenames are content-hashed)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Match report pages: network-first, cache for offline reading
  if (url.pathname.startsWith("/matches/") || url.pathname.startsWith("/share/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(REPORT_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((cached) => cached ?? caches.match("/offline.html"))
        )
    );
    return;
  }

  // All other navigation: network-first with offline fallback
  event.respondWith(
    fetch(req)
      .catch(() =>
        caches
          .match(req)
          .then((cached) => cached ?? caches.match("/offline.html"))
      )
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Football AI Analyst", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Football AI Analyst", {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: payload.tag ?? "football-alert",
      data: { url: payload.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
