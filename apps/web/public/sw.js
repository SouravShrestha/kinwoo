// Lets the installed app open offline and shows push notifications. Offline data comes from the
// persisted React Query cache, so API and auth requests are never cached here.
const CACHE = "kinwoo-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

// Pages carry no user data (screens load it client-side), so a cached copy is safe to replay.
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected && response.type === "basic") {
      (await caches.open(CACHE)).put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    data = null;
  }
  if (!data?.title) return;
  // userVisibleOnly subscriptions must always show something, so there is no foreground check.
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      data: { url: data.url, notificationId: data.notificationId, houseId: data.houseId },
    }),
  );
});

function withHouse(path, houseId) {
  const target = new URL(path, self.location.origin);
  target.searchParams.set("house", houseId);
  return target.pathname + target.search;
}

// An open window handles the tap itself (read mark and navigation share the app's cache). With
// none open, the app is opened on the target and the inbox row is marked read from here.
async function openFromNotification({ url, notificationId, houseId }) {
  const target = new URL(url ?? "/", self.location.origin);
  const path = target.origin === self.location.origin ? target.pathname + target.search : "/";

  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (windows.length > 0) {
    const [client] = windows;
    await client.focus();
    client.postMessage({ type: "notification-click", url: path, notificationId, houseId });
    return;
  }

  await Promise.all([
    // The app reads ?house= on start to switch to the house the push is about.
    self.clients.openWindow(houseId ? withHouse(path, houseId) : path),
    notificationId
      ? fetch(`/api/notifications/${encodeURIComponent(notificationId)}`, {
          method: "PATCH",
        }).catch(() => {})
      : null,
  ]);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(openFromNotification(event.notification.data ?? {}));
});

const STATIC_DESTINATIONS = new Set(["image", "font", "style", "script", "manifest"]);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // shortcut: hashed chunks from old deploys stay cached until CACHE is bumped; prune if it grows.
  // shortcut: /images/ files are not content-hashed; bump CACHE whenever one is replaced.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate" || STATIC_DESTINATIONS.has(request.destination)) {
    event.respondWith(networkFirst(request));
  }
});
