// BauKalk mobil – Offline-Speicher. Bei Änderungen an der App die Versionsnummer erhöhen.
// Löscht nur eigene alte Caches (gleicher Origin wie die anderen Apps im Repository).
const PREFIX = "baukalk-mobil-";
const CACHE = PREFIX + "v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const cacheable = (url.origin === location.origin && url.pathname.includes("/baukalk-mobil/")) || url.host.endsWith("fonts.googleapis.com") || url.host.endsWith("fonts.gstatic.com");
  if (!cacheable) return;
  // Netz zuerst, damit Updates ankommen; offline aus dem Cache.
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});