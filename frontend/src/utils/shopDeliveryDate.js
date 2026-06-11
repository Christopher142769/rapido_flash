const SHOP_ORDER_TZ = 'Africa/Porto-Novo';

function beninDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_ORDER_TZ }).format(date);
}

function parseDateKey(dateKey) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function addDaysToDateKey(dateKey, days) {
  const dt = parseDateKey(dateKey);
  dt.setUTCDate(dt.getUTCDate() + days);
  return beninDateKey(dt);
}

/** Lendemain (fuseau Bénin) — ex. commande lundi → livraison mardi. */
export function getDefaultDeliveryDateKey(now = new Date()) {
  return addDaysToDateKey(beninDateKey(now), 1);
}

/** 7 jours à partir du lendemain. */
export function getShopDeliveryDateOptions(now = new Date()) {
  const start = getDefaultDeliveryDateKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const value = addDaysToDateKey(start, i);
    return { value, label: formatDeliveryDateLabel(value) };
  });
}

export function formatDeliveryDateLabel(dateKey) {
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

export function formatDeliveryDateShort(dateKeyOrIso) {
  if (!dateKeyOrIso) return '—';
  const key = String(dateKeyOrIso).slice(0, 10);
  const d = parseDateKey(key);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function deliveryDateKeyToIso(dateKey) {
  return `${dateKey}T12:00:00.000Z`;
}

export function isAllowedDeliveryDateKey(dateKey, now = new Date()) {
  const allowed = getShopDeliveryDateOptions(now).map((o) => o.value);
  return allowed.includes(dateKey);
}
