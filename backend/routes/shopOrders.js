const express = require('express');
const User = require('../models/User');
const ShopProduct = require('../models/ShopProduct');
const ShopOrder = require('../models/ShopOrder');
const { auth, isRestaurant } = require('../middleware/auth');
const { getShopPromoState } = require('../utils/shopPromo');
const { normalizeShopQuantityUnit } = require('../utils/shopQuantityUnit');
const { formatQuantityWithUnit } = require('../utils/shopQuantityLabel');
const { sendToUserIds } = require('../services/pushNotifications');

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

  return null;
}

async function getShopStaffUserIds() {
  const staff = await User.find({
    role: { $in: ['restaurant', 'gestionnaire'] },
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

    const promoState = getShopPromoState(product);
    const quantityUnit = normalizeShopQuantityUnit(product.quantityUnit);
    const unitPrice = promoState.isPromoLive ? promoState.promoPrice : promoState.basePrice;
    const totalPrice = Math.round(unitPrice * quantity);

    const order = new ShopOrder({
      shopProduct: product._id,
      slug: product.slug,
      productName: product.name,
      quantity,
      quantityUnit,
      quantityLabel: formatQuantityWithUnit(quantity, quantityUnit),
      unitPrice,
      totalPrice,
      basePrice: promoState.basePrice,
      isPromoLive: promoState.isPromoLive,
      discountPercent: promoState.discountPercent,
      freeDelivery: promoState.freeDelivery,
      customer: {
        firstName: String(customer.firstName).trim(),
        lastName: String(customer.lastName).trim(),
        phone: String(customer.phone).trim(),
        city: String(customer.city).trim(),
        addressDescription: String(customer.addressDescription).trim(),
      },
      whatsappNumber: product.whatsappNumber || '',
      statut: 'en_attente',
    });

    await order.save();

    const staffIds = await getShopStaffUserIds();
    if (staffIds.length) {
      void sendToUserIds(staffIds, {
        title: 'Rapido Shop — Nouvelle commande',
        body: `${order.productName} · ${order.quantityLabel}`,
        url: '/dashboard/commandes',
        tag: `rapido-shop-order-${order._id}`,
      }).catch(() => {});
    }

    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Liste des commandes Shop (dashboard restaurant / gestionnaire). */
router.get('/', auth, isRestaurant, async (req, res) => {
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

router.put('/:id/statut', auth, isRestaurant, async (req, res) => {
  try {
    const { statut } = req.body;
    const valid = ['en_attente', 'confirmee', 'en_preparation', 'en_livraison', 'livree', 'annulee'];
    if (!valid.includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande non trouvée' });

    order.statut = statut;
    await order.save();

    res.json(order);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
