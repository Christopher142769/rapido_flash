import React from 'react';
import { FaTruck } from 'react-icons/fa';
import { formatDeliveryDateShort, getDefaultDeliveryDateKey } from '../../utils/shopDeliveryDate';
import './ShopDeliveryNotice.css';

export default function ShopDeliveryNotice({ variant = 'landing' }) {
  const deliveryDateLabel = formatDeliveryDateShort(getDefaultDeliveryDateKey());

  return (
    <aside
      className={`shop-delivery-notice shop-delivery-notice--${variant}`}
      role="note"
      aria-label="Information livraison sous 24 heures"
    >
      <div className="shop-delivery-notice-icon-wrap" aria-hidden>
        <FaTruck />
      </div>
      <div className="shop-delivery-notice-content">
        <p className="shop-delivery-notice-kicker">
          <span className="shop-delivery-notice-badge">NB</span>
          Livraison le lendemain
        </p>
        <p className="shop-delivery-notice-title">
          Commandez <strong>aujourd’hui</strong>, recevez <strong>demain</strong>
        </p>
        <p className="shop-delivery-notice-body">
          Votre commande est livrée sous <strong>24 h</strong>, le{' '}
          <strong>{deliveryDateLabel}</strong>. Assurez-vous d’être joignable et disponible à
          l’adresse indiquée avant de valider.
        </p>
      </div>
    </aside>
  );
}
