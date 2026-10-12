const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { cloudinary } = require('./cloudinaryClient');

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

function mediaKeyFromUrl(selfieUrl) {
  const raw = String(selfieUrl || '').trim();
  const match = raw.match(/\/staff-presence\/media\/([a-f0-9]{16,})$/i);
  return match ? match[1] : '';
}

function cloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const publicId = `sp-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'rapido/staff-presence',
        public_id: publicId,
        resource_type: 'image',
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Envoie le selfie vers Cloudinary. Si le cloud est désactivé, garde l'image en base.
 * @returns {{ url: string, key?: string, data?: Buffer, mime?: string }}
 */
async function persistStaffSelfie(file) {
  const buffer = file?.buffer;
  if (!buffer?.length) throw new Error('Selfie requis');
  const mime = String(file.mimetype || 'image/jpeg');

  if (cloudinaryConfigured()) {
    try {
      const result = await uploadBufferToCloudinary(buffer);
      if (result?.secure_url) return { url: result.secure_url };
    } catch (err) {
      console.warn(
        '[staff-presence] Cloudinary indisponible, selfie enregistré en base:',
        err?.message || err
      );
    }
  }

  const key = crypto.randomBytes(16).toString('hex');
  return {
    url: `/api/staff-presence/media/${key}`,
    key,
    data: buffer,
    mime,
  };
}

async function readSelfieBuffer(selfieUrl) {
  const raw = String(selfieUrl || '').trim();
  if (!raw) return null;
  const key = mediaKeyFromUrl(raw);
  if (key) {
    const StaffPresenceRecord = require('../models/StaffPresenceRecord');
    const rec = await StaffPresenceRecord.findOne({ selfieKey: key }).select('+selfieData');
    if (rec?.selfieData?.length) return Buffer.from(rec.selfieData);
  }
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
  const { publicAppBaseUrl } = require('./publicAppUrl');
  const base = publicAppBaseUrl();
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
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
  persistStaffSelfie,
  mediaKeyFromUrl,
};
