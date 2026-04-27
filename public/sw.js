// Minimal service worker. Caches the same-origin app shell so the PWA keeps
// working when the host is unreachable. Cross-origin requests (Google Fonts
// etc.) pass through untouched — no cache bloat from third-party assets.

const CACHE = "bikepay-v3";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(["./", "./index.html", "./manifest.webmanifest", "./icon.svg"]).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // skip third-party
  e.respondWith(
    fetch(req)
      .then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match("./")))
  );
});
