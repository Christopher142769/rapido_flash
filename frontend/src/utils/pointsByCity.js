import { formatQuantityWithUnit } from './shopQuantityUnit';

export const POINTS_CITIES = ['Cotonou', 'Calavi'];

const CITY_ORDER = ['Cotonou', 'Calavi', 'Autre'];

export function inferOrderCity(order) {
  const raw = String(order.city || order.customer?.city || '').trim();
  if (raw === 'Cotonou' || raw === 'Calavi') return raw;
  const blob = `${order.location || ''} ${order.address || ''} ${order.offPlatformLocation || ''}`;
  if (/calavi/i.test(blob)) return 'Calavi';
  if (/cotonou/i.test(blob)) return 'Cotonou';
  if (raw) return raw;
  return 'Autre';
}

export function groupOrdersByCity(orders, quantityUnit) {
  const map = new Map();
  for (const o of orders || []) {
    const city = inferOrderCity(o);
    if (!map.has(city)) {
      map.set(city, { city, orders: [], totalQuantity: 0, orderCount: 0, totalAmount: 0 });
    }
    const g = map.get(city);
    g.orders.push({ ...o, city });
    g.totalQuantity += Number(o.quantity || 0);
    g.orderCount += 1;
    g.totalAmount += Number(o.amount || 0);
  }
  return [...map.values()]
    .map((g) => ({
      ...g,
      totalQuantityLabel: formatQuantityWithUnit(g.totalQuantity, quantityUnit),
    }))
    .sort((a, b) => {
      const ia = CITY_ORDER.indexOf(a.city);
      const ib = CITY_ORDER.indexOf(b.city);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
}

export function enrichSummaryWithCities(summary) {
  if (!summary) return summary;
  const byCity = groupOrdersByCity(summary.orders, summary.quantityUnit);
  return { ...summary, byCity };
}
