import React from 'react';
import './ShopPrivacyFooter.css';

/** Lien politique de confidentialité — bas de page Shop / Repas. */
export default function ShopPrivacyFooter({ className = '' }) {
  return (
    <footer className={`shop-privacy-footer${className ? ` ${className}` : ''}`}>
      <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer">
        Politique de confidentialité
      </a>
      <span className="shop-privacy-footer-sep" aria-hidden>
        ·
      </span>
      <span className="shop-privacy-footer-brand">Rapido</span>
    </footer>
  );
}
