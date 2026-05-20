export const SHOP_DELIVERY_CITIES = [
  { value: 'Cotonou', label: 'Cotonou' },
  { value: 'Calavi', label: 'Calavi' },
];

export function isValidShopCity(city) {
  return SHOP_DELIVERY_CITIES.some((c) => c.value === city);
}
