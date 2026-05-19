import React from 'react';
import './ShopBrandHeader.css';

const RAPIDO_LOGO = '/images/logo.png';

export default function ShopBrandHeader({ variant = 'landing', className = '' }) {
  return (
    <header className={`shop-brand-header shop-brand-header--${variant} ${className}`.trim()}>
      <div className="shop-brand-header-inner">
        <img
          src={RAPIDO_LOGO}
          alt="Rapido"
          className="shop-brand-header-logo"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <span className="shop-brand-header-shop">Shop</span>
      </div>
    </header>
  );
}
