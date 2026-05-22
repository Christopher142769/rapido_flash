/**
 * Son type Shopify : pièces qui tombent + petit « ching » (synthèse Web Audio).
 * @param {'full' | 'short'} variant — full = nouvelle commande, short = message
 */
export function playShopifyCoinNotificationSound(variant = 'full') {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') void ctx.resume();

    const t0 = ctx.currentTime + 0.02;
    const master = ctx.createGain();
    master.gain.value = variant === 'short' ? 0.55 : 0.88;
    master.connect(ctx.destination);

    const playCoinClink = (offset, centerFreq, peak, q = 11) => {
      const start = t0 + offset;
      const dur = 0.085;
      const len = Math.ceil(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const env = Math.exp(-i / (len * 0.2));
        d[i] = (Math.random() * 2 - 1) * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = centerFreq;
      bp.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(master);
      src.start(start);
      src.stop(start + dur + 0.02);
    };

    const playChing = (baseTime, volume) => {
      [2093, 2637, 3322].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        const g = ctx.createGain();
        const s = baseTime + i * 0.007;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(volume - i * 0.02, s + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.12);
        o.connect(g);
        g.connect(master);
        o.start(s);
        o.stop(s + 0.13);
      });
    };

    if (variant === 'short') {
      playCoinClink(0, 4600, 0.28, 13);
      playChing(t0 + 0.07, 0.07);
    } else {
      playCoinClink(0, 4500, 0.4, 14);
      playCoinClink(0.05, 4000, 0.36, 12);
      playCoinClink(0.095, 5300, 0.32, 13);
      playCoinClink(0.135, 3200, 0.28, 10);
      playChing(t0 + 0.17, 0.11);
    }

    const closeDelay = variant === 'short' ? 220 : 400;
    window.setTimeout(() => ctx.close().catch(() => {}), closeDelay);
  } catch (_) {
    /* ignore */
  }
}

/** Alias utilisé par NotificationContext (dashboard). */
export function playNotificationChime(options) {
  const variant = options?.variant === 'short' ? 'short' : 'full';
  playShopifyCoinNotificationSound(variant);
}
