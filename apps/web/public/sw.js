// Lets the installed app open offline. Data comes from the persisted React Query cache, so API
// and auth requests are never cached here.
const CACHE = "kinwoo-v1";

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

const STATIC_DESTINATIONS = new Set(["image", "font", "style", "script", "manifest"]);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // shortcut: hashed chunks from old deploys stay cached until CACHE is bumped; prune if it grows.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate" || STATIC_DESTINATIONS.has(request.destination)) {
    event.respondWith(networkFirst(request));
  }
});
