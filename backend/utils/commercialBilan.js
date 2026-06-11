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

/** Points : uniquement le statut commercial « confirmé » (pas relance, pas livré). */
function pointsConfirmedOnlyQuery(extra = {}) {
  return {
    createdAt: { $gte: BILAN_START_DATE },
    $or: [
      { commercialStatus: 'confirme' },
      {
        commercialStatus: 'commande',
        confirmedAt: { $ne: null },
        statut: { $in: ['confirmee', 'en_preparation', 'en_livraison'] },
        $or: [{ scheduledDeliveryAt: null }, { scheduledDeliveryAt: { $exists: false } }],
      },
    ],
    ...extra,
  };
}

function orderLocation(order) {
  if (order.isOffPlatform) return order.offPlatformLocation || '—';
  const c = order.customer || {};
  return [c.city, c.addressDescription].filter(Boolean).join(' — ') || '—';
}

function resolveCommercialStatus(order) {
  const s = order.commercialStatus;
  if (s === 'confirme' || s === 'relance' || s === 'livree' || s === 'annulee') return s;
  if (order.statut === 'livree') return 'livree';
  if (order.scheduledDeliveryAt) return 'relance';
  if (
    order.confirmedAt ||
    order.statut === 'confirmee' ||
    order.statut === 'en_preparation' ||
    order.statut === 'en_livraison'
  ) {
    return 'confirme';
  }
  return s || 'commande';
}

function inferOrderCity(order) {
  const c = order.customer || {};
  if (!order.isOffPlatform && c.city) return c.city;
  const blob = `${order.offPlatformLocation || ''} ${c.addressDescription || ''}`;
  if (/calavi/i.test(blob)) return 'Calavi';
  if (/cotonou/i.test(blob)) return 'Cotonou';
  if (c.city) return c.city;
  return order.isOffPlatform ? 'Autre' : '—';
}

function groupPointsByCity(rows, quantityUnit) {
  const map = new Map();
  for (const row of rows) {
    const city = row.city && row.city !== '—' ? row.city : 'Autre';
    if (!map.has(city)) {
      map.set(city, { city, orders: [], totalQuantity: 0, orderCount: 0, totalAmount: 0 });
    }
    const g = map.get(city);
    g.orders.push(row);
    g.totalQuantity += Number(row.quantity || 0);
    g.orderCount += 1;
    g.totalAmount += Number(row.amount || 0);
  }
  const order = ['Cotonou', 'Calavi', 'Autre'];
  return [...map.values()].sort(
    (a, b) => order.indexOf(a.city) - order.indexOf(b.city) || a.city.localeCompare(b.city, 'fr')
  );
}

function pointsOrderDetail(order) {
  const base = bilanRowFromOrder(order);
  const c = order.customer || {};
  const city = inferOrderCity(order);
  return {
    ...base,
    firstName: order.isOffPlatform ? '—' : c.firstName || '—',
    lastName: order.isOffPlatform ? '—' : c.lastName || '—',
    phone: c.phone || '—',
    city,
    address: order.isOffPlatform ? order.offPlatformLocation || '—' : c.addressDescription || '—',
    location: orderLocation(order),
    requestedDeliveryAt: order.requestedDeliveryAt || null,
    scheduledDeliveryAt: order.scheduledDeliveryAt || null,
    commercialStatus: resolveCommercialStatus(order),
    statutLabel: order.statut,
    clientSpecifications: String(order.clientSpecifications || '').trim(),
  };
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
  pointsConfirmedOnlyQuery,
  CONFIRMED_STATUTS,
  orderLocation,
  bilanRowFromOrder,
  pointsOrderDetail,
  inferOrderCity,
  groupPointsByCity,
  resolveCommercialStatus,
};
