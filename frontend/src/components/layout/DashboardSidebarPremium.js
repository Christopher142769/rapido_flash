import React, { useContext, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FaSignOutAlt } from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  DASHBOARD_HOME_SECTION,
  ADMIN_NAV_SECTION,
  GESTION_NAV_SECTION,
  PLATFORM_NAV_SECTION,
  COMMERCIAL_NAV_SECTION,
  KITCHEN_NAV_SECTION,
  buildDashboardNavItems,
  navBadgeCount,
} from '../../dashboardNavConfig';
import { toDashboardPath } from '../../config/dashboardPath';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 28 },
  },
};

function NavItem({ item, pendingOrders, unreadMessages, todayRelances, onNavigate, reduce }) {
  const Icon = item.Icon;
  const badge = navBadgeCount(item.id, pendingOrders, unreadMessages, todayRelances);

  return (
    <motion.li variants={reduce ? { hidden: { opacity: 1 }, visible: { opacity: 1 } } : itemVariants}>
      <NavLink
        to={item.path}
        end={item.path === '/dashboard'}
        onClick={() => onNavigate?.()}
        className="relative block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rf-gold)]"
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <motion.div
                layoutId="rf-sidebar-active-pill"
                className="absolute inset-y-0.5 left-0 right-0 rounded-2xl"
                style={{
                  background: 'var(--rf-sidebar-active)',
                  borderLeft: '3px solid var(--rf-brown)',
                }}
                transition={reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 300, damping: 28 }}
              />
            ) : null}
            <span
              className={`relative z-10 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition-colors ${
                isActive ? '' : 'hover:bg-[var(--rf-sidebar-hover)]'
              }`}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                style={{ color: isActive ? 'var(--rf-brown)' : 'var(--rf-sidebar-text-muted)' }}
                aria-hidden
              />
              <span
                className="min-w-0 flex-1 text-left text-[13px] font-semibold leading-snug"
                style={{ color: isActive ? 'var(--rf-text-dark)' : 'var(--rf-sidebar-text-muted)' }}
              >
                {item.label}
              </span>
              {badge > 0 ? (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                  style={{ background: 'var(--rf-danger)' }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </span>
          </>
        )}
      </NavLink>
    </motion.li>
  );
}

export default function DashboardSidebarPremium({ onNavigate, className = '' }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { user, logout } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { pendingOrders, unreadMessages, todayRelances } = useNotifications();

  const items = useMemo(
    () =>
      buildDashboardNavItems({
        isAdmin: user?.role === 'restaurant',
        isCommercial: user?.role === 'commercial',
        isResponsable: user?.role === 'responsable',
        isCuisinier: user?.role === 'cuisinier',
        t,
        canManageMaintenance: !!user?.canManageMaintenance,
      }),
    [user?.role, user?.canManageMaintenance, t]
  );
  const homeItems = items.filter((i) => i.section === DASHBOARD_HOME_SECTION);
  const commercialItems = items.filter((i) => i.section === COMMERCIAL_NAV_SECTION);
  const kitchenItems = items.filter((i) => i.section === KITCHEN_NAV_SECTION);
  const adminItems = items.filter((i) => i.section === ADMIN_NAV_SECTION);
  const gestionItems = items.filter((i) => i.section === GESTION_NAV_SECTION);
  const plateformeItems = items.filter((i) => i.section === PLATFORM_NAV_SECTION);
  const isRestrictedRole =
    user?.role === 'commercial' || user?.role === 'cuisinier' || user?.role === 'responsable';

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${className}`}
      style={{ background: 'var(--rf-sidebar-bg)', color: 'var(--rf-sidebar-text)' }}
    >
      <div className="flex shrink-0 flex-col px-5 pb-5 pt-6">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left outline-none"
          onClick={() => {
            onNavigate?.();
            navigate(toDashboardPath());
          }}
        >
          <img
            src="/images/logo.png"
            alt=""
            className="h-11 w-11 shrink-0 rounded-2xl object-contain"
            style={{
              boxShadow: 'var(--shadow-card)',
              background: '#fff',
              border: '1px solid var(--rf-border)',
            }}
          />
          <div className="min-w-0">
            <div
              className="truncate text-[1.05rem] font-extrabold leading-tight tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--rf-brown)' }}
            >
              Rapido Flash
            </div>
            <div
              className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--rf-sidebar-text-muted)' }}
            >
              Menu
            </div>
          </div>
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {!isRestrictedRole && homeItems.length > 0 ? (
          <>
            <p
              className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--rf-sidebar-section)' }}
            >
              Menu
            </p>
            <motion.ul className="mb-6 space-y-1" initial="hidden" animate="visible" variants={containerVariants}>
              {homeItems.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  pendingOrders={pendingOrders}
                  unreadMessages={unreadMessages}
                  todayRelances={todayRelances}
                  onNavigate={onNavigate}
                  reduce={reduce}
                />
              ))}
            </motion.ul>
          </>
        ) : null}

        {commercialItems.length > 0 ? (
          <>
            <p
              className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--rf-sidebar-section)' }}
            >
              Commercial
            </p>
            <motion.ul className="mb-6 space-y-1" initial="hidden" animate="visible" variants={containerVariants}>
              {commercialItems.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  pendingOrders={pendingOrders}
                  unreadMessages={unreadMessages}
                  todayRelances={todayRelances}
                  onNavigate={onNavigate}
                  reduce={reduce}
                />
              ))}
            </motion.ul>
          </>
        ) : null}

        {kitchenItems.length > 0 ? (
          <>
            <p
              className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--rf-sidebar-section)' }}
            >
              Cuisine
            </p>
            <motion.ul className="mb-6 space-y-1" initial="hidden" animate="visible" variants={containerVariants}>
              {kitchenItems.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  pendingOrders={pendingOrders}
                  unreadMessages={unreadMessages}
                  todayRelances={todayRelances}
                  onNavigate={onNavigate}
                  reduce={reduce}
                />
              ))}
            </motion.ul>
          </>
        ) : null}

        {!isRestrictedRole ? (
          <>
            <p
              className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--rf-sidebar-section)' }}
            >
              {t('dashNav', 'sectionAdmin')}
            </p>
            <motion.ul className="mb-6 space-y-1" initial="hidden" animate="visible" variants={containerVariants}>
              {adminItems.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  pendingOrders={pendingOrders}
                  unreadMessages={unreadMessages}
                  todayRelances={todayRelances}
                  onNavigate={onNavigate}
                  reduce={reduce}
                />
              ))}
            </motion.ul>

            <p
              className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--rf-sidebar-section)' }}
            >
              {t('dashNav', 'sectionGestion')}
            </p>
            <motion.ul className="space-y-1" initial="hidden" animate="visible" variants={containerVariants}>
              {gestionItems.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  pendingOrders={pendingOrders}
                  unreadMessages={unreadMessages}
                  todayRelances={todayRelances}
                  onNavigate={onNavigate}
                  reduce={reduce}
                />
              ))}
            </motion.ul>

            {plateformeItems.length > 0 ? (
              <>
                <p
                  className="mb-2 mt-6 px-2 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--rf-sidebar-section)' }}
                >
                  {t('dashNav', 'sectionPlateforme')}
                </p>
                <motion.ul className="space-y-1" initial="hidden" animate="visible" variants={containerVariants}>
                  {plateformeItems.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      pendingOrders={pendingOrders}
                      unreadMessages={unreadMessages}
                      todayRelances={todayRelances}
                      onNavigate={onNavigate}
                      reduce={reduce}
                    />
                  ))}
                </motion.ul>
              </>
            ) : null}
          </>
        ) : null}
      </nav>

      <div className="mt-auto shrink-0 space-y-3 px-3 pb-4 pt-2">
        <div
          className="relative overflow-hidden rounded-[22px] px-4 py-4 text-white"
          style={{
            background: 'linear-gradient(155deg, #3d1c08 0%, #5c2e0b 40%, #8b4513 78%, #c76d2e 100%)',
            boxShadow: '0 16px 32px rgba(92, 46, 11, 0.28)',
          }}
        >
          <div
            className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #e8b54a, transparent 70%)' }}
            aria-hidden
          />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">Rapido</p>
          <p className="relative mt-1 text-sm font-extrabold leading-snug">Suivez vos pubs & conversions</p>
          <button
            type="button"
            className="relative mt-3 w-full rounded-xl border-0 bg-white/95 px-3 py-2 text-xs font-extrabold text-[var(--rf-brown)]"
            onClick={() => {
              onNavigate?.();
              navigate(toDashboardPath('/analyse'));
            }}
          >
            Ouvrir Analyse
          </button>
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-transparent py-2.5 text-sm font-semibold outline-none transition hover:border-[var(--rf-border)] hover:bg-[var(--rf-sidebar-hover)]"
          style={{ color: 'var(--rf-danger)' }}
          onClick={() => {
            onNavigate?.();
            logout();
          }}
        >
          <FaSignOutAlt aria-hidden />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
