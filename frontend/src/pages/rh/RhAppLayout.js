import React, { useContext, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUserCheck, FaImages } from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import './rh-app.css';

export default function RhAppLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

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

  return (
    <div className="rh-app">
      <div className="rh-app-bg" aria-hidden />
      <header className="rh-topbar">
        <div className="rh-brand">
          <img src="/images/logo.png" alt="" width={44} height={44} className="rh-brand-logo" />
          <div>
            <p className="rh-brand-name">King Fish</p>
            <p className="rh-brand-sub">Ressources humaines</p>
          </div>
        </div>
        <nav className="rh-nav" aria-label="Espace RH">
          <NavLink to="/rh" end className={({ isActive }) => `rh-nav-link${isActive ? ' is-active' : ''}`}>
            <FaUserCheck aria-hidden />
            Présence
          </NavLink>
          <NavLink
            to="/rh/photos"
            className={({ isActive }) => `rh-nav-link${isActive ? ' is-active' : ''}`}
          >
            <FaImages aria-hidden />
            Photos
          </NavLink>
        </nav>
        <div className="rh-user">
          <div className="rh-user-meta">
            <strong>{user?.nom || 'DRH'}</strong>
            <span>{user?.email}</span>
          </div>
          <button type="button" className="rh-logout" onClick={handleLogout}>
            <FaSignOutAlt aria-hidden />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="rh-main">
        <Outlet />
      </main>
    </div>
  );
}
