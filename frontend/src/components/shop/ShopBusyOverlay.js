import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import './ShopBusyOverlay.css';

/** Popup de chargement plein écran pour uploads / saves dashboard. */
export default function ShopBusyOverlay({ open, message = 'Chargement…' }) {
  if (!open) return null;
  return (
    <div className="shop-busy-overlay" role="alertdialog" aria-busy="true" aria-live="assertive">
      <div className="shop-busy-overlay-card">
        <FaSpinner className="shop-busy-overlay-spin" aria-hidden />
        <p>{message}</p>
      </div>
    </div>
  );
}
