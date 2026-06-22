import React from 'react';
import ShopBrandHeader from './ShopBrandHeader';
import ShopCountdown from './ShopCountdown';
import { formatClosureDateTime } from '../../utils/shopClosure';
import { FaStore, FaClock } from 'react-icons/fa';
import './ShopClosedPage.css';

export default function ShopClosedPage({ product, closureState, onReopen }) {
  const message =
    closureState.closureMessage ||
    'Nous préparons de nouvelles commandes pour vous. Merci de votre patience !';

  return (
    <div className="shop-closed">
      <ShopBrandHeader variant="landing" />

      <main className="shop-closed-main">
        <div className="shop-closed-card">
          <div className="shop-closed-icon-wrap" aria-hidden>
            <FaStore className="shop-closed-icon" />
          </div>

          <p className="shop-closed-badge">Boutique temporairement fermée</p>
          <h1 className="shop-closed-title">{product.name}</h1>
          <p className="shop-closed-lead">{message}</p>

          <div className="shop-closed-hours">
            <div className="shop-closed-hours-row">
              <FaClock aria-hidden />
              <span>
                Fermeture :{' '}
                <strong>{formatClosureDateTime(closureState.closureClosedFrom)}</strong>
              </span>
            </div>
            <div className="shop-closed-hours-row shop-closed-hours-row--reopen">
              <FaClock aria-hidden />
              <span>
                Réouverture :{' '}
                <strong>{formatClosureDateTime(closureState.closureClosedUntil)}</strong>
              </span>
            </div>
          </div>

          <div className="shop-closed-countdown-block">
            <p className="shop-closed-countdown-label">Réouverture dans</p>
            <ShopCountdown
              endsAt={closureState.closureReopensAt || closureState.closureClosedUntil}
              variant="urgent"
              endedLabel="Ouverture en cours…"
              onComplete={onReopen}
            />
          </div>

          <p className="shop-closed-foot">
            Rapido Flash · La boutique se rouvrira automatiquement à l’heure indiquée.
          </p>
        </div>
      </main>
    </div>
  );
}
