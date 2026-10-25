import React, { useState } from 'react';
import { formatSidePriceLabel } from '../../pages/repas/mealSides';
import './MealSidePicker.css';

export default function MealSidePicker({
  sides,
  sideKey,
  onSideKey,
  extraQty,
  onExtraQty,
  highlightSide,
  sideError,
  extras = [],
}) {
  const extrasCount = extras.filter((x) => Number(extraQty?.[x.key]) > 0).length;
  const [extrasOpen, setExtrasOpen] = useState(() => extrasCount > 0);

  return (
    <div className="meal-picks-wrap">
      {sides.length ? (
        <fieldset
          id="meal-acc-section"
          className={`meal-picks${highlightSide && !sideKey ? ' is-highlight' : ''}`}
        >
          <legend>Accompagnement</legend>
          <p>1 accompagnement au choix, inclus dans le prix (sauf mention « + … F »).</p>
          <div className="meal-picks-grid" role="radiogroup" aria-label="Accompagnement">
            {sides.map((side) => {
              const on = sideKey === side.key;
              return (
                <button
                  key={side.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`meal-pick${on ? ' is-on' : ''}`}
                  onClick={() => onSideKey(side.key)}
                >
                  <b>{side.name}</b>
                  <small>{formatSidePriceLabel(side.price, 'side')}</small>
                </button>
              );
            })}
          </div>
          {sideError ? <p className="meal-picks-error">{sideError}</p> : null}
        </fieldset>
      ) : null}

      {extras.length ? (
        <details
          id="meal-extra-section"
          className="meal-picks meal-picks--extra"
          open={extrasOpen}
          onToggle={(e) => setExtrasOpen(e.currentTarget.open)}
        >
          <summary>
            Ajouter un supplément <span>(facultatif{extrasCount ? ` · ${extrasCount} choisi${extrasCount > 1 ? 's' : ''}` : ''})</span>
          </summary>
          <p>Portion en plus de votre accompagnement, prix indiqué sur chaque supplément.</p>
          <div className="meal-picks-grid">
            {extras.map((extra) => {
              const qty = Math.max(0, Number(extraQty?.[extra.key]) || 0);
              return (
                <div key={extra.key} className={`meal-extra${qty > 0 ? ' is-on' : ''}`}>
                  <button
                    type="button"
                    className="meal-pick"
                    aria-pressed={qty > 0}
                    onClick={() => onExtraQty(extra.key, qty > 0 ? 0 : 1)}
                  >
                    <b>{extra.name}</b>
                    <small>{formatSidePriceLabel(extra.price, 'extra')}</small>
                  </button>
                  {qty > 0 ? (
                    <div className="meal-extra-qty">
                      <button
                        type="button"
                        aria-label={`Moins de ${extra.name}`}
                        onClick={() => onExtraQty(extra.key, qty - 1)}
                      >
                        −
                      </button>
                      <span>{qty}</span>
                      <button
                        type="button"
                        aria-label={`Plus de ${extra.name}`}
                        onClick={() => onExtraQty(extra.key, Math.min(5, qty + 1))}
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}
