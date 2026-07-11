const express = require('express');
const MealShopSettings = require('../models/MealShopSettings');
const { auth, isRestaurant } = require('../middleware/auth');
const upload = require('../middleware/uploadMealProduct');
const { getShopClosureState } = require('../utils/shopClosure');
const { getShopOrderLimitState, mergeClosureWithOrderLimit } = require('../utils/shopOrderLimit');
const MealOrder = require('../models/MealOrder');
const { startOfDay, endOfDay } = require('../utils/mealOrderNumber');

const router = express.Router();

const DEFAULT_TRUST = [
  { title: 'Livraison rapide', subtitle: 'Chez vous à Cotonou & Calavi' },
  { title: 'Paiement à la livraison', subtitle: 'Payez à la réception' },
  { title: 'Plats frais', subtitle: 'Préparation soignée' },
  { title: 'Support WhatsApp', subtitle: 'Suivi de commande facile' },
];

async function getOrCreateSettings() {
  let doc = await MealShopSettings.findOne({ key: 'default' });
  if (!doc) {
    doc = await MealShopSettings.create({ key: 'default' });
  }
  return doc;
}

async function countTodayMealOrders() {
  const now = new Date();
  return MealOrder.countDocuments({
    createdAt: { $gte: startOfDay(now), $lte: endOfDay(now) },
    statut: { $ne: 'annulee' },
  });
}

function serializeSettings(doc, ordersToday = 0) {
  const raw = doc.toObject ? doc.toObject() : { ...doc };
  const closureState = getShopClosureState({ shopClosure: raw.shopClosure });
  const limitState = getShopOrderLimitState(
    { dailyOrderLimit: raw.dailyOrderLimit, dailyOrderLimitEnabled: raw.dailyOrderLimit?.enabled },
    ordersToday
  );
  const availability = mergeClosureWithOrderLimit(closureState, limitState, new Date());
  return {
    ...raw,
    trustItems: raw.trustItems?.length ? raw.trustItems : DEFAULT_TRUST,
    ...availability,
    ordersToday,
  };
}

router.get('/public', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const doc = await getOrCreateSettings();
    const ordersToday = await countTodayMealOrders();
    res.json(serializeSettings(doc, ordersToday));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, isRestaurant, async (req, res) => {
  try {
    const doc = await getOrCreateSettings();
    const ordersToday = await countTodayMealOrders();
    res.json(serializeSettings(doc, ordersToday));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', auth, isRestaurant, async (req, res) => {
  try {
    const doc = await getOrCreateSettings();
    const body = req.body || {};

    if (body.heroSlides != null) {
      const slides = Array.isArray(body.heroSlides) ? body.heroSlides : [];
      doc.heroSlides = slides.map((s) => ({
        imageUrl: String(s.imageUrl || '').trim(),
        title: String(s.title || '').trim(),
        subtitle: String(s.subtitle || '').trim(),
        ctaLabel: String(s.ctaLabel || '').trim(),
        ctaHref: String(s.ctaHref || '#meal-products').trim(),
      }));
    }
    if (body.trustItems != null) {
      doc.trustItems = (Array.isArray(body.trustItems) ? body.trustItems : []).map((t) => ({
        title: String(t.title || '').trim(),
        subtitle: String(t.subtitle || '').trim(),
      }));
    }
    if (body.promoBanner != null) {
      const p = body.promoBanner;
      doc.promoBanner = {
        active: !!p.active,
        title: String(p.title || '').trim(),
        subtitle: String(p.subtitle || '').trim(),
        ctaLabel: String(p.ctaLabel || 'Voir les plats').trim(),
      };
    }
    if (body.categories != null) {
      doc.categories = (Array.isArray(body.categories) ? body.categories : [])
        .map((c) => String(c).trim())
        .filter(Boolean);
    }
    if (body.deliveryFee != null) {
      doc.deliveryFee = Math.max(0, Math.round(Number(body.deliveryFee) || 0));
    }
    if (body.shopClosure != null) {
      const sc = body.shopClosure;
      doc.shopClosure = {
        enabled: !!sc.enabled,
        dailyCloseTime: String(sc.dailyCloseTime || '').trim(),
        dailyOpenTime: String(sc.dailyOpenTime || '').trim(),
        message: String(sc.message || '').trim().slice(0, 500),
        manualOverride: ['open', 'closed'].includes(sc.manualOverride) ? sc.manualOverride : null,
      };
    }
    if (body.dailyOrderLimit != null) {
      const lim = body.dailyOrderLimit;
      doc.dailyOrderLimit = {
        enabled: !!lim.enabled,
        maxOrders: Math.max(0, Math.round(Number(lim.maxOrders) || 0)),
      };
    }

    await doc.save();
    const ordersToday = await countTodayMealOrders();
    res.json(serializeSettings(doc, ordersToday));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/upload-slide', auth, isRestaurant, upload.single('image'), async (req, res) => {
  try {
    if (!req.file?.path) return res.status(400).json({ message: 'Image requise' });
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
