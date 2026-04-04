/** Signal sonore pour alertes messagerie (dashboard structure / modération). */
export function playUrgentAlertSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const beeps = 3;
    for (let i = 0; i < beeps; i += 1) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = i % 2 === 0 ? 880 : 660;
      o.type = 'sine';
      const t0 = ctx.currentTime + i * 0.32;
      g.gain.setValueAtTime(0.001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      o.start(t0);
      o.stop(t0 + 0.3);
    }
  } catch (_) {
    // ignore
  }
}
