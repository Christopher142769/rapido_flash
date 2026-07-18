import React from 'react';
import './ShopPrivacyFooter.css';

/**
 * Lien politique de confidentialité — bas de page Shop / Repas.
 * Pointe vers le HTML statique (toujours servi), pas une route SPA fragile.
 */
export default function ShopPrivacyFooter({ className = '' }) {
  return (
    <footer className={`shop-privacy-footer${className ? ` ${className}` : ''}`}>
      <a href="/privacy.html">Politique de confidentialité</a>
      <span className="shop-privacy-footer-sep" aria-hidden>
        ·
      </span>
      <span className="shop-privacy-footer-brand">Rapido</span>
    </footer>
  );
}
