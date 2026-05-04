import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { useModal } from '../../context/ModalContext';
import PageLoader from '../../components/PageLoader';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FaExclamationTriangle, FaGlobe } from 'react-icons/fa';
import AnimatedToggle from '../../components/ui/AnimatedToggle';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  DNS_SOURCE_DOMAIN_OPTIONS,
  getNormalizedDomainFromUrl,
  isAllowedDnsNoticeUrl,
  normalizeDnsSourceDomain,
} from '../../utils/dnsNoticeUrl';
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

  const [dnsNoticeEnabled, setDnsNoticeEnabled] = useState(false);
  const [dnsNoticeSourceDomain, setDnsNoticeSourceDomain] = useState('rapido.bj');
  const [dnsNoticeUrl, setDnsNoticeUrl] = useState('');
  const [dnsNoticeMessage, setDnsNoticeMessage] = useState('');
  const [dnsSaving, setDnsSaving] = useState(false);
  const [dnsSaveSuccess, setDnsSaveSuccess] = useState(false);

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
        setDnsNoticeEnabled(!!res.data?.dnsNoticeEnabled);
        setDnsNoticeSourceDomain(normalizeDnsSourceDomain(res.data?.dnsNoticeSourceDomain) || 'rapido.bj');
        setDnsNoticeUrl(res.data?.dnsNoticeUrl || '');
        setDnsNoticeMessage(res.data?.dnsNoticeMessage || '');
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [user?.canManageMaintenance]);

  const buildBody = () => ({
    maintenanceEnabled,
    maintenanceMessage,
    dnsNoticeEnabled,
    dnsNoticeSourceDomain,
    dnsNoticeUrl,
    dnsNoticeMessage,
  });

  const validateDns = () => {
    if (dnsNoticeEnabled && !isAllowedDnsNoticeUrl(dnsNoticeUrl)) {
      showError(t('dnsNotice', 'urlInvalid'));
      return false;
    }
    if (dnsNoticeEnabled && !normalizeDnsSourceDomain(dnsNoticeSourceDomain)) {
      showError(t('dnsNotice', 'sourceDomainInvalid'));
      return false;
    }
    if (dnsNoticeEnabled) {
      const source = normalizeDnsSourceDomain(dnsNoticeSourceDomain);
      const target = getNormalizedDomainFromUrl(dnsNoticeUrl);
      if (source && target && source === target) {
        showError(t('dnsNotice', 'targetMustBeOtherDomain'));
        return false;
      }
    }
    return true;
  };

  const saveMaintenance = async () => {
    if (!validateDns()) return;
    const token = localStorage.getItem('token');
    setMaintenanceSaving(true);
    try {
      await axios.put(`${API_URL}/app-settings`, buildBody(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSuccess(t('maintenance', 'saved'));
      setMaintenanceSaveSuccess(true);
      setTimeout(() => setMaintenanceSaveSuccess(false), 2600);
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Erreur');
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const saveDnsNotice = async () => {
    if (!validateDns()) return;
    const token = localStorage.getItem('token');
    setDnsSaving(true);
    try {
      await axios.put(`${API_URL}/app-settings`, buildBody(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSuccess(t('dnsNotice', 'saved'));
      setDnsSaveSuccess(true);
      setTimeout(() => setDnsSaveSuccess(false), 2600);
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Erreur');
    } finally {
      setDnsSaving(false);
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

  const anySaving = maintenanceSaving || dnsSaving;

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
                  <span>{t('maintenance', 'activeBanner')}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <AnimatedToggle
                checked={maintenanceEnabled}
                onChange={setMaintenanceEnabled}
                disabled={anySaving}
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
              disabled={anySaving}
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
              disabled={anySaving}
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

        <header className="dashboard-block-header mt-12">
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--rf-text-dark)' }}>
            {t('dnsNotice', 'dashboardTitle')}
          </h2>
          <p className="dashboard-block-desc">{t('dnsNotice', 'dashboardHint')}</p>
        </header>

        <div
          className={`relative z-0 overflow-hidden rounded-[var(--radius-xl)] border bg-white p-8 shadow-[var(--shadow-card)] ${
            dnsNoticeEnabled && !prefersReducedMotion ? 'animate-rf-pulse-border' : ''
          }`}
          style={{
            borderColor: dnsNoticeEnabled ? 'var(--rf-amber)' : 'var(--rf-border)',
            borderWidth: dnsNoticeEnabled ? 2 : 1,
          }}
        >
          <AnimatePresence>
            {dnsNoticeEnabled ? (
              <motion.div
                key="dns-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.12 : 0.25 }}
                className="pointer-events-none absolute inset-0 rounded-[var(--radius-xl)] bg-[#c9782e]/[0.07]"
              />
            ) : null}
          </AnimatePresence>
          <div className="relative z-10">
            <AnimatePresence>
              {dnsNoticeEnabled ? (
                <motion.div
                  key="dns-banner"
                  role="status"
                  initial={{ y: prefersReducedMotion ? 0 : -24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={
                    prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 400, damping: 28 }
                  }
                  className="mb-6 flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold text-white shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1a5c52 0%, #c9782e 100%)' }}
                >
                  <FaGlobe className="shrink-0 text-lg" aria-hidden />
                  <span>{t('dnsNotice', 'activeBanner')}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <AnimatedToggle
                checked={dnsNoticeEnabled}
                onChange={setDnsNoticeEnabled}
                disabled={anySaving}
                size="lg"
                aria-label={t('dnsNotice', 'toggleLabel')}
              />
              <span
                className="text-base font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--rf-text-dark)' }}
              >
                {t('dnsNotice', 'toggleLabel')}
              </span>
            </div>
            <label
              className="mb-2 block text-xs font-bold uppercase tracking-wide"
              style={{ color: 'var(--rf-amber)' }}
              htmlFor="dns-notice-source-domain"
            >
              {t('dnsNotice', 'sourceDomainLabel')}
            </label>
            <select
              id="dns-notice-source-domain"
              value={dnsNoticeSourceDomain}
              onChange={(e) => setDnsNoticeSourceDomain(normalizeDnsSourceDomain(e.target.value) || 'rapido.bj')}
              disabled={anySaving}
              className="mb-5 w-full max-w-2xl rounded-[var(--radius-md)] border px-4 py-3 text-sm outline-none transition-[border-color,box-shadow]"
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
            >
              {DNS_SOURCE_DOMAIN_OPTIONS.map((domain) => (
                <option key={domain} value={domain}>
                  {t('dnsNotice', 'sourceDomainOptionPrefix')} {domain}
                </option>
              ))}
            </select>
            <label
              className="mb-2 block text-xs font-bold uppercase tracking-wide"
              style={{ color: 'var(--rf-amber)' }}
              htmlFor="dns-notice-url"
            >
              {t('dnsNotice', 'urlLabel')}
            </label>
            <input
              id="dns-notice-url"
              type="url"
              value={dnsNoticeUrl}
              onChange={(e) => setDnsNoticeUrl(e.target.value)}
              placeholder={t('dnsNotice', 'urlPlaceholder')}
              disabled={anySaving}
              className="mb-5 w-full max-w-2xl rounded-[var(--radius-md)] border px-4 py-3 text-sm outline-none transition-[border-color,box-shadow]"
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
            <label
              className="mb-2 block text-xs font-bold uppercase tracking-wide"
              style={{ color: 'var(--rf-amber)' }}
              htmlFor="dns-notice-message"
            >
              {t('dnsNotice', 'messageLabel')}
            </label>
            <textarea
              id="dns-notice-message"
              rows={4}
              value={dnsNoticeMessage}
              onChange={(e) => setDnsNoticeMessage(e.target.value)}
              placeholder={t('dnsNotice', 'messagePlaceholder')}
              disabled={anySaving}
              className="mb-1 w-full max-w-2xl resize-y rounded-[var(--radius-md)] border px-4 py-3 text-sm leading-relaxed outline-none transition-[border-color,box-shadow] min-h-[100px]"
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
              <span className="text-xs tabular-nums" style={{ color: 'var(--rf-text-muted)' }}>
                {dnsNoticeMessage.length} caractères
              </span>
            </div>
            <motion.button
              type="button"
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-[var(--radius-md)] border-0 px-6 py-3 text-base font-semibold text-white outline-none transition-colors hover:bg-[var(--rf-gold-soft)] hover:text-[#1A0F00] disabled:opacity-60"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, #1a5c52 0%, #c9782e 100%)',
              }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
              onClick={saveDnsNotice}
              disabled={anySaving}
            >
              <AnimatePresence mode="wait" initial={false}>
                {dnsSaving ? (
                  <motion.span
                    key="dns-saving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-2"
                  >
                    <LoadingSpinner size="sm" color="#fff" />
                    Enregistrement…
                  </motion.span>
                ) : dnsSaveSuccess ? (
                  <motion.span
                    key="dns-ok"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    ✓ Enregistré !
                  </motion.span>
                ) : (
                  <motion.span key="dns-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {t('dnsNotice', 'save')}
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
