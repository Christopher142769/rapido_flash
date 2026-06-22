import React from 'react';
import { FaClock } from 'react-icons/fa';
import { formatDeliveryDateShort, getDefaultDeliveryDateKey } from '../../utils/shopDeliveryDate';
import './ShopDeliveryNotice.css';

export default function ShopDeliveryNotice({ variant = 'landing' }) {
  const deliveryDateLabel = formatDeliveryDateShort(getDefaultDeliveryDateKey());

  return (
    <aside
      className={`shop-inline-note shop-inline-note--delivery${variant === 'confirm' ? ' shop-inline-note--confirm' : ''}`}
      role="note"
    >
      <FaClock className="shop-inline-note-icon" aria-hidden />
      <span>
        <strong>NB</strong> — Commandez aujourd’hui, livraison demain sous 24 h ({deliveryDateLabel}
        ). Soyez joignable à l’adresse indiquée.
      </span>
    </aside>
  );
}
