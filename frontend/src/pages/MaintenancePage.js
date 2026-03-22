import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import LanguageContext from '../context/LanguageContext';
import './MaintenancePage.css';

const MaintenancePage = ({ message }) => {
  const { t } = useContext(LanguageContext);
  const text =
    (message && String(message).trim()) ||
    t('maintenance', 'defaultMessage');

  return (
    <div className="maintenance-page">
      <div className="maintenance-page-bg" aria-hidden />
      <div className="maintenance-card">
        <div className="maintenance-logo-wrap">
          <img src="/images/logo.png" alt="" className="maintenance-logo" />
        </div>
        <h1 className="maintenance-title">{t('maintenance', 'title')}</h1>
        <p className="maintenance-subtitle">{t('maintenance', 'subtitle')}</p>
        <div className="maintenance-message">
          {text.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="maintenance-actions">
          <Link to="/login" className="maintenance-link-pro">
            {t('maintenance', 'staffLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
