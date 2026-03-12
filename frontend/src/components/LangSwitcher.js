import React, { useState, useEffect, useRef, useContext } from 'react';
import LanguageContext from '../context/LanguageContext';
import './LangSwitcher.css';

/** Compact language switcher for use inside the location bar (home). */
const LangSwitcher = ({ variant = 'inline' }) => {
  const { language, setLanguage, t } = useContext(LanguageContext);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div className={`lang-switcher lang-switcher--${variant}`} ref={wrapRef}>
      <button
        type="button"
        className="lang-switcher-btn"
        onClick={() => setOpen(!open)}
        title={t('navbar', 'changeLanguage')}
        aria-label={t('navbar', 'changeLanguage')}
        aria-expanded={open}
      >
        <svg className="lang-switcher-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="lang-switcher-code">{language.toUpperCase()}</span>
      </button>
      {open && (
        <div className="lang-switcher-dropdown">
          <button type="button" className={language === 'fr' ? 'active' : ''} onClick={() => { setLanguage('fr'); setOpen(false); }}>
            {t('common', 'french')}
          </button>
          <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => { setLanguage('en'); setOpen(false); }}>
            {t('common', 'english')}
          </button>
        </div>
      )}
    </div>
  );
};

export default LangSwitcher;
