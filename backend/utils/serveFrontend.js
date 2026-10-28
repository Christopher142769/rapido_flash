/**
 * Frontend React (build CRA) servi par Express — même origine que l’API.
 * Remplace l’hébergement statique Render : rapido.bj, rapido.online et le
 * sous-domaine Hostinger pointent tous sur ce serveur Node.
 *
 * Reprend frontend/public/_redirects (URLs propres → pages HTML statiques),
 * puis fallback SPA vers index.html pour toute route non-API.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');

// Préfixes jamais servis par le SPA (API, médias backend, healthcheck)
const BACKEND_PREFIXES = ['/api', '/uploads', '/healthz', '/socket'];

// Équivalent Express de frontend/public/_redirects et recrutement/_redirects
const PRETTY_URLS = {
  '/politique-confidentialite': 'politique-confidentialite/index.html',
  '/politique-confidentialite/': 'politique-confidentialite/index.html',
  '/privacy': 'privacy.html',
  '/recrutement': 'recrutement/carrieres.html',
  '/recrutement/': 'recrutement/carrieres.html',
  '/recrutement/merci': 'recrutement/merci.html',
};

// Fichiers à ne jamais mettre en cache (sinon les clients gardent un ancien build)
const NO_CACHE_FILES = new Set(['index.html', 'service-worker.js', 'manifest.json', 'cuisine-manifest.json']);

// Un chemin avec extension qui n’existe pas = 404, pas index.html (évite ChunkLoadError « Unexpected token < »)
const ASSET_EXT = /\.(js|mjs|css|map|json|xml|txt|ico|png|jpe?g|gif|webp|avif|svg|woff2?|ttf|eot|mp3|wav|ogg|mp4|webm|pdf)$/i;

function setNoCache(res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
}

function setStaticHeaders(res, filepath) {
  const rel = filepath.split(path.sep).join('/');
  if (rel.includes('/static/')) {
    // Fichiers hashés par CRA : cache long et immuable
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (NO_CACHE_FILES.has(path.basename(filepath)) || rel.endsWith('.html')) {
    setNoCache(res);
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  if (path.basename(filepath) === 'service-worker.js') {
    res.setHeader('Service-Worker-Allowed', '/');
  }
}

function isBackendPath(p) {
  return BACKEND_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/**
 * Monte le frontend si frontend/build/index.html existe. Retourne true si monté.
 */
function serveFrontend(app, buildPath) {
  const indexHtml = path.join(buildPath, 'index.html');
  if (!fs.existsSync(indexHtml)) return false;

  const sendBuildFile = (res, next, rel) => {
    setStaticHeaders(res, path.join(buildPath, rel));
    res.sendFile(path.join(buildPath, rel), (err) => {
      if (err) next(err);
    });
  };

  // Anciennes pages /shop/:slug compilées avec des chemins relatifs
  app.use((req, res, next) => {
    if (req.url.startsWith('/shop/static/')) req.url = req.url.slice('/shop'.length);
    next();
  });

  app.get(Object.keys(PRETTY_URLS), (req, res, next) => sendBuildFile(res, next, PRETTY_URLS[req.path]));

  app.use(
    express.static(buildPath, {
      index: false,
      redirect: false,
      setHeaders: setStaticHeaders,
    })
  );

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const p = req.path || '/';
    if (isBackendPath(p)) return next();
    if (p.startsWith('/static/') || ASSET_EXT.test(p)) {
      return res.status(404).type('text/plain').send('Not found');
    }
    sendBuildFile(res, next, 'index.html');
  });

  return true;
}

module.exports = serveFrontend;
