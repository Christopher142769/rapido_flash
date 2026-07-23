import React, { useContext } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FaSignOutAlt, FaShoppingBag, FaUtensils } from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import './responsable.css';

export default function ResponsableAppLayout() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const city = String(user?.assignedCity || '').trim();
  const firstName = user?.nom ? String(user.nom).split(' ')[0] : 'Responsable';
  const mealEnabled = !!user?.mealOrdersEnabled;
  const path = location.pathname;
  const shopActive = path === '/responsables' || path === '/responsables/commandes';

  return (
    <div className="resp-shell">
      <header className="resp-topbar">
        <div className="resp-topbar__brand">
          <img src="/images/logo.png" alt="" width={36} height={36} />
          <div className="resp-topbar__titles">
            <span className="resp-topbar__name">Rapido Responsables</span>
            <span className="resp-topbar__user">
              {firstName}
              {city ? ` · ${city}` : ''}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="resp-icon-btn resp-icon-btn--danger"
          aria-label="Déconnexion"
          onClick={logout}
        >
          <FaSignOutAlt />
        </button>
      </header>

      {mealEnabled ? (
        <nav className="resp-nav" aria-label="Navigation responsable">
          <NavLink
            to="/responsables/commandes"
            className={() => `resp-nav__link${shopActive ? ' is-active' : ''}`}
          >
            <FaShoppingBag aria-hidden />
            Commandes Shop
          </NavLink>
          <NavLink
            to="/responsables/commandes-repas"
            className={({ isActive }) => `resp-nav__link${isActive ? ' is-active' : ''}`}
          >
            <FaUtensils aria-hidden />
            Commandes Repas
          </NavLink>
        </nav>
      ) : null}

      <main className="resp-main">
        <Outlet />
      </main>
    </div>
  );
}
