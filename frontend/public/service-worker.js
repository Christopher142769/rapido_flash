/* eslint-disable no-restricted-globals */
/**
 * Cache léger + notifications push Web (affichage hors onglet).
 */
const CACHE_VERSION = 'rapido-flash-v4-push';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled([cache.add('/').catch(() => null), cache.add('/manifest.json').catch(() => null)])
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Rapido', body: '', url: '/home', tag: 'rapido' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch (e) {
    try {
      const text = event.data.text();
      if (text) payload.body = text;
    } catch (_) {
      /* ignore */
    }
  }

  const origin = self.location.origin;
  const openPath = payload.url && String(payload.url).startsWith('/') ? payload.url : '/home';

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Rapido', {
      body: payload.body || '',
      icon: '/images/logo.png',
      badge: '/images/logo.png',
      tag: payload.tag || 'rapido',
      data: { url: openPath, origin },
      vibrate: [120, 60, 120],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const path = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/home';
  const base = (data.origin || self.location.origin || '').replace(/\/$/, '');
  const targetUrl = base + path;
  event.waitUntil(self.clients.openWindow(targetUrl));
});
