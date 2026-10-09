import React, { useEffect, useMemo, useState } from 'react';
import { formatPriceXof } from '../../utils/shopPromo';
import MealOptionGroups from './MealOptionGroups';
import MealSidePicker from './MealSidePicker';
import { buildSideLines, productSideOptions } from '../../pages/repas/mealSides';
import {
  buildOptionSelection,
  toggleOptionChoice,
  selectedOptionsList,
  optionsPerUnitTotal,
  validateOptionSelection,
} from '../../utils/mealOptions';
import './MealAddToCartModal.css';

export default function MealAddToCartModal({
  open,
  onClose,
  product,
  onConfirm,
  ctaLabel = 'Ajouter au panier',
}) {
  const sideOptions = productSideOptions(product);
  const hasAcc = sideOptions.length > 0;
  const optionGroups = product?.optionGroups || [];
  const hasOptions = optionGroups.length > 0;
  const allowSpec = product?.allowSpecifications !== false;
  const unitPrice = product?.isPromoLive ? product.promoPrice : product?.basePrice;

  const [quantity, setQuantity] = useState(1);
  const [sideKey, setSideKey] = useState('');
  const [extraQty, setExtraQty] = useState({});
  const [optSelection, setOptSelection] = useState(() => buildOptionSelection(optionGroups));
  const [specifications, setSpecifications] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !product) return;
    setQuantity(1);
    setSideKey('');
    setExtraQty({});
    setOptSelection(buildOptionSelection(product.optionGroups || []));
    setSpecifications('');
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

  const selectedAcc = useMemo(
    () => buildSideLines(product, sideKey, extraQty),
    [product, sideKey, extraQty]
  );

  const selectedOptions = useMemo(
    () => selectedOptionsList(optionGroups, optSelection),
    [optionGroups, optSelection]
  );
  const optPerUnit = optionsPerUnitTotal(selectedOptions);

  const accTotal = selectedAcc.reduce((s, a) => s + a.price * a.quantity, 0);
  const linePreview = ((Number(unitPrice) || 0) + optPerUnit) * quantity + accTotal;

  if (!open || !product) return null;

  const handleToggleOption = (group, choice) => {
    setOptSelection((s) => toggleOptionChoice(s, group, choice));
    setError('');
  };

  const handleConfirm = () => {
    if (quantity < 1) {
      setError('Choisissez au moins 1 plat.');
      return;
    }
    if (hasAcc && !selectedAcc.some((a) => a.role === 'side')) {
      setError('Choisissez un seul accompagnement.');
      return;
    }
    const optError = validateOptionSelection(optionGroups, optSelection);
    if (optError) {
      setError(optError);
      return;
    }
    onConfirm({
      quantity,
      accompagnements: selectedAcc,
      options: selectedOptions,
      specifications: specifications.trim(),
    });
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

        <MealSidePicker
          sides={sideOptions}
          sideKey={sideKey}
          onSideKey={(key) => {
            setSideKey(key);
            setError('');
          }}
          extraQty={extraQty}
          onExtraQty={(key, next) => setExtraQty((current) => ({ ...current, [key]: next }))}
          highlightSide={false}
          sideError={hasAcc && error && !selectedAcc.some((a) => a.role === 'side') ? error : ''}
        />

        {hasOptions ? (
          <div className="meal-atc-options">
            <h3>Options</h3>
            <MealOptionGroups
              groups={optionGroups}
              selection={optSelection}
              onToggle={handleToggleOption}
            />
          </div>
        ) : null}

        {allowSpec ? (
          <div className="meal-spec-field">
            <label htmlFor="meal-atc-spec">Spécifications du plat (facultatif)</label>
            <textarea
              id="meal-atc-spec"
              value={specifications}
              maxLength={500}
              placeholder="Ex : bien cuit, sans oignon, peu épicé…"
              onChange={(e) => setSpecifications(e.target.value)}
            />
            <p className="meal-spec-hint">Précisez vos préférences pour ce plat.</p>
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
