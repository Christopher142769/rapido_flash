import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './GlobalSeoFooterLinks.css';

const LINKS = [
  { to: '/livraison-rapide-cotonou', label: 'Livraison rapide à Cotonou' },
  { to: '/service-livraison-cotonou', label: 'Service de livraison Cotonou' },
  { to: '/livraison-domicile-cotonou', label: 'Livraison à domicile Cotonou' },
  { to: '/livraison-colis-cotonou', label: 'Livraison de colis Cotonou' },
  { to: '/tarifs-livraison-cotonou', label: 'Tarifs livraison Cotonou' },
  { to: '/livraison-benin', label: 'Service de livraison au Bénin' },
];

function shouldHideOnPath(pathname) {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/restaurant/') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/factures') ||
    pathname.startsWith('/facture/') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/chat/') ||
    pathname.startsWith('/chats') ||
    pathname === '/loading'
  );
}

export default function GlobalSeoFooterLinks() {
  const location = useLocation();
  const pathname = location.pathname || '/';

  if (shouldHideOnPath(pathname)) return null;

  return (
    <footer className="global-seo-footer" aria-label="Liens de prospection Rapido Flash">
      <div className="global-seo-footer__inner">
        <h2 className="global-seo-footer__title">Explorer nos services de livraison</h2>
        <div className="global-seo-footer__links">
          {LINKS.map((item) => (
            <Link key={item.to} to={item.to} className="global-seo-footer__link">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

