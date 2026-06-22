import React from 'react';
import './ShopOrderLimitBanner.css';

export default function ShopOrderLimitBanner({ ordersRemaining, maxOrders, progressPct, ordersToday }) {
  const remaining = Math.max(0, ordersRemaining ?? 0);
  const max = Math.max(1, maxOrders || 1);
  const taken = Math.min(max, ordersToday ?? max - remaining);
  const pct = progressPct ?? Math.min(100, Math.round((taken / max) * 100));

  return (
    <div
      className="shop-pdp-limit-strip"
      role="status"
      aria-live="polite"
      aria-label={`${remaining} commande${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''} sur ${max} aujourd'hui`}
    >
      <p className="shop-pdp-limit-strip-headline">
        Il reste{' '}
        <span className="shop-pdp-limit-strip-accent">{remaining}</span>
        {' '}commande{remaining > 1 ? 's' : ''} sur {max} aujourd’hui
      </p>
      <div className="shop-pdp-limit-strip-track" aria-hidden>
        <span className="shop-pdp-limit-strip-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
