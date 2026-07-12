// Bump CACHE_VERSION on each deploy so the browser detects a new service worker.
const CACHE_VERSION = "morph-ops-v5";

self.addEventListener("install", (event) => {
  // Wait for the page to tell us to activate (via SKIP_WAITING) so the user controls refresh.
  event.waitUntil(Promise.resolve(CACHE_VERSION));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Morph Ops";
  const options = {
    body: payload.body || "You have a new reminder.",
    data: {
      url: payload.url || "/tasks",
      taskId: payload.taskId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/tasks";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
