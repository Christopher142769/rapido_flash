import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './ShopBrandHeader.css';

const RAPIDO_LOGO = '/images/logo.png';
const MOBILE_MAX = 767;

function useIsMobile() {
  const query = `(max-width: ${MOBILE_MAX}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const topBar =
    document.querySelector('.shop-pdp-top-fixed') || document.querySelector('.shop-brand-header');
  const offset = (topBar?.offsetHeight || 0) + 12;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

export default function ShopBrandHeader({
  variant = 'landing',
  className = '',
  sections = [],
  inTopBar = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const showNav = variant === 'landing' && sections.length > 0;
  const showMobileToggle = showNav && isMobile;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleNavClick = (id) => {
    scrollToSection(id);
    closeMenu();
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!isMobile && menuOpen) closeMenu();
  }, [isMobile, menuOpen, closeMenu]);

  return (
    <>
      <header
        className={[
          'shop-brand-header',
          `shop-brand-header--${variant}`,
          inTopBar ? 'shop-brand-header--in-top-bar' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="shop-brand-header-inner">
          <button
            type="button"
            className="shop-brand-header-logo-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Retour en haut"
          >
            <img
              src={RAPIDO_LOGO}
              alt="Rapido"
              className="shop-brand-header-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </button>

          {showNav ? (
            <nav className="shop-brand-header-nav" aria-label="Sections de la page">
              <ul className="shop-brand-header-nav-list">
                {sections.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="shop-brand-header-nav-link" onClick={() => handleNavClick(s.id)}>
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {showMobileToggle ? (
            <button
              type="button"
              className={`shop-brand-header-toggle${menuOpen ? ' is-open' : ''}`}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              aria-controls="shop-brand-drawer"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="shop-brand-header-toggle-bar" />
              <span className="shop-brand-header-toggle-bar" />
              <span className="shop-brand-header-toggle-bar" />
            </button>
          ) : null}
        </div>
      </header>

      <AnimatePresence>
        {showMobileToggle && menuOpen ? (
          <>
            <motion.button
              type="button"
              className="shop-brand-header-backdrop"
              aria-label="Fermer le menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeMenu}
            />
            <motion.aside
              id="shop-brand-drawer"
              className="shop-brand-header-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <motion.div
                className="shop-brand-header-drawer-head"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.3 }}
              >
                <img src={RAPIDO_LOGO} alt="" className="shop-brand-header-drawer-logo" aria-hidden />
                <p className="shop-brand-header-drawer-title">Navigation</p>
              </motion.div>
              <nav className="shop-brand-header-drawer-nav">
                <ul>
                  {sections.map((s, i) => (
                    <motion.li
                      key={s.id}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 + i * 0.05, duration: 0.35 }}
                    >
                      <button
                        type="button"
                        className="shop-brand-header-drawer-link"
                        onClick={() => handleNavClick(s.id)}
                      >
                        <span className="shop-brand-header-drawer-link-num">{String(i + 1).padStart(2, '0')}</span>
                        <span>{s.label}</span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </nav>
              <button type="button" className="shop-brand-header-drawer-close" onClick={closeMenu}>
                Fermer
              </button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
