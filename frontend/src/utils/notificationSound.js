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

/**
 * @param {'full' | 'short'} variant — full = commande, short = message (volume réduit)
 */
export function playNotificationChime(options) {
  const variant = options?.variant === 'short' ? 'short' : 'full';
  try {
    const template = loadNotificationAudio();
    if (!template) return;
    const audio = template.cloneNode();
    audio.volume = variant === 'short' ? 0.7 : 1;
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        /* autoplay bloqué ou fichier absent */
      });
    }
  } catch (_) {
    /* ignore */
  }
}

/** @deprecated Conservé pour compatibilité — utilise le MP3 via playNotificationChime. */
export function playShopifyCoinNotificationSound(variant = 'full') {
  playNotificationChime({ variant });
}
