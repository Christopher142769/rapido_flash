import React from 'react';
import { FaClock } from 'react-icons/fa';
import { formatDeliveryDateShort, getDefaultDeliveryDateKey } from '../../utils/shopDeliveryDate';
import './ShopDeliveryNotice.css';

export const DEFAULT_DELIVERY_NOTICE_MESSAGE =
  'Commandez aujourd’hui, livraison un jour après, le {date}. Soyez joignable à l’adresse indiquée.';

/** Shop Repas : livraison dans la journée / les prochaines 24 h. */
export const DEFAULT_MEAL_DELIVERY_NOTICE_MESSAGE =
  'Commandez aujourd’hui — livraison dans les prochaines 24 h. Soyez joignable à l’adresse indiquée.';

export function resolveDeliveryNoticeMessage(template, options = {}) {
  const {
    defaultMessage = DEFAULT_DELIVERY_NOTICE_MESSAGE,
    dateKey = getDefaultDeliveryDateKey(),
  } = options;
  const deliveryDateLabel = formatDeliveryDateShort(dateKey);
  const raw = String(template || '').trim() || defaultMessage;
  return raw.replace(/\{date\}/gi, deliveryDateLabel);
}

export default function ShopDeliveryNotice({
  variant = 'landing',
  message,
  defaultMessage,
  dateKey,
}) {
  const text = resolveDeliveryNoticeMessage(message, { defaultMessage, dateKey });

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
