import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FaSignOutAlt, FaSyncAlt, FaDownload } from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { playMealOrderChime } from '../../utils/kitchenSounds';
import {
  registerServiceWorkerForPush,
  syncPushSubscriptionWithServer,
} from '../../utils/pushSubscription';
import '../../components/kitchen/CuisineInstallPanel.css';
import './cuisine.css';

function isMealPushPayload(payload) {
  if (!payload) return false;
  if (payload.sound === 'meal') return true;
  const tag = String(payload.tag || '');
  return tag.startsWith('rapido-kitchen-order') || tag.startsWith('rapido-meal-order');
}

export default function CuisineAppLayout() {
  const { user, logout } = useContext(AuthContext);
  const { notificationPermission, requestBrowserPermission } = useNotifications();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

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
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = '/cuisine-manifest.json';
    manifest.setAttribute('data-cuisine-manifest', '1');
    document.head.appendChild(manifest);

    let themeMeta = document.querySelector('meta[name="theme-color"][data-cuisine="1"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      themeMeta.content = '#c76d2e';
      themeMeta.setAttribute('data-cuisine', '1');
      document.head.appendChild(themeMeta);
    }

    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    );

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    void registerServiceWorkerForPush({ force: true }).then(() => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        void syncPushSubscriptionWithServer();
      }
    });

    const onSwMessage = (event) => {
      const data = event.data;
      if (data?.type === 'RAPIDO_PUSH' && isMealPushPayload(data.payload)) {
        playMealOrderChime();
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }

    return () => {
      document.body.classList.remove('cuisine-app-active');
      manifest.remove();
      themeMeta?.remove();
      window.removeEventListener('beforeinstallprompt', onPrompt);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }, []);

  useEffect(() => {
    if (notificationPermission === 'granted') {
      void syncPushSubscriptionWithServer();
    }
  }, [notificationPermission]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
  };

  const pendingHint = user?.nom ? user.nom.split(' ')[0] : 'Cuisine';
  const showNotifBanner =
    typeof Notification !== 'undefined' && notificationPermission !== 'granted';

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
          {!isStandalone && deferredPrompt ? (
            <button
              type="button"
              className="cuisine-topbar__install"
              onClick={handleInstall}
              title="Installer l'app"
            >
              <FaDownload aria-hidden /> App
            </button>
          ) : null}
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

      {showNotifBanner ? (
        <div className="cuisine-notif-banner">
          <p>
            Activez les notifications pour recevoir les commandes repas sur votre téléphone avec la
            sonnerie cuisine.
          </p>
          <button type="button" onClick={() => requestBrowserPermission()}>
            Activer
          </button>
        </div>
      ) : null}

      <main className="cuisine-main">
        <Outlet context={{ refreshKey, requestRefresh }} />
      </main>
    </div>
  );
}
