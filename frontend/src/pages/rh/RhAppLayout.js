import React, { useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaCalendarAlt,
  FaClipboardList,
  FaImages,
  FaQrcode,
  FaSignOutAlt,
  FaTimes,
  FaUserCheck,
  FaUsers,
} from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import './rh-app.css';

const NAV = [
  { to: '/rh', end: true, label: 'Vue d’ensemble', Icon: FaUserCheck },
  { to: '/rh/qr', label: 'Codes QR', Icon: FaQrcode },
  { to: '/rh/personnel', label: 'Personnel', Icon: FaUsers },
  { to: '/rh/planning', label: 'Planning', Icon: FaCalendarAlt },
  { to: '/rh/registre', label: 'Registre', Icon: FaClipboardList },
  { to: '/rh/photos', label: 'Photos', Icon: FaImages },
];

export default function RhAppLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('rh-app-active');
    let themeMeta = document.querySelector('meta[name="theme-color"][data-rh="1"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      themeMeta.content = '#3d2314';
      themeMeta.setAttribute('data-rh', '1');
      document.head.appendChild(themeMeta);
    }
    return () => {
      document.body.classList.remove('rh-app-active');
      document.querySelector('meta[name="theme-color"][data-rh="1"]')?.remove();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login?next=/rh');
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="rh-app">
      <div className="rh-app-bg" aria-hidden />

      {drawerOpen ? (
        <button type="button" className="rh-drawer-backdrop" aria-label="Fermer le menu" onClick={closeDrawer} />
      ) : null}

      <aside className={`rh-sidebar${drawerOpen ? ' is-open' : ''}`} aria-label="Navigation RH">
        <div className="rh-sidebar-brand">
          <img src="/images/logo.png" alt="" width={48} height={48} className="rh-brand-logo" />
          <div>
            <p className="rh-brand-name">King Fish</p>
            <p className="rh-brand-sub">Ressources humaines</p>
          </div>
          <button type="button" className="rh-drawer-close" onClick={closeDrawer} aria-label="Fermer">
            <FaTimes />
          </button>
        </div>

        <nav className="rh-sidebar-nav">
          <p className="rh-sidebar-label">Présence</p>
          {NAV.map(({ to, end, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={!!end}
              className={({ isActive }) => `rh-side-link${isActive ? ' is-active' : ''}`}
              onClick={closeDrawer}
            >
              <span className="rh-side-ico" aria-hidden>
                <Icon />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rh-sidebar-foot">
          <div className="rh-user-meta">
            <strong>{user?.nom || 'DRH'}</strong>
            <span>{user?.email}</span>
          </div>
          <button type="button" className="rh-logout" onClick={handleLogout}>
            <FaSignOutAlt aria-hidden />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="rh-shell">
        <header className="rh-mobile-bar">
          <button type="button" className="rh-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu">
            <FaBars />
          </button>
          <div className="rh-mobile-brand">
            <strong>King Fish RH</strong>
          </div>
          <button type="button" className="rh-logout rh-logout--icon" onClick={handleLogout} aria-label="Déconnexion">
            <FaSignOutAlt />
          </button>
        </header>

        <main className="rh-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
