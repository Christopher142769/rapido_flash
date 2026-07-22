const express = require('express');
const User = require('../models/User');
const MealProduct = require('../models/MealProduct');
const MealOrder = require('../models/MealOrder');
const MealShopSettings = require('../models/MealShopSettings');
const { auth, isKitchenStaff, isRestaurantAdmin } = require('../middleware/auth');
const { generateMealOrderNumber } = require('../utils/mealOrderNumber');
const { buildMealOrderLine, computeMealOrderTotals } = require('../utils/mealPricing');
const { getShopClosureState } = require('../utils/shopClosure');
const { getShopOrderLimitState, mergeClosureWithOrderLimit } = require('../utils/shopOrderLimit');
const { sendToUserIds } = require('../services/pushNotifications');
const { normalizeBeninPhoneDigits } = require('../utils/phoneDigits');
const { getTodayDateKey, deliveryDateKeyToDate } = require('../utils/shopDeliveryDate');
const { assertResponsableCityAccess, responsableListFilter } = require('../utils/responsableAccess');

const router = express.Router();

const SHOP_CITIES = ['Cotonou', 'Calavi'];
const SHOP_WA = '22940317568';

async function getMealShopTrackingWhatsApp() {
  const settings = await MealShopSettings.findOne({ key: 'default' });
  const normalized = normalizeBeninPhoneDigits(settings?.trackingWhatsAppNumber);
  return normalized || SHOP_WA;
}

function validateCustomer(customer) {
  const c = customer || {};
  const firstName = String(c.firstName || '').trim();
  const lastName = String(c.lastName || '').trim();
  const phone = String(c.phone || '').trim();
  const city = String(c.city || '').trim();
  const addressDescription = String(c.addressDescription || '').trim();
  const phoneDigits = phone.replace(/\D/g, '');

  if (!firstName) return 'Le prénom est requis';
  if (!lastName) return 'Le nom est requis';
  if (phoneDigits.length < 8) return 'Un numéro joignable est requis';
  if (!SHOP_CITIES.includes(city)) return 'Choisissez Cotonou ou Calavi';
  if (!addressDescription) return 'L’adresse complète de livraison est requise';
  return null;
}

async function getStaffUserIds() {
  const staff = await User.find({
    role: { $in: ['restaurant', 'gestionnaire', 'commercial', 'cuisinier'] },
    banned: { $ne: true },
  })
    .select('_id')
    .lean();
  return staff.map((u) => String(u._id));
}

async function getKitchenUserIds() {
  const staff = await User.find({
    role: { $in: ['restaurant', 'gestionnaire', 'cuisinier'] },
    banned: { $ne: true },
  })
    .select('_id')
    .lean();
  return staff.map((u) => String(u._id));
}

const CUISINIER_STATUT_TRANSITIONS = {
  en_attente: ['confirmee'],
  confirmee: ['en_preparation'],
  en_preparation: ['en_livraison'],
};

function assertCuisinierStatutTransition(currentStatut, nextStatut) {
  const allowed = CUISINIER_STATUT_TRANSITIONS[currentStatut] || [];
  return allowed.includes(nextStatut);
}

async function getSettings() {
  let doc = await MealShopSettings.findOne({ key: 'default' });
  if (!doc) doc = await MealShopSettings.create({ key: 'default' });
  return doc;
}

/** Créer une commande multi-plats (public). */
router.post('/', async (req, res) => {
  try {
    const itemsIn = Array.isArray(req.body?.items) ? req.body.items : [];
    const customer = req.body?.customer;

    if (!itemsIn.length) return res.status(400).json({ message: 'Panier vide' });
    const customerError = validateCustomer(customer);
    if (customerError) return res.status(400).json({ message: customerError });

    const settings = await getSettings();
    const ordersToday = await MealOrder.countDocuments({
      createdAt: {
        $gte: require('../utils/mealOrderNumber').startOfDay(new Date()),
        $lte: require('../utils/mealOrderNumber').endOfDay(new Date()),
      },
      statut: { $ne: 'annulee' },
    });
    const closureState = getShopClosureState({ shopClosure: settings.shopClosure });
    const limitState = getShopOrderLimitState(
      { dailyOrderLimit: settings.dailyOrderLimit, dailyOrderLimitEnabled: settings.dailyOrderLimit?.enabled },
      ordersToday
    );
    const availability = mergeClosureWithOrderLimit(closureState, limitState, new Date());
    if (availability.isShopClosed) {
      return res.status(403).json({
        message:
          availability.closureReason === 'orderLimit'
            ? 'Le quota de commandes du jour est atteint.'
            : settings.shopClosure?.message || 'La boutique repas est temporairement fermée.',
      });
    }

    const builtItems = [];
    let anyFreeDelivery = false;

    for (const line of itemsIn) {
      const productId = line.mealProductId || line.productId || line.id;
      if (!productId) return res.status(400).json({ message: 'Plat manquant dans le panier' });
      const product = await MealProduct.findOne({ _id: productId, published: true });
      if (!product) {
        return res.status(404).json({ message: `Plat indisponible` });
      }
      const result = buildMealOrderLine(product, line);
      if (result.error) return res.status(400).json({ message: result.error });
      builtItems.push(result.item);
      if (result.promoState?.freeDelivery) anyFreeDelivery = true;
    }

    const shopDelivery = Math.max(0, Math.round(Number(settings.deliveryFee) || 0));
    const totals = computeMealOrderTotals(builtItems, shopDelivery, anyFreeDelivery);
    const orderNumber = await generateMealOrderNumber();

    // Shop Repas : livraison dans les prochaines 24 h (jour de commande), pas J+1.
    let requestedDeliveryAt = req.body?.requestedDeliveryAt
      ? new Date(req.body.requestedDeliveryAt)
      : deliveryDateKeyToDate(getTodayDateKey());
    if (!requestedDeliveryAt || Number.isNaN(requestedDeliveryAt.getTime())) {
      requestedDeliveryAt = deliveryDateKeyToDate(getTodayDateKey());
    }

    const order = new MealOrder({
      orderNumber,
      items: builtItems,
      subtotalPrice: totals.subtotalPrice,
      deliveryFee: totals.deliveryFee,
      totalPrice: totals.totalPrice,
      freeDelivery: anyFreeDelivery,
      customer: {
        firstName: String(customer.firstName).trim(),
        lastName: String(customer.lastName).trim(),
        phone: String(customer.phone).trim(),
        email: String(customer.email || '').trim().toLowerCase(),
        city: String(customer.city).trim(),
        addressDescription: String(customer.addressDescription).trim(),
      },
      whatsappNumber: await getMealShopTrackingWhatsApp(),
      statut: 'en_attente',
      commercialStatus: 'commande',
      orderDate: new Date(),
      requestedDeliveryAt,
    });

    await order.save();

    const staffIds = await getStaffUserIds();
    const kitchenIds = await getKitchenUserIds();
    if (staffIds.length) {
      const summary = builtItems.map((i) => `${i.productName} ×${i.quantity}`).join(', ');
      void sendToUserIds(staffIds, {
        title: 'Rapido Repas — Nouvelle commande',
        body: summary.slice(0, 120),
        url: '/dashboard/commercial-commandes-repas',
        tag: `rapido-meal-order-${order._id}`,
      }).catch(() => {});
    }
    if (kitchenIds.length) {
      const summary = builtItems.map((i) => `${i.productName} ×${i.quantity}`).join(', ');
      void sendToUserIds(kitchenIds, {
        title: 'Cuisine — Nouvelle commande repas',
        body: summary.slice(0, 120),
        url: '/cuisine/app',
        tag: `rapido-kitchen-order-${order._id}`,
        sound: 'meal',
      }).catch(() => {});
    }

    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/:id/whatsapp-confirmation', async (req, res) => {
  try {
    const order = await MealOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande introuvable' });

    const phone = normalizeBeninPhoneDigits(req.body?.phone);
    const orderPhone = normalizeBeninPhoneDigits(order.customer?.phone);
    if (!phone || !orderPhone || phone !== orderPhone) {
      return res.status(403).json({ message: 'Numéro non autorisé' });
    }

    if (!order.whatsappConfirmationSentAt) {
      order.whatsappConfirmationSentAt = new Date();
      await order.save();
    }
    res.json({ scheduled: false, alreadySent: !!order.whatsappConfirmationSentAt });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/', auth, isKitchenStaff, async (req, res) => {
  try {
    const filter = {
      ...responsableListFilter(req.user),
    };
    if (req.query.statut) filter.statut = req.query.statut;
    if (req.query.commercialStatus) filter.commercialStatus = req.query.commercialStatus;
    const orders = await MealOrder.find(filter)
      .sort({ createdAt: 1 })
      .populate('items.mealProduct', 'name slug mainImage')
      .lean();
    res.json(orders);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

function parseDateInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function recomputeMealLineTotal(item) {
  const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
  const unitPrice = Math.max(0, Math.round(Number(item.unitPrice) || 0));
  const optionsPerUnit = (item.options || []).reduce(
    (s, o) => s + Math.max(0, Math.round(Number(o.price) || 0)),
    0
  );
  const accTotal = (item.accompagnements || []).reduce(
    (s, a) =>
      s + Math.max(0, Math.round(Number(a.price) || 0)) * Math.max(1, Math.round(Number(a.quantity) || 1)),
    0
  );
  return Math.round(unitPrice * qty + optionsPerUnit * qty + accTotal);
}

router.put('/:id/statut', auth, isKitchenStaff, async (req, res) => {
  try {
    const order = await MealOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande introuvable' });

    const { statut, commercialStatus, clientSpecifications } = req.body || {};
    const isCuisinierRole = req.user.role === 'cuisinier';

    if (isCuisinierRole) {
      if (commercialStatus) {
        return res.status(403).json({ message: 'Modification du statut commercial non autorisée' });
      }
      if (statut === 'annulee' || statut === 'livree') {
        return res.status(403).json({ message: 'Action non autorisée pour la cuisine' });
      }
      if (statut && !assertCuisinierStatutTransition(order.statut, statut)) {
        return res.status(403).json({ message: 'Transition de statut non autorisée' });
      }
    } else if (!['restaurant', 'gestionnaire', 'commercial', 'responsable'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const cityErr = assertResponsableCityAccess(req.user, order);
    if (cityErr) return res.status(403).json({ message: cityErr });

    if (statut) {
      order.statut = statut;
      if (statut === 'en_attente') {
        order.commercialStatus = 'commande';
        order.confirmedAt = undefined;
      }
      if (statut === 'confirmee') {
        order.commercialStatus = 'confirme';
        order.confirmedAt = order.confirmedAt || new Date();
      }
      if (statut === 'livree') {
        order.commercialStatus = 'livree';
        order.deliveredAt = order.deliveredAt || new Date();
      }
      if (statut === 'annulee') order.commercialStatus = 'annulee';
    }
    if (commercialStatus) order.commercialStatus = commercialStatus;
    if (clientSpecifications != null) {
      order.clientSpecifications = String(clientSpecifications).trim();
    }

    await order.save();
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Admin uniquement — modification commande repas. */
router.patch('/:id', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const order = await MealOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande introuvable' });

    const body = req.body || {};

    if (body.customer) {
      const customerError = validateCustomer(body.customer);
      if (customerError) return res.status(400).json({ message: customerError });
      const c = body.customer;
      order.customer = {
        firstName: String(c.firstName || '').trim(),
        lastName: String(c.lastName || '').trim(),
        phone: String(c.phone || '').trim(),
        email: String(c.email || '').trim().toLowerCase(),
        city: String(c.city || '').trim(),
        addressDescription: String(c.addressDescription || '').trim(),
      };
    }

    if (body.deliveryFee != null) {
      const deliveryFee = Number(body.deliveryFee);
      if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
        return res.status(400).json({ message: 'Frais de livraison invalides' });
      }
      order.deliveryFee = Math.round(deliveryFee);
      if (deliveryFee > 0) order.freeDelivery = false;
    }

    if (body.clientSpecifications != null) {
      order.clientSpecifications = String(body.clientSpecifications).trim().slice(0, 2000);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'requestedDeliveryAt')) {
      order.requestedDeliveryAt = body.requestedDeliveryAt
        ? parseDateInput(body.requestedDeliveryAt)
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'orderDate')) {
      const orderDate = parseDateInput(body.orderDate);
      if (orderDate) order.orderDate = orderDate;
    }

    if (Array.isArray(body.items) && body.items.length) {
      const byId = new Map(order.items.map((it) => [String(it._id), it]));
      for (const patch of body.items) {
        const id = String(patch._id || patch.id || '');
        const item = byId.get(id);
        if (!item) continue;

        if (patch.productName != null) {
          const name = String(patch.productName).trim();
          if (name) item.productName = name;
        }
        if (patch.quantity != null) {
          const quantity = Math.round(Number(patch.quantity));
          if (!Number.isFinite(quantity) || quantity < 1) {
            return res.status(400).json({ message: 'Quantité plat invalide' });
          }
          item.quantity = quantity;
        }
        if (patch.unitPrice != null) {
          const unitPrice = Number(patch.unitPrice);
          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            return res.status(400).json({ message: 'Prix unitaire invalide' });
          }
          item.unitPrice = Math.round(unitPrice);
        }
        if (patch.specifications != null) {
          item.specifications = String(patch.specifications).trim().slice(0, 500);
        }
        item.lineTotal = recomputeMealLineTotal(item);
      }
    }

    const totals = computeMealOrderTotals(order.items, order.deliveryFee, order.freeDelivery);
    order.subtotalPrice = totals.subtotalPrice;
    order.deliveryFee = totals.deliveryFee;
    order.totalPrice = totals.totalPrice;

    await order.save();
    const populated = await MealOrder.findById(order._id)
      .populate('items.mealProduct', 'name slug mainImage')
      .lean();
    res.json(populated || order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Admin uniquement — suppression définitive commande repas. */
router.delete('/:id', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const order = await MealOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande introuvable' });

    await order.deleteOne();
    res.json({
      message: 'Commande repas supprimée',
      id: String(order._id),
      orderNumber: order.orderNumber || null,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
