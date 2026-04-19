import React, { useState, useContext, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import AuthContext from '../context/AuthContext';
import LanguageContext from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import './NotificationPermissionBanner.css';

const STORAGE_KEY = 'rapido_notif_prompt_done';

const NotificationPermissionBanner = () => {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { notificationPermission, requestBrowserPermission } = useNotifications();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(STORAGE_KEY) === '1');

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    setDismissed(sessionStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  useEffect(() => {
    const visible =
      typeof Notification !== 'undefined' &&
      user &&
      ['restaurant', 'gestionnaire', 'client'].includes(user.role) &&
      !dismissed &&
      notificationPermission === 'default';
    if (!visible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [user, dismissed, notificationPermission]);

  const handleLater = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }, []);

  const handleEnable = useCallback(async () => {
    await requestBrowserPermission();
    sessionStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }, [requestBrowserPermission]);

  useEffect(() => {
    const visible =
      typeof Notification !== 'undefined' &&
      user &&
      ['restaurant', 'gestionnaire', 'client'].includes(user.role) &&
      !dismissed &&
      notificationPermission === 'default';
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') handleLater();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, dismissed, notificationPermission, handleLater]);

  if (typeof Notification === 'undefined') return null;
  if (!user || !['restaurant', 'gestionnaire', 'client'].includes(user.role)) return null;
  if (dismissed || notificationPermission !== 'default') return null;

  const modal = (
    <div className="notif-perm-modal-root">
      <button
        type="button"
        className="notif-perm-modal-backdrop"
        aria-label={t('notifications', 'later')}
        onClick={handleLater}
      />
      <div
        className="notif-perm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-perm-modal-title"
      >
        <div className="notif-perm-modal__glow" aria-hidden />
        <div className="notif-perm-modal__brand">
          <img src="/images/logo.png" alt="" className="notif-perm-modal__logo" width={72} height={72} />
          <span className="notif-perm-modal__brand-name">Rapido Flash</span>
        </div>
        <h2 id="notif-perm-modal-title" className="notif-perm-modal__title">
          {t('notifications', 'bannerTitle')}
        </h2>
        <p className="notif-perm-modal__body">{t('notifications', 'bannerBody')}</p>
        <div className="notif-perm-modal__actions">
          <button
            type="button"
            className="notif-perm-modal__btn notif-perm-modal__btn--primary"
            onClick={handleEnable}
          >
            {t('notifications', 'enable')}
          </button>
          <button type="button" className="notif-perm-modal__btn notif-perm-modal__btn--ghost" onClick={handleLater}>
            {t('notifications', 'later')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default NotificationPermissionBanner;
