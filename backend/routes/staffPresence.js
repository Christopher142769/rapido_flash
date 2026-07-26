const express = require('express');
const crypto = require('crypto');
const StaffPresenceSettings = require('../models/StaffPresenceSettings');
const StaffPresenceRecord = require('../models/StaffPresenceRecord');
const { auth, isRestaurant } = require('../middleware/auth');

const router = express.Router();

const TZ = 'Africa/Porto-Novo';

function dateKeyBenin(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

function normalizeNamePart(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeFullKey(firstName, lastName) {
  return `${normalizeNamePart(firstName)} ${normalizeNamePart(lastName)}`
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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
  return `${publicPresenceBaseUrl()}/présence/${encodeURIComponent(code)}`;
}

function newPresenceCode() {
  return crypto.randomBytes(16).toString('hex');
}

async function getOrCreateSettings() {
  let doc = await StaffPresenceSettings.findOne({ key: 'default' });
  if (!doc) {
    doc = await StaffPresenceSettings.create({
      key: 'default',
      code: newPresenceCode(),
    });
  }
  return doc;
}

function serializeSettings(doc) {
  return {
    code: doc.code,
    url: publicPresenceUrl(doc.code),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Admin : récupérer (ou créer) le QR permanent. */
router.get('/settings', auth, isRestaurant, async (req, res) => {
  try {
    const doc = await getOrCreateSettings();
    res.json(serializeSettings(doc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Admin : régénérer le code (ancien QR invalide). */
router.post('/settings/regenerate', auth, isRestaurant, async (req, res) => {
  try {
    const doc = await getOrCreateSettings();
    doc.code = newPresenceCode();
    await doc.save();
    res.json(serializeSettings(doc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Admin : liste des présences (filtre date optionnel). */
router.get('/records', auth, isRestaurant, async (req, res) => {
  try {
    const filter = {};
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
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

/** Public : valider le code QR. */
router.get('/public/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Code manquant' });
    const settings = await StaffPresenceSettings.findOne({ code }).lean();
    if (!settings) return res.status(404).json({ message: 'QR code invalide' });
    res.json({
      ok: true,
      code: settings.code,
      todayKey: dateKeyBenin(),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Public : marquer présence (heure = serveur uniquement). */
router.post('/public/:code/check', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Code manquant' });

    const settings = await StaffPresenceSettings.findOne({ code }).lean();
    if (!settings) return res.status(404).json({ message: 'QR code invalide' });

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

    const existing = await StaffPresenceRecord.findOne({ dateKey, normalizedName }).lean();
    if (existing) {
      return res.json({
        ok: true,
        alreadyPresent: true,
        firstName: existing.firstName,
        lastName: existing.lastName,
        checkedAt: existing.checkedAt,
        dateKey: existing.dateKey,
        message: 'Présence déjà enregistrée aujourd’hui',
      });
    }

    const record = await StaffPresenceRecord.create({
      firstName,
      lastName,
      normalizedName,
      dateKey,
      checkedAt: now,
      code,
      checkedIp: clientIp(req),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
    });

    res.status(201).json({
      ok: true,
      alreadyPresent: false,
      firstName: record.firstName,
      lastName: record.lastName,
      checkedAt: record.checkedAt,
      dateKey: record.dateKey,
      message: 'Présence enregistrée',
    });
  } catch (e) {
    if (e?.code === 11000) {
      const dateKey = dateKeyBenin();
      const firstName = normalizeNamePart(req.body?.firstName || req.body?.prenom);
      const lastName = normalizeNamePart(req.body?.lastName || req.body?.nom);
      const existing = await StaffPresenceRecord.findOne({
        dateKey,
        normalizedName: normalizeFullKey(firstName, lastName),
      }).lean();
      if (existing) {
        return res.json({
          ok: true,
          alreadyPresent: true,
          firstName: existing.firstName,
          lastName: existing.lastName,
          checkedAt: existing.checkedAt,
          dateKey: existing.dateKey,
          message: 'Présence déjà enregistrée aujourd’hui',
        });
      }
    }
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
