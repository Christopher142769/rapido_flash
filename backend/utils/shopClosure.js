/**
 * Fermeture quotidienne automatique (fuseau Bénin).
 * Ex. fermeture 22:00, réouverture 08:00 → fermé chaque nuit sans reprogrammation.
 */
const SHOP_TZ = 'Africa/Porto-Novo';

function parseTimeHHmm(str) {
  const m = String(str || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return h * 60 + min;
}

function normalizeTimeHHmm(str) {
  const mins = parseTimeHHmm(str);
  if (mins == null) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getNowMinutesInTz(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const min = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + min;
}

function isInDailyClosedWindow(nowMinutes, closeMinutes, openMinutes) {
  if (closeMinutes == null || openMinutes == null) return false;
  if (closeMinutes === openMinutes) return false;
  if (closeMinutes < openMinutes) {
    return nowMinutes >= closeMinutes && nowMinutes < openMinutes;
  }
  return nowMinutes >= closeMinutes || nowMinutes < openMinutes;
}

function msUntilNextDailyTime(now, timeHHmm) {
  const targetMin = parseTimeHHmm(timeHHmm);
  if (targetMin == null) return 0;
  const nowMin = getNowMinutesInTz(now);
  let diffMin = targetMin - nowMin;
  if (diffMin <= 0) diffMin += 24 * 60;
  return diffMin * 60 * 1000;
}

function nextDailyTimeIso(now, timeHHmm) {
  const ms = msUntilNextDailyTime(now, timeHHmm);
  if (!ms) return null;
  return new Date(now.getTime() + ms).toISOString();
}

function legacyOneShotClosure(closure, now) {
  const closedFrom = closure.closedFrom ? new Date(closure.closedFrom) : null;
  const closedUntil = closure.closedUntil ? new Date(closure.closedUntil) : null;
  const t = now.getTime();
  const has =
    closure.enabled &&
    closedFrom &&
    closedUntil &&
    !Number.isNaN(closedFrom.getTime()) &&
    !Number.isNaN(closedUntil.getTime()) &&
    closedUntil.getTime() > closedFrom.getTime();
  if (!has) return null;
  const isShopClosed = t >= closedFrom.getTime() && t < closedUntil.getTime();
  return {
    isShopClosed,
    isClosurePending: t < closedFrom.getTime(),
    isClosureScheduled: true,
    closureEnabled: true,
    closureClosedFrom: closedFrom.toISOString(),
    closureClosedUntil: closedUntil.toISOString(),
    closureReopensAt: isShopClosed ? closedUntil.toISOString() : null,
    closureMessage: String(closure.message || '').trim(),
    closureRemainingMs: isShopClosed ? Math.max(0, closedUntil.getTime() - t) : 0,
    dailyCloseTime: null,
    dailyOpenTime: null,
    manualOverride: null,
  };
}

function getShopClosureState(product, now = new Date()) {
  const closure = product?.shopClosure || {};
  const message = String(closure.message || '').trim();
  const enabled = !!closure.enabled;
  const dailyCloseTime = normalizeTimeHHmm(closure.dailyCloseTime);
  const dailyOpenTime = normalizeTimeHHmm(closure.dailyOpenTime);
  const manualOverride = closure.manualOverride === 'open' || closure.manualOverride === 'closed'
    ? closure.manualOverride
    : null;

  const empty = {
    isShopClosed: false,
    isClosurePending: false,
    isClosureScheduled: false,
    closureEnabled: false,
    closureClosedFrom: null,
    closureClosedUntil: null,
    closureReopensAt: null,
    closureMessage: message,
    closureRemainingMs: 0,
    dailyCloseTime,
    dailyOpenTime,
    manualOverride,
  };

  if (!dailyCloseTime || !dailyOpenTime) {
    const legacy = legacyOneShotClosure(closure, now);
    if (legacy) return legacy;
    return empty;
  }

  const hasSchedule = enabled && dailyCloseTime && dailyOpenTime;
  if (!hasSchedule && !manualOverride) {
    return { ...empty, dailyCloseTime, dailyOpenTime };
  }

  const nowMin = getNowMinutesInTz(now);
  const closeMin = parseTimeHHmm(dailyCloseTime);
  const openMin = parseTimeHHmm(dailyOpenTime);
  const scheduleClosed = isInDailyClosedWindow(nowMin, closeMin, openMin);

  if (manualOverride === 'open') {
    const nextClose = nextDailyTimeIso(now, dailyCloseTime);
    return {
      isShopClosed: false,
      isClosurePending: false,
      isClosureScheduled: true,
      closureEnabled: enabled,
      closureClosedFrom: null,
      closureClosedUntil: null,
      closureReopensAt: scheduleClosed ? null : nextClose,
      closureMessage: message,
      closureRemainingMs: 0,
      dailyCloseTime,
      dailyOpenTime,
      manualOverride: 'open',
    };
  }

  if (manualOverride === 'closed') {
    const reopenAt = nextDailyTimeIso(now, dailyOpenTime);
    const reopenMs = reopenAt ? new Date(reopenAt).getTime() - now.getTime() : 0;
    return {
      isShopClosed: true,
      isClosurePending: false,
      isClosureScheduled: true,
      closureEnabled: enabled,
      closureClosedFrom: null,
      closureClosedUntil: reopenAt,
      closureReopensAt: reopenAt,
      closureMessage: message,
      closureRemainingMs: Math.max(0, reopenMs),
      dailyCloseTime,
      dailyOpenTime,
      manualOverride: 'closed',
    };
  }

  if (!enabled) {
    return { ...empty, dailyCloseTime, dailyOpenTime };
  }

  const reopenAt = scheduleClosed ? nextDailyTimeIso(now, dailyOpenTime) : null;
  const reopenMs = reopenAt ? new Date(reopenAt).getTime() - now.getTime() : 0;
  const nextClose = scheduleClosed ? null : nextDailyTimeIso(now, dailyCloseTime);

  return {
    isShopClosed: scheduleClosed,
    isClosurePending: !scheduleClosed && !!nextClose,
    isClosureScheduled: true,
    closureEnabled: true,
    closureClosedFrom: null,
    closureClosedUntil: reopenAt,
    closureReopensAt: reopenAt,
    closureMessage: message,
    closureRemainingMs: scheduleClosed ? Math.max(0, reopenMs) : 0,
    dailyCloseTime,
    dailyOpenTime,
    manualOverride: null,
  };
}

function buildShopClosureFromBody(body) {
  const raw = body?.shopClosure != null ? body.shopClosure : body;
  const closure = typeof raw === 'object' && raw !== null ? raw : {};
  const enabled = closure.enabled === true || closure.enabled === 'true';
  const dailyCloseTime = normalizeTimeHHmm(closure.dailyCloseTime);
  const dailyOpenTime = normalizeTimeHHmm(closure.dailyOpenTime);
  const manualOverride =
    closure.manualOverride === 'open' || closure.manualOverride === 'closed'
      ? closure.manualOverride
      : null;

  if (enabled) {
    if (!dailyCloseTime) {
      return { error: 'Indiquez l’heure de fermeture quotidienne (ex. 22:00)' };
    }
    if (!dailyOpenTime) {
      return { error: 'Indiquez l’heure de réouverture quotidienne (ex. 08:00)' };
    }
    if (dailyCloseTime === dailyOpenTime) {
      return { error: 'Les horaires de fermeture et d’ouverture doivent être différents' };
    }
  }

  return {
    value: {
      enabled,
      dailyCloseTime: enabled ? dailyCloseTime : dailyCloseTime || '',
      dailyOpenTime: enabled ? dailyOpenTime : dailyOpenTime || '',
      message: String(closure.message || '').trim().slice(0, 500),
      manualOverride: manualOverride || null,
      closedFrom: null,
      closedUntil: null,
    },
  };
}

module.exports = {
  SHOP_TZ,
  parseTimeHHmm,
  normalizeTimeHHmm,
  getNowMinutesInTz,
  isInDailyClosedWindow,
  msUntilNextDailyTime,
  nextDailyTimeIso,
  getShopClosureState,
  buildShopClosureFromBody,
};
