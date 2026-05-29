import React from 'react';
import { formatQuantityWithUnit } from '../../utils/shopQuantityUnit';

export default function ShopQuantityPicker({
  quantity,
  onChange,
  quantityUnit,
  quantityLabel,
  min = 0,
  max = 999,
  highlight = false,
  id,
}) {
  const display = formatQuantityWithUnit(quantity, quantityUnit);
  const canDecrease = quantity > min;

  return (
    <div
      id={id}
      className={`shop-pdp-buybox-qty${highlight ? ' shop-pdp-buybox-qty--highlight' : ''}`}
    >
      <span>{quantityLabel}</span>
      <div className="shop-pdp-qty-controls">
        <button
          type="button"
          aria-label="Moins"
          disabled={!canDecrease}
          onClick={() => onChange(Math.max(min, quantity - 1))}
        >
          −
        </button>
        <span className="shop-pdp-qty-value">{display}</span>
        <button
          type="button"
          aria-label="Plus"
          disabled={quantity >= max}
          onClick={() => onChange(Math.min(max, quantity + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
