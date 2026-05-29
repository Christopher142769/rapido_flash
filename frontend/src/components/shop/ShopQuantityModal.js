import React, { useEffect, useState } from 'react';
import { formatPriceXof } from '../../utils/shopPromo';
import { formatQuantityWithUnit, getPriceUnitSuffix } from '../../utils/shopQuantityUnit';
import ShopQuantityPicker from './ShopQuantityPicker';
import './ShopQuantityModal.css';

export default function ShopQuantityModal({
  open,
  onClose,
  productName,
  quantityUnit,
  quantityLabel,
  unitPrice,
  unitBasePrice,
  isPromoLive,
  initialQuantity = 0,
  ctaLabel = 'Commander maintenant',
  onConfirm,
  submitting = false,
}) {
  const [draftQty, setDraftQty] = useState(initialQuantity);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDraftQty(initialQuantity);
      setError('');
    }
  }, [open, initialQuantity]);

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

  if (!open) return null;

  const priceUnitSuffix = getPriceUnitSuffix(quantityUnit);
  const total = (unitPrice || 0) * draftQty;
  const totalBase = (unitBasePrice || 0) * draftQty;
  const qtyDisplay = formatQuantityWithUnit(draftQty, quantityUnit);

  const handleConfirm = () => {
    if (draftQty < 1) {
      setError('Choisissez au moins 1 pour continuer.');
      return;
    }
    onConfirm(draftQty);
  };

  return (
    <div className="shop-qty-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="shop-qty-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-qty-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="shop-qty-modal-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        <h2 id="shop-qty-modal-title" className="shop-qty-modal-title">
          Votre quantité
        </h2>
        <p className="shop-qty-modal-product">{productName}</p>

        <ShopQuantityPicker
          quantity={draftQty}
          onChange={(q) => {
            setDraftQty(q);
            if (q >= 1) setError('');
          }}
          quantityUnit={quantityUnit}
          quantityLabel={quantityLabel}
          min={0}
          highlight
        />

        <div className="shop-qty-modal-price">
          {draftQty < 1 ? (
            <>
              <span className="shop-qty-modal-price-label">Prix unitaire</span>
              <span className="shop-qty-modal-price-main">
                {formatPriceXof(unitPrice)}
                {priceUnitSuffix ? <span className="shop-pdp-price-unit">{priceUnitSuffix}</span> : null}
              </span>
              <p className="shop-qty-modal-hint">Augmentez la quantité pour voir le total.</p>
            </>
          ) : (
            <>
              <span className="shop-qty-modal-price-label">Total</span>
              <span className="shop-qty-modal-price-main">{formatPriceXof(total)}</span>
              {isPromoLive ? (
                <span className="shop-qty-modal-price-old">{formatPriceXof(totalBase)}</span>
              ) : null}
              <p className="shop-qty-modal-hint">
                {formatPriceXof(unitPrice)}
                {priceUnitSuffix}
                {' × '}
                {qtyDisplay}
              </p>
            </>
          )}
        </div>

        {error ? (
          <p className="shop-qty-modal-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="shop-pdp-cta shop-pdp-cta--primary shop-qty-modal-cta"
          disabled={submitting}
          onClick={handleConfirm}
        >
          {submitting ? 'Enregistrement…' : ctaLabel}
        </button>
      </div>
    </div>
  );
}
