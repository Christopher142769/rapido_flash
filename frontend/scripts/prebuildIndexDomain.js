/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// Génère un index.html host-aware (canonical / og / hreflang / x-default)
// pour que le HTML source soit cohérent (indispensable pour Google).

function stripTrailingSlash(s) {
  return String(s || '').trim().replace(/\/$/, '');
}

const SITE_URL = stripTrailingSlash(process.env.REACT_APP_SITE_URL) || 'https://www.rapido.bj';
const SITE_URL_ALT = stripTrailingSlash(process.env.REACT_APP_SITE_URL_ALT) || 'https://www.rapido.online';

const BJ_URL = 'https://www.rapido.bj';
const ONLINE_URL = 'https://www.rapido.online';

const indexPath = path.join(__dirname, '..', 'public', 'index.html');

function main() {
  if (!fs.existsSync(indexPath)) {
    console.warn('[prebuildIndexDomain] index.html introuvable:', indexPath);
    return;
  }

  let html = fs.readFileSync(indexPath, 'utf8');

  // Canonical & OG url doivent pointer sur le domaine actif.
  html = html.replace(
    /<link rel="canonical" href="https:\/\/www\.rapido\.bj\/home"\s*\/?>/g,
    `<link rel="canonical" href="${SITE_URL}/home" />`
  );
  html = html.replace(
    /<meta property="og:url" content="https:\/\/www\.rapido\.bj\/home"\s*\/?>/g,
    `<meta property="og:url" content="${SITE_URL}/home" />`
  );

  // Images OG/Twitter doivent suivre le domaine actif.
  html = html.replace(
    /<meta property="og:image" content="https:\/\/www\.rapido\.bj\/images\/logo\.png"\s*\/?>/g,
    `<meta property="og:image" content="${SITE_URL}/images/logo.png" />`
  );
  html = html.replace(
    /<meta name="twitter:image" content="https:\/\/www\.rapido\.bj\/images\/logo\.png"\s*\/?>/g,
    `<meta name="twitter:image" content="${SITE_URL}/images/logo.png" />`
  );

  // hreflang :
  // - fr-BJ pointe toujours vers BJ_URL
  // - fr pointe toujours vers ONLINE_URL
  // - x-default pointe vers le domaine actif
  html = html.replace(
    /<link rel="alternate" hreflang="fr-BJ" href="https:\/\/www\.rapido\.bj\/home"\s*\/?>/g,
    `<link rel="alternate" hreflang="fr-BJ" href="${BJ_URL}/home" />`
  );
  html = html.replace(
    /<link rel="alternate" hreflang="fr" href="https:\/\/www\.rapido\.online\/home"\s*\/?>/g,
    `<link rel="alternate" hreflang="fr" href="${ONLINE_URL}/home" />`
  );
  html = html.replace(
    /<link rel="alternate" hreflang="x-default" href="https:\/\/www\.rapido\.bj\/home"\s*\/?>/g,
    `<link rel="alternate" hreflang="x-default" href="${SITE_URL}/home" />`
  );

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`[prebuildIndexDomain] index.html regénéré pour ${SITE_URL}`);
}

main();

