import React from 'react';
import { FaClock } from 'react-icons/fa';
import { formatDeliveryDateShort, getDefaultDeliveryDateKey } from '../../utils/shopDeliveryDate';
import './ShopDeliveryNotice.css';

export const DEFAULT_DELIVERY_NOTICE_MESSAGE =
  'Commandez aujourd’hui, livraison un jour après, le {date}. Soyez joignable à l’adresse indiquée.';

export function resolveDeliveryNoticeMessage(template) {
  const deliveryDateLabel = formatDeliveryDateShort(getDefaultDeliveryDateKey());
  const raw = String(template || '').trim() || DEFAULT_DELIVERY_NOTICE_MESSAGE;
  return raw.replace(/\{date\}/gi, deliveryDateLabel);
}

export default function ShopDeliveryNotice({ variant = 'landing', message }) {
  const text = resolveDeliveryNoticeMessage(message);

  return (
    <aside
      className={`shop-inline-note shop-inline-note--delivery${variant === 'confirm' ? ' shop-inline-note--confirm' : ''}`}
      role="note"
    >
      <FaClock className="shop-inline-note-icon" aria-hidden />
      <span>
        <strong>NB</strong> — {text}
      </span>
    </aside>
  );
}
