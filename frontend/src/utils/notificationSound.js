/** Son notification dashboard — fichier Voicy Shopify (public/sounds). */
const SOUND_URL = `${process.env.PUBLIC_URL || ''}/sounds/shopify-sales-notification.mp3`;

let preloadAudio = null;

function loadNotificationAudio() {
  if (typeof window === 'undefined') return null;
  if (!preloadAudio) {
    preloadAudio = new Audio(SOUND_URL);
    preloadAudio.preload = 'auto';
    preloadAudio.load();
  }
  return preloadAudio;
}

if (typeof window !== 'undefined') {
  loadNotificationAudio();
}

/** Joue uniquement le MP3 Shopify (pas de synthèse Web Audio ni autre son). */
export function playNotificationChime() {
  try {
    const template = loadNotificationAudio();
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
