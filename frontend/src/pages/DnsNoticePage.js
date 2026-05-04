import React, { useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import LanguageContext from '../context/LanguageContext';
import './DnsNoticePage.css';

function safeHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

const DnsNoticePage = ({ message, targetUrl }) => {
  const { t } = useContext(LanguageContext);
  const prefersReducedMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const host = useMemo(() => safeHostname(targetUrl), [targetUrl]);
  const text =
    (message && String(message).trim()) || t('dnsNotice', 'defaultMessage');

  const copyLink = () => {
    if (!targetUrl || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(targetUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const spring = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: 'spring', stiffness: 380, damping: 28 };

  return (
    <div className="dns-notice-page">
      <div className="dns-notice-page-bg" aria-hidden>
        <span className="dns-notice-orb dns-notice-orb-a" />
        <span className="dns-notice-orb dns-notice-orb-b" />
        <span className="dns-notice-orb dns-notice-orb-c" />
      </div>
      <motion.div
        className="dns-notice-card"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
      >
        <motion.div
          className="dns-notice-logo-wrap"
          initial={prefersReducedMotion ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: prefersReducedMotion ? 0 : 0.08 }}
        >
          <img src="/images/logo.png" alt="" className="dns-notice-logo" />
        </motion.div>
        <motion.h1
          className="dns-notice-title"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: prefersReducedMotion ? 0 : 0.12 }}
        >
          {t('dnsNotice', 'title')}
        </motion.h1>
        <motion.p
          className="dns-notice-subtitle"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: prefersReducedMotion ? 0 : 0.18 }}
        >
          {t('dnsNotice', 'subtitle')}
        </motion.p>
        <motion.div
          className="dns-notice-message"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: prefersReducedMotion ? 0 : 0.24 }}
        >
          {text.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </motion.div>
        <motion.div
          className="dns-notice-cta-wrap"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: prefersReducedMotion ? 0 : 0.3 }}
        >
          <motion.a
            href={targetUrl}
            className="dns-notice-cta"
            rel="noopener noreferrer"
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
          >
            <span className="dns-notice-cta-glow" aria-hidden />
            <span className="dns-notice-cta-label">{t('dnsNotice', 'cta')}</span>
            {host ? <span className="dns-notice-cta-host">{host}</span> : null}
          </motion.a>
          <button type="button" className="dns-notice-copy" onClick={copyLink}>
            {copied ? t('dnsNotice', 'copied') : t('dnsNotice', 'copyLink')}
          </button>
        </motion.div>
        <motion.p
          className="dns-notice-hint"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.38 }}
        >
          {t('dnsNotice', 'hint')}
        </motion.p>
        <div className="dns-notice-actions">
          <Link to="/login" className="dns-notice-link-pro">
            {t('maintenance', 'staffLogin')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default DnsNoticePage;
