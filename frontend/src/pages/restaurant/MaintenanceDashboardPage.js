import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { useModal } from '../../context/ModalContext';
import PageLoader from '../../components/PageLoader';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FaExclamationTriangle } from 'react-icons/fa';
import AnimatedToggle from '../../components/ui/AnimatedToggle';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const MaintenanceDashboardPage = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { showSuccess, showError } = useModal();
  const prefersReducedMotion = useReducedMotion();

  const [ready, setReady] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [maintenanceSaveSuccess, setMaintenanceSaveSuccess] = useState(false);

  useEffect(() => {
    if (!user?.canManageMaintenance) {
      setReady(true);
      return;
    }
    axios
      .get(`${API_URL}/app-settings/public`)
      .then((res) => {
        setMaintenanceEnabled(!!res.data?.maintenanceEnabled);
        setMaintenanceMessage(res.data?.maintenanceMessage || '');
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [user?.canManageMaintenance]);

  const saveMaintenance = async () => {
    const token = localStorage.getItem('token');
    setMaintenanceSaving(true);
    try {
      await axios.put(
        `${API_URL}/app-settings`,
        { maintenanceEnabled, maintenanceMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess(t('maintenance', 'saved'));
      setMaintenanceSaveSuccess(true);
      setTimeout(() => setMaintenanceSaveSuccess(false), 2600);
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Erreur');
    } finally {
      setMaintenanceSaving(false);
    }
  };

  if (authLoading) {
    return <PageLoader message={t('maintenance', 'dashboardTitle')} />;
  }

  if (!user?.canManageMaintenance) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!ready) {
    return <PageLoader message={t('maintenance', 'dashboardTitle')} />;
  }

  return (
    <div className="dashboard-main">
      <div className="dashboard-content maintenance-dashboard-page">
        <header className="dashboard-block-header">
          <h1>{t('maintenance', 'dashboardTitle')}</h1>
          <p className="dashboard-block-desc">{t('maintenance', 'dashboardHint')}</p>
        </header>

        <div
          className={`relative z-0 overflow-hidden rounded-[var(--radius-xl)] border bg-white p-8 shadow-[var(--shadow-card)] ${
            maintenanceEnabled && !prefersReducedMotion ? 'animate-rf-pulse-border' : ''
          }`}
          style={{
            borderColor: maintenanceEnabled ? 'var(--rf-danger)' : 'var(--rf-border)',
            borderWidth: maintenanceEnabled ? 2 : 1,
          }}
        >
          <AnimatePresence>
            {maintenanceEnabled ? (
              <motion.div
                key="maint-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.12 : 0.25 }}
                className="pointer-events-none absolute inset-0 rounded-[var(--radius-xl)] bg-[#E84040]/[0.06]"
              />
            ) : null}
          </AnimatePresence>
          <div className="relative z-10">
            <AnimatePresence>
              {maintenanceEnabled ? (
                <motion.div
                  key="maint-banner"
                  role="status"
                  initial={{ y: prefersReducedMotion ? 0 : -24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={
                    prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 400, damping: 28 }
                  }
                  className={`mb-6 flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold text-white shadow-md ${
                    !prefersReducedMotion ? 'animate-rf-shake' : ''
                  }`}
                  style={{ background: 'var(--rf-danger)' }}
                >
                  <FaExclamationTriangle className="shrink-0 text-lg" aria-hidden />
                  <span>Mode maintenance activé — Les visiteurs voient la page d&apos;attente</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <AnimatedToggle
                checked={maintenanceEnabled}
                onChange={setMaintenanceEnabled}
                disabled={maintenanceSaving}
                size="lg"
                aria-label={t('maintenance', 'toggleLabel')}
              />
              <span
                className="text-base font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--rf-text-dark)' }}
              >
                {t('maintenance', 'toggleLabel')}
              </span>
            </div>
            <label
              className="mb-2 block text-xs font-bold uppercase tracking-wide"
              style={{ color: 'var(--rf-amber)' }}
              htmlFor="maintenance-message-page"
            >
              {t('maintenance', 'messageLabel')}
            </label>
            <textarea
              id="maintenance-message-page"
              rows={5}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder={
                t('maintenance', 'messagePlaceholder') ||
                'Nous effectuons une courte maintenance pour améliorer votre expérience. Merci de revenir très bientôt !'
              }
              disabled={maintenanceSaving}
              className="mb-1 w-full max-w-2xl resize-y rounded-[var(--radius-md)] border px-4 py-3 text-sm leading-relaxed outline-none transition-[border-color,box-shadow] min-h-[120px]"
              style={{
                background: 'var(--rf-cream)',
                borderColor: 'var(--rf-border-strong)',
                fontFamily: 'var(--font-body)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--rf-amber)';
                e.target.style.boxShadow = 'var(--shadow-gold)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--rf-border-strong)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div className="mb-4 flex max-w-2xl justify-end">
              <motion.span
                key={maintenanceMessage.length}
                initial={prefersReducedMotion ? false : { scale: 0.92, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-xs tabular-nums"
                style={{ color: 'var(--rf-text-muted)' }}
              >
                {maintenanceMessage.length} caractères
              </motion.span>
            </div>
            <motion.button
              type="button"
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-[var(--radius-md)] border-0 px-6 py-3 text-base font-semibold text-white outline-none transition-colors hover:bg-[var(--rf-gold-soft)] hover:text-[#1A0F00] disabled:opacity-60"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'var(--rf-amber)',
              }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
              onClick={saveMaintenance}
              disabled={maintenanceSaving}
            >
              <AnimatePresence mode="wait" initial={false}>
                {maintenanceSaving ? (
                  <motion.span
                    key="saving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-2"
                  >
                    <LoadingSpinner size="sm" color="#fff" />
                    Enregistrement…
                  </motion.span>
                ) : maintenanceSaveSuccess ? (
                  <motion.span
                    key="ok"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    ✓ Enregistré !
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {t('maintenance', 'save')}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDashboardPage;
