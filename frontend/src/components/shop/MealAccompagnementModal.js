import React, { useEffect, useMemo, useState } from 'react';
import { formatPriceXof } from '../../utils/shopPromo';
import './MealAccompagnementModal.css';

function buildDraft(options, initialQty = {}) {
  const draft = {};
  (options || []).forEach((a) => {
    const key = String(a._id || a.name);
    draft[key] = Math.max(0, Number(initialQty[key]) || 0);
  });
  return draft;
}

export default function MealAccompagnementModal({
  open,
  onClose,
  productName,
  options = [],
  initialQty = {},
  onConfirm,
  ctaLabel = 'Valider et commander',
}) {
  const [draft, setDraft] = useState(() => buildDraft(options, initialQty));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft(buildDraft(options, initialQty));
    setError('');
    // Sync only when the modal opens — not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open]);

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

  const selectedCount = useMemo(
    () => Object.values(draft).reduce((sum, q) => sum + (Number(q) > 0 ? 1 : 0), 0),
    [draft]
  );

  const accTotal = useMemo(
    () =>
      (options || []).reduce((sum, a) => {
        const key = String(a._id || a.name);
        const q = Number(draft[key]) || 0;
        return sum + (Number(a.price) || 0) * q;
      }, 0),
    [options, draft]
  );

  if (!open) return null;

  const setQty = (key, next, maxQuantity) => {
    const max = Math.max(1, Number(maxQuantity) || 10);
    setDraft((d) => ({ ...d, [key]: Math.min(max, Math.max(0, next)) }));
    setError('');
  };

  const handleConfirm = () => {
    if (selectedCount < 1) {
      setError('Choisissez au moins un accompagnement pour continuer.');
      return;
    }
    onConfirm(draft);
  };

  return (
    <div className="meal-acc-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="meal-acc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-acc-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="meal-acc-modal-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>

        <div className="meal-acc-modal-icon" aria-hidden>
          <span className="meal-acc-modal-icon-mark" />
        </div>
        <h2 id="meal-acc-modal-title" className="meal-acc-modal-title">
          Choisissez un accompagnement
        </h2>
        <p className="meal-acc-modal-lead">
          Pour <strong>{productName}</strong>, sélectionnez au moins un accompagnement avant de
          commander.
        </p>

        <div className="meal-acc-modal-list">
          {options.map((a) => {
            const key = String(a._id || a.name);
            const q = draft[key] || 0;
            return (
              <div key={key} className={`meal-acc-modal-row${q > 0 ? ' is-selected' : ''}`}>
                <div className="meal-acc-modal-info">
                  <strong>{a.name}</strong>
                  <span>{formatPriceXof(a.price)}</span>
                </div>
                <div className="meal-acc-modal-ctrl">
                  <button
                    type="button"
                    aria-label={`Retirer ${a.name}`}
                    onClick={() => setQty(key, q - 1, a.maxQuantity)}
                  >
                    −
                  </button>
                  <span>{q}</span>
                  <button
                    type="button"
                    aria-label={`Ajouter ${a.name}`}
                    onClick={() => setQty(key, q + 1, a.maxQuantity)}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {accTotal > 0 ? (
          <p className="meal-acc-modal-total">
            Supplément : <strong>{formatPriceXof(accTotal)}</strong>
          </p>
        ) : null}

        {error ? <p className="meal-acc-modal-error">{error}</p> : null}

        <button type="button" className="meal-acc-modal-cta" onClick={handleConfirm}>
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
