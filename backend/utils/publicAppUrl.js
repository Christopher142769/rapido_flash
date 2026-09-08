/**
 * URL publique canonique du frontend (liens QR, emails, etc.).
 * Ne doit PAS être une URL *.onrender.com (souvent utilisée seulement pour le CORS).
 */
function normalizeBase(url) {
  return String(url || '')
    .trim()
    .replace(/\/$/, '');
}

function isOnRenderHost(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.onrender.com') || host === 'onrender.com';
  } catch {
    return /onrender\.com/i.test(String(url || ''));
  }
}

function candidatePublicBases() {
  return [
    process.env.PUBLIC_APP_URL,
    process.env.PUBLIC_FRONTEND_URL,
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_1,
    process.env.FRONTEND_URL_2,
    process.env.FRONTEND_URL_3,
    process.env.FRONTEND_URL_4,
    'https://rapido.online',
  ]
    .map(normalizeBase)
    .filter(Boolean);
}

function publicAppBaseUrl() {
  const candidates = candidatePublicBases();
  const preferred = candidates.find((u) => !isOnRenderHost(u));
  return preferred || 'https://rapido.online';
}

module.exports = {
  publicAppBaseUrl,
  isOnRenderHost,
  normalizeBase,
};
