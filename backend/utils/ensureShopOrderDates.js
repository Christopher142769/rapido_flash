const ShopOrder = require('../models/ShopOrder');

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameCalendarDay(a, b) {
  if (!a || !b) return false;
  return startOfDay(a).getTime() === startOfDay(b).getTime();
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

      const orderAfterCreation = orderD.getTime() > created.getTime() + 60_000;
      const orderOnConfirmDay = sameCalendarDay(orderD, confirmed);
      const createdOnOtherDay = !sameCalendarDay(created, orderD);

      if (orderAfterCreation && orderOnConfirmDay && createdOnOtherDay) {
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
