/** Délai de livraison des plats cuisinés (Shop Repas) — livrés chauds, de 09h à minuit. */
export const MEAL_DELIVERY_ETA = '30 à 45 min';
export const MEAL_OPEN_HOUR = 9;

function beninHour(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Porto-Novo',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === 'hour')?.value) % 24;
}

export function isMealDeliveryOpen(now = new Date()) {
  return beninHour(now) >= MEAL_OPEN_HOUR;
}

/** Texte court : « Livré en 30 à 45 min » (ou reprise à 9 h la nuit). */
export function mealDeliveryEtaText(now = new Date()) {
  return isMealDeliveryOpen(now)
    ? `Livré chaud en ${MEAL_DELIVERY_ETA}`
    : `Livraisons de 09h à minuit — votre commande part dès 09h, livrée en ${MEAL_DELIVERY_ETA}`;
}

/** Ville choisie en haut de /repas, réutilisée dans le formulaire. */
const CITY_KEY = 'rapido_meal_city';

export function loadMealCity() {
  try {
    const v = localStorage.getItem(CITY_KEY) || '';
    return v === 'Cotonou' || v === 'Calavi' ? v : '';
  } catch {
    return '';
  }
}

export function saveMealCity(city) {
  try {
    localStorage.setItem(CITY_KEY, city);
  } catch {
    /* ignore */
  }
}
