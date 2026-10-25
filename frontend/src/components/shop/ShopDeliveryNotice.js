import React from 'react';
import { FaClock } from 'react-icons/fa';
import { formatDeliveryDateLabel, getDefaultDeliveryDateKey } from '../../utils/shopDeliveryDate';
import { mealDeliveryEtaText } from '../../utils/mealDeliveryEta';
import './ShopDeliveryNotice.css';

export const DEFAULT_DELIVERY_NOTICE_MESSAGE =
  'Commandé aujourd’hui, livré demain ({date}). Soyez joignable au numéro indiqué.';


export function resolveDeliveryNoticeMessage(template, options = {}) {
  const {
    defaultMessage = DEFAULT_DELIVERY_NOTICE_MESSAGE,
    dateKey = getDefaultDeliveryDateKey(),
  } = options;
  const deliveryDateLabel = formatDeliveryDateLabel(dateKey);
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

/** Shop Repas : plats cuisinés livrés chauds (délai court, pas de date). */
export function MealDeliveryEtaNotice({ variant = 'landing' }) {
  return (
    <aside
      className={`shop-inline-note shop-inline-note--delivery${variant === 'confirm' ? ' shop-inline-note--confirm' : ''}`}
      role="note"
    >
      <FaClock className="shop-inline-note-icon" aria-hidden />
      <span>
        <strong>{mealDeliveryEtaText()}</strong> — soyez joignable au numéro indiqué.
      </span>
    </aside>
  );
}
