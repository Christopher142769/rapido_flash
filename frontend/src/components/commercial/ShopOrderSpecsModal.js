import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './ShopOrderSpecsModal.css';

export default function ShopOrderSpecsModal({ order, onClose, onSave, saving = false }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (order) {
      setText(String(order.clientSpecifications || ''));
    }
  }, [order]);

  useEffect(() => {
    if (!order) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [order, saving, onClose]);

  if (!order) return null;

  const handleSave = () => {
    if (saving) return;
    onSave(text);
  };

  return createPortal(
    <div
      className="shop-specs-modal-overlay"
      role="presentation"
      onClick={() => !saving && onClose()}
    >
      <div
        className="shop-specs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-specs-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="shop-specs-modal-close"
          aria-label="Fermer"
          disabled={saving}
          onClick={onClose}
        >
          ×
        </button>
        <h3 id="shop-specs-modal-title">Spécifications client</h3>
        <p className="shop-specs-modal-lead">
          N° {order.orderNumber || '—'} · {order.productName}
        </p>
        <label className="shop-specs-modal-label" htmlFor="shop-specs-textarea">
          Instructions pour le livreur
        </label>
        <textarea
          id="shop-specs-textarea"
          className="shop-specs-modal-textarea"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex. appeler avant livraison, livrer au gardien, produit fragile…"
          maxLength={2000}
          autoFocus
        />
        <div className="shop-specs-modal-actions">
          <button
            type="button"
            className="shop-specs-modal-btn shop-specs-modal-btn--outline"
            disabled={saving}
            onClick={onClose}
          >
            Fermer
          </button>
          <button
            type="button"
            className="shop-specs-modal-btn shop-specs-modal-btn--primary"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
