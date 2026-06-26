import React from 'react';
import { formatPriceXof } from '../../utils/shopPromo';
import {
  computeEviscerationFee,
  EVISCERATION_FEE_PER_KG,
  quantityToKg,
} from '../../utils/shopEvisceration';
import './ShopEviscerationOption.css';

export default function ShopEviscerationOption({
  enabled,
  onChange,
  quantity,
  quantityUnit,
}) {
  const kg = quantityToKg(quantity, quantityUnit);
  const fee = computeEviscerationFee(quantity, quantityUnit, enabled);

  return (
    <div className="shop-evic-option">
      <p className="shop-evic-title">Éviscération et nettoyage</p>
      <p className="shop-evic-hint">
        {EVISCERATION_FEE_PER_KG.toLocaleString('fr-FR')} FCFA par kilo commandé
      </p>
      <div className="shop-evic-choices" role="group" aria-label="Éviscération et nettoyage">
        <button
          type="button"
          className={`shop-evic-choice${!enabled ? ' is-selected' : ''}`}
          onClick={() => onChange(false)}
        >
          Non
        </button>
        <button
          type="button"
          className={`shop-evic-choice${enabled ? ' is-selected' : ''}`}
          onClick={() => onChange(true)}
        >
          Oui
        </button>
      </div>
      {enabled && quantity >= 1 && fee > 0 ? (
        <p className="shop-evic-fee">
          + {formatPriceXof(fee)}
          <span className="shop-evic-fee-detail">
            {' '}
            ({kg.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} kg × {EVISCERATION_FEE_PER_KG} FCFA)
          </span>
        </p>
      ) : enabled && quantity < 1 ? (
        <p className="shop-evic-fee shop-evic-fee--hint">Choisissez une quantité pour voir le montant.</p>
      ) : null}
    </div>
  );
}
