import React from 'react';
import ShopBrandHeader from './ShopBrandHeader';
import ShopPrivacyFooter from './ShopPrivacyFooter';
import ShopCountdown from './ShopCountdown';
import { formatClosureDateTime, formatDailyTime } from '../../utils/shopClosure';
import { FaStore, FaClock, FaShoppingBag } from 'react-icons/fa';
import './ShopClosedPage.css';

export default function ShopClosedPage({ product, closureState, onReopen }) {
  const isOrderLimit = closureState.closureReason === 'orderLimit';
  const message = isOrderLimit
    ? closureState.closureMessage ||
      `Le quota de ${closureState.dailyOrderLimitMax} commandes pour aujourd’hui est atteint. Merci pour votre enthousiasme !`
    : closureState.closureMessage ||
      'Nous préparons de nouvelles commandes pour vous. Merci de votre patience !';

  const closeLabel = formatDailyTime(closureState.dailyCloseTime);
  const openLabel = formatDailyTime(closureState.dailyOpenTime);
  const reopenAt = closureState.closureReopensAt;

  return (
    <div className="shop-closed">
      <ShopBrandHeader variant="landing" />

      <main className="shop-closed-main">
        <div className="shop-closed-card">
          <div className="shop-closed-icon-wrap" aria-hidden>
            {isOrderLimit ? (
              <FaShoppingBag className="shop-closed-icon" />
            ) : (
              <FaStore className="shop-closed-icon" />
            )}
          </div>

          <p className="shop-closed-badge">
            {isOrderLimit ? 'Quota journalier atteint' : 'Boutique temporairement fermée'}
          </p>
          <h1 className="shop-closed-title">{product.name}</h1>
          <p className="shop-closed-lead">{message}</p>

          {closureState.dailyCloseTime && closureState.dailyOpenTime ? (
            <div className="shop-closed-hours">
              <div className="shop-closed-hours-row">
                <FaClock aria-hidden />
                <span>
                  Fermeture quotidienne : <strong>{closeLabel}</strong>
                </span>
              </div>
              <div className="shop-closed-hours-row shop-closed-hours-row--reopen">
                <FaClock aria-hidden />
                <span>
                  Réouverture quotidienne : <strong>{openLabel}</strong>
                </span>
              </div>
            </div>
          ) : null}

          {reopenAt ? (
            <div className="shop-closed-countdown-block">
              <p className="shop-closed-countdown-label">Réouverture dans</p>
              <ShopCountdown
                endsAt={reopenAt}
                variant="urgent"
                endedLabel="Ouverture en cours…"
                onComplete={onReopen}
              />
              <p className="shop-closed-next-open">
                Prochaine ouverture : {formatClosureDateTime(reopenAt)}
              </p>
            </div>
          ) : null}

          <p className="shop-closed-foot">
            {isOrderLimit
              ? 'Rapido Flash · Le compteur repart demain · Réouverture à l’heure habituelle.'
              : 'Rapido Flash · Horaires automatiques chaque jour · La boutique se rouvrira à l’heure indiquée.'}
          </p>
        </div>
      </main>
      <ShopPrivacyFooter />
    </div>
  );
}
