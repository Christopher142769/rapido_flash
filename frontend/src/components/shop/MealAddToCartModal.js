import React, { useEffect, useMemo, useState } from 'react';
import { formatPriceXof } from '../../utils/shopPromo';
import './MealAddToCartModal.css';

function buildAccDraft(options, initialQty = {}) {
  const draft = {};
  (options || []).forEach((a) => {
    const key = String(a._id || a.name);
    draft[key] = Math.max(0, Number(initialQty[key]) || 0);
  });
  return draft;
}

export default function MealAddToCartModal({
  open,
  onClose,
  product,
  onConfirm,
  ctaLabel = 'Ajouter au panier',
}) {
  const options = product?.accompagnements || [];
  const hasAcc = options.length > 0;
  const unitPrice = product?.isPromoLive ? product.promoPrice : product?.basePrice;

  const [quantity, setQuantity] = useState(1);
  const [accDraft, setAccDraft] = useState(() => buildAccDraft(options));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !product) return;
    setQuantity(1);
    setAccDraft(buildAccDraft(product.accompagnements || []));
    setError('');
  }, [open, product]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const selectedAcc = useMemo(() => {
    return (options || [])
      .map((a) => {
        const key = String(a._id || a.name);
        const q = Number(accDraft[key]) || 0;
        if (q < 1) return null;
        return {
          id: a._id,
          name: a.name,
          price: Number(a.price) || 0,
          quantity: q,
        };
      })
      .filter(Boolean);
  }, [options, accDraft]);

  const accTotal = selectedAcc.reduce((s, a) => s + a.price * a.quantity, 0);
  const linePreview = (Number(unitPrice) || 0) * quantity + accTotal;

  if (!open || !product) return null;

  const setAccQty = (key, next, maxQuantity) => {
    const max = Math.max(1, Number(maxQuantity) || 10);
    setAccDraft((d) => ({ ...d, [key]: Math.min(max, Math.max(0, next)) }));
    setError('');
  };

  const handleConfirm = () => {
    if (quantity < 1) {
      setError('Choisissez au moins 1 plat.');
      return;
    }
    if (hasAcc && selectedAcc.length < 1) {
      setError('Choisissez au moins un accompagnement pour ce plat.');
      return;
    }
    onConfirm({ quantity, accompagnements: selectedAcc });
  };

  return (
    <div className="meal-atc-overlay" role="presentation" onClick={onClose}>
      <div
        className="meal-atc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-atc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="meal-atc-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>

        <h2 id="meal-atc-title" className="meal-atc-title">
          {product.name}
        </h2>
        <p className="meal-atc-price">{formatPriceXof(unitPrice)} / plat</p>

        <div className="meal-atc-qty">
          <span>Quantité</span>
          <div className="meal-atc-qty-ctrl">
            <button
              type="button"
              aria-label="Diminuer"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <strong>{quantity}</strong>
            <button type="button" aria-label="Augmenter" onClick={() => setQuantity((q) => q + 1)}>
              +
            </button>
          </div>
        </div>

        {hasAcc ? (
          <div className="meal-atc-acc">
            <h3>Accompagnements</h3>
            <p>Obligatoire — choisissez au moins un accompagnement.</p>
            {options.map((a) => {
              const key = String(a._id || a.name);
              const q = accDraft[key] || 0;
              return (
                <div key={key} className={`meal-atc-acc-row${q > 0 ? ' is-selected' : ''}`}>
                  <div>
                    <strong>{a.name}</strong>
                    <span>{formatPriceXof(a.price)}</span>
                  </div>
                  <div className="meal-atc-qty-ctrl">
                    <button
                      type="button"
                      aria-label={`Retirer ${a.name}`}
                      onClick={() => setAccQty(key, q - 1, a.maxQuantity)}
                    >
                      −
                    </button>
                    <strong>{q}</strong>
                    <button
                      type="button"
                      aria-label={`Ajouter ${a.name}`}
                      onClick={() => setAccQty(key, q + 1, a.maxQuantity)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="meal-atc-summary">
          <span>Total ligne</span>
          <strong>{formatPriceXof(linePreview)}</strong>
        </div>

        {error ? <p className="meal-atc-error">{error}</p> : null}

        <button type="button" className="meal-atc-cta" onClick={handleConfirm}>
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
