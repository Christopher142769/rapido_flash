import React, { useCallback, useEffect, useState } from 'react';
import PageLoader from '../../components/PageLoader';
import { fetchPointsProducts, fetchPointsSummary } from '../../utils/commercialApi';
import { formatQuantityWithUnit } from '../../utils/shopQuantityUnit';
import './commercial.css';

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

const productKey = (p) => (p._id ? String(p._id) : `name:${p.name}`);

export default function CommercialPointsPage() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ ...defaultDateRange(), productKey: '' });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchPointsProducts();
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const runSummary = async (e) => {
    e?.preventDefault();
    setError('');
    if (!filters.productKey) {
      setError('Sélectionnez un produit');
      return;
    }
    const selected = products.find((p) => productKey(p) === filters.productKey);
    if (!selected) return;

    setLoadingSummary(true);
    try {
      const params = {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      };
      if (selected._id) params.productId = selected._id;
      else params.productName = selected.name;

      setSummary(await fetchPointsSummary(params));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="commercial-page">
      <h1>Points</h1>
      <p className="commercial-lead">
        Quantité totale des commandes <strong>confirmées</strong> pour un produit sur une période
        donnée.
      </p>

      <div className="commercial-card">
        <form onSubmit={runSummary}>
          <div className="commercial-filters">
            <label>
              Du
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                required
              />
            </label>
            <label>
              Au
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                required
              />
            </label>
            <label>
              Produit
              <select
                value={filters.productKey}
                onChange={(e) => setFilters({ ...filters, productKey: e.target.value })}
                required
              >
                <option value="">Choisir un produit</option>
                {products.map((p) => (
                  <option key={productKey(p)} value={productKey(p)}>
                    {p.name}
                    {p.fromOrders ? ' (hors catalogue)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="commercial-btn commercial-btn--primary"
              disabled={loadingSummary}
            >
              {loadingSummary ? 'Calcul…' : 'Calculer'}
            </button>
          </div>
        </form>

        {error ? <p style={{ color: '#c0392b', margin: '0 0 1rem' }}>{error}</p> : null}

        {summary ? (
          <>
            <div className="commercial-kpi-grid" style={{ marginTop: '0.5rem' }}>
              <div className="commercial-kpi">
                <div className="commercial-kpi-label">Produit</div>
                <div className="commercial-kpi-value" style={{ fontSize: '1.1rem' }}>
                  {summary.productName}
                </div>
              </div>
              <div className="commercial-kpi">
                <div className="commercial-kpi-label">Quantité totale confirmée</div>
                <div className="commercial-kpi-value commercial-kpi-value--gold">
                  {formatQuantityWithUnit(summary.totalQuantity, summary.quantityUnit)}
                </div>
              </div>
              <div className="commercial-kpi">
                <div className="commercial-kpi-label">Nombre de commandes</div>
                <div className="commercial-kpi-value">{summary.orderCount}</div>
              </div>
              <div className="commercial-kpi">
                <div className="commercial-kpi-label">Période</div>
                <div className="commercial-kpi-value" style={{ fontSize: '0.95rem' }}>
                  {new Date(summary.dateFrom).toLocaleDateString('fr-FR')} →{' '}
                  {new Date(summary.dateTo).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>

            {summary.orders?.length > 0 ? (
              <div className="commercial-table-wrap" style={{ marginTop: '1.25rem' }}>
                <table className="commercial-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>N° commande</th>
                      <th>Quantité</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.orders.map((row) => (
                      <tr key={row.id}>
                        <td>{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                        <td>{row.orderNumber || '—'}</td>
                        <td>{row.quantityLabel || row.quantity}</td>
                        <td>{row.statut}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : (
          <p style={{ color: '#666', margin: 0 }}>
            Choisissez une période et un produit, puis cliquez sur Calculer.
          </p>
        )}
      </div>
    </div>
  );
}
