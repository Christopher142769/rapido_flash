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

function getTodayDateKey(now = new Date()) {
  return beninDateKey(now);
}

function getDefaultDeliveryDateKey(now = new Date()) {
  return addDaysToDateKey(beninDateKey(now), 1);
}

function getAllowedDeliveryDateKeys(now = new Date()) {
  const start = getDefaultDeliveryDateKey(now);
  return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(start, i));
}

function deliveryDateKeyToDate(dateKey) {
  return parseDateKey(dateKey);
}

function isAllowedDeliveryDate(date, now = new Date()) {
  if (!date || Number.isNaN(date.getTime())) return false;
  const key = beninDateKey(date);
  return getAllowedDeliveryDateKeys(now).includes(key);
}

module.exports = {
  deliveryDateKeyToDate,
  isAllowedDeliveryDate,
  getDefaultDeliveryDateKey,
  getTodayDateKey,
};
