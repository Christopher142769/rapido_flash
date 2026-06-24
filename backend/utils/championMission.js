const DeliveryMission = require('../models/DeliveryMission');
const Champion = require('../models/Champion');
const User = require('../models/User');
const { notifyChampionsNewMission, notifyClientDeliveryCode } = require('../services/championMailer');
const { sendToUserId } = require('../services/pushNotifications');
const { geocodeAddress, haversineKm } = require('./geocodeBenin');
const { normalizeBeninPhoneDigits } = require('./phoneDigits');

const CHAMPION_ZONES = ['Cotonou', 'Calavi', 'Porto-Novo'];

function generateDeliveryCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function inferWorkZoneFromCity(city) {
  const c = String(city || '').toLowerCase();
  if (c.includes('calavi') || c.includes('abomey')) return 'Calavi';
  if (c.includes('porto')) return 'Porto-Novo';
  return 'Cotonou';
}

function formatBeninPhoneDisplay(digits) {
  const d = String(digits || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('229')) {
    return `+229 ${d.slice(3)}`;
  }
  return d ? `+${d}` : '';
}

function frontendBaseUrl() {
  return (
    process.env.FRONTEND_URL_1 ||
    process.env.FRONTEND_URL ||
    'https://rapido.bj'
  ).replace(/\/$/, '');
}

async function resolveClientEmail(order) {
  const fromOrder = String(order.customer?.email || '').trim().toLowerCase();
  if (fromOrder && fromOrder.includes('@')) return fromOrder;

  const phone = normalizeBeninPhoneDigits(order.customer?.phone);
  if (phone) {
    const tail = phone.slice(-8);
    const user = await User.findOne({
      $or: [{ telephone: phone }, { telephone: new RegExp(`${tail}$`) }],
      email: { $exists: true, $ne: '' },
    })
      .select('email')
      .lean();
    if (user?.email) return String(user.email).toLowerCase().trim();
  }
  return '';
}

async function createMissionFromShopOrder(order) {
  const existing = await DeliveryMission.findOne({
    shopOrderId: order._id,
    status: { $nin: ['cancelled', 'delivered'] },
  });
  if (existing) return existing;

  const zone = inferWorkZoneFromCity(order.customer?.city);
  const earnings = order.freeDelivery ? 500 : Math.max(Number(order.deliveryFee) || 0, 500);
  const clientName = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ').trim();
  const deliveryAddress = [order.customer?.city, order.customer?.addressDescription].filter(Boolean).join(' — ');
  const deliveryCode = generateDeliveryCode();
  const clientEmail = await resolveClientEmail(order);

  const pickupCoords = await geocodeAddress(`${zone} Rapido`, zone, 1);
  const deliveryCoords = await geocodeAddress(
    `${deliveryAddress}, ${zone}`,
    zone,
    2
  );

  const distanceKm = haversineKm(
    pickupCoords.latitude,
    pickupCoords.longitude,
    deliveryCoords.latitude,
    deliveryCoords.longitude
  );
  const estimatedMinutes = Math.max(15, Math.round(distanceKm * 4 + 10));

  const mission = await DeliveryMission.create({
    sourceType: 'shop',
    shopOrderId: order._id,
    status: 'available',
    workZone: zone,
    pickupLabel: order.productName || 'Boutique Rapido',
    pickupAddress: `Zone ${zone} — point de retrait à confirmer`,
    pickupPhone: order.whatsappNumber || '',
    pickupLat: pickupCoords.latitude,
    pickupLng: pickupCoords.longitude,
    deliveryLabel: clientName || 'Client',
    deliveryAddress,
    deliveryPhone: order.customer?.phone || '',
    deliveryLat: deliveryCoords.latitude,
    deliveryLng: deliveryCoords.longitude,
    clientEmail,
    clientName,
    productSummary: `${order.productName} × ${order.quantityLabel || order.quantity}`,
    earnings,
    orderTotal: Number(order.totalPrice) || 0,
    paymentMode: 'cash_on_delivery',
    distanceKm: Math.round(distanceKm * 10) / 10,
    estimatedMinutes,
    deliveryCode,
  });

  if (clientEmail) {
    const reviewUrl = `${frontendBaseUrl()}/champion/avis/${mission._id}`;
    try {
      await notifyClientDeliveryCode({
        email: clientEmail,
        clientName,
        deliveryCode,
        productSummary: mission.productSummary,
        deliveryAddress,
        reviewUrl,
      });
      mission.deliveryCodeEmailSentAt = new Date();
      await mission.save();
    } catch (err) {
      console.error('Email code livraison:', err.message);
    }
  }

  const champions = await Champion.find({
    accountStatus: 'active',
    emailVerified: true,
    workZone: zone,
    email: { $ne: '' },
  }).select('email userId');

  await notifyChampionsNewMission(champions, mission);

  for (const ch of champions) {
    if (ch.userId) {
      try {
        await sendToUserId(ch.userId, {
          title: 'Nouvelle course disponible',
          body: `${zone} — gain CFA ${earnings.toLocaleString('fr-FR')}`,
          url: '/champion/app',
        });
      } catch (_) {
        /* push optionnel */
      }
    }
  }

  return mission;
}

module.exports = {
  CHAMPION_ZONES,
  generateDeliveryCode,
  inferWorkZoneFromCity,
  formatBeninPhoneDisplay,
  resolveClientEmail,
  createMissionFromShopOrder,
};
