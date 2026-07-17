/** Sonnerie repas cuisine — distincte du son Shopify des autres commandes. */
const MEAL_SOUND_URL = `${process.env.PUBLIC_URL || ''}/sounds/meal-order-notification.wav`;

let preloadAudio = null;
let lastPlayedAt = 0;

function loadMealAudio() {
  if (typeof window === 'undefined') return null;
  if (!preloadAudio) {
    preloadAudio = new Audio(MEAL_SOUND_URL);
    preloadAudio.preload = 'auto';
    preloadAudio.load();
  }
  return preloadAudio;
}

if (typeof window !== 'undefined') {
  loadMealAudio();
}

export function playMealOrderChime() {
  try {
    const now = Date.now();
    if (now - lastPlayedAt < 2500) return;
    lastPlayedAt = now;
    const template = loadMealAudio();
    if (!template) return;
    const audio = template.cloneNode();
    audio.volume = 1;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  } catch (_) {
    /* ignore */
  }
}

export const MEAL_ORDER_SOUND_PATH = '/sounds/meal-order-notification.wav';
