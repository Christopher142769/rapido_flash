/**
 * Fermeture programmée d'une fiche Shop boostée.
 * Entre closedFrom et closedUntil (exclus), la boutique affiche la page « fermée ».
 */
function getShopClosureState(product, now = new Date()) {
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

function buildShopClosureFromBody(body) {
  const raw = body?.shopClosure != null ? body.shopClosure : body;
  const closure = typeof raw === 'object' && raw !== null ? raw : {};
  const enabled = closure.enabled === true || closure.enabled === 'true';
  const closedFrom = closure.closedFrom ? new Date(closure.closedFrom) : null;
  const closedUntil = closure.closedUntil ? new Date(closure.closedUntil) : null;

  if (enabled) {
    if (!closedFrom || Number.isNaN(closedFrom.getTime())) {
      return { error: 'Indiquez l’heure de fermeture' };
    }
    if (!closedUntil || Number.isNaN(closedUntil.getTime())) {
      return { error: 'Indiquez l’heure de réouverture' };
    }
    if (closedUntil.getTime() <= closedFrom.getTime()) {
      return { error: 'La réouverture doit être après la fermeture' };
    }
  }

  return {
    value: {
      enabled,
      closedFrom: enabled && closedFrom ? closedFrom : null,
      closedUntil: enabled && closedUntil ? closedUntil : null,
      message: String(closure.message || '').trim().slice(0, 500),
    },
  };
}

module.exports = {
  getShopClosureState,
  buildShopClosureFromBody,
};
