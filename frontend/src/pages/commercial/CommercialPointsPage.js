import React, { useCallback, useEffect, useState } from 'react';
import PageLoader from '../../components/PageLoader';
import { fetchPointsProducts, fetchPointsSummary, formatCommercialStatus, formatPrice } from '../../utils/commercialApi';
import { exportPointsToExcel, exportPointsToPdf } from '../../utils/exportPointsDelivery';
import { POINTS_CITIES } from '../../utils/pointsByCity';
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
  const [filters, setFilters] = useState({ ...defaultDateRange(), productKey: '', city: '' });
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
      if (filters.city) params.city = filters.city;

      setSummary(await fetchPointsSummary(params));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  if (loading) return <PageLoader />;

  const byCity = summary?.byCity || [];

  return (
    <div className="commercial-page">
      <h1>Points</h1>
      <p className="commercial-lead">
        Quantité totale des commandes au statut <strong>Confirmé</strong> uniquement (hors relance et
        hors livré) pour un produit sur une période. Filtrez par ville (Cotonou ou Calavi) et exportez
        la synthèse classée par ville pour vos livreurs.
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
            <label>
              Ville
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              >
                <option value="">Toutes les villes</option>
                {POINTS_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
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
                <div className="commercial-kpi-label">Montant total</div>
                <div className="commercial-kpi-value">{formatPrice(summary.totalAmount)}</div>
              </div>
            </div>

            {byCity.length > 0 ? (
              <div className="commercial-city-grid">
                {byCity.map((g) => (
                  <div key={g.city} className="commercial-city-card">
                    <div className="commercial-city-card__title">{g.city}</div>
                    <div className="commercial-city-card__qty">
                      {g.totalQuantityLabel || formatQuantityWithUnit(g.totalQuantity, summary.quantityUnit)}
                    </div>
                    <div className="commercial-city-card__meta">
                      {g.orderCount} commande{g.orderCount > 1 ? 's' : ''} · {formatPrice(g.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {summary.orders?.length > 0 ? (
              <>
                <div className="commercial-filters" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="commercial-btn commercial-btn--primary"
                    onClick={() => exportPointsToExcel(summary)}
                  >
                    Exporter Excel
                  </button>
                  <button
                    type="button"
                    className="commercial-btn commercial-btn--outline"
                    onClick={() => exportPointsToPdf(summary)}
                  >
                    Exporter PDF livreurs
                  </button>
                </div>

                {byCity.map((group) => (
                  <div key={group.city} className="commercial-city-section">
                    <div className="commercial-city-section__header">
                      <h2>{group.city}</h2>
                      <span className="commercial-city-section__badge">
                        {group.totalQuantityLabel ||
                          formatQuantityWithUnit(group.totalQuantity, summary.quantityUnit)}{' '}
                        · {group.orderCount} cmd
                      </span>
                    </div>
                    <div className="commercial-table-wrap">
                      <table className="commercial-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>N° commande</th>
                            <th>Prénom</th>
                            <th>Nom</th>
                            <th>Téléphone</th>
                            <th>Adresse</th>
                            <th>Qté</th>
                            <th>Statut</th>
                            <th>Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.orders.map((row) => (
                            <tr key={row.id}>
                              <td>{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                              <td>{row.orderNumber || '—'}</td>
                              <td>{row.firstName}</td>
                              <td>{row.lastName}</td>
                              <td>{row.phone}</td>
                              <td style={{ maxWidth: 180 }}>{row.address}</td>
                              <td>{row.quantityLabel || row.quantity}</td>
                              <td>
                                <span className={`commercial-badge commercial-badge--${row.commercialStatus}`}>
                                  {formatCommercialStatus(row.commercialStatus)}
                                </span>
                              </td>
                              <td>{formatPrice(row.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p style={{ marginTop: '1rem', color: '#666' }}>Aucune commande confirmée sur cette période.</p>
            )}
          </>
        ) : (
          <p style={{ color: '#666', margin: 0 }}>
            Choisissez une période, un produit et éventuellement une ville, puis cliquez sur Calculer.
          </p>
        )}
      </div>
    </div>
  );
}
