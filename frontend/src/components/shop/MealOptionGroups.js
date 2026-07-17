import React from 'react';
import { formatPriceXof } from '../../utils/shopPromo';
import { isChoiceSelected, optionChoiceKey, optionGroupKey } from '../../utils/mealOptions';
import './MealOptionGroups.css';

/**
 * Affiche les groupes d'options d'un plat.
 * @param {object[]} groups
 * @param {object} selection état {groupKey: choiceKey[]}
 * @param {(group, choice) => void} onToggle
 */
export default function MealOptionGroups({ groups = [], selection = {}, onToggle }) {
  if (!groups || !groups.length) return null;
  return (
    <div className="meal-opt-groups">
      {groups.map((g) => {
        const multiple = g.selectionType === 'multiple';
        return (
          <div key={optionGroupKey(g)} className="meal-opt-group">
            <div className="meal-opt-group-head">
              <strong>
                {g.name}
                {g.required ? <span className="meal-opt-req"> *</span> : null}
              </strong>
              <span className="meal-opt-hint">
                {multiple ? 'Plusieurs choix' : 'Un choix'}
                {g.required ? ' · requis' : ''}
              </span>
            </div>
            <div className="meal-opt-choices">
              {(g.choices || []).map((c) => {
                const selected = isChoiceSelected(selection, g, c);
                return (
                  <button
                    key={optionChoiceKey(c)}
                    type="button"
                    className={`meal-opt-choice${selected ? ' is-selected' : ''}`}
                    onClick={() => onToggle(g, c)}
                    aria-pressed={selected}
                  >
                    <span className={`meal-opt-mark${multiple ? ' is-check' : ''}`} aria-hidden />
                    <span className="meal-opt-label">{c.label}</span>
                    <span className="meal-opt-price">
                      {Number(c.price) > 0 ? `+${formatPriceXof(c.price)}` : 'Inclus'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
