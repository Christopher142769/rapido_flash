const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const StaffEmployee = require('../models/StaffEmployee');
const StaffSite = require('../models/StaffSite');
const StaffPresenceRecord = require('../models/StaffPresenceRecord');
const LivreurDelivery = require('../models/LivreurDelivery');
const LivreurAuditEvent = require('../models/LivreurAuditEvent');
const LivreurScanNonce = require('../models/LivreurScanNonce');
const { auth, isStaffPresence } = require('../middleware/auth');
const { dateKeyBenin } = require('../utils/staffPresenceShifts');
const { isValidSiteId, listSites, siteLabel, normalizeSiteId } = require('../utils/staffPresenceSites');
const { publicAppBaseUrl } = require('../utils/publicAppUrl');
const S = require('../utils/livreurSecurity');
const { recordEvent, verifyChain } = require('../services/livreurAudit');
const { notifyLivreurEvent } = require('../services/livreurMailer');

const router = express.Router();

const MIN_DURATION_S = Number(process.env.LIVREUR_MIN_DURATION_SECONDS) || 180;
const MAX_DURATION_S = Number(process.env.LIVREUR_MAX_DURATION_SECONDS) || 3 * 3600;
const MAX_ACCURACY_M = 200;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const uploadSignature = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 600 * 1024 },
});

const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.socket?.remoteAddress || '';
const ua = (req) => String(req.headers['user-agent'] || '').slice(0, 300);
const fullName = (e) => `${e.firstName || ''} ${e.lastName && e.lastName !== '·' ? e.lastName : ''}`.trim();
const mail = (args) =>
  notifyLivreurEvent(args).catch((err) => console.error('Email livreur:', err?.message || err));

function ensureStr(v, max) {
  return String(v || '').trim().slice(0, max);
}

function clockSkewFlag(body, flags) {
  const t = Date.parse(body?.clientTime);
  if (Number.isFinite(t) && Math.abs(t - Date.now()) > MAX_CLOCK_SKEW_MS) flags.push('clock_skew');
}

function geoFlags(geo, flags, { zone = true } = {}) {
  if (!geo) return flags.push('no_geo');
  if (geo.accuracy != null && geo.accuracy > MAX_ACCURACY_M) flags.push('low_gps_accuracy');
  if (zone && geo.inZone === false) flags.push('out_of_zone');
}

async function getSite(siteId) {
  return StaffSite.findOne({ id: normalizeSiteId(siteId) }).lean();
}

async function livreurAuth(req, res, next) {
  const payload = S.verify(String(req.headers.authorization || '').replace(/^Bearer /, '') || req.headers['x-livreur-token']);
  if (!payload || payload.t !== 'sess') return res.status(401).json({ message: 'Session expirée, reconnectez-vous.' });
  const employee = await StaffEmployee.findOne({ _id: payload.id, active: true, role: 'livreur' }).lean();
  if (!employee) return res.status(401).json({ message: 'Compte livreur inactif.' });
  req.livreur = employee;
  next();
}

const publicDelivery = (d) =>
  d && {
    id: d._id,
    status: d.status,
    siteId: d.siteId,
    siteLabel: siteLabel(d.siteId),
    startedAt: d.startedAt,
    startPlace: d.startGeo?.place || '',
    endPlace: d.endGeo?.place || '',
    endScannedAt: d.endScannedAt,
    signedAt: d.signedAt,
    durationSeconds: d.durationSeconds,
    orderRef: d.orderRef,
    note: d.note,
    clientName: d.clientName,
  };

/* ───────────── Public / livreur ───────────── */

router.get('/public/livreurs', async (_req, res) => {
  try {
    const list = await StaffEmployee.find({ role: 'livreur', active: true })
      .sort({ firstName: 1 })
      .select('_id firstName lastName siteId')
      .lean();
    res.json(list.map((e) => ({ id: e._id, name: fullName(e), siteId: e.siteId })));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const employee = await StaffEmployee.findOne({
      _id: String(req.body?.employeeId || '').match(/^[a-f0-9]{24}$/i) ? req.body.employeeId : null,
      role: 'livreur',
      active: true,
    }).select('+pinHash +pinFailures +pinLockedUntil');
    if (!employee || !employee.pinHash) return res.status(401).json({ message: 'Identifiants invalides.' });
    if (employee.pinLockedUntil && employee.pinLockedUntil > new Date()) {
      return res.status(429).json({ message: 'Trop d’essais. Réessayez dans quelques minutes.' });
    }
    if (!S.checkPin(String(req.body?.pin || ''), employee.pinHash)) {
      employee.pinFailures = (employee.pinFailures || 0) + 1;
      if (employee.pinFailures >= 5) {
        employee.pinFailures = 0;
        employee.pinLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await employee.save();
      await recordEvent({
        type: 'login_failed',
        employeeId: employee._id,
        livreurName: fullName(employee),
        siteId: employee.siteId,
        data: { ip: clientIp(req) },
      });
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }
    employee.pinFailures = 0;
    employee.pinLockedUntil = null;
    await employee.save();
    await recordEvent({
      type: 'login',
      employeeId: employee._id,
      livreurName: fullName(employee),
      siteId: employee.siteId,
      data: { ip: clientIp(req), ua: ua(req) },
    });
    res.json({ token: S.sessionToken(employee._id), name: fullName(employee), siteId: employee.siteId });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/me', livreurAuth, async (req, res) => {
  try {
    const e = req.livreur;
    const current = await LivreurDelivery.findOne({
      employeeId: e._id,
      status: { $in: ['active', 'awaiting_signature'] },
    }).lean();
    const recent = await LivreurDelivery.find({ employeeId: e._id, status: 'completed' })
      .sort({ startedAt: -1 })
      .limit(10)
      .lean();
    const todayCount = await LivreurDelivery.countDocuments({
      employeeId: e._id,
      dateKey: dateKeyBenin(),
      status: 'completed',
    });
    const qrToday = !!(await LivreurDelivery.exists({
      employeeId: e._id,
      dateKey: dateKeyBenin(),
      startVia: 'qr',
      status: { $ne: 'cancelled' },
    }));
    res.json({
      qrToday,
      name: fullName(e),
      siteId: e.siteId,
      siteLabel: siteLabel(e.siteId),
      serverTime: new Date().toISOString(),
      current: publicDelivery(current),
      todayCount,
      recent: recent.map(publicDelivery),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

async function createStart(req, res, { via, now }) {
  const e = req.livreur;
  const site = await getSite(e.siteId);
  const geo = await S.buildGeo(req.body, site);
  if (!geo) {
    return res.status(400).json({ message: 'Position GPS requise : activez la localisation du téléphone puis réessayez.' });
  }
  const flags = [];
  geoFlags(geo, flags, { zone: via === 'qr' });
  clockSkewFlag(req.body, flags);
  const dateKey = dateKeyBenin(now);
  const yesterday = dateKeyBenin(new Date(now.getTime() - 24 * 3600 * 1000));
  const clockedIn = await StaffPresenceRecord.exists({
    employeeId: e._id,
    kind: 'arrival',
    dateKey: { $in: [dateKey, yesterday] },
  });
  if (!clockedIn) flags.push('not_clocked_in');
  if (await LivreurDelivery.exists({ employeeId: e._id, status: { $in: ['active', 'awaiting_signature'] } })) {
    return res.status(409).json({ message: 'Une livraison est déjà en cours. Terminez-la d’abord.' });
  }
  let delivery;
  try {
    delivery = await LivreurDelivery.create({
      employeeId: e._id,
      livreurName: fullName(e),
      siteId: e.siteId,
      dateKey,
      status: 'active',
      startVia: via,
      startedAt: now,
      startGeo: geo,
      flags,
      ip: clientIp(req),
      userAgent: ua(req),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Une livraison est déjà en cours. Terminez-la d’abord.' });
    }
    throw err;
  }
  await recordEvent({
    type: 'delivery_start',
    employeeId: e._id,
    livreurName: fullName(e),
    deliveryId: delivery._id,
    siteId: e.siteId,
    at: now,
    data: { via, geo, flags, ip: clientIp(req) },
  });
  mail({ kind: 'start', delivery: delivery.toObject() });
  return res.status(201).json({ ok: true, kind: 'start', delivery: publicDelivery(delivery) });
}

/** QR de livraison (signé, 60 s, usage unique) : lance la 1re livraison de la journée. */
router.post('/scan', livreurAuth, async (req, res) => {
  try {
    const e = req.livreur;
    const payload = S.verify(req.body?.token);
    if (!payload || payload.t !== 'qr' || payload.k !== 'start') {
      return res.status(400).json({ message: 'QR expiré ou invalide. Scannez le QR affiché à l’écran.' });
    }
    if (payload.s !== e.siteId) {
      await recordEvent({ type: 'scan_rejected', employeeId: e._id, livreurName: fullName(e), siteId: e.siteId, data: { reason: 'wrong_site', qrSite: payload.s } });
      return res.status(403).json({ message: 'Ce QR appartient à un autre site.' });
    }
    try {
      await LivreurScanNonce.create({ nonce: payload.n });
    } catch (err) {
      if (err?.code === 11000) {
        await recordEvent({ type: 'scan_rejected', employeeId: e._id, livreurName: fullName(e), siteId: e.siteId, data: { reason: 'qr_reused' } });
        return res.status(409).json({ message: 'Ce QR a déjà été utilisé. Scannez le nouveau QR affiché.' });
      }
      throw err;
    }
    await createStart(req, res, { via: 'qr', now: new Date() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** Livraisons suivantes de la journée : plus de QR, la position est relevée au démarrage. */
router.post('/delivery/start', livreurAuth, async (req, res) => {
  try {
    const qrToday = await LivreurDelivery.exists({
      employeeId: req.livreur._id,
      dateKey: dateKeyBenin(),
      startVia: 'qr',
      status: { $ne: 'cancelled' },
    });
    if (!qrToday) {
      return res.status(403).json({ message: 'Scannez d’abord le QR de livraison pour commencer la journée.' });
    }
    await createStart(req, res, { via: 'app', now: new Date() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** Contexte (n° commande, note) modifiable tant que la livraison est active – chaque modif est journalisée. */
router.patch('/delivery/context', livreurAuth, async (req, res) => {
  try {
    const orderRef = ensureStr(req.body?.orderRef, 80);
    const note = ensureStr(req.body?.note, 300);
    if (orderRef.length < 2 || note.length < 2) {
      return res.status(400).json({ message: 'Renseignez le numéro de commande et la destination.' });
    }
    const d = await LivreurDelivery.findOneAndUpdate(
      { employeeId: req.livreur._id, status: 'active' },
      { $set: { orderRef, note } },
      { new: true }
    );
    if (!d) return res.status(409).json({ message: 'Aucune livraison active.' });
    await recordEvent({
      type: 'delivery_context',
      employeeId: req.livreur._id,
      livreurName: fullName(req.livreur),
      deliveryId: d._id,
      siteId: d.siteId,
      data: { orderRef, note },
    });
    res.json({ ok: true, delivery: publicDelivery(d) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/finish', livreurAuth, uploadSignature.single('signature'), async (req, res) => {
  try {
    const e = req.livreur;
    const clientName = ensureStr(req.body?.clientName, 120);
    const phone = S.phoneDigits(req.body?.clientPhone);
    if (clientName.length < 2) return res.status(400).json({ message: 'Nom du client requis.' });
    if (phone.replace(/\D/g, '').length < 8 || phone.replace(/\D/g, '').length > 15) {
      return res.status(400).json({ message: 'Numéro de téléphone du client invalide.' });
    }
    const png = req.file?.buffer;
    if (!png || png.length < 200 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
      return res.status(400).json({ message: 'Signature du client requise.' });
    }
    const delivery = await LivreurDelivery.findOne({ employeeId: e._id, status: 'active' });
    if (!delivery) return res.status(409).json({ message: 'Aucune livraison en cours.' });
    if (!delivery.orderRef || !delivery.note) {
      return res.status(400).json({ message: 'Renseignez d’abord le numéro de commande et la destination avant de terminer.' });
    }

    const now = new Date();
    const site = await getSite(e.siteId);
    const geo = await S.buildGeo(req.body, site);
    if (!geo) {
      return res.status(400).json({ message: 'Position GPS requise : activez la localisation du téléphone puis réessayez.' });
    }
    const flags = [];
    geoFlags(geo, flags, { zone: false });
    clockSkewFlag(req.body, flags);
    const durationSeconds = Math.round((now - delivery.startedAt) / 1000);
    if (durationSeconds < MIN_DURATION_S) flags.push('too_short');
    if (durationSeconds > MAX_DURATION_S) flags.push('too_long');
    const strokes = Number(req.body?.strokes) || 0;
    if (strokes < 2 || png.length < 1500) flags.push('weak_signature');
    const sha = crypto.createHash('sha256').update(png).digest('hex');
    if (await LivreurDelivery.exists({ signatureSha256: sha })) flags.push('duplicate_signature');
    const recentSame = await LivreurDelivery.countDocuments({
      clientPhone: clientPhone(phone),
      status: 'completed',
      signedAt: { $gte: new Date(now.getTime() - 24 * 3600 * 1000) },
    });
    if (recentSame >= 3) flags.push('repeat_client');

    const updated = await LivreurDelivery.findOneAndUpdate(
      { _id: delivery._id, status: 'active' },
      {
        $set: {
          status: 'completed',
          signedAt: now,
          endScannedAt: now,
          durationSeconds,
          clientName,
          clientPhone: clientPhone(phone),
          endGeo: geo,
          signGeo: geo,
          signatureKey: crypto.randomBytes(16).toString('hex'),
          signatureMime: 'image/png',
          signatureSha256: sha,
          signatureData: png,
        },
        $addToSet: { flags: { $each: flags } },
      },
      { new: true }
    );
    if (!updated) return res.status(409).json({ message: 'Signature déjà enregistrée.' });
    await recordEvent({
      type: 'delivery_signed',
      employeeId: e._id,
      livreurName: fullName(e),
      deliveryId: updated._id,
      siteId: updated.siteId,
      at: now,
      data: { clientName, clientPhone: updated.clientPhone, signatureSha256: sha, geo, flags, durationSeconds, ip: clientIp(req) },
    });
    mail({ kind: 'signature', delivery: updated.toObject(), signatureBuffer: png });
    res.json({ ok: true, delivery: publicDelivery(updated) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function clientPhone(p) {
  return String(p).slice(0, 30);
}

/* ───────────── Admin / RH ───────────── */

const admin = [auth, isStaffPresence];

/** Écran QR du site : jetons de 60 s à usage unique, renouvelés dès qu'ils sont consommés ou presque expirés. */
router.get('/admin/station/:siteId', ...admin, async (req, res) => {
  try {
    const siteId = normalizeSiteId(req.params.siteId);
    if (!isValidSiteId(siteId)) return res.status(400).json({ message: 'Site invalide' });
    const out = { siteId, siteLabel: siteLabel(siteId), serverTime: Date.now() };
    for (const kind of ['start']) {
      const cur = S.verify(req.query[kind]);
      const reusable =
        cur &&
        cur.t === 'qr' &&
        cur.k === kind &&
        cur.s === siteId &&
        cur.e - Date.now() > 20000 &&
        !(await LivreurScanNonce.exists({ nonce: cur.n }));
      if (reusable) {
        out[kind] = { keep: true };
      } else {
        const { token } = S.newQrToken(siteId, kind);
        out[kind] = {
          token,
          path: `/livreur/scan/${token}`,
          url: `${publicAppBaseUrl()}/livreur/scan/${token}`,
          expiresAt: S.verify(token).e,
        };
      }
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/admin/livreurs', ...admin, async (_req, res) => {
  try {
    const list = await StaffEmployee.find({ role: 'livreur' })
      .select('+pinHash')
      .sort({ active: -1, firstName: 1 })
      .lean();
    const sites = await listSites({ activeOnly: true });
    const siteDocs = await StaffSite.find({ id: { $in: sites.map((s) => s.id) } }).lean();
    res.json({
      livreurs: list.map((e) => ({
        id: e._id,
        firstName: e.firstName,
        lastName: e.lastName === '·' ? '' : e.lastName,
        name: fullName(e),
        siteId: e.siteId,
        active: e.active,
        hasPin: !!e.pinHash,
      })),
      sites: siteDocs.map((s) => ({ id: s.id, label: s.label, lat: s.lat ?? null, lng: s.lng ?? null, radiusM: s.radiusM || 300 })),
      thresholds: { minDurationSeconds: MIN_DURATION_S, maxDurationSeconds: MAX_DURATION_S },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

function validPin(pin) {
  return /^\d{4,8}$/.test(String(pin || ''));
}

router.post('/admin/livreurs', ...admin, async (req, res) => {
  try {
    if (!validPin(req.body?.pin)) return res.status(400).json({ message: 'Code PIN : 4 à 8 chiffres.' });
    let employee;
    if (req.body?.employeeId) {
      employee = await StaffEmployee.findById(req.body.employeeId);
      if (!employee) return res.status(404).json({ message: 'Employé introuvable' });
    } else {
      const firstName = ensureStr(req.body?.firstName, 60);
      const lastName = ensureStr(req.body?.lastName, 60) || '·';
      const siteId = normalizeSiteId(req.body?.siteId);
      if (firstName.length < 2) return res.status(400).json({ message: 'Prénom requis' });
      if (!isValidSiteId(siteId)) return res.status(400).json({ message: 'Site invalide' });
      employee = new StaffEmployee({
        firstName,
        lastName,
        siteId,
        normalizedName: `${firstName} ${lastName}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
      });
    }
    employee.role = 'livreur';
    employee.active = true;
    employee.pinHash = S.hashPin(req.body.pin);
    await employee.save();
    await recordEvent({ type: 'admin_livreur_set', employeeId: employee._id, livreurName: fullName(employee), siteId: employee.siteId, data: { by: req.user.email || String(req.user._id) } });
    res.status(201).json({ ok: true, id: employee._id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.patch('/admin/livreurs/:id', ...admin, async (req, res) => {
  try {
    const employee = await StaffEmployee.findOne({ _id: req.params.id, role: 'livreur' });
    if (!employee) return res.status(404).json({ message: 'Livreur introuvable' });
    if (req.body?.pin != null) {
      if (!validPin(req.body.pin)) return res.status(400).json({ message: 'Code PIN : 4 à 8 chiffres.' });
      employee.pinHash = S.hashPin(req.body.pin);
    }
    if (req.body?.active != null) employee.active = !!req.body.active;
    await employee.save();
    await recordEvent({ type: 'admin_livreur_update', employeeId: employee._id, livreurName: fullName(employee), siteId: employee.siteId, data: { by: req.user.email || String(req.user._id), pinChanged: req.body?.pin != null, active: employee.active } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

function rangeFilter(q) {
  const f = {};
  const from = ensureStr(q.dateFrom, 10);
  const to = ensureStr(q.dateTo, 10);
  if (from && to) f.dateKey = { $gte: from, $lte: to };
  else if (from) f.dateKey = { $gte: from };
  else if (to) f.dateKey = { $lte: to };
  return f;
}

router.get('/admin/deliveries', ...admin, async (req, res) => {
  try {
    const filter = rangeFilter(req.query);
    if (req.query.siteId) filter.siteId = normalizeSiteId(req.query.siteId);
    if (/^[a-f0-9]{24}$/i.test(String(req.query.employeeId || ''))) filter.employeeId = req.query.employeeId;
    if (req.query.flagged === 'true') filter['flags.0'] = { $exists: true };
    const list = await LivreurDelivery.find(filter).sort({ startedAt: -1 }).limit(1000).lean();
    res.json(list.map((d) => ({ ...d, siteLabel: siteLabel(d.siteId), hasSignature: !!d.signatureKey })));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/admin/deliveries/:id/signature', ...admin, async (req, res) => {
  try {
    const d = await LivreurDelivery.findById(req.params.id).select('+signatureData signatureMime');
    if (!d?.signatureData?.length) return res.status(404).end();
    res.set('Content-Type', d.signatureMime || 'image/png');
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(d.signatureData);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Clôture forcée par la RH (livreur bloqué) — l'action est journalisée. */
router.post('/admin/deliveries/:id/cancel', ...admin, async (req, res) => {
  try {
    const reason = ensureStr(req.body?.reason, 200);
    if (reason.length < 3) return res.status(400).json({ message: 'Motif requis.' });
    const d = await LivreurDelivery.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['active', 'awaiting_signature'] } },
      { $set: { status: 'cancelled' }, $addToSet: { flags: 'cancelled_by_hr' } },
      { new: true }
    );
    if (!d) return res.status(409).json({ message: 'Livraison non annulable.' });
    await recordEvent({ type: 'admin_cancel', employeeId: d.employeeId, livreurName: d.livreurName, deliveryId: d._id, siteId: d.siteId, data: { reason, by: req.user.email || String(req.user._id) } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/admin/events', ...admin, async (req, res) => {
  try {
    const filter = {};
    if (/^[a-f0-9]{24}$/i.test(String(req.query.employeeId || ''))) filter.employeeId = req.query.employeeId;
    if (req.query.type) filter.type = ensureStr(req.query.type, 40);
    const from = Date.parse(req.query.from);
    const to = Date.parse(req.query.to);
    if (Number.isFinite(from) || Number.isFinite(to)) {
      filter.at = {};
      if (Number.isFinite(from)) filter.at.$gte = new Date(from);
      if (Number.isFinite(to)) filter.at.$lte = new Date(to);
    }
    const events = await LivreurAuditEvent.find(filter).sort({ seq: -1 }).limit(500).lean();
    res.json(events);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/admin/audit/verify', ...admin, async (_req, res) => {
  try {
    res.json(await verifyChain());
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Heures d'arrivée / sortie (pointage selfie existant) des livreurs. */
router.get('/admin/presence', ...admin, async (req, res) => {
  try {
    const ids = (await StaffEmployee.find({ role: 'livreur' }).select('_id').lean()).map((x) => x._id);
    const filter = { employeeId: { $in: ids }, ...rangeFilter(req.query) };
    const records = await StaffPresenceRecord.find(filter)
      .sort({ checkedAt: -1 })
      .limit(1000)
      .select('-selfieData')
      .lean();
    res.json(records.map((r) => ({ ...r, siteLabel: siteLabel(r.siteId) })));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
