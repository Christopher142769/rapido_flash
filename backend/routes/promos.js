const express = require('express');
const PromoOffer = require('../models/PromoOffer');
const PromoCode = require('../models/PromoCode');
const Produit = require('../models/Produit');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { canManageMaintenance } = require('../utils/maintenanceAccess');
const { validatePromoCodeForOrder } = require('../utils/promoEngine');
const { assignEligiblePromoCodesToUser } = require('../utils/promoAutoAssign');

const router = express.Router();

router.use(express.json({ limit: '100mb' }));
router.use(express.urlencoded({ extended: true, limit: '100mb' }));

function normalizeCodePart(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

function randomCodeSuffix(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function generateUniqueCode(basePrefix = 'RAPIDO') {
  const prefix = normalizeCodePart(basePrefix) || 'RAPIDO';
  for (let i = 0; i < 20; i += 1) {
    const code = `${prefix}-${randomCodeSuffix(6)}`;
    const existing = await PromoCode.findOne({ code }).select('_id').lean();
    if (!existing) return code;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

async function getAccessibleRestaurantIds(userId) {
  const owned = await Restaurant.find({
    $or: [{ proprietaire: userId }, { gestionnaires: userId }],
  })
    .select('_id')
    .lean();
  return owned.map((r) => String(r._id));
}

async function assertRestaurantAccess(reqUser, restaurantId) {
  const ids = await getAccessibleRestaurantIds(reqUser._id);
  return ids.includes(String(restaurantId));
}

router.get('/offers', auth, async (req, res) => {
  try {
    if (!['restaurant', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const ids = await getAccessibleRestaurantIds(req.user._id);
    const filter = {
      $or: [
        { scopeType: 'platform' },
        { scopeType: { $exists: false }, restaurant: { $in: ids } },
        { scopeType: 'restaurant', restaurant: { $in: ids } },
      ],
    };
    if (req.query.restaurantId) {
      if (!ids.includes(String(req.query.restaurantId))) {
        return res.status(403).json({ message: 'Restaurant inaccessible.' });
      }
      filter.$or = [
        { scopeType: { $exists: false }, restaurant: req.query.restaurantId },
        { scopeType: 'restaurant', restaurant: req.query.restaurantId },
      ];
    }

    const offers = await PromoOffer.find(filter)
      .populate('restaurant', 'nom')
      .populate('productIds', 'nom')
      .sort({ createdAt: -1 })
      .lean();

    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/offers', auth, async (req, res) => {
  try {
    if (!['restaurant', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const {
      restaurantId,
      title,
      description,
      discountPercent,
      publicCode,
      scopeType = 'restaurant',
      productScope = 'all_products',
      audience = 'all_users',
      firstNewUsersCount = 0,
      newUsersWindowDays = 30,
      productIds = [],
      validFrom,
      validUntil,
    } = req.body;

    const finalScope = ['restaurant', 'platform'].includes(scopeType) ? scopeType : 'restaurant';
    if (finalScope === 'restaurant') {
      if (!restaurantId || !(await assertRestaurantAccess(req.user, restaurantId))) {
        return res.status(403).json({ message: 'Restaurant inaccessible.' });
      }
    } else if (!canManageMaintenance(req.user)) {
      return res.status(403).json({ message: 'Accès refusé pour une offre plateforme.' });
    }
    if (!String(title || '').trim()) {
      return res.status(400).json({ message: 'Le titre de l’offre est obligatoire.' });
    }
    const pct = Math.min(90, Math.max(1, Math.round(Number(discountPercent || 0))));
    if (!Number.isFinite(pct) || pct <= 0) {
      return res.status(400).json({ message: 'Pourcentage de réduction invalide.' });
    }

    const normalizedPublicCode = String(publicCode || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    if (normalizedPublicCode) {
      const exists = await PromoOffer.findOne({
        status: 'active',
        publicCode: normalizedPublicCode,
      })
        .select('_id')
        .lean();
      if (exists) {
        return res.status(400).json({ message: 'Ce code promo existe déjà pour cette entreprise.' });
      }
    }

    const uniqueProductIds = [...new Set((Array.isArray(productIds) ? productIds : []).map(String))];
    let finalProductScope = ['all_products', 'selected_products'].includes(productScope)
      ? productScope
      : 'all_products';
    if (finalScope === 'platform') finalProductScope = 'all_products';
    if (finalProductScope === 'selected_products' && uniqueProductIds.length > 0 && finalScope === 'restaurant') {
      const count = await Produit.countDocuments({
        _id: { $in: uniqueProductIds },
        restaurant: restaurantId,
      });
      if (count !== uniqueProductIds.length) {
        return res.status(400).json({ message: 'Certains produits sélectionnés sont invalides.' });
      }
    }

    const offer = await PromoOffer.create({
      restaurant: finalScope === 'restaurant' ? restaurantId : null,
      title: String(title).trim(),
      description: String(description || '').trim(),
      discountPercent: pct,
      publicCode: normalizedPublicCode,
      scopeType: finalScope,
      productScope: finalProductScope,
      productIds: finalProductScope === 'selected_products' ? uniqueProductIds : [],
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      rules: {
        singleUseCode: false,
        audience: ['manual', 'new_users', 'all_users', 'first_new_users'].includes(audience)
          ? audience
          : 'all_users',
        firstNewUsersCount: Math.max(0, Number(firstNewUsersCount || 0)),
        newUsersWindowDays: Math.max(1, Number(newUsersWindowDays || 30)),
      },
      createdBy: req.user._id,
    });

    res.status(201).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/offers/:id/status', auth, async (req, res) => {
  try {
    if (!['restaurant', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const { status } = req.body;
    if (!['active', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }

    const offer = await PromoOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offre introuvable.' });
    if (!(await assertRestaurantAccess(req.user, offer.restaurant))) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    offer.status = status;
    await offer.save();

    if (status === 'cancelled') {
      await PromoCode.updateMany({ offer: offer._id, status: 'active' }, { $set: { status: 'cancelled' } });
    }

    res.json({ ok: true, offer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/offers/:id/codes', auth, async (req, res) => {
  try {
    if (!['restaurant', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const offer = await PromoOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offre introuvable.' });
    if (!(await assertRestaurantAccess(req.user, offer.restaurant))) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const codes = await PromoCode.find({ offer: offer._id })
      .populate('assignedTo', 'nom email role createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json(codes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/offers/:id/generate-codes', auth, async (req, res) => {
  try {
    if (!['restaurant', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const offer = await PromoOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offre introuvable.' });
    if (!(await assertRestaurantAccess(req.user, offer.restaurant))) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }
    if (offer.status !== 'active') {
      return res.status(400).json({ message: 'Offre inactive.' });
    }

    const {
      mode = 'manual',
      userIds = [],
      firstCount = 0,
      codePrefix = 'PROMO',
    } = req.body;

    let targetUsers = [];
    if (mode === 'manual') {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: 'Sélectionnez au moins un utilisateur.' });
      }
      targetUsers = await User.find({ _id: { $in: userIds } }).select('_id').lean();
    } else if (mode === 'all_users') {
      targetUsers = await User.find({ role: 'client' }).select('_id').lean();
      offer.rules = { ...(offer.rules || {}), audience: 'all_users' };
      await offer.save();
    } else if (mode === 'new_users') {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30);
      targetUsers = await User.find({ role: 'client', createdAt: { $gte: dateFrom } }).select('_id').lean();
      offer.rules = { ...(offer.rules || {}), audience: 'new_users' };
      await offer.save();
    } else if (mode === 'first_new_users') {
      const limit = Math.max(1, Number(firstCount || offer.rules?.firstNewUsersCount || 1));
      targetUsers = await User.find({ role: 'client' }).sort({ createdAt: 1 }).limit(limit).select('_id').lean();
      offer.rules = { ...(offer.rules || {}), audience: 'first_new_users', firstNewUsersCount: limit };
      await offer.save();
    } else {
      return res.status(400).json({ message: 'Mode de génération invalide.' });
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ message: 'Aucun utilisateur cible trouvé.' });
    }

    const created = [];
    const assignedIds = targetUsers.map((u) => String(u._id));
    const already = await PromoCode.find({
      offer: offer._id,
      assignedTo: { $in: assignedIds },
    })
      .select('assignedTo')
      .lean();
    const alreadySet = new Set(already.map((c) => String(c.assignedTo)));

    for (const user of targetUsers) {
      if (alreadySet.has(String(user._id))) continue;
      const code = await generateUniqueCode(codePrefix || offer.title || 'PROMO');
      created.push({
        offer: offer._id,
        restaurant: offer.restaurant,
        code,
        assignedTo: user._id,
        assignmentType: mode,
        maxUses: 1,
        expiresAt: offer.validUntil || null,
      });
    }

    if (created.length === 0) {
      return res.json({ ok: true, createdCount: 0, message: 'Aucun nouveau code à générer.' });
    }

    await PromoCode.insertMany(created, { ordered: false });
    const createdCodes = await PromoCode.find({ offer: offer._id, code: { $in: created.map((c) => c.code) } })
      .populate('assignedTo', 'nom email role createdAt')
      .lean();

    res.status(201).json({ ok: true, createdCount: createdCodes.length, codes: createdCodes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/users', auth, async (req, res) => {
  try {
    if (!canManageMaintenance(req.user)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const q = String(req.query.q || '').trim();
    const where = {};
    if (q) {
      where.$or = [
        { nom: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { telephone: { $regex: q, $options: 'i' } },
      ];
    }
    const users = await User.find(where)
      .select('nom email telephone role createdAt')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/validate', auth, async (req, res) => {
  try {
    const { code, restaurantId, produits = [] } = req.body;
    const result = await validatePromoCodeForOrder({
      code,
      userId: req.user._id,
      restaurantId,
      produits,
    });
    if (!result.ok) return res.status(400).json(result);

    res.json({
      ok: true,
      discountPercent: result.discountPercent,
      eligibleSubtotal: result.eligibleSubtotal,
      discountAmount: result.discountAmount,
      offer: {
        id: result.offer._id,
        title: result.offer.title,
      },
      promoCode: result.appliedCode,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my-codes', auth, async (req, res) => {
  try {
    await assignEligiblePromoCodesToUser(req.user);
    const now = new Date();
    const publicOffers = await PromoOffer.find({
      status: 'active',
      publicCode: { $exists: true, $ne: '' },
      $or: [{ validUntil: null }, { validUntil: { $gte: now } }],
    })
      .populate('productIds', 'nom')
      .populate('restaurant', 'nom logo')
      .sort({ createdAt: -1 })
      .lean();

    const userCreatedAt = new Date(req.user.createdAt || Date.now());
    const userRank = await User.countDocuments({
      role: 'client',
      createdAt: { $lte: userCreatedAt },
    });

    const eligible = publicOffers.filter((offer) => {
      if (!offer || !offer.publicCode) return false;
      const aud = String(offer?.rules?.audience || 'all_users');
      if (aud === 'all_users') return true;
      if (aud === 'new_users') {
        const days = Math.max(1, Number(offer?.rules?.newUsersWindowDays || 30));
        const minDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return userCreatedAt >= minDate;
      }
      if (aud === 'first_new_users') {
        const limit = Math.max(1, Number(offer?.rules?.firstNewUsersCount || 1));
        return userRank <= limit;
      }
      return false;
    });

    const entries = eligible.map((offer) => ({
      id: `public-${offer._id}`,
      code: offer.publicCode,
      expiresAt: offer.validUntil || null,
      maxUses: null,
      useCount: 0,
      offer: {
        id: offer._id,
        title: offer.title,
        description: offer.description,
        discountPercent: offer.discountPercent,
        validUntil: offer.validUntil,
        scopeType: offer.scopeType || 'restaurant',
        restaurantName: offer.restaurant?.nom || 'Rapido Flash',
        restaurantLogo: offer.restaurant?.logo || '',
        products: (offer.productIds || []).map((p) => ({ id: p._id, nom: p.nom })),
      },
    }));

    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
