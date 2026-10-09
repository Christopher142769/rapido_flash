import React from 'react';
import { formatSidePriceLabel, supplementOptions } from '../../pages/repas/mealSides';
import './MealSidePicker.css';

export default function MealSidePicker({
  sides,
  sideKey,
  onSideKey,
  extraQty,
  onExtraQty,
  highlightSide,
  sideError,
}) {
  const extras = supplementOptions();

  return (
    <div className="meal-picks-wrap">
      {sides.length ? (
        <fieldset
          id="meal-acc-section"
          className={`meal-picks${highlightSide && !sideKey ? ' is-highlight' : ''}`}
        >
          <legend>Accompagnement</legend>
          <p>Un seul choix. Offert, sauf les frites à 500 F.</p>
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
                  <small>{formatSidePriceLabel(side.name, 'side')}</small>
                </button>
              );
            })}
          </div>
          {sideError ? <p className="meal-picks-error">{sideError}</p> : null}
        </fieldset>
      ) : null}

      <fieldset id="meal-extra-section" className="meal-picks meal-picks--extra">
        <legend>Suppléments</legend>
        <p>Ajoutez ce que vous voulez. 500 F, frites à 1 000 F.</p>
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
                  <small>{formatSidePriceLabel(extra.name, 'extra')}</small>
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
      </fieldset>
    </div>
  );
}
