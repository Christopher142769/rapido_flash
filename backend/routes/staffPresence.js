const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const StaffPresenceSettings = require('../models/StaffPresenceSettings');
const StaffPresenceRecord = require('../models/StaffPresenceRecord');
const Restaurant = require('../models/Restaurant');
const { auth, isRestaurant } = require('../middleware/auth');

const router = express.Router();

const TZ = 'Africa/Porto-Novo';
const VALID_KINDS = new Set(['arrival', 'exit']);

let indexesEnsured = false;

function dateKeyBenin(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

function normalizeNamePart(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Identité stable : accents ignorés, ordre prénom/nom indifférent. */
function normalizeFullKey(firstName, lastName) {
  return `${normalizeNamePart(firstName)} ${normalizeNamePart(lastName)}`
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.ip || req.socket?.remoteAddress || '';
}

function publicPresenceBaseUrl() {
  const raw =
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_URL_1 ||
    process.env.FRONTEND_URL ||
    process.env.FRONTEND_URL_2 ||
    'https://rapido.online';
  return String(raw).replace(/\/$/, '');
}

function publicPresenceUrl(code) {
  // Chemin ASCII uniquement : les scanners photo ouvrent /presence/ directement,
  // alors que /présence/ (é) est souvent proposé en « copier le lien ».
  return `${publicPresenceBaseUrl()}/presence/${encodeURIComponent(code)}`;
}

function newPresenceCode() {
  return crypto.randomBytes(16).toString('hex');
}

async function ensureRecordIndexes() {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    await StaffPresenceRecord.updateMany(
      { $or: [{ kind: { $exists: false } }, { kind: null }, { kind: '' }] },
      { $set: { kind: 'arrival' } }
    );
    const col = StaffPresenceRecord.collection;
    const indexes = await col.indexes();
    for (const idx of indexes) {
      const key = idx.key || {};
      const keys = Object.keys(key);
      // Ancien index unique sans kind
      if (
        idx.unique &&
        keys.length === 2 &&
        key.dateKey === 1 &&
        key.normalizedName === 1 &&
        !('kind' in key)
      ) {
        await col.dropIndex(idx.name).catch(() => {});
      }
    }
    await StaffPresenceRecord.syncIndexes();
  } catch (e) {
    console.warn('[staff-presence] ensureRecordIndexes:', e.message);
  }
}

async function getOrCreateSettings() {
  let doc = await StaffPresenceSettings.findOne({ key: 'default' });
  if (!doc) {
    doc = await StaffPresenceSettings.create({
      key: 'default',
      arrivalCode: newPresenceCode(),
      exitCode: newPresenceCode(),
    });
    return doc;
  }

  let dirty = false;
  if (!doc.arrivalCode) {
    doc.arrivalCode = doc.code || newPresenceCode();
    dirty = true;
  }
  if (!doc.exitCode) {
    doc.exitCode = newPresenceCode();
    dirty = true;
  }
  if (dirty) await doc.save();
  return doc;
}

function resolveKindFromCode(doc, code) {
  if (!doc || !code) return null;
  if (doc.exitCode && doc.exitCode === code) return 'exit';
  if (doc.arrivalCode && doc.arrivalCode === code) return 'arrival';
  if (doc.code && doc.code === code) return 'arrival';
  return null;
}

async function findSettingsByCode(code) {
  return StaffPresenceSettings.findOne({
    $or: [{ arrivalCode: code }, { exitCode: code }, { code }],
  });
}

function mimeFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'image/png';
}

function logoPathToDataUrl(logoPath) {
  if (!logoPath) return null;
  const raw = String(logoPath).trim();
  if (raw.startsWith('data:image/')) return raw;
  if (/^https?:\/\//i.test(raw)) return null;
  const rel = raw.replace(/^\/+/, '');
  const abs = path.resolve(__dirname, '..', rel);
  const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
  if (abs !== uploadsRoot && !abs.startsWith(`${uploadsRoot}${path.sep}`)) return null;
  if (!fs.existsSync(abs)) return null;
  try {
    const buf = fs.readFileSync(abs);
    return `data:${mimeFromExt(abs)};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function getKingFishBranding() {
  const doc = await Restaurant.findOne({
    nom: { $regex: /king\s*fish/i },
    isPlatformSupport: { $ne: true },
  })
    .select('nom logo')
    .lean();
  const companyLogo = doc?.logo || null;
  return {
    companyName: doc?.nom || 'KING FISH',
    companyLogo,
    companyLogoDataUrl: logoPathToDataUrl(companyLogo),
  };
}

async function serializeSettings(doc) {
  const branding = await getKingFishBranding();
  return {
    arrivalCode: doc.arrivalCode,
    exitCode: doc.exitCode,
    arrivalUrl: publicPresenceUrl(doc.arrivalCode),
    exitUrl: publicPresenceUrl(doc.exitCode),
    /** rétrocompat */
    code: doc.arrivalCode,
    url: publicPresenceUrl(doc.arrivalCode),
    companyName: branding.companyName,
    companyLogo: branding.companyLogo,
    companyLogoDataUrl: branding.companyLogoDataUrl,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function kindLabel(kind) {
  return kind === 'exit' ? 'sortie' : 'arrivée';
}

function alreadyMessage(kind) {
  return kind === 'exit'
    ? 'Sortie déjà enregistrée aujourd’hui'
    : 'Arrivée déjà enregistrée aujourd’hui';
}

function successMessage(kind) {
  return kind === 'exit' ? 'Sortie enregistrée' : 'Arrivée enregistrée';
}

/** Admin : récupérer (ou créer) les QR permanents. */
router.get('/settings', auth, isRestaurant, async (req, res) => {
  try {
    await ensureRecordIndexes();
    const doc = await getOrCreateSettings();
    res.json(await serializeSettings(doc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/**
 * Admin : régénérer un QR.
 * body.kind = 'arrival' | 'exit' | 'both' (défaut: both)
 */
router.post('/settings/regenerate', auth, isRestaurant, async (req, res) => {
  try {
    const kind = String(req.body?.kind || 'both').trim().toLowerCase();
    const doc = await getOrCreateSettings();
    if (kind === 'arrival' || kind === 'both') doc.arrivalCode = newPresenceCode();
    if (kind === 'exit' || kind === 'both') doc.exitCode = newPresenceCode();
    await doc.save();
    res.json(await serializeSettings(doc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Admin : liste des présences (filtre date + kind). */
router.get('/records', auth, isRestaurant, async (req, res) => {
  try {
    await ensureRecordIndexes();
    const filter = {};
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const kind = String(req.query.kind || '').trim().toLowerCase();
    if (VALID_KINDS.has(kind)) filter.kind = kind;

    if (dateFrom && dateTo) {
      filter.dateKey = { $gte: dateFrom, $lte: dateTo };
    } else if (dateFrom) {
      filter.dateKey = dateFrom;
    } else if (dateTo) {
      filter.dateKey = { $lte: dateTo };
    } else if (req.query.date) {
      filter.dateKey = String(req.query.date).trim();
    }

    const records = await StaffPresenceRecord.find(filter)
      .sort({ checkedAt: -1, _id: -1 })
      .lean();
    res.json(records);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Public : valider le code QR + type (arrivée / sortie). */
router.get('/public/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Code manquant' });
    const settings = await findSettingsByCode(code);
    if (!settings) return res.status(404).json({ message: 'QR code invalide' });
    const kind = resolveKindFromCode(settings, code);
    if (!kind) return res.status(404).json({ message: 'QR code invalide' });
    res.json({
      ok: true,
      code,
      kind,
      kindLabel: kindLabel(kind),
      todayKey: dateKeyBenin(),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Public : marquer arrivée ou sortie (heure = serveur uniquement). */
router.post('/public/:code/check', async (req, res) => {
  try {
    await ensureRecordIndexes();
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Code manquant' });

    const settings = await findSettingsByCode(code);
    if (!settings) return res.status(404).json({ message: 'QR code invalide' });
    const kind = resolveKindFromCode(settings, code);
    if (!kind) return res.status(404).json({ message: 'QR code invalide' });

    const firstName = normalizeNamePart(req.body?.firstName || req.body?.prenom);
    const lastName = normalizeNamePart(req.body?.lastName || req.body?.nom);
    if (!firstName || firstName.length < 2) {
      return res.status(400).json({ message: 'Prénom requis (2 caractères min.)' });
    }
    if (!lastName || lastName.length < 2) {
      return res.status(400).json({ message: 'Nom requis (2 caractères min.)' });
    }

    const now = new Date();
    const dateKey = dateKeyBenin(now);
    const normalizedName = normalizeFullKey(firstName, lastName);

    const existing = await StaffPresenceRecord.findOne({ dateKey, normalizedName, kind }).lean();
    if (existing) {
      return res.json({
        ok: true,
        alreadyPresent: true,
        kind,
        kindLabel: kindLabel(kind),
        firstName: existing.firstName,
        lastName: existing.lastName,
        checkedAt: existing.checkedAt,
        dateKey: existing.dateKey,
        message: alreadyMessage(kind),
      });
    }

    const record = await StaffPresenceRecord.create({
      firstName,
      lastName,
      normalizedName,
      kind,
      dateKey,
      checkedAt: now,
      code,
      checkedIp: clientIp(req),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
    });

    res.status(201).json({
      ok: true,
      alreadyPresent: false,
      kind,
      kindLabel: kindLabel(kind),
      firstName: record.firstName,
      lastName: record.lastName,
      checkedAt: record.checkedAt,
      dateKey: record.dateKey,
      message: successMessage(kind),
    });
  } catch (e) {
    if (e?.code === 11000) {
      const dateKey = dateKeyBenin();
      const firstName = normalizeNamePart(req.body?.firstName || req.body?.prenom);
      const lastName = normalizeNamePart(req.body?.lastName || req.body?.nom);
      const code = String(req.params.code || '').trim();
      const settings = await findSettingsByCode(code);
      const kind = resolveKindFromCode(settings, code) || 'arrival';
      const existing = await StaffPresenceRecord.findOne({
        dateKey,
        normalizedName: normalizeFullKey(firstName, lastName),
        kind,
      }).lean();
      if (existing) {
        return res.json({
          ok: true,
          alreadyPresent: true,
          kind,
          kindLabel: kindLabel(kind),
          firstName: existing.firstName,
          lastName: existing.lastName,
          checkedAt: existing.checkedAt,
          dateKey: existing.dateKey,
          message: alreadyMessage(kind),
        });
      }
    }
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
