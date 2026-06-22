import React from 'react';
import { FaBolt, FaShoppingBag } from 'react-icons/fa';
import './ShopOrderLimitBanner.css';

function RemainingSlots({ remaining, max }) {
  const digits = String(Math.max(0, remaining)).padStart(2, '0').split('');
  return (
    <div className="shop-limit-slots" aria-hidden>
      {digits.map((d, i) => (
        <span key={`${i}-${d}`} className="shop-limit-slot">
          <strong>{d}</strong>
        </span>
      ))}
      <span className="shop-limit-slots-sep">/</span>
      <span className="shop-limit-slot shop-limit-slot--max">
        <strong>{max}</strong>
      </span>
    </div>
  );
}

export default function ShopOrderLimitBanner({ ordersToday, ordersRemaining, maxOrders, progressPct }) {
  const remaining = Math.max(0, ordersRemaining ?? 0);
  const max = Math.max(1, maxOrders || 1);
  const taken = Math.min(max, ordersToday ?? max - remaining);
  const pct = progressPct ?? Math.min(100, Math.round((taken / max) * 100));
  const urgent = remaining <= 3 && remaining > 0;
  const soldOut = remaining <= 0;

  return (
    <div
      className={`shop-limit-banner${urgent ? ' shop-limit-banner--urgent' : ''}${soldOut ? ' shop-limit-banner--soldout' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${remaining} commande${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''} sur ${max} aujourd'hui`}
    >
      <div className="shop-limit-banner-glow" aria-hidden />
      <div className="shop-limit-banner-inner">
        <div className="shop-limit-banner-head">
          <span className="shop-limit-banner-icon" aria-hidden>
            {urgent ? <FaBolt /> : <FaShoppingBag />}
          </span>
          <div className="shop-limit-banner-copy">
            <p className="shop-limit-banner-kicker">
              {soldOut ? 'Quota atteint' : urgent ? 'Dernières places !' : 'Places limitées aujourd’hui'}
            </p>
            <p className="shop-limit-banner-title">
              {soldOut ? (
                <>Plus de commandes disponibles</>
              ) : (
                <>
                  Il reste{' '}
                  <span className="shop-limit-banner-accent">{remaining}</span>{' '}
                  commande{remaining > 1 ? 's' : ''}
                </>
              )}
            </p>
          </div>
          {!soldOut ? <RemainingSlots remaining={remaining} max={max} /> : null}
        </div>

        <div className="shop-limit-banner-track" aria-hidden>
          <span
            className="shop-limit-banner-fill"
            style={{ width: `${pct}%` }}
          />
          <span className="shop-limit-banner-track-label">
            {taken} / {max} commandes
          </span>
        </div>
      </div>
    </div>
  );
}
