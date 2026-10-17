import React, { useEffect, useState } from 'react';
import { Ico } from './RepasRefonteIcons';
import { mealDeliveryFeeForCity } from '../../utils/mealShopSettings';
import { fmtXof } from './repasRefonteConstants';

/** Plage de livraison : 09h → 00h (minuit), heure du Bénin. */
const OPEN_HOUR = 9;
const SLOTS = [
  { label: 'Matin', range: '09h – 12h', from: 9, to: 12 },
  { label: 'Midi', range: '12h – 15h', from: 12, to: 15 },
  { label: 'Après-midi', range: '15h – 19h', from: 15, to: 19 },
  { label: 'Soir', range: '19h – 00h', from: 19, to: 24 },
];

function beninHour() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Porto-Novo',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')?.value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value) || 0;
  return h + m / 60;
}

export default function RepasDeliveryHours({ settings }) {
  const [now, setNow] = useState(() => beninHour());
  useEffect(() => {
    const id = setInterval(() => setNow(beninHour()), 60000);
    return () => clearInterval(id);
  }, []);

  const isOpen = now >= OPEN_HOUR;
  const nowPct = Math.min(100, Math.max(0, (now / 24) * 100));
  const startPct = (OPEN_HOUR / 24) * 100;

  return (
    <section className="dh" id="horaires" aria-label="Horaires de livraison">
      <div className="wrap">
        <div className="dh-card">
          <div className="dh-head">
            <span className="dh-eyebrow">
              <Ico id="i-truck" /> Horaires de livraison
            </span>
            <h2 className="dh-title">
              Livrés chauds, <em>de 09h à 00h</em>
            </h2>
            <p className="dh-sub">
              Commandez quand vous voulez : nous livrons à Cotonou et Calavi de 09h00 à minuit.
            </p>
            <span className={`dh-status${isOpen ? ' is-open' : ''}`} role="status">
              <i aria-hidden="true" />
              {isOpen ? 'Livraisons en cours maintenant' : 'Fermé — reprise des livraisons à 09h00'}
            </span>
          </div>

          <div className="dh-body">
            <div className="dh-big" aria-label="De 09h à 00h">
              <div>
                <small>Début</small>
                <strong>09h</strong>
              </div>
              <span className="dh-arrow" aria-hidden="true" />
              <div>
                <small>Fin</small>
                <strong>00h</strong>
              </div>
            </div>

            <div className="dh-timeline" aria-hidden="true">
              <div className="dh-track">
                <span className="dh-fill" style={{ left: `${startPct}%`, width: `${100 - startPct}%` }} />
                <span className="dh-now" style={{ left: `${nowPct}%` }} />
              </div>
              <div className="dh-ticks">
                <span>00h</span>
                <span>06h</span>
                <span>09h</span>
                <span>12h</span>
                <span>18h</span>
                <span>00h</span>
              </div>
            </div>

            <ul className="dh-slots">
              {SLOTS.map((s) => {
                const live = now >= s.from && now < s.to;
                return (
                  <li key={s.label} className={live ? 'is-live' : ''}>
                    <strong>{s.label}</strong>
                    <span>{s.range}</span>
                    {live ? <em>En cours</em> : null}
                  </li>
                );
              })}
            </ul>

            <div className="dh-zones">
              {['Cotonou', 'Calavi'].map((city) => (
                <div key={city} className="dh-zone">
                  <Ico id="i-pin" />
                  <span>{city}</span>
                  <b>{fmtXof(mealDeliveryFeeForCity(settings, city))} F</b>
                </div>
              ))}
              <div className="dh-zone dh-zone--pay">
                <Ico id="i-cash" />
                <span>Paiement à la livraison</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
