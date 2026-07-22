import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { DashboardRefreshProvider } from '../../context/DashboardRefreshContext';
import DashboardSidebarPremium from './DashboardSidebarPremium';
import DashboardHeaderPremium from './DashboardHeaderPremium';
import DashboardMobileBottomNav from './DashboardMobileBottomNav';
import PageTransition from './PageTransition';
import './dashboard-shell.css';

export default function DashboardLayout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.add('dashboard-layout-active');
    return () => document.body.classList.remove('dashboard-layout-active');
  }, []);

  if (user?.role === 'cuisinier') {
    return <Navigate to="/cuisine/app" replace />;
  }
  if (user?.role === 'responsable') {
    return <Navigate to="/responsables" replace />;
  }

  return (
    <DashboardRefreshProvider>
    <div className="rf-dashboard-root min-h-screen text-[var(--rf-text-dark)]">
      {mobileDrawerOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileDrawerOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[200px] flex-col transition-transform duration-300 ease-out lg:w-[240px] ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          background: 'var(--rf-sidebar-bg)',
          borderRight: '1px solid var(--rf-sidebar-border)',
          boxShadow: 'var(--shadow-sidebar)',
        }}
        aria-hidden={false}
      >
        <DashboardSidebarPremium onNavigate={() => setMobileDrawerOpen(false)} />
      </aside>

      <div className="flex min-h-screen flex-col md:pl-[200px] lg:pl-[240px]">
        <DashboardHeaderPremium onOpenDrawer={() => setMobileDrawerOpen(true)} />
        <main
          className="rf-dashboard-outlet flex min-h-0 flex-1 flex-col overflow-auto pb-[calc(112px+env(safe-area-inset-bottom,0px))] md:pb-0"
        >
          <PageTransition />
        </main>
        <DashboardMobileBottomNav onNavigate={() => setMobileDrawerOpen(false)} />
      </div>
    </div>
    </DashboardRefreshProvider>
  );
}
