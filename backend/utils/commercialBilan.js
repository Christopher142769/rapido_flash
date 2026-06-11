/** Date de début du bilan commercial (09/06/2026). */
const BILAN_START_DATE = new Date('2026-06-09T00:00:00.000+01:00');

function bilanBaseQuery(extra = {}) {
  return {
    createdAt: { $gte: BILAN_START_DATE },
    commercialStatus: { $ne: 'annulee' },
    ...extra,
  };
}

const SHOP_ORDER_TZ = 'Africa/Porto-Novo';

function parseDateInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeDateKey(value) {
  if (!value) return null;
  const s = String(value).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Date métier d’une commande Shop (jour de la commande, jamais le jour de confirmation). */
function effectiveShopOrderDate(order) {
  if (!order) return null;
  const raw = order.orderDate || order.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Clé YYYY-MM-DD du jour de commande (fuseau Bénin). */
function orderDateKey(order) {
  const d = effectiveShopOrderDate(order);
  if (!d) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_ORDER_TZ }).format(d);
}

function isOrderInPeriod(order, dateFrom, dateTo) {
  const key = orderDateKey(order);
  if (!key) return false;
  const fromKey = normalizeDateKey(dateFrom);
  const toKey = normalizeDateKey(dateTo);
  if (fromKey && key < fromKey) return false;
  if (toKey && key > toKey) return false;
  return true;
}

/** Clé YYYY-MM-DD du jour de confirmation (fuseau Bénin). */
function confirmedDateKey(order) {
  if (!order?.confirmedAt) return null;
  const d = new Date(order.confirmedAt);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_ORDER_TZ }).format(d);
}

/** Points : filtre sur la date de confirmation (confirmedAt). */
function isOrderConfirmedInPeriod(order, dateFrom, dateTo) {
  const key = confirmedDateKey(order);
  if (!key) return false;
  const fromKey = normalizeDateKey(dateFrom);
  const toKey = normalizeDateKey(dateTo);
  if (fromKey && key < fromKey) return false;
  if (toKey && key > toKey) return false;
  return true;
}

/**
 * Filtre MongoDB sur le jour de commande (orderDate ou createdAt), fuseau Africa/Porto-Novo.
 * Compare des chaînes YYYY-MM-DD — évite les décalages UTC.
 */
function buildPeriodFilter(dateFrom, dateTo) {
  const fromKey = normalizeDateKey(dateFrom);
  const toKey = normalizeDateKey(dateTo);
  if (!fromKey && !toKey) return null;

  const dayStr = {
    $dateToString: {
      format: '%Y-%m-%d',
      date: { $ifNull: ['$orderDate', '$createdAt'] },
      timezone: SHOP_ORDER_TZ,
    },
  };

  const exprClauses = [];
  if (fromKey) exprClauses.push({ $gte: [dayStr, fromKey] });
  if (toKey) exprClauses.push({ $lte: [dayStr, toKey] });

  return { $expr: { $and: exprClauses } };
}

function buildPointsStatusFilter() {
  return {
    $or: [
      { commercialStatus: 'confirme' },
      {
        commercialStatus: 'commande',
        confirmedAt: { $ne: null },
        statut: { $in: ['confirmee', 'en_preparation', 'en_livraison'] },
        $or: [{ scheduledDeliveryAt: null }, { scheduledDeliveryAt: { $exists: false } }],
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
  if (s === 'livree' || order.statut === 'livree') return 'livree';
  if (s === 'annulee' || order.statut === 'annulee') return 'annulee';
  if (
    s === 'confirme' ||
    order.confirmedAt ||
    order.statut === 'confirmee' ||
    order.statut === 'en_preparation' ||
    order.statut === 'en_livraison'
  ) {
    return 'confirme';
  }
  if (s === 'relance' || order.scheduledDeliveryAt) return 'relance';
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
  const orderDay = effectiveShopOrderDate(order);
  return {
    ...base,
    date: order.confirmedAt || orderDay || base.date,
    orderDate: orderDay || order.createdAt,
    confirmedAt: order.confirmedAt || null,
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
    date: effectiveShopOrderDate(order) || order.createdAt,
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
  effectiveShopOrderDate,
  orderDateKey,
  isOrderInPeriod,
  confirmedDateKey,
  isOrderConfirmedInPeriod,
  normalizeDateKey,
  buildPointsStatusFilter,
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
