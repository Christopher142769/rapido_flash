/** Urgence / compteur catalogue Shop Repas — isolé de Shop Express. */
import {
  resolveStableCountdownEndsAt,
  DEFAULT_COUNTDOWN_HOURS,
  formatCountdown,
  getShopPromoState,
} from './shopPromo';

export const DEFAULT_MEAL_COUNTDOWN_HOURS = 48;

/**
 * Compteur de la page /repas uniquement (MealShopSettings.urgency).
 * Ne lit jamais les promos Shop Express.
 */
export function getMealCatalogueUrgency(settings, now = new Date()) {
  const u = settings?.urgency || {};
  const enabled = !!u.enabled && !!u.active;
  if (!enabled) {
    return {
      isLive: false,
      endsAt: null,
      endsAtIso: null,
      expectedOrders: 0,
      ordersToday: Number(settings?.ordersToday) || 0,
      remainingOrders: 0,
      label: '',
      timeRemainingMs: 0,
      runUntilStopped: false,
    };
  }

  const endsAtRaw = u.endsAt ? new Date(u.endsAt) : null;
  const startsAt = u.startsAt ? new Date(u.startsAt) : null;
  const runUntilStopped = u.runUntilStopped !== false;
  const durationHours = Number(u.durationHours) || DEFAULT_MEAL_COUNTDOWN_HOURS;
  const t = now.getTime();

  let isLive = true;
  if (startsAt && t < startsAt.getTime()) isLive = false;
  if (endsAtRaw && t > endsAtRaw.getTime() && !runUntilStopped) isLive = false;

  const countdownEndsAt = isLive
    ? resolveStableCountdownEndsAt({
        endsAt: endsAtRaw,
        startsAt,
        anchorAt: settings?.updatedAt || settings?.createdAt || null,
        nowMs: t,
        durationHours,
        allowRolling: runUntilStopped,
      })
    : endsAtRaw;

  const expectedOrders = Math.max(0, Math.round(Number(u.expectedOrders) || 0));
  const ordersToday = Math.max(0, Math.round(Number(settings?.ordersToday) || 0));
  const remainingOrders = expectedOrders > 0 ? Math.max(0, expectedOrders - ordersToday) : 0;

  return {
    isLive,
    endsAt: countdownEndsAt,
    endsAtIso: countdownEndsAt ? countdownEndsAt.toISOString() : null,
    expectedOrders,
    ordersToday,
    remainingOrders,
    label: String(u.label || 'Offre limitée — commandez vite').trim(),
    timeRemainingMs: countdownEndsAt ? Math.max(0, countdownEndsAt.getTime() - t) : 0,
    runUntilStopped,
    durationHours,
  };
}

export function mealUrgencyPayloadFromForm(urgency) {
  const u = urgency || {};
  return {
    enabled: !!u.enabled,
    active: !!u.active,
    label: String(u.label || '').trim(),
    expectedOrders: Math.max(0, Math.round(Number(u.expectedOrders) || 0)),
    durationHours: Math.min(720, Math.max(1, Number(u.durationHours) || DEFAULT_MEAL_COUNTDOWN_HOURS)),
    runUntilStopped: u.runUntilStopped !== false,
    startsAt: u.startsAt ? new Date(u.startsAt) : null,
    endsAt: u.endsAt ? new Date(u.endsAt) : null,
  };
}

/** Promo / compteur fiche plat — ancré sur le MealProduct uniquement (pas Shop Express). */
export function getMealProductPromoState(product, now = new Date()) {
  if (!product) return null;
  const promo = {
    ...(product.promo || {}),
    boostHours: Number(product.promo?.boostHours) || DEFAULT_MEAL_COUNTDOWN_HOURS,
  };
  return getShopPromoState({ ...product, promo }, now);
}

export { formatCountdown, DEFAULT_COUNTDOWN_HOURS };
