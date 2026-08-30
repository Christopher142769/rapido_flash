const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function uploadsRoot() {
  return path.resolve(__dirname, '..', 'uploads');
}

function resolveLocalSelfiePath(selfieUrl) {
  const raw = String(selfieUrl || '').trim();
  if (!raw || raw.startsWith('http://') || raw.startsWith('https://')) return null;
  const rel = raw.replace(/^\/+/, '');
  const abs = path.resolve(__dirname, '..', rel);
  const root = uploadsRoot();
  if (abs !== root && !abs.startsWith(`${root}${path.sep}`)) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

function fetchUrlBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrlBuffer(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function readSelfieBuffer(selfieUrl) {
  const raw = String(selfieUrl || '').trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      return await fetchUrlBuffer(raw);
    } catch {
      return null;
    }
  }
  const local = resolveLocalSelfiePath(raw);
  if (!local) return null;
  try {
    return fs.readFileSync(local);
  } catch {
    return null;
  }
}

function publicSelfieUrl(selfieUrl) {
  const raw = String(selfieUrl || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const base =
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_URL_1 ||
    process.env.FRONTEND_URL ||
    process.env.FRONTEND_URL_2 ||
    'https://rapido.online';
  return `${String(base).replace(/\/$/, '')}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function safeZipBaseName(record) {
  const name = `${record.firstName || ''}_${record.lastName || ''}`
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);
  const kind = record.kind === 'exit' ? 'sortie' : 'arrivee';
  const d = record.checkedAt ? new Date(record.checkedAt) : new Date();
  const stamp = d.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${stamp}_${name || 'employe'}_${kind}.jpg`;
}

module.exports = {
  readSelfieBuffer,
  resolveLocalSelfiePath,
  publicSelfieUrl,
  safeZipBaseName,
};
