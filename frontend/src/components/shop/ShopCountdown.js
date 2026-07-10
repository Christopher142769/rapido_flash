import React, { useEffect, useRef, useState } from 'react';
import { formatCountdown } from '../../utils/shopPromo';
import './ShopCountdown.css';

function CountdownDigit({ value, pad = true }) {
  const text = pad ? String(value).padStart(2, '0') : String(value);
  return (
    <span className="shop-countdown-digit-slot" aria-hidden>
      <strong className="shop-countdown-digit">{text}</strong>
    </span>
  );
}

function CountdownUnit({ value, label, pad = true }) {
  return (
    <div className="shop-countdown-unit">
      <CountdownDigit value={value} pad={pad} />
      <span className="shop-countdown-label">{label}</span>
    </div>
  );
}

function Separator() {
  return (
    <span className="shop-countdown-sep" aria-hidden>
      :
    </span>
  );
}

function remainingMs(endsAt) {
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - Date.now());
}

export default function ShopCountdown({
  endsAt,
  variant = 'default',
  endedLabel,
  onComplete,
  /** Si true : à 00:00:00 on notifie le parent pour relancer (pas de message « terminée »). */
  autoRestart = false,
}) {
  const [remaining, setRemaining] = useState(() => remainingMs(endsAt));
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    setRemaining(remainingMs(endsAt));
  }, [endsAt]);

  useEffect(() => {
    const tick = () => {
      const left = remainingMs(endsAt);
      setRemaining(left);
      if (left <= 0 && !completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    };

    tick();
    const id = setInterval(tick, 250);

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    window.addEventListener('pageshow', tick);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
      window.removeEventListener('pageshow', tick);
    };
  }, [endsAt, onComplete]);

  const { days, hours, minutes, seconds } = formatCountdown(remaining);
  const showDays = days > 0;
  const ended = remaining <= 0;

  if (ended && !autoRestart) {
    return <p className="shop-countdown-ended">{endedLabel || 'Offre terminée'}</p>;
  }

  return (
    <div className={`shop-countdown${variant === 'urgent' ? ' shop-countdown--urgent' : ''}`} role="timer">
      <div className="shop-countdown-digits">
        {showDays ? (
          <>
            <CountdownUnit value={days} label="Jours" pad={false} />
            <Separator />
          </>
        ) : null}
        <CountdownUnit value={ended ? 0 : hours} label="Heures" />
        <Separator />
        <CountdownUnit value={ended ? 0 : minutes} label="Min" />
        <Separator />
        <CountdownUnit value={ended ? 0 : seconds} label="Sec" />
      </div>
    </div>
  );
}
