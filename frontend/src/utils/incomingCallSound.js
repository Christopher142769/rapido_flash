/** Sonnerie courte pour appel entrant (messagerie / dashboard). */
export function playIncomingCallSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const rings = 4;
    for (let i = 0; i < rings; i += 1) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 440 + (i % 2) * 180;
      o.type = 'sine';
      const t0 = ctx.currentTime + i * 0.55;
      g.gain.setValueAtTime(0.001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
      o.start(t0);
      o.stop(t0 + 0.45);
    }
  } catch (_) {
    // ignore
  }
}
