/** Date de début du bilan commercial (09/06/2026). */
const BILAN_START_DATE = new Date('2026-06-09T00:00:00.000+01:00');

function bilanBaseQuery(extra = {}) {
  return {
    createdAt: { $gte: BILAN_START_DATE },
    commercialStatus: { $ne: 'annulee' },
    ...extra,
  };
}

function parseDateInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Filtre MongoDB sur orderDate (ou createdAt si orderDate absent). */
function buildPeriodFilter(dateFrom, dateTo) {
  const from = parseDateInput(dateFrom);
  const to = parseDateInput(dateTo);
  if (!from && !to) return null;

  const range = {};
  if (from) range.$gte = from;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }

  return {
    $or: [
      { orderDate: range },
      {
        $and: [
          { $or: [{ orderDate: null }, { orderDate: { $exists: false } }] },
          { createdAt: range },
        ],
      },
    ],
  };
}

/** Commandes confirmées (hors en attente / annulées). */
const CONFIRMED_STATUTS = ['confirmee', 'en_preparation', 'en_livraison', 'livree'];

function confirmedOrdersQuery(extra = {}) {
  return {
    ...bilanBaseQuery(),
    statut: { $in: CONFIRMED_STATUTS },
    ...extra,
  };
}

function orderLocation(order) {
  if (order.isOffPlatform) return order.offPlatformLocation || '—';
  const c = order.customer || {};
  return [c.city, c.addressDescription].filter(Boolean).join(' — ') || '—';
}

function resolveCommercialStatus(order) {
  if (order.commercialStatus) return order.commercialStatus;
  if (order.statut === 'livree') return 'livree';
  if (order.scheduledDeliveryAt) return 'relance';
  return 'commande';
}

function bilanRowFromOrder(order) {
  return {
    id: String(order._id),
    date: order.orderDate || order.createdAt,
    productName: order.productName,
    quantity: order.quantity,
    quantityLabel: order.quantityLabel || String(order.quantity),
    orderNumber: order.orderNumber || '—',
    location: orderLocation(order),
    commercialStatus: resolveCommercialStatus(order),
    amount: Number(order.totalPrice || 0),
    isOffPlatform: !!order.isOffPlatform,
    scheduledDeliveryAt: order.scheduledDeliveryAt || null,
    customerName: order.isOffPlatform
      ? 'Hors plateforme'
      : [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' '),
    customerPhone: order.customer?.phone || '',
    statut: order.statut,
    confirmedAt: order.confirmedAt,
    deliveredAt: order.deliveredAt,
  };
}

module.exports = {
  BILAN_START_DATE,
  bilanBaseQuery,
  buildPeriodFilter,
  confirmedOrdersQuery,
  CONFIRMED_STATUTS,
  orderLocation,
  bilanRowFromOrder,
  resolveCommercialStatus,
};
