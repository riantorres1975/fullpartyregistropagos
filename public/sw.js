// Service worker mínimo de "Mis Transferencias".
// Objetivo: hacer la app instalable y acelerar la carga de archivos estáticos.
// IMPORTANTE: NUNCA cachea /api/ (datos sensibles) — esos siempre van a la red.
const CACHE = "mt-static-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // datos: siempre a la red

  // Solo cacheamos estáticos no sensibles (cache-first).
  const cacheable =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons") ||
    url.pathname.startsWith("/tesseract") ||
    url.pathname === "/manifest.webmanifest";

  if (!cacheable) return;

  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          }),
      ),
    ),
  );
});
