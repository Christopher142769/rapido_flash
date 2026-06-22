const ShopOrder = require('../models/ShopOrder');
const { buildPeriodFilter } = require('./commercialBilan');
const { getShopClosureState, nextDailyTimeIso } = require('./shopClosure');

const SHOP_ORDER_TZ = 'Africa/Porto-Novo';

function beninDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_ORDER_TZ }).format(date);
}

async function countTodayOrdersForProduct(shopProductId) {
  if (!shopProductId) return 0;
  const today = beninDateKey();
  const periodFilter = buildPeriodFilter(today, today);
  const filter = {
    shopProduct: shopProductId,
    isOffPlatform: { $ne: true },
    statut: { $ne: 'annulee' },
    commercialStatus: { $ne: 'annulee' },
  };
  if (periodFilter) Object.assign(filter, periodFilter);
  return ShopOrder.countDocuments(filter);
}

function getShopOrderLimitConfig(product) {
  const limit = product?.dailyOrderLimit || {};
  const enabled = !!limit.enabled;
  const maxOrders = Math.max(0, Math.floor(Number(limit.maxOrders || 0)));
  return {
    enabled: enabled && maxOrders > 0,
    maxOrders: enabled ? maxOrders : 0,
  };
}

function getShopOrderLimitState(product, ordersToday) {
  const { enabled, maxOrders } = getShopOrderLimitConfig(product);
  const orders = Math.max(0, Math.floor(Number(ordersToday || 0)));

  if (!enabled) {
    return {
      dailyOrderLimitEnabled: false,
      dailyOrderLimitMax: 0,
      ordersToday: orders,
      ordersRemaining: 0,
      isOrderLimitReached: false,
      orderLimitProgressPct: 0,
    };
  }

  const remaining = Math.max(0, maxOrders - orders);
  const reached = orders >= maxOrders;
  const progressPct = Math.min(100, Math.round((orders / maxOrders) * 100));

  return {
    dailyOrderLimitEnabled: true,
    dailyOrderLimitMax: maxOrders,
    ordersToday: orders,
    ordersRemaining: remaining,
    isOrderLimitReached: reached,
    orderLimitProgressPct: progressPct,
  };
}

function mergeClosureWithOrderLimit(closureState, limitState, now = new Date()) {
  if (closureState.manualOverride === 'open') {
    return {
      ...closureState,
      ...limitState,
      closureReason: null,
    };
  }

  if (limitState.isOrderLimitReached && !closureState.isShopClosed) {
    const reopenAt = closureState.dailyOpenTime
      ? nextDailyTimeIso(now, closureState.dailyOpenTime)
      : null;
    const reopenMs = reopenAt ? new Date(reopenAt).getTime() - now.getTime() : 0;
    const defaultMessage = `Le quota de ${limitState.dailyOrderLimitMax} commandes pour aujourd’hui est atteint. La boutique rouvrira demain à l’heure habituelle.`;

    return {
      ...closureState,
      ...limitState,
      isShopClosed: true,
      closureReason: 'orderLimit',
      closureReopensAt: reopenAt,
      closureRemainingMs: Math.max(0, reopenMs),
      closureMessage: closureState.closureMessage || defaultMessage,
    };
  }

  return {
    ...closureState,
    ...limitState,
    closureReason: closureState.isShopClosed
      ? closureState.closureReason || 'schedule'
      : null,
  };
}

async function getShopAvailabilityState(product, now = new Date()) {
  const closureState = getShopClosureState(product, now);
  const limitConfig = getShopOrderLimitConfig(product);
  let ordersToday = 0;
  const productId = product?._id || product?.id;
  if (limitConfig.enabled && productId) {
    ordersToday = await countTodayOrdersForProduct(productId);
  }
  const limitState = getShopOrderLimitState(product, ordersToday);
  return mergeClosureWithOrderLimit(closureState, limitState, now);
}

function buildDailyOrderLimitFromBody(body) {
  const raw = body?.dailyOrderLimit != null ? body.dailyOrderLimit : body;
  const limit = typeof raw === 'object' && raw !== null ? raw : {};
  const enabled = limit.enabled === true || limit.enabled === 'true';
  const maxOrders = Math.max(0, Math.floor(Number(limit.maxOrders || 0)));

  if (enabled && maxOrders <= 0) {
    return { error: 'Indiquez un nombre de commandes journalier supérieur à 0' };
  }

  return {
    value: {
      enabled,
      maxOrders: enabled ? maxOrders : Math.max(0, maxOrders),
    },
  };
}

module.exports = {
  beninDateKey,
  countTodayOrdersForProduct,
  getShopOrderLimitConfig,
  getShopOrderLimitState,
  mergeClosureWithOrderLimit,
  getShopAvailabilityState,
  buildDailyOrderLimitFromBody,
};
