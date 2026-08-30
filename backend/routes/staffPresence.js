const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const StaffPresenceSettings = require('../models/StaffPresenceSettings');
const StaffPresenceRecord = require('../models/StaffPresenceRecord');
const StaffEmployee = require('../models/StaffEmployee');
const StaffWeeklySchedule = require('../models/StaffWeeklySchedule');
const Restaurant = require('../models/Restaurant');
const uploadStaffPresence = require('../middleware/uploadStaffPresence');
const { auth, isRestaurant } = require('../middleware/auth');
const {
  SITES,
  SITE_IDS,
  DEFAULT_SITE_ID,
  isValidSiteId,
  siteLabel,
} = require('../utils/staffPresenceSites');
const { notifyPresenceRecorded } = require('../services/staffPresenceMailer');
const { readSelfieBuffer, safeZipBaseName } = require('../utils/staffPresenceSelfie');
const {
  SHIFTS,
  SHIFT_IDS,
  dateKeyBenin,
  isoWeekdayBenin,
  suggestShift,
  isValidShift,
  shiftLabel,
  shiftWindowKey,
  computeOvertimeMinutes,
  formatMinutesLabel,
} = require('../utils/staffPresenceShifts');
const {
  WEEKDAYS,
  isValidRestDays,
  normalizeSlots,
  getScheduleForSite,
  seedGbegameyPlanning,
  serializeSchedule,
  assignedShiftsForEmployee,
  scheduleHasAssignments,
  isShiftAllowedForEmployee,
} = require('../utils/staffPresencePlanning');

const router = express.Router();

const VALID_KINDS = new Set(['arrival', 'exit']);
let indexesEnsured = false;

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
  return `${publicPresenceBaseUrl()}/presence/${encodeURIComponent(code)}`;
}

function newPresenceCode() {
  return crypto.randomBytes(16).toString('hex');
}

function selfieUrlFromFile(file) {
  if (!file) return '';
  const stored = String(file.path || '').trim();
  if (stored.startsWith('http://') || stored.startsWith('https://')) return stored;
  const name = path.basename(stored || file.filename || '');
  return name ? `/uploads/staff-presence/${name}` : '';
}

async function ensureRecordIndexes() {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    await StaffPresenceRecord.updateMany(
      { $or: [{ kind: { $exists: false } }, { kind: null }, { kind: '' }] },
      { $set: { kind: 'arrival' } }
    );
    await StaffPresenceRecord.updateMany(
      { $or: [{ siteId: { $exists: false } }, { siteId: null }, { siteId: '' }] },
      { $set: { siteId: DEFAULT_SITE_ID } }
    );
    await StaffPresenceSettings.updateMany({ key: 'default' }, { $set: { key: DEFAULT_SITE_ID } });

    const col = StaffPresenceRecord.collection;
    const indexes = await col.indexes();
    for (const idx of indexes) {
      const key = idx.key || {};
      const keys = Object.keys(key);
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

async function getOrCreateSiteSettings(siteId) {
  const key = isValidSiteId(siteId) ? siteId : DEFAULT_SITE_ID;
  let doc = await StaffPresenceSettings.findOne({ key });
  if (!doc) {
    doc = await StaffPresenceSettings.create({
      key,
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

async function ensureAllSiteSettings() {
  const docs = {};
  for (const siteId of SITE_IDS) {
    docs[siteId] = await getOrCreateSiteSettings(siteId);
  }
  return docs;
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
  const siteId = doc.key || DEFAULT_SITE_ID;
  return {
    siteId,
    siteLabel: siteLabel(siteId),
    arrivalCode: doc.arrivalCode,
    exitCode: doc.exitCode,
    arrivalUrl: publicPresenceUrl(doc.arrivalCode),
    exitUrl: publicPresenceUrl(doc.exitCode),
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
    ? 'Sortie déjà enregistrée pour cette plage'
    : 'Arrivée déjà enregistrée pour cette plage';
}

function successMessage(kind) {
  return kind === 'exit' ? 'Sortie enregistrée' : 'Arrivée enregistrée';
}

function shiftsPayload() {
  return SHIFT_IDS.map((id) => ({ id, label: SHIFTS[id].label, scheduledMinutes: SHIFTS[id].scheduledMinutes }));
}

function parseCheckBody(req) {
  const body = req.body || {};
  return {
    employeeId: String(body.employeeId || '').trim(),
    shift: String(body.shift || '').trim().toLowerCase(),
    firstName: normalizeNamePart(body.firstName || body.prenom),
    lastName: normalizeNamePart(body.lastName || body.nom),
  };
}

async function computeExitMetrics({ siteId, employeeId, shiftWindowKey, exitAt }) {
  const arrival = await StaffPresenceRecord.findOne({
    siteId,
    employeeId,
    shiftWindowKey,
    kind: 'arrival',
  })
    .sort({ checkedAt: -1 })
    .lean();
  if (!arrival?.checkedAt) {
    return { workedMinutes: null, overtimeMinutes: null, arrivalRecord: null };
  }
  const workedMinutes = Math.round((exitAt.getTime() - new Date(arrival.checkedAt).getTime()) / 60000);
  const shift = shiftWindowKey.split('-').pop();
  const overtimeMinutes = computeOvertimeMinutes(workedMinutes, shift);
  return { workedMinutes, overtimeMinutes, arrivalRecord: arrival };
}

function buildPhotosFilter(req) {
  const filter = { selfieUrl: { $exists: true, $ne: '' } };
  const dateFrom = String(req.query.dateFrom || '').trim();
  const dateTo = String(req.query.dateTo || '').trim();
  const kind = String(req.query.kind || '').trim().toLowerCase();
  const siteId = String(req.query.site || req.query.siteId || '').trim().toLowerCase();

  if (VALID_KINDS.has(kind)) filter.kind = kind;
  if (siteId && isValidSiteId(siteId)) filter.siteId = siteId;

  if (dateFrom && dateTo) {
    filter.dateKey = { $gte: dateFrom, $lte: dateTo };
  } else if (dateFrom) {
    filter.dateKey = dateFrom;
  } else if (dateTo) {
    filter.dateKey = { $lte: dateTo };
  } else if (req.query.date) {
    filter.dateKey = String(req.query.date).trim();
  }

  return filter;
}

/** Admin : tous les sites ou un site (?site=zogbo). */
router.get('/settings', auth, isRestaurant, async (req, res) => {
  try {
    await ensureRecordIndexes();
    const siteQuery = String(req.query.site || '').trim().toLowerCase();
    if (siteQuery && isValidSiteId(siteQuery)) {
      const doc = await getOrCreateSiteSettings(siteQuery);
      return res.json(await serializeSettings(doc));
    }
    const all = await ensureAllSiteSettings();
    const branding = await getKingFishBranding();
    const sites = await Promise.all(SITE_IDS.map((id) => serializeSettings(all[id])));
    res.json({
      sites,
      companyName: branding.companyName,
      companyLogo: branding.companyLogo,
      companyLogoDataUrl: branding.companyLogoDataUrl,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/settings/regenerate', auth, isRestaurant, async (req, res) => {
  try {
    const kind = String(req.body?.kind || 'both').trim().toLowerCase();
    const siteId = String(req.body?.site || req.body?.siteId || DEFAULT_SITE_ID).trim().toLowerCase();
    const doc = await getOrCreateSiteSettings(siteId);
    if (kind === 'arrival' || kind === 'both') doc.arrivalCode = newPresenceCode();
    if (kind === 'exit' || kind === 'both') doc.exitCode = newPresenceCode();
    await doc.save();
    res.json(await serializeSettings(doc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Admin : employés par site. */
router.get('/employees', auth, isRestaurant, async (req, res) => {
  try {
    const filter = {};
    const siteId = String(req.query.site || req.query.siteId || '').trim().toLowerCase();
    if (siteId && isValidSiteId(siteId)) filter.siteId = siteId;
    if (req.query.active === 'true') filter.active = true;
    if (req.query.active === 'false') filter.active = false;
    const employees = await StaffEmployee.find(filter)
      .sort({ siteId: 1, lastName: 1, firstName: 1 })
      .lean();
    res.json(employees);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/employees', auth, isRestaurant, async (req, res) => {
  try {
    const firstName = normalizeNamePart(req.body?.firstName);
    const siteId = String(req.body?.siteId || req.body?.site || DEFAULT_SITE_ID).trim().toLowerCase();
    if (!isValidSiteId(siteId)) return res.status(400).json({ message: 'Site invalide' });
    if (!firstName || firstName.length < 2) {
      return res.status(400).json({ message: 'Prénom requis (2 caractères min.)' });
    }
    const lastNameRaw = normalizeNamePart(req.body?.lastName);
    const lastName = lastNameRaw && lastNameRaw !== '·' ? lastNameRaw : '·';
    const restDays = Array.isArray(req.body?.restDays) ? req.body.restDays.map(Number) : [];
    if (restDays.length && !isValidRestDays(restDays)) {
      return res.status(400).json({ message: 'Jours de repos invalides' });
    }
    const contractDaysPerWeek = Math.min(
      7,
      Math.max(1, Number(req.body?.contractDaysPerWeek) || 5)
    );
    const employee = await StaffEmployee.create({
      firstName,
      lastName,
      normalizedName: normalizeFullKey(firstName, lastName),
      siteId,
      active: req.body?.active !== false,
      restDays,
      contractDaysPerWeek,
      notes: String(req.body?.notes || '').trim().slice(0, 500),
    });
    res.status(201).json(employee);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/employees/:id', auth, isRestaurant, async (req, res) => {
  try {
    const employee = await StaffEmployee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employé introuvable' });
    if (req.body?.firstName != null) {
      employee.firstName = normalizeNamePart(req.body.firstName);
    }
    if (req.body?.lastName != null) {
      employee.lastName = normalizeNamePart(req.body.lastName);
    }
    if (req.body?.siteId != null || req.body?.site != null) {
      const siteId = String(req.body.siteId || req.body.site).trim().toLowerCase();
      if (!isValidSiteId(siteId)) return res.status(400).json({ message: 'Site invalide' });
      employee.siteId = siteId;
    }
    if (req.body?.active != null) employee.active = !!req.body.active;
    if (req.body?.restDays != null) {
      const restDays = Array.isArray(req.body.restDays) ? req.body.restDays.map(Number) : [];
      if (restDays.length && !isValidRestDays(restDays)) {
        return res.status(400).json({ message: 'Jours de repos invalides' });
      }
      employee.restDays = restDays;
    }
    if (req.body?.contractDaysPerWeek != null) {
      employee.contractDaysPerWeek = Math.min(
        7,
        Math.max(1, Number(req.body.contractDaysPerWeek) || 5)
      );
    }
    if (req.body?.notes != null) employee.notes = String(req.body.notes).trim().slice(0, 500);
    employee.normalizedName = normalizeFullKey(employee.firstName, employee.lastName);
    await employee.save();
    res.json(employee);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete('/employees/:id', auth, isRestaurant, async (req, res) => {
  try {
    const employee = await StaffEmployee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employé introuvable' });
    employee.active = false;
    await employee.save();
    res.json({ ok: true, employee });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Admin : planning hebdomadaire par site. */
router.get('/schedule', auth, isRestaurant, async (req, res) => {
  try {
    const siteId = String(req.query.site || req.query.siteId || DEFAULT_SITE_ID).trim().toLowerCase();
    if (!isValidSiteId(siteId)) return res.status(400).json({ message: 'Site invalide' });
    const schedule = await getScheduleForSite(siteId);
    const employees = await StaffEmployee.find({ siteId }).sort({ firstName: 1, lastName: 1 }).lean();
    res.json({ schedule, employees, weekdays: WEEKDAYS });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/schedule', auth, isRestaurant, async (req, res) => {
  try {
    const siteId = String(req.body?.siteId || req.body?.site || DEFAULT_SITE_ID).trim().toLowerCase();
    if (!isValidSiteId(siteId)) return res.status(400).json({ message: 'Site invalide' });

    const rules = req.body?.rules || {};
    const slots = normalizeSlots(req.body?.slots || []);

    let doc = await StaffWeeklySchedule.findOne({ siteId });
    if (!doc) {
      doc = new StaffWeeklySchedule({ siteId });
    }

    doc.rules = {
      open247: rules.open247 !== false,
      mondayNightClosed: !!rules.mondayNightClosed,
      binomeMin: Math.min(6, Math.max(1, Number(rules.binomeMin) || 2)),
      maxRestDaysPerWeek: Math.min(6, Math.max(0, Number(rules.maxRestDaysPerWeek) ?? 1)),
      notes: String(rules.notes || '').trim().slice(0, 1000),
    };
    doc.slots = slots.map((s) => ({
      weekday: s.weekday,
      shift: s.shift,
      closed: !!s.closed,
      employeeIds: s.employeeIds,
    }));
    await doc.save();

    const employees = await StaffEmployee.find({ siteId }).sort({ firstName: 1 }).lean();
    res.json({ schedule: serializeSchedule(doc.toObject(), employees), employees });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/schedule/seed-gbegamey', auth, isRestaurant, async (req, res) => {
  try {
    const force = String(req.query.force || req.body?.force || '').trim() === 'true';
    const result = await seedGbegameyPlanning({ force });
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Admin : présences + synthèse heures sup. */
router.get('/records', auth, isRestaurant, async (req, res) => {
  try {
    await ensureRecordIndexes();
    const filter = {};
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const kind = String(req.query.kind || '').trim().toLowerCase();
    const siteId = String(req.query.site || req.query.siteId || '').trim().toLowerCase();
    const overtimeOnly = String(req.query.overtimeOnly || '').trim() === 'true';

    if (VALID_KINDS.has(kind)) filter.kind = kind;
    if (siteId && isValidSiteId(siteId)) filter.siteId = siteId;
    if (overtimeOnly) filter.overtimeMinutes = { $gt: 0 };

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

    if (String(req.query.summary || '') === 'true') {
      const pairs = await StaffPresenceRecord.find({
        ...(filter.siteId ? { siteId: filter.siteId } : {}),
        ...(filter.dateKey ? { dateKey: filter.dateKey } : {}),
        kind: 'exit',
        overtimeMinutes: { $gt: 0 },
      })
        .sort({ overtimeMinutes: -1 })
        .lean();
      return res.json({ records, overtimeSummary: pairs });
    }

    res.json(records);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Public : valider QR + contexte site / plages / employés actifs. */
router.get('/public/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Code manquant' });
    const settings = await findSettingsByCode(code);
    if (!settings) return res.status(404).json({ message: 'QR code invalide' });
    const kind = resolveKindFromCode(settings, code);
    if (!kind) return res.status(404).json({ message: 'QR code invalide' });

    const siteId = settings.key || DEFAULT_SITE_ID;
    const weekday = isoWeekdayBenin();
    const schedule = await getScheduleForSite(siteId);
    const restrictShifts = scheduleHasAssignments(schedule);

    const employees = await StaffEmployee.find({ siteId, active: true })
      .sort({ lastName: 1, firstName: 1 })
      .select('_id firstName lastName siteId')
      .lean();

    const employeesOut = employees.map((e) => ({
      ...e,
      assignedShifts: restrictShifts
        ? assignedShiftsForEmployee(schedule, e._id, weekday)
        : SHIFT_IDS.slice(),
    }));

    res.json({
      ok: true,
      code,
      kind,
      kindLabel: kindLabel(kind),
      siteId,
      siteLabel: siteLabel(siteId),
      todayKey: dateKeyBenin(),
      weekday,
      restrictShifts,
      suggestedShift: suggestShift(),
      shifts: shiftsPayload(),
      employees: employeesOut,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Public : selfie + employé + plage → présence. */
router.post('/public/:code/check', uploadStaffPresence.single('selfie'), async (req, res) => {
  try {
    await ensureRecordIndexes();
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Code manquant' });
    if (!req.file) return res.status(400).json({ message: 'Selfie requis' });

    const settings = await findSettingsByCode(code);
    if (!settings) return res.status(404).json({ message: 'QR code invalide' });
    const kind = resolveKindFromCode(settings, code);
    if (!kind) return res.status(404).json({ message: 'QR code invalide' });

    const siteId = settings.key || DEFAULT_SITE_ID;
    const { employeeId, shift } = parseCheckBody(req);
    if (!employeeId) return res.status(400).json({ message: 'Employé requis' });
    if (!isValidShift(shift)) {
      return res.status(400).json({ message: 'Plage horaire invalide' });
    }

    const employee = await StaffEmployee.findOne({ _id: employeeId, siteId, active: true }).lean();
    if (!employee) {
      return res.status(400).json({ message: 'Employé introuvable pour ce site' });
    }

    const schedule = await getScheduleForSite(siteId);
    if (!isShiftAllowedForEmployee(schedule, employee._id, shift, isoWeekdayBenin())) {
      return res.status(400).json({
        message: 'Cette plage horaire ne vous est pas attribuée aujourd’hui.',
      });
    }

    const now = new Date();
    const dateKey = dateKeyBenin(now);
    const windowKey = shiftWindowKey(dateKey, shift);
    const selfieUrl = selfieUrlFromFile(req.file);

    const existing = await StaffPresenceRecord.findOne({
      siteId,
      shiftWindowKey: windowKey,
      kind,
      employeeId: employee._id,
    }).lean();

    if (existing) {
      return res.json({
        ok: true,
        alreadyPresent: true,
        kind,
        kindLabel: kindLabel(kind),
        siteId,
        siteLabel: siteLabel(siteId),
        shift,
        shiftLabel: shiftLabel(shift),
        firstName: existing.firstName,
        lastName: existing.lastName,
        checkedAt: existing.checkedAt,
        dateKey: existing.dateKey,
        overtimeMinutes: existing.overtimeMinutes,
        overtimeLabel: existing.overtimeMinutes ? formatMinutesLabel(existing.overtimeMinutes) : null,
        message: alreadyMessage(kind),
      });
    }

    let workedMinutes = null;
    let overtimeMinutes = null;
    let arrivalRecord = null;
    if (kind === 'exit') {
      const metrics = await computeExitMetrics({
        siteId,
        employeeId: employee._id,
        shiftWindowKey: windowKey,
        exitAt: now,
      });
      workedMinutes = metrics.workedMinutes;
      overtimeMinutes = metrics.overtimeMinutes;
      arrivalRecord = metrics.arrivalRecord;
    }

    const record = await StaffPresenceRecord.create({
      firstName: employee.firstName,
      lastName: employee.lastName === '·' ? '' : employee.lastName,
      normalizedName: employee.normalizedName,
      employeeId: employee._id,
      siteId,
      shift,
      shiftWindowKey: windowKey,
      kind,
      dateKey,
      checkedAt: now,
      selfieUrl,
      workedMinutes,
      overtimeMinutes,
      code,
      checkedIp: clientIp(req),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
    });

    res.status(201).json({
      ok: true,
      alreadyPresent: false,
      kind,
      kindLabel: kindLabel(kind),
      siteId,
      siteLabel: siteLabel(siteId),
      shift,
      shiftLabel: shiftLabel(shift),
      firstName: record.firstName,
      lastName: record.lastName,
      checkedAt: record.checkedAt,
      dateKey: record.dateKey,
      workedMinutes: record.workedMinutes,
      overtimeMinutes: record.overtimeMinutes,
      overtimeLabel: record.overtimeMinutes ? formatMinutesLabel(record.overtimeMinutes) : null,
      message: successMessage(kind),
    });

    notifyPresenceRecorded({
      record: record.toObject ? record.toObject() : record,
      arrivalRecord,
    }).catch((err) => {
      console.error('Alerte email présence:', err?.message || err);
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: alreadyMessage('arrival') });
    }
    res.status(500).json({ message: e.message });
  }
});

router.get('/meta/sites', auth, isRestaurant, (_req, res) => {
  res.json({
    sites: SITE_IDS.map((id) => ({ id, label: SITES[id].label })),
    shifts: shiftsPayload(),
  });
});

/** Admin : galerie photos (selfies arrivée / sortie). */
router.get('/photos', auth, isRestaurant, async (req, res) => {
  try {
    await ensureRecordIndexes();
    const filter = buildPhotosFilter(req);
    const records = await StaffPresenceRecord.find(filter)
      .sort({ checkedAt: -1, _id: -1 })
      .select(
        'firstName lastName siteId shift kind dateKey checkedAt selfieUrl overtimeMinutes workedMinutes employeeId'
      )
      .lean();
    res.json({ photos: records, total: records.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Admin : export ZIP de toutes les photos filtrées + index JSON. */
router.get('/photos/export-zip', auth, isRestaurant, async (req, res) => {
  let archiver;
  try {
    archiver = require('archiver');
  } catch {
    return res.status(503).json({ message: 'Export ZIP indisponible (dépendance archiver manquante)' });
  }

  try {
    await ensureRecordIndexes();
    const filter = buildPhotosFilter(req);
    const records = await StaffPresenceRecord.find(filter)
      .sort({ checkedAt: 1, _id: 1 })
      .select('firstName lastName siteId shift kind dateKey checkedAt selfieUrl')
      .lean();

    const dateFrom = String(req.query.dateFrom || '').trim() || 'all';
    const dateTo = String(req.query.dateTo || '').trim() || 'all';
    const filename = `presence-photos_${dateFrom}_${dateTo}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('ZIP présence:', err);
      if (!res.headersSent) res.status(500).json({ message: err.message });
    });
    archive.pipe(res);

    const manifest = [];
    const usedNames = new Set();

    for (const record of records) {
      const buf = await readSelfieBuffer(record.selfieUrl);
      if (!buf?.length) continue;

      let name = safeZipBaseName(record);
      while (usedNames.has(name)) {
        name = name.replace(/\.jpg$/, `_${manifest.length}.jpg`);
      }
      usedNames.add(name);
      archive.append(buf, { name: `photos/${name}` });

      manifest.push({
        file: `photos/${name}`,
        firstName: record.firstName,
        lastName: record.lastName,
        siteId: record.siteId,
        siteLabel: siteLabel(record.siteId),
        shift: record.shift,
        shiftLabel: shiftLabel(record.shift),
        kind: record.kind,
        kindLabel: kindLabel(record.kind),
        dateKey: record.dateKey,
        checkedAt: record.checkedAt,
        selfieUrl: record.selfieUrl,
      });
    }

    archive.append(JSON.stringify({ exportedAt: new Date().toISOString(), total: manifest.length, items: manifest }, null, 2), {
      name: 'index.json',
    });

    await archive.finalize();
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ message: e.message });
  }
});

module.exports = router;
