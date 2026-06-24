let audio;

export function playChampionNewMissionSound() {
  try {
    if (!audio) {
      audio = new Audio('/sounds/shopify-sales-notification.mp3');
      audio.volume = 0.85;
    }
    audio.currentTime = 0;
    const p = audio.play();
    if (p?.catch) p.catch(() => {});
  } catch (_) {
    /* ignore */
  }
}
