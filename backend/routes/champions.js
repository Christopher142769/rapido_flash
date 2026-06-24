const express = require('express');
const jwt = require('jsonwebtoken');
const Champion = require('../models/Champion');
const ChampionOtp = require('../models/ChampionOtp');
const ChampionTransaction = require('../models/ChampionTransaction');
const ChampionReview = require('../models/ChampionReview');
const DeliveryMission = require('../models/DeliveryMission');
const User = require('../models/User');
const { auth, isRestaurantAdmin, isLivreur } = require('../middleware/auth');
const uploadChampion = require('../middleware/uploadChampion');
const { normalizeBeninPhoneDigits } = require('../utils/phoneDigits');
const { sendChampionOtp, notifyAdminNewChampionApplication } = require('../services/championMailer');
const { CHAMPION_ZONES, formatBeninPhoneDisplay } = require('../utils/championMission');
const { recalcChampionRating } = require('../utils/championRating');

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function validateBeninLocalPhone(digits) {
  const d = normalizeBeninPhoneDigits(digits);
  return d.length === 11 && d.startsWith('229');
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getChampionForUser(userId) {
  return Champion.findOne({ userId });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function bumpTodayStats(champion, { deliveries = 0, earnings = 0, distanceKm = 0 }) {
  const key = todayKey();
  if (champion.todayStats?.dateKey !== key) {
    champion.todayStats = { deliveries: 0, earnings: 0, distanceKm: 0, dateKey: key };
  }
  champion.todayStats.deliveries += deliveries;
  champion.todayStats.earnings += earnings;
  champion.todayStats.distanceKm += distanceKm;
  await champion.save();
}

function serializeMission(m) {
  if (!m) return null;
  const o = m.toObject ? m.toObject() : m;
  return {
    ...o,
    deliveryPhoneDisplay: formatBeninPhoneDisplay(o.deliveryPhone),
    pickupPhoneDisplay: formatBeninPhoneDisplay(o.pickupPhone),
  };
}

// ─── Public onboarding ───────────────────────────────────────────────────────

router.get('/zones', (_req, res) => {
  res.json({ zones: CHAMPION_ZONES, vehicleTypes: ['moto', 'velo', 'voiture', 'pied'] });
});

router.post('/onboarding/step1', uploadChampion.single('profilePhoto'), async (req, res) => {
  try {
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'Prénom et nom requis' });
    }
    if (!req.file?.path) {
      return res.status(400).json({ message: 'Photo de profil requise (caméra)' });
    }

    const champion = await Champion.create({
      firstName,
      lastName,
      profilePhotoUrl: req.file.path,
      accountStatus: 'draft',
    });

    res.status(201).json({ championId: champion._id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/onboarding/:id/otp/send', async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Candidature introuvable' });

    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Email invalide' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && String(existingUser._id) !== String(champion.userId || '')) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const lastOtp = await ChampionOtp.findOne({ championId: champion._id }).sort({ createdAt: -1 });
    if (lastOtp?.lastSentAt && Date.now() - new Date(lastOtp.lastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - (Date.now() - new Date(lastOtp.lastSentAt).getTime())) / 1000
      );
      return res.status(429).json({ message: `Attendez ${waitSec}s avant de renvoyer le code` });
    }

    await ChampionOtp.deleteMany({ championId: champion._id });

    const code = generateOtpCode();
    await ChampionOtp.create({
      email,
      championId: champion._id,
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      lastSentAt: new Date(),
    });

    champion.email = email;
    await champion.save();

    const mailResult = await sendChampionOtp(email, code);
    if (!mailResult.sent) {
      return res.status(500).json({ message: "Impossible d'envoyer le code par email" });
    }

    res.json({ ok: true, expiresInSeconds: OTP_TTL_MS / 1000, resendCooldownSeconds: 60 });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/onboarding/:id/otp/verify', async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Candidature introuvable' });

    const { code, password } = req.body;
    const pwd = String(password || '');
    if (!code || pwd.length < 6) {
      return res.status(400).json({ message: 'Code et mot de passe (6 car. min) requis' });
    }

    const otp = await ChampionOtp.findOne({ championId: champion._id }).sort({ createdAt: -1 });
    if (!otp) return res.status(400).json({ message: 'Aucun code actif — renvoyez un code' });

    if (otp.lockedUntil && new Date(otp.lockedUntil) > new Date()) {
      return res.status(429).json({ message: 'Trop de tentatives. Réessayez plus tard.' });
    }
    if (new Date(otp.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Code expiré — demandez un nouveau code' });
    }
    if (String(code).trim() !== otp.code) {
      otp.attempts += 1;
      if (otp.attempts >= OTP_MAX_ATTEMPTS) {
        otp.lockedUntil = new Date(Date.now() + OTP_LOCK_MS);
      }
      await otp.save();
      const left = Math.max(0, OTP_MAX_ATTEMPTS - otp.attempts);
      return res.status(400).json({
        message: left ? `Code incorrect (${left} tentative(s) restante(s))` : 'Compte temporairement bloqué',
      });
    }

    const email = otp.email;
    let user = champion.userId ? await User.findById(champion.userId) : null;
    if (!user) {
      user = await User.create({
        nom: `${champion.firstName} ${champion.lastName}`.trim(),
        email,
        password: pwd,
        telephone: champion.phone || '',
        role: 'livreur',
        photo: champion.profilePhotoUrl,
      });
      champion.userId = user._id;
    } else {
      user.password = pwd;
      user.email = email;
      await user.save();
    }

    champion.email = email;
    champion.emailVerified = true;
    await champion.save();
    await ChampionOtp.deleteMany({ championId: champion._id });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '30d' });

    res.json({
      ok: true,
      token,
      user: { id: user._id, nom: user.nom, email: user.email, role: user.role },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/onboarding/:id/contacts', async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Candidature introuvable' });
    if (!champion.emailVerified) {
      return res.status(403).json({ message: 'Vérifiez votre email avant de continuer' });
    }

    const phone = normalizeBeninPhoneDigits(req.body.phone);
    const whatsAppSame = !!req.body.whatsAppSameAsPhone;
    const whatsApp = whatsAppSame ? phone : normalizeBeninPhoneDigits(req.body.whatsApp);

    if (!validateBeninLocalPhone(phone)) {
      return res.status(400).json({ message: 'Numéro invalide (8 chiffres après +229)' });
    }
    if (!validateBeninLocalPhone(whatsApp)) {
      return res.status(400).json({ message: 'Numéro WhatsApp invalide' });
    }

    champion.phone = phone;
    champion.whatsApp = whatsApp;
    champion.whatsAppSameAsPhone = whatsAppSame;
    await champion.save();

    if (champion.userId) {
      await User.findByIdAndUpdate(champion.userId, { telephone: phone });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put(
  '/onboarding/:id/id-document',
  uploadChampion.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const champion = await Champion.findById(req.params.id);
      if (!champion) return res.status(404).json({ message: 'Candidature introuvable' });
      if (!champion.emailVerified) {
        return res.status(403).json({ message: 'Vérifiez votre email avant de continuer' });
      }

      const front = req.files?.idCardFront?.[0];
      if (!front?.path) {
        return res.status(400).json({ message: 'Photo recto de la CNI requise' });
      }

      champion.idCardFrontUrl = front.path;
      const back = req.files?.idCardBack?.[0];
      if (back?.path) champion.idCardBackUrl = back.path;
      champion.idCardNumber = String(req.body.idCardNumber || '').trim().slice(0, 64);
      await champion.save();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

router.put('/onboarding/:id/vehicle', async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Candidature introuvable' });
    if (!champion.emailVerified) {
      return res.status(403).json({ message: 'Vérifiez votre email avant de continuer' });
    }

    const vehicleType = String(req.body.vehicleType || '');
    const workZone = String(req.body.workZone || '');
    const validVehicles = ['moto', 'velo', 'voiture', 'pied'];
    if (!validVehicles.includes(vehicleType)) {
      return res.status(400).json({ message: 'Type de véhicule invalide' });
    }
    if (!CHAMPION_ZONES.includes(workZone)) {
      return res.status(400).json({ message: 'Zone de travail invalide' });
    }

    champion.vehicleType = vehicleType;
    champion.workZone = workZone;
    await champion.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/onboarding/:id/payment', async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Candidature introuvable' });
    if (!champion.emailVerified) {
      return res.status(403).json({ message: 'Vérifiez votre email avant de continuer' });
    }

    const momoNetwork = String(req.body.momoNetwork || '');
    const momoNumber = normalizeBeninPhoneDigits(req.body.momoNumber);
    const momoAccountName = String(req.body.momoAccountName || '').trim();

    if (!['mtn', 'moov'].includes(momoNetwork)) {
      return res.status(400).json({ message: 'Réseau Mobile Money invalide' });
    }
    if (!validateBeninLocalPhone(momoNumber)) {
      return res.status(400).json({ message: 'Numéro MoMo invalide' });
    }
    if (!momoAccountName) {
      return res.status(400).json({ message: 'Nom du titulaire MoMo requis' });
    }

    champion.momoNetwork = momoNetwork;
    champion.momoNumber = momoNumber;
    champion.momoAccountName = momoAccountName;
    await champion.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/onboarding/:id/submit', async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Candidature introuvable' });

    if (!req.body.termsAccepted) {
      return res.status(400).json({ message: 'Acceptez les conditions pour continuer' });
    }
    if (!champion.emailVerified || !champion.phone || !champion.idCardFrontUrl) {
      return res.status(400).json({ message: 'Complétez toutes les étapes avant de soumettre' });
    }
    if (!champion.vehicleType || !champion.workZone || !champion.momoNumber) {
      return res.status(400).json({ message: 'Complétez véhicule, zone et paiement' });
    }

    champion.termsAcceptedAt = new Date();
    champion.accountStatus = 'pending_validation';
    champion.submittedAt = new Date();
    await champion.save();

    await notifyAdminNewChampionApplication(champion);

    res.json({ ok: true, accountStatus: champion.accountStatus });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── Champion app (livreur connecté) ───────────────────────────────────────

router.get('/me', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    if (!champion) return res.status(404).json({ message: 'Profil Champion introuvable' });
    res.json(champion);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/me/online', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    if (!champion) return res.status(404).json({ message: 'Profil introuvable' });
    if (champion.accountStatus !== 'active') {
      return res.status(403).json({ message: 'Compte non actif', accountStatus: champion.accountStatus });
    }

    champion.isOnline = !!req.body.isOnline;
    if (!champion.isOnline) {
      champion.location = champion.location || {};
      champion.location.updatedAt = new Date();
    }
    await champion.save();
    res.json({ isOnline: champion.isOnline });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/me/location', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    if (!champion) return res.status(404).json({ message: 'Profil introuvable' });
    if (!champion.isOnline) return res.json({ ok: true, skipped: true });

    const lat = Number(req.body.latitude);
    const lng = Number(req.body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'Coordonnées invalides' });
    }

    champion.location = { latitude: lat, longitude: lng, updatedAt: new Date() };
    await champion.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/me/profile', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    if (!champion) return res.status(404).json({ message: 'Profil introuvable' });

    if (req.body.whatsApp !== undefined) {
      const wa = normalizeBeninPhoneDigits(req.body.whatsApp);
      if (!validateBeninLocalPhone(wa)) {
        return res.status(400).json({ message: 'WhatsApp invalide' });
      }
      champion.whatsApp = wa;
      champion.whatsAppSameAsPhone = wa === champion.phone;
    }
    if (req.body.momoNumber !== undefined) {
      const mn = normalizeBeninPhoneDigits(req.body.momoNumber);
      if (!validateBeninLocalPhone(mn)) {
        return res.status(400).json({ message: 'MoMo invalide' });
      }
      champion.momoNumber = mn;
    }
    if (req.body.momoAccountName !== undefined) {
      champion.momoAccountName = String(req.body.momoAccountName).trim().slice(0, 120);
    }
    if (req.body.momoNetwork !== undefined && ['mtn', 'moov'].includes(req.body.momoNetwork)) {
      champion.momoNetwork = req.body.momoNetwork;
    }

    await champion.save();
    res.json(champion);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/missions/available', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    if (!champion || champion.accountStatus !== 'active' || !champion.isOnline) {
      return res.json([]);
    }

    const missions = await DeliveryMission.find({
      status: 'available',
      workZone: champion.workZone,
    }).sort({ createdAt: -1 });

    const lat = champion.location?.latitude;
    const lng = champion.location?.longitude;
    const sorted = missions
      .map((m) => {
        const item = serializeMission(m);
        if (Number.isFinite(lat) && Number.isFinite(lng) && m.pickupLat != null) {
          item.sortDistance = haversineKm(lat, lng, m.pickupLat, m.pickupLng);
        } else {
          item.sortDistance = m.distanceKm || 99;
        }
        return item;
      })
      .sort((a, b) => a.sortDistance - b.sortDistance);

    res.json(sorted);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/missions/active', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    if (!champion) return res.json(null);

    const mission = await DeliveryMission.findOne({
      championId: champion._id,
      status: { $in: ['accepted', 'heading_pickup', 'picked_up', 'en_route', 'arrived'] },
    }).sort({ acceptedAt: -1 });

    res.json(serializeMission(mission));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/missions/:id/accept', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    if (!champion || champion.accountStatus !== 'active') {
      return res.status(403).json({ message: 'Compte non actif' });
    }
    if (!champion.isOnline) {
      return res.status(400).json({ message: 'Passez en ligne pour accepter une course' });
    }

    const active = await DeliveryMission.findOne({
      championId: champion._id,
      status: { $in: ['accepted', 'heading_pickup', 'picked_up', 'en_route', 'arrived'] },
    });
    if (active) {
      return res.status(400).json({ message: 'Vous avez déjà une course en cours' });
    }

    const mission = await DeliveryMission.findOneAndUpdate(
      { _id: req.params.id, status: 'available', workZone: champion.workZone },
      {
        $set: {
          status: 'accepted',
          championId: champion._id,
          acceptedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!mission) {
      return res.status(409).json({ message: 'Cette commande a déjà été prise' });
    }

    res.json(serializeMission(mission));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

const STEP_TRANSITIONS = {
  accepted: 'heading_pickup',
  heading_pickup: 'picked_up',
  picked_up: 'en_route',
  en_route: 'arrived',
};

router.put('/missions/:id/step', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    const mission = await DeliveryMission.findOne({ _id: req.params.id, championId: champion?._id });
    if (!mission) return res.status(404).json({ message: 'Course introuvable' });

    const next = STEP_TRANSITIONS[mission.status];
    if (!next) {
      return res.status(400).json({ message: 'Étape invalide pour cette course' });
    }

    mission.status = next;
    if (next === 'picked_up') mission.pickedUpAt = new Date();
    await mission.save();
    res.json(serializeMission(mission));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post(
  '/missions/:id/complete',
  auth,
  isLivreur,
  uploadChampion.single('proofPhoto'),
  async (req, res) => {
    try {
      const champion = await getChampionForUser(req.user._id);
      const mission = await DeliveryMission.findOne({ _id: req.params.id, championId: champion?._id });
      if (!mission) return res.status(404).json({ message: 'Course introuvable' });
      if (mission.status !== 'arrived') {
        return res.status(400).json({ message: 'Marquez votre arrivée chez le client d’abord' });
      }

      const code = String(req.body.deliveryCode || '').trim();
      const hasValidCode = code && code === mission.deliveryCode;
      const hasPhoto = !!req.file?.path;

      if (!hasValidCode && !hasPhoto) {
        return res.status(400).json({
          message: 'Code de livraison incorrect ou photo de preuve requise',
        });
      }

      mission.status = 'delivered';
      mission.deliveredAt = new Date();
      mission.deliveryCodeVerified = hasValidCode;
      if (hasPhoto) mission.proofPhotoUrl = req.file.path;
      await mission.save();

      const earnings = Number(mission.earnings) || 0;
      champion.pendingBalance += earnings;
      await champion.save();
      await ChampionTransaction.create({
        championId: champion._id,
        type: 'earning',
        amount: earnings,
        status: 'pending',
        missionId: mission._id,
        note: 'Course livrée',
      });
      await bumpTodayStats(champion, {
        deliveries: 1,
        earnings,
        distanceKm: Number(mission.distanceKm) || 0,
      });

      res.json(serializeMission(mission));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

router.post('/missions/:id/cancel', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    const mission = await DeliveryMission.findOne({ _id: req.params.id, championId: champion?._id });
    if (!mission) return res.status(404).json({ message: 'Course introuvable' });

    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'Motif d’annulation requis' });

    if (!['accepted', 'heading_pickup', 'picked_up', 'en_route', 'arrived'].includes(mission.status)) {
      return res.status(400).json({ message: 'Cette course ne peut pas être annulée' });
    }

    mission.status = 'available';
    mission.championId = null;
    mission.cancelReason = reason;
    mission.cancelledAt = new Date();
    mission.acceptedAt = null;
    await mission.save();

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/missions/history', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    const missions = await DeliveryMission.find({
      championId: champion._id,
      status: 'delivered',
    })
      .sort({ deliveredAt: -1 })
      .limit(50)
      .lean();

    const missionIds = missions.map((m) => m._id);
    const reviews = await ChampionReview.find({ missionId: { $in: missionIds } }).lean();
    const reviewByMission = new Map(reviews.map((r) => [String(r.missionId), r]));

    res.json(
      missions.map((m) => ({
        ...serializeMission(m),
        clientReview: reviewByMission.get(String(m._id)) || null,
      }))
    );
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/me/reviews', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    const reviews = await ChampionReview.find({ championId: champion._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({
      ratingAvg: champion.ratingAvg,
      ratingCount: champion.ratingCount,
      reviews,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── Avis client (public) ────────────────────────────────────────────────────

router.get('/public/mission/:id/review-info', async (req, res) => {
  try {
    const mission = await DeliveryMission.findById(req.params.id).populate('championId', 'firstName lastName');
    if (!mission) return res.status(404).json({ message: 'Course introuvable' });

    const existing = await ChampionReview.findOne({ missionId: mission._id }).lean();
    const champion = mission.championId;
    const championName = champion
      ? [champion.firstName, champion.lastName].filter(Boolean).join(' ')
      : 'Livreur';

    res.json({
      canReview: mission.status === 'delivered',
      alreadyReviewed: !!existing,
      productSummary: mission.productSummary,
      championName,
      clientName: mission.clientName,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/public/review', async (req, res) => {
  try {
    const missionId = req.body.missionId;
    const deliveryCode = String(req.body.deliveryCode || '').trim();
    const rating = Math.round(Number(req.body.rating) || 0);
    const comment = String(req.body.comment || '').trim().slice(0, 500);
    const clientName = String(req.body.clientName || '').trim().slice(0, 120);

    if (!missionId || !deliveryCode || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Code de livraison et note (1–5) requis' });
    }

    const mission = await DeliveryMission.findById(missionId);
    if (!mission || mission.status !== 'delivered') {
      return res.status(400).json({ message: 'Cette course ne peut pas être notée' });
    }
    if (deliveryCode !== mission.deliveryCode) {
      return res.status(400).json({ message: 'Code de livraison incorrect' });
    }
    if (!mission.championId) {
      return res.status(400).json({ message: 'Livreur introuvable pour cette course' });
    }

    const existing = await ChampionReview.findOne({ missionId: mission._id });
    if (existing) {
      return res.status(400).json({ message: 'Un avis a déjà été enregistré pour cette course' });
    }

    const review = await ChampionReview.create({
      missionId: mission._id,
      championId: mission.championId,
      rating,
      comment,
      clientName: clientName || mission.clientName,
    });

    await recalcChampionRating(mission.championId);

    res.status(201).json({ ok: true, review });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/wallet', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    const transactions = await ChampionTransaction.find({ championId: champion._id })
      .sort({ createdAt: -1 })
      .limit(40);
    res.json({
      walletBalance: champion.walletBalance,
      pendingBalance: champion.pendingBalance,
      transactions,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/wallet/withdraw', auth, isLivreur, async (req, res) => {
  try {
    const champion = await getChampionForUser(req.user._id);
    const amount = Math.round(Number(req.body.amount) || 0);
    if (amount < 500) {
      return res.status(400).json({ message: 'Montant minimum : CFA 500' });
    }
    if (amount > champion.walletBalance) {
      return res.status(400).json({ message: 'Solde insuffisant' });
    }

    champion.walletBalance -= amount;
    await champion.save();
    await ChampionTransaction.create({
      championId: champion._id,
      type: 'withdrawal',
      amount,
      status: 'pending',
      note: `Retrait MoMo ${champion.momoNetwork} ${champion.momoNumber}`,
    });

    res.json({ ok: true, walletBalance: champion.walletBalance });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

router.get('/admin/applications', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'pending_validation';
    const filter = status === 'all' ? {} : { accountStatus: status };
    const list = await Champion.find(filter).sort({ submittedAt: -1, createdAt: -1 }).limit(200);
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/admin/:id', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Introuvable' });
    res.json(champion);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/admin/:id/approve', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Introuvable' });

    champion.accountStatus = 'active';
    champion.reviewedAt = new Date();
    champion.reviewedBy = req.user._id;
    champion.rejectionReason = '';
    await champion.save();
    res.json(champion);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/admin/:id/reject', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Introuvable' });

    champion.accountStatus = 'rejected';
    champion.rejectionReason = String(req.body.reason || '').trim().slice(0, 500);
    champion.reviewedAt = new Date();
    champion.reviewedBy = req.user._id;
    champion.isOnline = false;
    await champion.save();
    res.json(champion);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/admin/:id/suspend', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Introuvable' });

    champion.accountStatus = 'suspended';
    champion.suspensionReason = String(req.body.reason || '').trim().slice(0, 500);
    champion.isOnline = false;
    await champion.save();
    res.json(champion);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/admin/:id/reactivate', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.id);
    if (!champion) return res.status(404).json({ message: 'Introuvable' });

    champion.accountStatus = 'active';
    champion.suspensionReason = '';
    await champion.save();
    res.json(champion);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/admin/missions/from-shop/:orderId', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const ShopOrder = require('../models/ShopOrder');
    const { createMissionFromShopOrder } = require('../utils/championMission');
    const order = await ShopOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Commande introuvable' });
    const mission = await createMissionFromShopOrder(order);
    res.json(serializeMission(mission));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/admin/wallet/:championId/release-pending', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const champion = await Champion.findById(req.params.championId);
    if (!champion) return res.status(404).json({ message: 'Introuvable' });

    const amount = champion.pendingBalance;
    if (amount <= 0) return res.json({ ok: true, amount: 0 });

    champion.pendingBalance = 0;
    champion.walletBalance += amount;
    await champion.save();

    await ChampionTransaction.updateMany(
      { championId: champion._id, type: 'earning', status: 'pending' },
      { $set: { status: 'completed' } }
    );

    res.json({ ok: true, released: amount, walletBalance: champion.walletBalance });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
