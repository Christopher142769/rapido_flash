import React from 'react';
import { formatFilterQuantity } from '../../utils/commandesFilterStats';

/**
 * KPIs commandes selon les filtres actifs (date, statut, produit…).
 */
export default function CommandesFilterStats({
  orderCount,
  totalQuantity,
  totalAmount,
  statutLabel,
  productLabel,
  formatPrice,
  quantityLabel = 'Quantité totale',
}) {
  return (
    <div className="commercial-kpi-grid commandes-filter-stats">
      <div className="commercial-kpi">
        <div className="commercial-kpi-label">Commandes · {statutLabel}</div>
        <div className="commercial-kpi-value commercial-kpi-value--gold">{orderCount}</div>
        <p className="commandes-filter-stats-hint">{productLabel}</p>
      </div>
      <div className="commercial-kpi">
        <div className="commercial-kpi-label">{quantityLabel}</div>
        <div className="commercial-kpi-value">{formatFilterQuantity(totalQuantity)}</div>
        <p className="commandes-filter-stats-hint">Selon filtres actifs</p>
      </div>
      <div className="commercial-kpi">
        <div className="commercial-kpi-label">Montant total</div>
        <div className="commercial-kpi-value">{formatPrice(totalAmount)}</div>
        <p className="commandes-filter-stats-hint">Période filtrée</p>
      </div>
    </div>
  );
}
