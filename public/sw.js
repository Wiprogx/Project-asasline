/*
 * The office's service worker. It is deliberately small, because the app is authenticated and
 * every screen is personal:
 *
 * - a navigation is always fetched from the network and never stored; when the network is
 *   away, the one page in the cache (/offline) is shown instead;
 * - the build's static files (content-hashed, immutable), the icons and the fonts are served
 *   from the cache once seen;
 * - everything else is left alone: POSTs (server actions), React Server Component payloads
 *   (the RSC header, ?_rsc=), /api (the event stream, the file downloads), the printed
 *   documents and the UBL files.
 *
 * The cache name carries a version; an activation drops the caches of earlier versions.
 */
const VERSION = "asl-v1";
const OFFLINE = "/offline";
const STATIC = /^\/(_next\/static\/|icons\/)|\.(png|ico|svg|woff2?)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.add(OFFLINE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (
    request.headers.get("RSC") ||
    url.searchParams.has("_rsc") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/print/") ||
    url.pathname.endsWith("/ubl")
  )
    return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
    return;
  }

  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
