/** Fermeture programée — aligné sur backend/utils/shopClosure.js */

export function getShopClosureState(product, now = new Date()) {
  const closure = product?.shopClosure || {};
  const enabled = !!closure.enabled;
  const closedFrom = closure.closedFrom ? new Date(closure.closedFrom) : null;
  const closedUntil = closure.closedUntil ? new Date(closure.closedUntil) : null;
  const t = now.getTime();

  const hasSchedule =
    enabled &&
    closedFrom &&
    closedUntil &&
    !Number.isNaN(closedFrom.getTime()) &&
    !Number.isNaN(closedUntil.getTime()) &&
    closedUntil.getTime() > closedFrom.getTime();

  if (!hasSchedule) {
    return {
      isShopClosed: false,
      isClosurePending: false,
      isClosureScheduled: false,
      closureEnabled: false,
      closureClosedFrom: null,
      closureClosedUntil: null,
      closureReopensAt: null,
      closureMessage: String(closure.message || '').trim(),
      closureRemainingMs: 0,
    };
  }

  const fromMs = closedFrom.getTime();
  const untilMs = closedUntil.getTime();
  const isShopClosed = t >= fromMs && t < untilMs;
  const isClosurePending = t < fromMs;
  const isClosureScheduled = isShopClosed || isClosurePending;
  const closureRemainingMs = isShopClosed ? Math.max(0, untilMs - t) : 0;

  return {
    isShopClosed,
    isClosurePending,
    isClosureScheduled,
    closureEnabled: true,
    closureClosedFrom: closedFrom.toISOString(),
    closureClosedUntil: closedUntil.toISOString(),
    closureReopensAt: isShopClosed ? closedUntil.toISOString() : null,
    closureMessage: String(closure.message || '').trim(),
    closureRemainingMs,
  };
}

export function closurePayloadFromForm(shopClosure) {
  const c = shopClosure || {};
  return {
    enabled: !!c.enabled,
    closedFrom: c.closedFrom ? new Date(c.closedFrom).toISOString() : null,
    closedUntil: c.closedUntil ? new Date(c.closedUntil).toISOString() : null,
    message: String(c.message || '').trim().slice(0, 500),
  };
}

export function formatClosureDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
