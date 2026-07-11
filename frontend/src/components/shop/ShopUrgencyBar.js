import React from 'react';
import { FaFire } from 'react-icons/fa';
import ShopCountdown from './ShopCountdown';
import './ShopUrgencyBar.css';

/**
 * Bandeau urgence unifié (Shop Express + Shop repas) :
 * label + minuteur + commandes restantes + barre de progression.
 */
export default function ShopUrgencyBar({
  label = 'Offre limitée — commandez vite',
  endsAt = null,
  autoRestart = false,
  onCountdownComplete,
  ordersRemaining = null,
  maxOrders = 0,
  ordersToday = 0,
  progressPct = null,
  showCountdown = true,
  showQuota = true,
}) {
  const max = Math.max(0, Number(maxOrders) || 0);
  const remaining =
    ordersRemaining != null
      ? Math.max(0, Number(ordersRemaining))
      : max > 0
        ? Math.max(0, max - Number(ordersToday || 0))
        : 0;
  const taken = max > 0 ? Math.min(max, Number(ordersToday) || max - remaining) : 0;
  const pct =
    progressPct != null
      ? Math.min(100, Math.max(0, Number(progressPct)))
      : max > 0
        ? Math.min(100, Math.round((taken / max) * 100))
        : 0;

  const hasCountdown = showCountdown && !!endsAt;
  const hasQuota = showQuota && max > 0;

  if (!hasCountdown && !hasQuota && !label) return null;

  return (
    <div className="shop-urgency-bar" role="region" aria-live="polite">
      <div className="shop-urgency-bar-inner">
        {label ? (
          <p className="shop-urgency-bar-label">
            <FaFire aria-hidden /> {label}
          </p>
        ) : null}

        {hasCountdown ? (
          <div className="shop-urgency-bar-countdown">
            <ShopCountdown
              endsAt={endsAt}
              variant="urgent"
              autoRestart={autoRestart}
              onComplete={onCountdownComplete}
            />
          </div>
        ) : null}

        {hasQuota ? (
          <div className="shop-urgency-bar-quota">
            <p className="shop-urgency-bar-quota-text">
              {remaining > 0 ? (
                <>
                  Il reste <strong className="shop-urgency-bar-accent">{remaining}</strong> commande
                  {remaining > 1 ? 's' : ''} sur {max} aujourd&apos;hui
                </>
              ) : (
                <>Quota du jour presque atteint — commandez maintenant</>
              )}
            </p>
            <div className="shop-urgency-bar-track" aria-hidden>
              <span className="shop-urgency-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
