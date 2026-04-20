import React, { useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import { buildDashboardNavItems, navBadgeCount, isDashboardNavActive } from '../../dashboardNavConfig';

export default function DashboardMobileBottomNav({ onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { pendingOrders, unreadMessages } = useNotifications();
  const items = useMemo(
    () =>
      buildDashboardNavItems({
        isAdmin: user?.role === 'restaurant',
        t,
        canManageMaintenance: !!user?.canManageMaintenance,
      }),
    [user?.role, user?.canManageMaintenance, t]
  );

  return (
    <nav
      className="fixed bottom-[calc(10px+env(safe-area-inset-bottom,0px))] left-2 right-2 z-[1200] rounded-[22px] border px-2 py-2 lg:hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,245,240,0.92) 100%)',
        borderColor: 'var(--rf-border)',
        boxShadow: 'var(--shadow-hover)',
        backdropFilter: 'blur(14px) saturate(1.15)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.15)',
      }}
      aria-label="Navigation dashboard"
    >
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-0.5 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {items.map((item) => {
          const Icon = item.Icon;
          const active = isDashboardNavActive(location.pathname, item.path);
          const badge = navBadgeCount(item.id, pendingOrders, unreadMessages);
          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={reduce ? {} : { scale: 0.96 }}
              className="flex min-w-[84px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center"
              style={{
                color: active ? 'var(--rf-text-dark)' : 'var(--rf-text-muted)',
                background: active ? 'rgba(232, 181, 74, 0.28)' : 'transparent',
                boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.65)' : 'none',
              }}
              onClick={() => {
                onNavigate?.();
                navigate(item.path);
              }}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="relative inline-flex h-7 w-7 items-center justify-center">
                <Icon className="text-lg" aria-hidden />
                {badge > 0 ? (
                  <span
                    className="absolute -right-2 -top-1 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white"
                    style={{ background: 'var(--rf-danger)' }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-[88px] truncate text-[10px] font-bold leading-tight">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
