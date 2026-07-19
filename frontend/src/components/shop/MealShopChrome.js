import React from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingBag, FaArrowLeft } from 'react-icons/fa';
import ShopBrandHeader from './ShopBrandHeader';
import ShopUrgencyBar from './ShopUrgencyBar';
import './MealShopChrome.css';

const RAPIDO_LOGO = '/images/logo.png';

/**
 * En-tête partagé catalogue /repas et fiches /repas/commandes/:slug
 * Urgence → brand header → toolbar (logo + panier)
 */
export default function MealShopChrome({
  sections = [],
  cartCount = 0,
  urgency = null,
  onCountdownComplete,
  showBack = false,
  backTo = '/repas',
  backLabel = 'Boutique',
}) {
  const showUrgency =
    urgency &&
    (urgency.isLive ||
      (urgency.expectedOrders > 0 && urgency.remainingOrders != null) ||
      urgency.endsAtIso);

  return (
    <div className="meal-shop-chrome">
      {showUrgency && urgency?.isLive ? (
        <ShopUrgencyBar
          label={urgency.label}
          endsAt={urgency.endsAtIso}
          autoRestart={urgency.runUntilStopped}
          onCountdownComplete={onCountdownComplete}
          ordersRemaining={urgency.remainingOrders}
          maxOrders={urgency.expectedOrders}
          ordersToday={urgency.ordersToday}
          showCountdown={!!urgency.endsAtIso}
          showQuota={urgency.expectedOrders > 0}
        />
      ) : null}

      <ShopBrandHeader sections={sections} />

      <header className="meal-shop-toolbar">
        <div className="meal-shop-toolbar-left">
          {showBack ? (
            <Link to={backTo} className="meal-shop-toolbar-back" aria-label={backLabel}>
              <FaArrowLeft aria-hidden />
              <span>{backLabel}</span>
            </Link>
          ) : null}
          <Link to="/repas" className="meal-shop-toolbar-logo-link" aria-label="Shop repas">
            <img src={RAPIDO_LOGO} alt="Rapido Flash" className="meal-shop-toolbar-logo" />
          </Link>
        </div>
        <Link to="/repas/panier" className="meal-shop-cart-link" aria-label="Panier">
          <FaShoppingBag />
          {cartCount > 0 ? <span>{cartCount}</span> : null}
        </Link>
      </header>
    </div>
  );
}
