const express = require('express');
const User = require('../models/User');
const ShopProduct = require('../models/ShopProduct');
const ShopOrder = require('../models/ShopOrder');
const { auth, isRestaurant, isCommercialStaff } = require('../middleware/auth');
const { generateShopOrderNumber } = require('../utils/shopOrderNumber');
const { getShopPromoState, getShopDeliveryFee, computeShopOrderTotals } = require('../utils/shopPromo');
const { getShopAvailabilityState } = require('../utils/shopOrderLimit');
const { normalizeShopQuantityUnit } = require('../utils/shopQuantityUnit');
const { formatQuantityWithUnit } = require('../utils/shopQuantityLabel');
const { sendToUserIds } = require('../services/pushNotifications');
const { notifyShopOrderCreated } = require('../services/orderNotificationMailer');
const { isAllowedDeliveryDate, getDefaultDeliveryDateKey, deliveryDateKeyToDate } = require('../utils/shopDeliveryDate');
const { unconfirmShopOrder } = require('../utils/shopOrderStatus');
const { isEviscerationApplicable } = require('../utils/shopEvisceration');
const { normalizeBeninPhoneDigits } = require('../utils/phoneDigits');
const { scheduleShopOrderWhatsAppConfirmation } = require('../services/shopOrderWhatsAppConfirmation');

const router = express.Router();

const SHOP_CITIES = ['Cotonou', 'Calavi'];

function validateShopCustomer(customer) {
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

  const email = String(c.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Adresse email invalide';
  }

  return null;
}

async function getShopStaffUserIds() {
  const staff = await User.find({
    role: { $in: ['restaurant', 'gestionnaire', 'commercial'] },
    banned: { $ne: true },
  })
    .select('_id')
    .lean();
  return staff.map((u) => String(u._id));
}

/** Créer une commande Shop express (public, page /shop/:slug). */
router.post('/', async (req, res) => {
  try {
    const slug = String(req.body?.slug || '')
      .trim()
      .toLowerCase();
    const quantity = Number(req.body?.quantity);
    const customer = req.body?.customer;

    if (!slug) return res.status(400).json({ message: 'Produit invalide' });
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Quantité invalide' });
    }

    const customerError = validateShopCustomer(customer);
    if (customerError) return res.status(400).json({ message: customerError });

    const product = await ShopProduct.findOne({ slug, published: true });
    if (!product) {
      return res.status(404).json({ message: 'Produit indisponible' });
    }

    const availability = await getShopAvailabilityState(product);
    if (availability.isShopClosed) {
      const msg =
        availability.closureReason === 'orderLimit'
          ? 'Le quota de commandes du jour est atteint. La boutique rouvrira à l’heure habituelle.'
          : 'La boutique est temporairement fermée. Revenez à l’heure de réouverture indiquée sur la fiche.';
      return res.status(403).json({ message: msg });
    }

    const promoState = getShopPromoState(product);
    const quantityUnit = normalizeShopQuantityUnit(product.quantityUnit);
    const unitPrice = promoState.isPromoLive ? promoState.promoPrice : promoState.basePrice;
    const deliveryFee = getShopDeliveryFee(product, promoState);
    const eviscerationCleaning =
      !!req.body?.eviscerationCleaning && isEviscerationApplicable(quantityUnit);
    const totals = computeShopOrderTotals(unitPrice, quantity, deliveryFee, {
      eviscerationCleaning,
      quantityUnit,
    });
    const { subtotalPrice, totalPrice, eviscerationFee } = totals;

    let requestedDeliveryAt = req.body?.requestedDeliveryAt
      ? new Date(req.body.requestedDeliveryAt)
      : deliveryDateKeyToDate(getDefaultDeliveryDateKey());
    if (!requestedDeliveryAt || Number.isNaN(requestedDeliveryAt.getTime())) {
      requestedDeliveryAt = deliveryDateKeyToDate(getDefaultDeliveryDateKey());
    }
    if (!isAllowedDeliveryDate(requestedDeliveryAt)) {
      return res.status(400).json({ message: 'Date de livraison invalide' });
    }

    const orderNumber = await generateShopOrderNumber();
    const order = new ShopOrder({
      orderNumber,
      shopProduct: product._id,
      slug: product.slug,
      productName: product.name,
      quantity,
      quantityUnit,
      quantityLabel: formatQuantityWithUnit(quantity, quantityUnit),
      unitPrice,
      subtotalPrice,
      deliveryFee,
      eviscerationCleaning: totals.eviscerationCleaning,
      eviscerationFee,
      totalPrice,
      basePrice: promoState.basePrice,
      isPromoLive: promoState.isPromoLive,
      discountPercent: promoState.discountPercent,
      freeDelivery: promoState.freeDelivery,
      customer: {
        firstName: String(customer.firstName).trim(),
        lastName: String(customer.lastName).trim(),
        phone: String(customer.phone).trim(),
        email: String(customer.email || '').trim().toLowerCase(),
        city: String(customer.city).trim(),
        addressDescription: String(customer.addressDescription).trim(),
      },
      whatsappNumber: product.whatsappNumber || '',
      statut: 'en_attente',
      commercialStatus: 'commande',
      orderDate: new Date(),
      requestedDeliveryAt,
    });

    await order.save();

    const staffIds = await getShopStaffUserIds();
    if (staffIds.length) {
      void sendToUserIds(staffIds, {
        title: 'Rapido Shop — Nouvelle commande',
        body: `${order.productName} · ${order.quantityLabel}`,
        url: '/dashboard/commercial-commandes',
        tag: `rapido-shop-order-${order._id}`,
      }).catch(() => {});
    }

    void notifyShopOrderCreated(order.toObject ? order.toObject() : order).catch((err) => {
      console.error('Notification e-mail commande Shop:', err.message);
    });

    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Planifie la confirmation WhatsApp après « Suivre ma commande » (client envoie d’abord le récap à Rapido). */
router.post('/:id/whatsapp-confirmation', async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande introuvable' });

    const phone = normalizeBeninPhoneDigits(req.body?.phone);
    const orderPhone = normalizeBeninPhoneDigits(order.customer?.phone);
    if (!phone || !orderPhone || phone !== orderPhone) {
      return res.status(403).json({ message: 'Numéro non autorisé' });
    }

    if (order.whatsappConfirmationSentAt) {
      return res.json({ scheduled: false, alreadySent: true });
    }

    scheduleShopOrderWhatsAppConfirmation(order._id);
    res.json({ scheduled: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Liste des commandes Shop (dashboard restaurant / gestionnaire). */
router.get('/', auth, isCommercialStaff, async (req, res) => {
  try {
    const orders = await ShopOrder.find()
      .populate('shopProduct', 'name slug mainImage')
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/:id/statut', auth, isCommercialStaff, async (req, res) => {
  try {
    const { statut } = req.body;
    const valid = ['en_attente', 'confirmee', 'en_preparation', 'en_livraison', 'livree', 'annulee'];
    if (!valid.includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });

    if (statut === 'en_attente') {
      const unconfirmErr = unconfirmShopOrder(order);
      if (unconfirmErr) return res.status(400).json({ message: unconfirmErr });
      await order.save();
      return res.json(order);
    }

    order.statut = statut;
    if (statut === 'livree') {
      order.commercialStatus = 'livree';
      order.deliveredAt = new Date();
    } else if (statut === 'annulee') {
      order.commercialStatus = 'annulee';
    } else if (statut === 'confirmee') {
      if (!order.orderDate) {
        order.orderDate = order.createdAt || new Date();
      }
      order.commercialStatus = 'confirme';
      order.confirmedAt = new Date();
    } else if (['en_preparation', 'en_livraison'].includes(statut)) {
      if (!order.orderDate) {
        order.orderDate = order.createdAt || new Date();
      }
      if (!order.confirmedAt) order.confirmedAt = new Date();
      if (order.commercialStatus !== 'livree' && order.commercialStatus !== 'annulee') {
        order.commercialStatus = 'confirme';
      }
    }
    await order.save();

    if (statut === 'confirmee') {
      try {
        const { createMissionFromShopOrder } = require('../utils/championMission');
        await createMissionFromShopOrder(order);
      } catch (missionErr) {
        console.error('Champion mission:', missionErr.message);
      }
    }

    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
