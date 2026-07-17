/* eslint-disable no-restricted-globals */
/**
 * Cache léger + notifications push Web (affichage hors onglet).
 */
const CACHE_VERSION = 'rapido-flash-v5-cuisine-push';

const MEAL_SOUND = '/sounds/meal-order-notification.wav';
const DEFAULT_SOUND = '/sounds/shopify-sales-notification.mp3';

function isMealKitchenPayload(payload) {
  if (payload?.sound === 'meal') return true;
  const tag = String(payload?.tag || '');
  return tag.startsWith('rapido-kitchen-order') || tag.startsWith('rapido-meal-order');
}

function notifyClients(payload) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'RAPIDO_PUSH', payload });
    });
  });
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled([
        cache.add('/').catch(() => null),
        cache.add('/manifest.json').catch(() => null),
        cache.add('/cuisine-manifest.json').catch(() => null),
      ])
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
  const isMeal = isMealKitchenPayload(payload);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title || 'Rapido', {
        body: payload.body || '',
        icon: '/images/logo.png',
        badge: '/images/logo.png',
        tag: payload.tag || 'rapido',
        data: { url: openPath, origin, sound: isMeal ? 'meal' : 'default' },
        vibrate: isMeal ? [180, 80, 180, 80, 240] : [120, 60, 120],
        silent: false,
        ...(isMeal ? { sound: MEAL_SOUND } : {}),
      }),
      notifyClients({ ...payload, sound: isMeal ? 'meal' : 'default' }),
    ])
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
