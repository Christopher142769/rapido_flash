import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FaSignOutAlt, FaSyncAlt } from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import './cuisine.css';

export default function CuisineAppLayout() {
  const { user, logout } = useContext(AuthContext);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const requestRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!refreshing) return;
    const t = setTimeout(() => setRefreshing(false), 600);
    return () => clearTimeout(t);
  }, [refreshKey, refreshing]);

  useEffect(() => {
    document.body.classList.add('cuisine-app-active');
    return () => document.body.classList.remove('cuisine-app-active');
  }, []);

  const pendingHint = user?.nom ? user.nom.split(' ')[0] : 'Cuisine';

  return (
    <div className="cuisine-shell cuisine-shell--app">
      <header className="cuisine-topbar">
        <div className="cuisine-topbar__brand">
          <img src="/images/logo.png" alt="" width={36} height={36} />
          <div className="cuisine-topbar__titles">
            <span className="cuisine-topbar__name">Rapido Cuisine</span>
            <span className="cuisine-topbar__user">Bonjour, {pendingHint}</span>
          </div>
        </div>
        <div className="cuisine-topbar__actions">
          <button
            type="button"
            className="cuisine-icon-btn"
            aria-label="Actualiser"
            disabled={refreshing}
            onClick={requestRefresh}
          >
            <FaSyncAlt className={refreshing ? 'cuisine-spin' : ''} />
          </button>
          <button
            type="button"
            className="cuisine-icon-btn cuisine-icon-btn--danger"
            aria-label="Déconnexion"
            onClick={logout}
          >
            <FaSignOutAlt />
          </button>
        </div>
      </header>

      <main className="cuisine-main">
        <Outlet context={{ refreshKey, requestRefresh }} />
      </main>
    </div>
  );
}
