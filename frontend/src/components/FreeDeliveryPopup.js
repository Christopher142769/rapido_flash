import React, { useState, useEffect } from 'react';
import './FreeDeliveryPopup.css';

const STORAGE_KEY = 'rapido_free_delivery_popup_dismissed';

const FreeDeliveryPopup = ({ message, ctaLabel = 'OK' }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch (_) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (_) { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="free-delivery-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="free-delivery-title">
      <div className="free-delivery-popup">
        <button type="button" className="free-delivery-popup-close" onClick={dismiss} aria-label="Fermer">×</button>
        <div className="free-delivery-popup-icon" aria-hidden>🛵</div>
        <h2 id="free-delivery-title" className="free-delivery-popup-title">Bonne nouvelle</h2>
        <p className="free-delivery-popup-text">{message}</p>
        <button type="button" className="free-delivery-popup-btn" onClick={dismiss}>
          {ctaLabel}
        </button>
      </div>
    </div>
  );
};

export default FreeDeliveryPopup;
