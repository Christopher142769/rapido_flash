/** Plats cuisinés (Shop Repas) : livraison rapide de 09h à minuit, sans engagement de durée chiffrée. */
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

/** Texte court de livraison (reprise à 9 h la nuit). */
export function mealDeliveryEtaText(now = new Date()) {
  return isMealDeliveryOpen(now)
    ? 'Livraison rapide à Cotonou et Calavi, de 09h à minuit'
    : 'Livraisons de 09h à minuit : votre commande part dès 09h';
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
