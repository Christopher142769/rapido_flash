import React, { useCallback, useEffect, useState } from 'react';
import PageLoader from '../../components/PageLoader';
import {
  fetchCommercialOverview,
  formatCommercialStatus,
  formatPrice,
} from '../../utils/commercialApi';
import './commercial.css';

export default function CommercialOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await fetchCommercialOverview());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoader />;
  if (!data) return <p>Impossible de charger la vue d&apos;ensemble.</p>;

  return (
    <div className="commercial-page">
      <h1>Vue d&apos;ensemble — Commercial</h1>
      <p className="commercial-lead">
        Bilan à partir du 09/06/2026 · commandes Shop express et hors plateforme.
      </p>

      <div className="commercial-kpi-grid">
        <div className="commercial-kpi">
          <div className="commercial-kpi-label">Chiffre d&apos;affaires (livré)</div>
          <div className="commercial-kpi-value commercial-kpi-value--gold">
            {formatPrice(data.revenueReceived)}
          </div>
        </div>
        <div className="commercial-kpi">
          <div className="commercial-kpi-label">Montant total commandes</div>
          <div className="commercial-kpi-value">{formatPrice(data.totalOrdersAmount)}</div>
        </div>
        <div className="commercial-kpi">
          <div className="commercial-kpi-label">Livraisons effectuées</div>
          <div className="commercial-kpi-value">{data.deliveryCount}</div>
        </div>
        <div className="commercial-kpi">
          <div className="commercial-kpi-label">En commande</div>
          <div className="commercial-kpi-value">{data.pendingCount}</div>
        </div>
        <div className="commercial-kpi">
          <div className="commercial-kpi-label">En relance</div>
          <div className="commercial-kpi-value">{data.relanceCount}</div>
        </div>
        <div className="commercial-kpi">
          <div className="commercial-kpi-label">Relances aujourd&apos;hui</div>
          <div className="commercial-kpi-value">{data.todayRelances}</div>
        </div>
      </div>

      <div className="commercial-card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem' }}>Détails récents</h2>
        <div className="commercial-table-wrap">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>N° commande</th>
                <th>Lieu</th>
                <th>Statut</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent || []).map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                  <td>
                    {row.productName}
                    {row.isOffPlatform ? (
                      <span className="commercial-badge commercial-badge--off" style={{ marginLeft: 6 }}>
                        Hors plateforme
                      </span>
                    ) : null}
                  </td>
                  <td>{row.orderNumber}</td>
                  <td>{row.location}</td>
                  <td>
                    <span className={`commercial-badge commercial-badge--${row.commercialStatus}`}>
                      {formatCommercialStatus(row.commercialStatus)}
                    </span>
                  </td>
                  <td
                    className={
                      row.commercialStatus === 'livree'
                        ? 'commercial-amount--received'
                        : 'commercial-amount--pending'
                    }
                  >
                    {formatPrice(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
