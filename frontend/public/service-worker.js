/* eslint-disable no-restricted-globals */
/**
 * Service worker minimal : PAS d’écouteur "fetch" = plus d’erreurs
 * FetchEvent / Failed to fetch / promise rejected.
 * (Les anciennes versions interceptaient fetch() et rejetaient si le réseau échouait.)
 */
const CACHE_VERSION = 'rapido-flash-v3';

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

/* Aucun self.addEventListener('fetch') — le navigateur gère tout le réseau normalement. */
