const ShopOrder = require('../models/ShopOrder');
const { normalizeBeninPhoneDigits } = require('../utils/phoneDigits');
const { notifyShopOrderClientWhatsApp } = require('./customerOrderWhatsApp');

const CONFIRMATION_DELAY_MS = Number(process.env.WHATSAPP_SHOP_CONFIRM_DELAY_MS) || 22000;
const pendingSchedules = new Map();

function phonesMatch(a, b) {
  const da = normalizeBeninPhoneDigits(a);
  const db = normalizeBeninPhoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  return da.slice(-8) === db.slice(-8);
}

function isShopOrderTrackingMessage(text) {
  const t = String(text || '').toLowerCase();
  return (
    t.includes('shop express') ||
    t.includes('passer commande') ||
    t.includes('confirmer ma commande') ||
    t.includes('réf. commande') ||
    t.includes('ref. commande')
  );
}

async function findShopOrderForWhatsAppReply(phoneDigits, textBody) {
  if (!isShopOrderTrackingMessage(textBody)) return null;

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const orders = await ShopOrder.find({
    createdAt: { $gte: since },
    $or: [{ whatsappConfirmationSentAt: { $exists: false } }, { whatsappConfirmationSentAt: null }],
    isOffPlatform: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const text = String(textBody || '');
  const refMatch = text.match(/(?:réf\.?\s*commande|réf\.?)\s*:\s*([A-Za-z0-9-]+)/i);

  if (refMatch) {
    const ref = refMatch[1].trim();
    const byRef = orders.find(
      (o) =>
        phonesMatch(o.customer?.phone, phoneDigits) &&
        (o.orderNumber === ref || String(o._id).slice(-8).toUpperCase() === ref.toUpperCase())
    );
    if (byRef) return byRef;
  }

  return orders.find((o) => phonesMatch(o.customer?.phone, phoneDigits)) || null;
}

function cancelScheduledConfirmation(orderId) {
  const key = String(orderId);
  const timeoutId = pendingSchedules.get(key);
  if (timeoutId) {
    clearTimeout(timeoutId);
    pendingSchedules.delete(key);
  }
}

async function markConfirmationSent(orderId) {
  cancelScheduledConfirmation(orderId);
  await ShopOrder.findByIdAndUpdate(orderId, { whatsappConfirmationSentAt: new Date() });
}

async function sendShopOrderWhatsAppConfirmation(order) {
  if (!order || order.whatsappConfirmationSentAt) {
    return { sent: false, reason: 'already_sent_or_missing' };
  }

  const result = await notifyShopOrderClientWhatsApp(order);
  if (result.sent) {
    await markConfirmationSent(order._id);
  }
  return result;
}

function scheduleShopOrderWhatsAppConfirmation(orderId) {
  const key = String(orderId);
  if (pendingSchedules.has(key)) return;

  const timeoutId = setTimeout(async () => {
    pendingSchedules.delete(key);
    try {
      const order = await ShopOrder.findById(orderId).lean();
      if (!order || order.whatsappConfirmationSentAt) return;
      await sendShopOrderWhatsAppConfirmation(order);
    } catch (err) {
      console.error('[WhatsApp Shop confirmation]', err.message);
    }
  }, CONFIRMATION_DELAY_MS);

  pendingSchedules.set(key, timeoutId);
}

async function handleIncomingShopWhatsAppMessage(fromDigits, textBody) {
  const order = await findShopOrderForWhatsAppReply(fromDigits, textBody);
  if (!order) return { handled: false, reason: 'no_matching_order' };

  cancelScheduledConfirmation(order._id);
  const result = await sendShopOrderWhatsAppConfirmation(order);
  return { handled: true, orderId: String(order._id), ...result };
}

module.exports = {
  isShopOrderTrackingMessage,
  findShopOrderForWhatsAppReply,
  sendShopOrderWhatsAppConfirmation,
  scheduleShopOrderWhatsAppConfirmation,
  handleIncomingShopWhatsAppMessage,
  cancelScheduledConfirmation,
  CONFIRMATION_DELAY_MS,
};
