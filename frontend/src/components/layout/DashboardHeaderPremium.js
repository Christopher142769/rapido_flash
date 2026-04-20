import React, { useContext, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FaBell, FaSearch, FaBars } from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';

function titleForPath(pathname, user, t) {
  if (pathname === '/dashboard') {
    return user?.role === 'gestionnaire' ? 'Mon entreprise' : 'Mes entreprises';
  }
  const map = new Map([
    ['/dashboard/tableau', t('dashboardOverview', 'pageTitle')],
    ['/dashboard/medias', "Galerie d'images"],
    ['/dashboard/vitrine-accueil', 'Vitrine accueil'],
    ['/dashboard/categories-domaine', 'Catégories domaine'],
    ['/dashboard/categories', 'Catégories produits'],
    ['/dashboard/plats', 'Produits'],
    ['/dashboard/commandes', 'Commandes'],
    ['/dashboard/messages', 'Messages'],
    ['/dashboard/avis', t('reviews', 'sidebarReviews')],
    ['/dashboard/bannieres', 'Bannières'],
    ['/dashboard/gestionnaires', 'Gestionnaires'],
    ['/dashboard/messages-moderation', t('chat', 'moderationTitle')],
    ['/dashboard/maintenance', t('maintenance', 'dashboardTitle')],
  ]);
  if (map.has(pathname)) return map.get(pathname);
  for (const [path, label] of map) {
    if (pathname.startsWith(path + '/')) return label;
  }
  return 'Rapido Flash';
}

export default function DashboardHeaderPremium({ onOpenDrawer }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { pendingOrders, unreadMessages } = useNotifications();
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  const title = titleForPath(location.pathname, user, t);
  const notifTotal = (Number(pendingOrders) || 0) + (Number(unreadMessages) || 0);

  return (
    <header
      className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-4 border-b px-4 md:px-6"
      style={{
        background: 'rgba(255, 252, 248, 0.82)',
        backdropFilter: 'blur(18px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
        borderColor: 'var(--rf-border)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset',
      }}
    >
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-xl border md:hidden"
        style={{
          background: 'var(--rf-surface)',
          color: 'var(--rf-text-dark)',
          borderColor: 'var(--rf-border)',
          boxShadow: 'var(--shadow-card)',
        }}
        aria-label="Ouvrir le menu"
        onClick={onOpenDrawer}
      >
        <FaBars />
      </button>

      <h1
        className="min-w-0 flex-1 font-display text-[22px] font-bold leading-tight tracking-tight md:flex-none"
        style={{ color: 'var(--rf-text-dark)', fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h1>

      <motion.div
        className="mx-auto hidden max-w-[280px] flex-1 md:flex"
        animate={reduce ? {} : { scale: searchFocused ? 1.02 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <label className="relative block w-full">
          <span className="sr-only">Rechercher</span>
          <FaSearch
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-50"
            style={{ color: 'var(--rf-text-muted)' }}
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            placeholder="Rechercher..."
            className="w-full rounded-[var(--radius-md)] border bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-shadow"
            style={{
              borderColor: 'var(--rf-border-strong)',
              boxShadow: searchFocused ? 'var(--shadow-gold)' : 'none',
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </label>
      </motion.div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--rf-border)] bg-[var(--rf-surface)] text-lg outline-none transition hover:shadow-[var(--shadow-hover)]"
          style={{ color: 'var(--rf-text-dark)', boxShadow: 'var(--shadow-card)' }}
          aria-label="Notifications"
          onClick={() => navigate('/dashboard/commandes')}
        >
          <FaBell />
          {notifTotal > 0 ? (
            <motion.span
              className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
              style={{
                background: 'linear-gradient(145deg, var(--rf-gold-soft) 0%, var(--rf-gold) 100%)',
                color: 'var(--rf-ink)',
              }}
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            >
              {notifTotal > 99 ? '99+' : notifTotal}
            </motion.span>
          ) : null}
        </button>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border-0 bg-transparent p-1 pr-2 outline-none"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: 'var(--rf-amber)' }}
            >
              {(user?.nom || user?.email || 'A').slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden text-sm font-semibold sm:inline" style={{ color: 'var(--rf-text-dark)' }}>
              Admin
            </span>
          </button>
          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                role="menu"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ duration: reduce ? 0.12 : 0.2 }}
                className="absolute right-0 top-full z-50 mt-2 min-w-[180px] rounded-[var(--radius-md)] border bg-white py-1 shadow-lg"
                style={{ borderColor: 'var(--rf-border)' }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-[var(--rf-cream)]"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/home');
                  }}
                >
                  Accueil public
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
