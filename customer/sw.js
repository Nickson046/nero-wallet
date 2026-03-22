/* ============================================================
   NERO FUEL WALLET — Service Worker
   Caches the app shell so it loads offline
============================================================ */

const CACHE_NAME   = "nero-wallet-v1";
const SHELL_ASSETS = [
  "./index.html",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@300;400;500&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
];

/* Install — cache app shell */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

/* Activate — clean old caches */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch — serve from cache, fall back to network */
self.addEventListener("fetch", event => {
  /* Skip Firebase and non-GET requests */
  const url = event.request.url;
  if (event.request.method !== "GET") return;
  if (url.includes("firestore.googleapis.com")) return;
  if (url.includes("identitytoolkit.googleapis.com")) return;
  if (url.includes("securetoken.googleapis.com")) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        /* Cache successful responses for app assets */
        if (response && response.status === 200 && response.type !== "opaque") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        /* Offline fallback — return the cached app shell */
        if (event.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});

/* Push notifications */
self.addEventListener("push", event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "NERO Wallet", {
      body:    data.body  || "You have a new notification",
      icon:    data.icon  || "./icon-192.png",
      badge:   "./icon-192.png",
      tag:     data.tag   || "nero-notification",
      data:    data.url   || "./index.html",
      actions: data.actions || []
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      const url = event.notification.data || "./index.html";
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});