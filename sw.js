// Guarda la app en el celular para que funcione sin internet y muestra los recordatorios.
// Subí el número de versión cada vez que cambies archivos de la app.
const CACHE = 'appgym-v3';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'data.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Primero intenta la red (para tener siempre la última versión) y si no hay conexión usa la copia guardada.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

// Llega un recordatorio desde el servidor
self.addEventListener('push', (e) => {
  let msg = { title: 'AppGym', body: 'Tenés un recordatorio', url: './' };
  try { msg = { ...msg, ...e.data.json() }; } catch (err) { /* sin datos */ }
  e.waitUntil(self.registration.showNotification(msg.title, {
    body: msg.body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'appgym-supps',
    renotify: true,
    data: { url: new URL(msg.url, self.registration.scope).href },
  }));
});

// Al tocar la notificación, abrir la app (y marcar los suplementos)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || self.registration.scope;
  e.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        await w.focus();
        return w.navigate(url);
      }
    }
    return clients.openWindow(url);
  })());
});
