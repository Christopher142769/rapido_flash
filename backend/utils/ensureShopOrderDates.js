const ShopOrder = require('../models/ShopOrder');

const SHOP_ORDER_TZ = 'Africa/Porto-Novo';

function dateKey(d) {
  if (!d) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_ORDER_TZ }).format(new Date(d));
}

function sameCalendarDay(a, b) {
  if (!a || !b) return false;
  return dateKey(a) === dateKey(b);
}

/**
 * Corrige les dates de commande en base :
 * - orderDate manquant → createdAt
 * - orderDate calé sur le jour de confirmation alors que la commande est plus ancienne → createdAt
 */
async function ensureShopOrderDates() {
  try {
    const missing = await ShopOrder.updateMany(
      { $or: [{ orderDate: null }, { orderDate: { $exists: false } }] },
      [{ $set: { orderDate: '$createdAt' } }]
    );
    if (missing.modifiedCount > 0) {
      console.log(`✅ ShopOrder: orderDate renseigné pour ${missing.modifiedCount} commande(s)`);
    }

    const suspects = await ShopOrder.find({
      confirmedAt: { $ne: null },
      orderDate: { $ne: null },
      createdAt: { $ne: null },
    })
      .select('_id createdAt orderDate confirmedAt')
      .lean();

    let fixed = 0;
    for (const o of suspects) {
      const created = new Date(o.createdAt);
      const orderD = new Date(o.orderDate);
      const confirmed = new Date(o.confirmedAt);
      if (Number.isNaN(created.getTime()) || Number.isNaN(orderD.getTime())) continue;

      const createdKey = dateKey(created);
      const orderKey = dateKey(orderD);
      const confirmedKey = dateKey(confirmed);

      if (
        createdKey &&
        orderKey &&
        confirmedKey &&
        orderKey !== createdKey &&
        orderKey === confirmedKey
      ) {
        await ShopOrder.updateOne({ _id: o._id }, { $set: { orderDate: created } });
        fixed += 1;
      }
    }

    if (fixed > 0) {
      console.log(`✅ ShopOrder: date de commande corrigée pour ${fixed} commande(s) (hors jour de confirmation)`);
    }
  } catch (e) {
    console.error('ensureShopOrderDates:', e.message);
  }
}

module.exports = ensureShopOrderDates;
