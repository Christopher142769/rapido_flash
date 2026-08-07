import React, { useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  FaBell,
  FaBullseye,
  FaChartLine,
  FaFileExcel,
  FaShoppingBag,
  FaSignOutAlt,
  FaUtensils,
} from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import './commercial-app.css';

const NAV_ITEMS = [
  { to: '/commerciaux/app', end: true, label: 'Vue d’ensemble', Icon: FaChartLine },
  { to: '/commerciaux/app/commandes', end: false, label: 'Commandes Shop', Icon: FaShoppingBag },
  { to: '/commerciaux/app/commandes-repas', end: false, label: 'Commandes Repas', Icon: FaUtensils },
  { to: '/commerciaux/app/bilan', end: false, label: 'Bilan', Icon: FaFileExcel },
  { to: '/commerciaux/app/relances', end: false, label: 'Relances', Icon: FaBell },
  { to: '/commerciaux/app/points', end: false, label: 'Points', Icon: FaBullseye },
];

export default function CommercialAppLayout() {
  const { user, logout } = useContext(AuthContext);
  const firstName = user?.nom ? String(user.nom).split(' ')[0] : 'Commercial';

  return (
    <div className="comm-shell">
      <header className="comm-topbar">
        <div className="comm-topbar__brand">
          <img src="/images/logo.png" alt="" width={36} height={36} />
          <div className="comm-topbar__titles">
            <span className="comm-topbar__name">Rapido Commerciaux</span>
            <span className="comm-topbar__user">Bonjour, {firstName}</span>
          </div>
        </div>
        <button
          type="button"
          className="comm-icon-btn comm-icon-btn--danger"
          aria-label="Déconnexion"
          onClick={logout}
        >
          <FaSignOutAlt />
        </button>
      </header>

      <nav className="comm-nav" aria-label="Navigation commercial">
        {NAV_ITEMS.map(({ to, end, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `comm-nav__link${isActive ? ' is-active' : ''}`}
          >
            <Icon aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="comm-main">
        <Outlet />
      </main>
    </div>
  );
}
