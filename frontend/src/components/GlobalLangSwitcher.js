import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import LanguageContext from '../context/LanguageContext';
import LangSwitcher from './LangSwitcher';
import './GlobalLangSwitcher.css';

/** Sélecteur de langue visible sur toutes les pages SPA (sauf recrutement iframe). */
export default function GlobalLangSwitcher() {
  const location = useLocation();
  const { t } = useContext(LanguageContext);

  if (location.pathname.startsWith('/recrutement')) {
    return null;
  }

  const hasTopNavbarLang = [
    '/home',
    '/cart',
    '/checkout',
    '/orders',
    '/factures',
    '/facture',
    '/settings',
    '/chats',
    '/chat',
    '/restaurant',
  ].some((p) => location.pathname.startsWith(p));
  if (hasTopNavbarLang) {
    return null;
  }

  return (
    <div
      className="global-lang-switcher notranslate"
      role="region"
      aria-label={t('navbar', 'language')}
    >
      <LangSwitcher variant="floating" />
    </div>
  );
}
