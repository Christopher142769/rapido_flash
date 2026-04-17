import React, { useState, useEffect, useRef } from 'react';
import { FaTruck, FaTimes, FaGift } from 'react-icons/fa';
import './FreeDeliveryBanner.css';

const STORAGE_KEY = 'rapido_free_delivery_banner_dismissed_until';

/** Bandeau jusqu’à fermeture — réapparaît après 24h. */
const FreeDeliveryBanner = ({ message, dismissLabel = 'Masquer pour aujourd’hui' }) => {
  const [visible, setVisible] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    try {
      const until = localStorage.getItem(STORAGE_KEY);
      if (until) {
        const ts = parseInt(until, 10);
        if (!Number.isNaN(ts) && Date.now() < ts) {
          setVisible(false);
          return;
        }
      }
    } catch (_) {
      /* ignore */
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!offerOpen) return;
    const handleClickOutside = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOfferOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [offerOpen]);

  const dismiss = () => {
    try {
      const until = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, String(until));
    } catch (_) {
      /* ignore */
    }
    setOfferOpen(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="free-delivery-banner" role="status" aria-live="polite" ref={wrapRef} data-nosnippet="true">
      <div className="free-delivery-banner-inner">
        <button
          type="button"
          className="free-delivery-banner-badge"
          onClick={() => setOfferOpen((v) => !v)}
          aria-label="Offre"
          aria-expanded={offerOpen}
        >
          <FaGift size={18} />
          <span>Offre</span>
        </button>

        {offerOpen && (
          <div className="free-delivery-banner-popover" role="dialog" aria-live="polite">
            <p className="free-delivery-banner-popover-title">Livraison</p>
            <p className="free-delivery-banner-popover-text">{message}</p>
          </div>
        )}

        <span className="free-delivery-banner-icon" aria-hidden>
          <FaTruck size={22} />
        </span>
        <div className="free-delivery-banner-copy">
          <p className="free-delivery-banner-kicker">Livraison</p>
          <p className="free-delivery-banner-text">{message}</p>
        </div>
        <button type="button" className="free-delivery-banner-dismiss" onClick={dismiss} title={dismissLabel}>
          <FaTimes size={16} />
          <span className="free-delivery-banner-dismiss-sr">{dismissLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default FreeDeliveryBanner;
