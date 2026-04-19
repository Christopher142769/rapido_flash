/** Court signal sonore type « notification » (sans fichier audio externe). */
export function playNotificationChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 784;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.frequency.setValueAtTime(784, now);
    osc.frequency.exponentialRampToValueAtTime(1046, now + 0.12);
    osc.stop(now + 0.35);
    osc.onended = () => ctx.close().catch(() => {});
  } catch (_) {
    /* ignore */
  }
}
