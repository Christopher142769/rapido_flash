const crypto = require('crypto');

const QR_TTL_MS = 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const FINISH_TTL_MS = 20 * 60 * 1000;

function secret() {
  return process.env.LIVREUR_SECRET || `${process.env.JWT_SECRET || 'secret_key'}:livreur`;
}

function b64u(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** @returns {object|null} payload si signature valide et non expiré. */
function verify(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.e || Date.now() > payload.e) return null;
    return payload;
  } catch {
    return null;
  }
}

function newQrToken(siteId, kind) {
  const nonce = crypto.randomBytes(12).toString('hex');
  return { token: sign({ t: 'qr', s: siteId, k: kind, n: nonce, e: Date.now() + QR_TTL_MS }), nonce };
}

const sessionToken = (employeeId) => sign({ t: 'sess', id: String(employeeId), e: Date.now() + SESSION_TTL_MS });
const finishTicket = (employeeId, deliveryId) =>
  sign({ t: 'fin', id: String(employeeId), d: String(deliveryId), e: Date.now() + FINISH_TTL_MS });

function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
  const h = crypto.pbkdf2Sync(String(pin), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${h}`;
}

function checkPin(pin, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  const calc = crypto.pbkdf2Sync(String(pin), salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(h));
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Position envoyée par le téléphone → objet normalisé (+ distance au site si référence connue). */
async function buildGeo(body, site) {
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const accuracy = Number.isFinite(Number(body?.accuracy)) ? Math.round(Number(body.accuracy)) : null;
  const geo = { lat, lng, accuracy, distanceM: null, inZone: null };
  if (site && Number.isFinite(site.lat) && Number.isFinite(site.lng)) {
    geo.distanceM = Math.round(haversineM(lat, lng, site.lat, site.lng));
    geo.inZone = geo.distanceM <= (site.radiusM || 300) + Math.min(accuracy || 0, 150);
  }
  const named = await require('./reverseGeocode').reverseGeocode(lat, lng);
  if (named) {
    geo.place = named.place;
    geo.nearby = named.nearby;
  }
  return geo;
}

/** Sérialise les écritures du journal (une seule instance serveur). */
let chainLock = Promise.resolve();
function withChainLock(fn) {
  const run = chainLock.then(fn, fn);
  chainLock = run.catch(() => {});
  return run;
}

function phoneDigits(v) {
  return String(v || '').replace(/[^\d+]/g, '');
}

module.exports = {
  QR_TTL_MS,
  verify,
  newQrToken,
  sessionToken,
  finishTicket,
  hashPin,
  checkPin,
  haversineM,
  buildGeo,
  withChainLock,
  phoneDigits,
};
