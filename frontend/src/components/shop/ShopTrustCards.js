import React from 'react';
import { FaShippingFast, FaMoneyBillWave, FaWhatsapp } from 'react-icons/fa';
import './ShopTrustCards.css';

const TRUST_ITEMS = [
  {
    id: 'fast-delivery',
    icon: FaShippingFast,
    title: 'Livraison Rapide',
    description: 'Votre commande livrée rapidement, où que vous soyez.',
  },
  {
    id: 'cod',
    icon: FaMoneyBillWave,
    title: 'Paiement à la livraison',
    description: 'Payez en toute sérénité à la réception de votre colis.',
  },
  {
    id: 'whatsapp',
    icon: FaWhatsapp,
    title: 'Support WhatsApp',
    description: 'Une équipe joignable pour suivre et confirmer votre commande.',
  },
];

export default function ShopTrustCards({ whatsappNumber }) {
  const waDigits = String(whatsappNumber || '').replace(/\D/g, '');
  const waHref = waDigits ? `https://wa.me/${waDigits}` : null;

  return (
    <section id="shop-section-trust" className="shop-pdp-trust" aria-label="Nos engagements">
      <div className="shop-pdp-trust-inner">
        <ul className="shop-pdp-trust-grid">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            const isWhatsApp = item.id === 'whatsapp';
            const CardTag = isWhatsApp && waHref ? 'a' : 'div';
            const cardProps =
              isWhatsApp && waHref
                ? {
                    href: waHref,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    'aria-label': `${item.title} — ouvrir WhatsApp`,
                  }
                : {};

            return (
              <li key={item.id}>
                <CardTag className={`shop-pdp-trust-card${isWhatsApp ? ' shop-pdp-trust-card--wa' : ''}`} {...cardProps}>
                  <span className={`shop-pdp-trust-icon shop-pdp-trust-icon--${item.id}`} aria-hidden>
                    <Icon />
                  </span>
                  <h3 className="shop-pdp-trust-title">{item.title}</h3>
                  <p className="shop-pdp-trust-desc">{item.description}</p>
                </CardTag>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
