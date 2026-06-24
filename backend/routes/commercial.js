const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const ShopOrder = require('../models/ShopOrder');
const ShopProduct = require('../models/ShopProduct');
const { auth, isCommercialStaff, isRestaurantAdmin } = require('../middleware/auth');
const { generateShopOrderNumber, startOfDay, endOfDay } = require('../utils/shopOrderNumber');
const { unconfirmShopOrder } = require('../utils/shopOrderStatus');
const {
  bilanBaseQuery,
  bilanRowFromOrder,
  pointsOrderDetail,
  groupPointsByCity,
  resolveCommercialStatus,
  buildPeriodFilter,
  isOrderConfirmedInPeriod,
  normalizeDateKey,
  confirmedOrdersQuery,
  pointsConfirmedOnlyQuery,
  BILAN_START_DATE,
} = require('../utils/commercialBilan');
const { sendToUserIds } = require('../services/pushNotifications');

const router = express.Router();

const COMMERCIAL_STATUSES = ['commande', 'confirme', 'relance', 'livree', 'annulee'];

async function getCommercialStaffIds() {
  const staff = await User.find({
    role: { $in: ['restaurant', 'gestionnaire', 'commercial'] },
    banned: { $ne: true },
  })
    .select('_id')
    .lean();
  return staff.map((u) => String(u._id));
}

function parseDateInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function todayRange() {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
}

function buildBilanFilter(query) {
  const filter = bilanBaseQuery();
  if (query.product) {
    filter.productName = { $regex: String(query.product).trim(), $options: 'i' };
  }
  if (query.status && COMMERCIAL_STATUSES.includes(query.status)) {
    filter.commercialStatus = query.status;
  }
  if (query.offPlatform === 'true') filter.isOffPlatform = true;
  if (query.offPlatform === 'false') filter.isOffPlatform = { $ne: true };
  const periodClause = buildPeriodFilter(query.dateFrom, query.dateTo);
  if (periodClause) {
    filter.$and = [...(filter.$and || []), periodClause];
  }
  return filter;
}

// ——— Gestion des comptes commerciaux (admin restaurant) ———

router.get('/accounts', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'commercial' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/accounts', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const nom = String(req.body?.nom || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const telephone = String(req.body?.telephone || '').trim();
    const password = String(req.body?.password || '');

    if (!nom || !email || password.length < 6) {
      return res.status(400).json({ message: 'Nom, email et mot de passe (6 car. min) requis' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Cet email est déjà utilisé' });

    const user = new User({ nom, email, telephone, password, role: 'commercial' });
    await user.save();
    const out = user.toObject();
    delete out.password;
    res.status(201).json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.patch('/accounts/:id', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'commercial' });
    if (!user) return res.status(404).json({ message: 'Commercial introuvable' });

    if (req.body.nom) user.nom = String(req.body.nom).trim();
    if (req.body.telephone !== undefined) user.telephone = String(req.body.telephone || '').trim();
    if (req.body.banned !== undefined) user.banned = !!req.body.banned;
    if (req.body.password && String(req.body.password).length >= 6) {
      user.password = String(req.body.password);
    }
    await user.save();
    const out = user.toObject();
    delete out.password;
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ——— Points (quantités confirmées par période / produit) ———

router.get('/points/products', auth, isCommercialStaff, async (req, res) => {
  try {
    const catalog = await ShopProduct.find()
      .select('name slug quantityUnit')
      .sort({ name: 1 })
      .lean();

    const orderNames = await ShopOrder.distinct('productName', {
      productName: { $exists: true, $ne: '' },
    });

    const catalogNames = new Set(catalog.map((p) => p.name.toLowerCase()));
    const extras = orderNames
      .filter((n) => n && !catalogNames.has(String(n).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map((name) => ({ _id: null, name, slug: '', quantityUnit: 'unit', fromOrders: true }));

    res.json([...catalog, ...extras]);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/points/summary', auth, isCommercialStaff, async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const productId = String(req.query.productId || '').trim();
    const productName = String(req.query.productName || '').trim();
    const cityFilter = String(req.query.city || '').trim();

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: 'Période requise (date de début et date de fin)' });
    }
    if (!productId && !productName) {
      return res.status(400).json({ message: 'Sélectionnez un produit' });
    }

    if (!normalizeDateKey(dateFrom) && !normalizeDateKey(dateTo)) {
      return res.status(400).json({ message: 'Période invalide' });
    }

    let resolvedName = productName;
    let resolvedUnit = 'unit';

    const mongoFilter = {};

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      const product = await ShopProduct.findById(productId).select('name quantityUnit').lean();
      if (!product) return res.status(404).json({ message: 'Produit introuvable' });
      resolvedName = product.name;
      resolvedUnit = product.quantityUnit || 'unit';
      const nameRx = new RegExp(`^${product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      mongoFilter.$or = [
        { shopProduct: product._id },
        { isOffPlatform: true, productName: nameRx },
      ];
    } else if (resolvedName) {
      const escaped = resolvedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      mongoFilter.productName = new RegExp(`^${escaped}$`, 'i');
    }

    if (cityFilter === 'Cotonou' || cityFilter === 'Calavi') {
      mongoFilter.$and = [
        ...(mongoFilter.$and || []),
        {
          $or: [
            { 'customer.city': cityFilter },
            {
              isOffPlatform: true,
              offPlatformLocation: new RegExp(cityFilter, 'i'),
            },
          ],
        },
      ];
    }

    let orders = await ShopOrder.find(mongoFilter).sort({ confirmedAt: -1, orderDate: -1 }).lean();
    orders = orders.filter((o) => resolveCommercialStatus(o) === 'confirme');
    orders = orders.filter((o) => isOrderConfirmedInPeriod(o, dateFrom, dateTo));

    if (orders.length && !resolvedName) {
      resolvedName = orders[0].productName;
    }
    if (orders.length) {
      resolvedUnit = orders[0].quantityUnit || resolvedUnit;
    }

    const totalQuantity = orders.reduce((sum, o) => sum + Number(o.quantity || 0), 0);
    const detailRows = orders.map(pointsOrderDetail);
    const byCity = groupPointsByCity(detailRows, resolvedUnit);

    res.json({
      productName: resolvedName,
      quantityUnit: resolvedUnit,
      dateFrom,
      dateTo,
      cityFilter: cityFilter || null,
      orderCount: orders.length,
      totalQuantity,
      totalAmount: detailRows.reduce((s, r) => s + Number(r.amount || 0), 0),
      byCity,
      orders: detailRows,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ——— Vue d'ensemble ———

router.get('/overview', auth, isCommercialStaff, async (req, res) => {
  try {
    const base = bilanBaseQuery();
    const orders = await ShopOrder.find(base).lean();

    let totalOrdersAmount = 0;
    let revenueReceived = 0;
    let deliveryCount = 0;
    let pendingCount = 0;
    let relanceCount = 0;

    for (const o of orders) {
      const amount = Number(o.totalPrice || 0);
      const status = resolveCommercialStatus(o);
      totalOrdersAmount += amount;
      if (status === 'livree') {
        revenueReceived += amount;
        deliveryCount += 1;
      } else if (status === 'relance') {
        relanceCount += 1;
      } else if (status === 'confirme') {
        pendingCount += 1;
      } else if (status === 'commande') {
        pendingCount += 1;
      }
    }

    const { start, end } = todayRange();
    const todayRelances = await ShopOrder.countDocuments({
      commercialStatus: 'relance',
      scheduledDeliveryAt: { $gte: start, $lte: end },
    });

    const recent = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 12)
      .map(bilanRowFromOrder);

    res.json({
      bilanStartDate: BILAN_START_DATE,
      totalOrdersAmount,
      revenueReceived,
      deliveryCount,
      pendingCount,
      relanceCount,
      todayRelances,
      orderCount: orders.length,
      recent,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ——— Commandes shop (espace commercial) ———

router.get('/orders', auth, isCommercialStaff, async (req, res) => {
  try {
    let orders = await ShopOrder.find()
      .populate('shopProduct', 'name slug mainImage')
      .sort({ orderDate: -1, createdAt: -1 })
      .lean();

    const status = req.query.status;
    if (status === 'confirme') {
      orders = orders.filter((o) => resolveCommercialStatus(o) === 'confirme');
    } else if (status && COMMERCIAL_STATUSES.includes(status)) {
      orders = orders.filter((o) => resolveCommercialStatus(o) === status);
    }

    res.json(
      orders.map((o) => ({
        ...o,
        commercialStatusResolved: resolveCommercialStatus(o),
      }))
    );
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/orders/:id/confirm', auth, isCommercialStaff, async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });

    if (!order.orderDate) {
      order.orderDate = order.createdAt || new Date();
    }
    if (!order.orderDate) {
      order.orderDate = order.createdAt || new Date();
    }
    order.statut = 'confirmee';
    order.commercialStatus = 'confirme';
    order.confirmedAt = new Date();
    await order.save();
    try {
      const { createMissionFromShopOrder } = require('../utils/championMission');
      await createMissionFromShopOrder(order);
    } catch (missionErr) {
      console.error('Champion mission:', missionErr.message);
    }
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/orders/:id/unconfirm', auth, isCommercialStaff, async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });

    const unconfirmErr = unconfirmShopOrder(order);
    if (unconfirmErr) return res.status(400).json({ message: unconfirmErr });

    await order.save();
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/orders/:id/deliver', auth, isCommercialStaff, async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });

    order.statut = 'livree';
    order.commercialStatus = 'livree';
    order.deliveredAt = new Date();
    if (!order.orderDate) order.orderDate = order.deliveredAt;
    await order.save();
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/orders/:id/specifications', auth, isCommercialStaff, async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });

    order.clientSpecifications = String(req.body?.clientSpecifications ?? '').trim().slice(0, 2000);
    await order.save();
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/orders/:id/cancel', auth, isCommercialStaff, async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });

    const status = resolveCommercialStatus(order);
    if (status === 'livree') {
      return res.status(400).json({ message: 'Une commande livrée ne peut pas être annulée' });
    }
    if (status === 'annulee') {
      return res.status(400).json({ message: 'Cette commande est déjà annulée' });
    }
    if (status !== 'confirme' && status !== 'relance') {
      return res.status(400).json({
        message: 'Seules les commandes confirmées ou en relance peuvent être annulées',
      });
    }

    order.commercialStatus = 'annulee';
    order.statut = 'annulee';
    await order.save();
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/orders/:id/relance', auth, isCommercialStaff, async (req, res) => {
  try {
    const scheduledDeliveryAt = parseDateInput(req.body?.scheduledDeliveryAt);
    if (!scheduledDeliveryAt) {
      return res.status(400).json({ message: 'Date et heure de livraison requises' });
    }

    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });

    order.commercialStatus = 'relance';
    order.scheduledDeliveryAt = scheduledDeliveryAt;
    order.relanceNotifiedAt = null;
    order.statut = order.statut === 'en_attente' ? 'confirmee' : order.statut;
    await order.save();
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/orders/:id/commercial-status', auth, isCommercialStaff, async (req, res) => {
  try {
    const { commercialStatus } = req.body;
    if (!COMMERCIAL_STATUSES.includes(commercialStatus)) {
      return res.status(400).json({ message: 'Statut commercial invalide' });
    }

    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });

    order.commercialStatus = commercialStatus;
    if (commercialStatus === 'livree') {
      order.statut = 'livree';
      order.deliveredAt = new Date();
    }
    if (commercialStatus === 'annulee') {
      order.statut = 'annulee';
    }
    await order.save();
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ——— Bilan ———

router.get('/bilan', auth, isCommercialStaff, async (req, res) => {
  try {
    const filter = buildBilanFilter(req.query);
    const orders = await ShopOrder.find(filter).sort({ orderDate: -1, createdAt: -1 }).lean();
    const rows = orders.map(bilanRowFromOrder);
    res.json({ bilanStartDate: BILAN_START_DATE, rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/bilan/off-platform', auth, isCommercialStaff, async (req, res) => {
  try {
    const productName = String(req.body?.productName || '').trim();
    const orderNumber = String(req.body?.orderNumber || '').trim();
    const quantity = Number(req.body?.quantity);
    const location = String(req.body?.location || '').trim();
    const amount = Number(req.body?.amount);
    const commercialStatus = req.body?.commercialStatus || 'commande';
    const orderDate = parseDateInput(req.body?.orderDate) || new Date();

    if (!productName) return res.status(400).json({ message: 'Produit requis' });
    if (!orderNumber) return res.status(400).json({ message: 'Numéro de commande requis' });
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Quantité invalide' });
    }
    if (!location) return res.status(400).json({ message: 'Lieu requis' });
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ message: 'Montant invalide' });
    }
    if (!COMMERCIAL_STATUSES.includes(commercialStatus) || commercialStatus === 'annulee') {
      return res.status(400).json({ message: 'Statut : commande, relance ou livree' });
    }

    const order = new ShopOrder({
      orderNumber,
      productName,
      slug: 'hors-plateforme',
      quantity,
      quantityUnit: 'unit',
      quantityLabel: String(quantity),
      unitPrice: amount / quantity,
      totalPrice: Math.round(amount),
      isOffPlatform: true,
      offPlatformLocation: location,
      commercialStatus,
      orderDate,
      createdByCommercial: req.user._id,
      statut: commercialStatus === 'livree' ? 'livree' : 'confirmee',
      deliveredAt: commercialStatus === 'livree' ? orderDate : undefined,
      confirmedAt: orderDate,
    });

    await order.save();
    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ——— Relances du jour ———

router.get('/relances/today', auth, isCommercialStaff, async (req, res) => {
  try {
    const { start, end } = todayRange();
    const orders = await ShopOrder.find({
      commercialStatus: 'relance',
      scheduledDeliveryAt: { $gte: start, $lte: end },
    })
      .sort({ scheduledDeliveryAt: 1 })
      .lean();

    res.json(
      orders.map((o) => ({
        ...bilanRowFromOrder(o),
        scheduledDeliveryAt: o.scheduledDeliveryAt,
      }))
    );
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/relances/:id/ack', auth, isCommercialStaff, async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });
    order.relanceNotifiedAt = new Date();
    await order.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Déclenche les notifications push pour les relances du jour (appelé par le polling). */
router.post('/relances/notify-today', auth, isCommercialStaff, async (req, res) => {
  try {
    const { start, end } = todayRange();
    const orders = await ShopOrder.find({
      commercialStatus: 'relance',
      scheduledDeliveryAt: { $gte: start, $lte: end },
      $or: [{ relanceNotifiedAt: null }, { relanceNotifiedAt: { $lt: start } }],
    }).lean();

    if (orders.length) {
      const staffIds = await getCommercialStaffIds();
      const names = orders
        .slice(0, 3)
        .map((o) => o.customer?.firstName || o.productName)
        .join(', ');
      void sendToUserIds(staffIds, {
        title: 'Rapido — Relances livraison',
        body: `${orders.length} livraison(s) à relancer aujourd'hui${names ? ` · ${names}` : ''}`,
        url: '/dashboard/commercial-relances',
        tag: `rapido-relance-${start.toISOString().slice(0, 10)}`,
      }).catch(() => {});
    }

    res.json({ count: orders.length, notified: orders.length > 0 });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
