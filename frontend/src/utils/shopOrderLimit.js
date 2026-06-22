import { getShopClosureState, nextDailyTimeIso } from './shopClosure';

export function getShopOrderLimitConfig(product) {
  const limit = product?.dailyOrderLimit || {};
  const enabled = !!limit.enabled;
  const maxOrders = Math.max(0, Math.floor(Number(limit.maxOrders || 0)));
  return {
    enabled: enabled && maxOrders > 0,
    maxOrders: enabled ? maxOrders : 0,
  };
}

export function getShopOrderLimitState(product, ordersToday) {
  const { enabled, maxOrders } = getShopOrderLimitConfig(product);
  const orders = Math.max(0, Math.floor(Number(ordersToday ?? product?.ordersToday ?? 0)));

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

export function mergeClosureWithOrderLimit(closureState, limitState, now = new Date()) {
  if (closureState.manualOverride === 'open') {
    return { ...closureState, ...limitState, closureReason: null };
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
    closureReason: closureState.isShopClosed ? closureState.closureReason || 'schedule' : null,
  };
}

export function getShopAvailabilityState(product, now = new Date()) {
  if (!product) return null;
  const closureState = getShopClosureState(product, now);
  const limitState = getShopOrderLimitState(product);
  return mergeClosureWithOrderLimit(closureState, limitState, now);
}

export function dailyOrderLimitPayloadFromForm(dailyOrderLimit) {
  const d = dailyOrderLimit || {};
  const enabled = !!d.enabled;
  const maxOrders = Math.max(0, Math.floor(Number(d.maxOrders || 0)));
  return { enabled, maxOrders: enabled ? maxOrders : maxOrders };
}
