import React, { useEffect, useRef, useState } from 'react';
import { formatCountdown } from '../../utils/shopPromo';
import './ShopCountdown.css';

function CountdownDigit({ value, pad = true }) {
  const text = pad ? String(value).padStart(2, '0') : String(value);
  return (
    <span className="shop-countdown-digit-slot" aria-hidden>
      <strong key={text} className="shop-countdown-digit">
        {text}
      </strong>
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

export default function ShopCountdown({ endsAt, variant = 'default' }) {
  const [remaining, setRemaining] = useState(0);
  const initialMsRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const end = new Date(endsAt).getTime();
      const left = Math.max(0, end - Date.now());
      if (initialMsRef.current === null && left > 0) {
        initialMsRef.current = left;
      }
      setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const { days, hours, minutes, seconds } = formatCountdown(remaining);
  const showDays = days > 0;
  const progressPct =
    initialMsRef.current && initialMsRef.current > 0
      ? Math.min(100, (remaining / initialMsRef.current) * 100)
      : 100;

  if (remaining <= 0) {
    return <p className="shop-countdown-ended">Offre terminée</p>;
  }

  return (
    <div className={`shop-countdown${variant === 'urgent' ? ' shop-countdown--urgent' : ''}`} role="timer">
      <div className="shop-countdown-track" aria-hidden>
        <span className="shop-countdown-track-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="shop-countdown-digits">
        {showDays ? (
          <>
            <CountdownUnit value={days} label="Jours" pad={false} />
            <Separator />
          </>
        ) : null}
        <CountdownUnit value={hours} label="Heures" />
        <Separator />
        <CountdownUnit value={minutes} label="Min" />
        <Separator />
        <CountdownUnit value={seconds} label="Sec" />
      </div>
    </div>
  );
}
