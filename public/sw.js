const CACHE_NAME = "dash-dental-shell-v1";
const SHELL_ROUTES = ["/", "/workspaces", "/inbox", "/dashboard", "/alerts"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ROUTES))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/workspaces"))),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Dash Dental SLA alert";
  const body = payload.body || "A patient thread needs attention.";
  const url = payload.url || "/inbox";

  event.waitUntil(
    self.registration.showNotification(title, {
      badge: "/icon-192.png",
      body,
      data: { url },
      icon: "/icon-192.png",
      tag: payload.tag || "dash-dental-sla",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/inbox", self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((clients) => {
        const visibleClient = clients.find((client) => client.url === targetUrl);
        if (visibleClient) {
          return visibleClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
