import React, { useContext, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FaBell, FaSearch, FaBars } from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { useDashboardRefresh } from '../../context/DashboardRefreshContext';
import { useNotifications } from '../../context/NotificationContext';
import SectionRefreshButton from '../dashboard/SectionRefreshButton';
import LangSwitcher from '../LangSwitcher';
import '../dashboard/section-refresh.css';

function titleForPath(pathname, user, t) {
  if (pathname === '/dashboard') {
    return user?.role === 'gestionnaire' ? t('dashNav', 'monEntreprise') : t('dashNav', 'mesEntreprises');
  }
  const map = new Map([
    ['/dashboard/tableau', t('dashboardOverview', 'pageTitle')],
    ['/dashboard/analyse', 'Analyse'],
    ['/dashboard/medias', t('dashNav', 'medias')],
    ['/dashboard/vitrine-accueil', t('dashNav', 'vitrine')],
    ['/dashboard/categories-domaine', t('dashNav', 'categoriesDomaine')],
    ['/dashboard/categories', t('dashNav', 'categories')],
    ['/dashboard/plats', t('dashNav', 'plats')],
    ['/dashboard/shop', t('dashNav', 'shop')],
    ['/dashboard/shop-repas', 'Shop repas'],
    ['/dashboard/formulaires', t('dashNav', 'formulaires')],
    ['/dashboard/commandes', t('dashNav', 'commandes')],
    ['/dashboard/invites', 'Invités'],
    ['/dashboard/presence-personnel', 'Présence personnel'],
    ['/dashboard/messages', t('dashNav', 'messages')],
    ['/dashboard/offres-promo', t('dashNav', 'offresPromo')],
    ['/dashboard/utilisateurs-promo', t('dashNav', 'utilisateurs')],
    ['/dashboard/avis', t('reviews', 'sidebarReviews')],
    ['/dashboard/bannieres', t('dashNav', 'bannieres')],
    ['/dashboard/gestionnaires', t('dashNav', 'gestionnaires')],
    ['/dashboard/messages-moderation', t('chat', 'moderationTitle')],
    ['/dashboard/maintenance', t('maintenance', 'dashboardTitle')],
    ['/dashboard/demandes-compte', t('dashNav', 'demandesCompte')],
    ['/dashboard/notifications-push', t('dashNav', 'notifPush')],
    ['/dashboard/commercial', 'Vue d’ensemble commercial'],
    ['/dashboard/commercial-commandes', 'Commandes Shop'],
    ['/dashboard/commercial-commandes-repas', 'Commandes Repas'],
    ['/dashboard/commercial-bilan', 'Bilan commercial'],
    ['/dashboard/commercial-relances', 'Relances'],
    ['/dashboard/commercial-points', 'Points'],
    ['/dashboard/commerciaux', 'Commerciaux'],
    ['/dashboard/responsables', 'Responsables villes'],
  ]);
  if (map.has(pathname)) return map.get(pathname);
  for (const [path, label] of map) {
    if (pathname.startsWith(path + '/')) return label;
  }
  return t('dashNav', 'defaultTitle');
}

export default function DashboardHeaderPremium({ onOpenDrawer }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { pendingOrders, unreadMessages } = useNotifications();
  const { refresh, refreshing } = useDashboardRefresh();
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  const title = titleForPath(location.pathname, user, t);
  const notifTotal = (Number(pendingOrders) || 0) + (Number(unreadMessages) || 0);

  return (
    <header
      className="sticky top-0 z-50 flex h-[72px] shrink-0 items-center gap-4 border-b px-4 md:px-7"
      style={{
        background: 'rgba(255, 255, 255, 0.86)',
        backdropFilter: 'blur(18px) saturate(1.15)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.15)',
        borderColor: 'var(--rf-border)',
      }}
    >
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-2xl border md:hidden"
        style={{
          background: 'var(--rf-surface)',
          color: 'var(--rf-text-dark)',
          borderColor: 'var(--rf-border)',
          boxShadow: 'var(--shadow-card)',
        }}
        aria-label={t('dashNav', 'ouvrirMenu')}
        onClick={onOpenDrawer}
      >
        <FaBars />
      </button>

      <h1
        className="min-w-0 flex-1 font-display text-[20px] font-extrabold leading-tight tracking-tight md:flex-none md:max-w-[220px]"
        style={{ color: 'var(--rf-text-dark)', fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h1>

      <motion.div
        className="mx-auto hidden max-w-[420px] flex-1 lg:flex"
        animate={reduce ? {} : { scale: searchFocused ? 1.01 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <label className="relative block w-full">
          <span className="sr-only">{t('dashNav', 'rechercher')}</span>
          <FaSearch
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-45"
            style={{ color: 'var(--rf-text-muted)' }}
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            placeholder={`${t('dashNav', 'rechercher')}…`}
            className="w-full rounded-full border bg-[var(--rf-cream)] py-3 pl-11 pr-14 text-sm outline-none transition-shadow"
            style={{
              borderColor: 'var(--rf-border)',
              boxShadow: searchFocused ? 'var(--shadow-gold)' : 'none',
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd
            className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold sm:inline"
            style={{
              borderColor: 'var(--rf-border)',
              color: 'var(--rf-text-muted)',
              background: '#fff',
            }}
          >
            ⌘F
          </kbd>
        </label>
      </motion.div>

      <div className="ml-auto flex items-center gap-2.5 md:gap-3">
        <SectionRefreshButton
          onRefresh={refresh}
          loading={refreshing}
          className="hidden sm:inline-flex"
        />
        <SectionRefreshButton
          onRefresh={refresh}
          loading={refreshing}
          compact
          className="sm:hidden"
        />
        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--rf-border)] bg-white text-lg outline-none transition hover:shadow-[var(--shadow-hover)]"
          style={{ color: 'var(--rf-text-dark)', boxShadow: 'var(--shadow-card)' }}
          aria-label={t('dashNav', 'notifications')}
          onClick={() => navigate('/dashboard/commandes')}
        >
          <FaBell />
          {notifTotal > 0 ? (
            <motion.span
              className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{
                background: 'linear-gradient(145deg, var(--rf-amber) 0%, var(--rf-brown) 100%)',
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
            className="flex items-center gap-2.5 rounded-2xl border border-[var(--rf-border)] bg-white py-1.5 pl-1.5 pr-3 outline-none"
            style={{ boxShadow: 'var(--shadow-card)' }}
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(145deg, var(--rf-amber), var(--rf-brown))' }}
            >
              {(user?.nom || user?.email || 'A').slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden min-w-0 flex-col text-left sm:flex">
              <span className="truncate text-[13px] font-bold leading-tight" style={{ color: 'var(--rf-text-dark)' }}>
                {user?.nom || t('dashNav', 'admin')}
              </span>
              <span className="truncate text-[11px] font-medium leading-tight" style={{ color: 'var(--rf-text-muted)' }}>
                {user?.email || ''}
              </span>
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
                className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-2xl border bg-white py-1.5 shadow-lg"
                style={{ borderColor: 'var(--rf-border)' }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-[var(--rf-cream)]"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/home');
                  }}
                >
                  {t('dashNav', 'accueilPublic')}
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="notranslate hidden sm:block">
          <LangSwitcher variant="inline" />
        </div>
      </div>
    </header>
  );
}
