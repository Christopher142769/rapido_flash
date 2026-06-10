import React, { useCallback, useEffect, useState } from 'react';
import PageLoader from '../../components/PageLoader';
import { useModal } from '../../context/ModalContext';
import {
  createOffPlatformOrder,
  fetchCommercialBilan,
  formatCommercialStatus,
  formatPrice,
} from '../../utils/commercialApi';
import { exportBilanToCsv } from '../../utils/exportBilanCsv';
import './commercial.css';

const emptyOffPlatform = {
  orderDate: '',
  productName: '',
  orderNumber: '',
  quantity: '1',
  location: '',
  amount: '',
  commercialStatus: 'commande',
};

export default function CommercialBilanPage() {
  const { showSuccess, showError } = useModal();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    product: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    offPlatform: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyOffPlatform);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.product) params.product = filters.product;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.status) params.status = filters.status;
      if (filters.offPlatform) params.offPlatform = filters.offPlatform;
      const data = await fetchCommercialBilan(params);
      setRows(data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    const suffix = filters.product || filters.status || 'complet';
    exportBilanToCsv(rows, `bilan-commercial-${suffix}-${Date.now()}.csv`);
  };

  const submitOffPlatform = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createOffPlatformOrder({
        orderDate: form.orderDate ? new Date(form.orderDate).toISOString() : new Date().toISOString(),
        productName: form.productName,
        orderNumber: form.orderNumber,
        quantity: Number(form.quantity),
        location: form.location,
        amount: Number(form.amount),
        commercialStatus: form.commercialStatus,
      });
      showSuccess('Commande hors plateforme ajoutée au bilan');
      setForm(emptyOffPlatform);
      setShowForm(false);
      await load();
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) return <PageLoader />;

  return (
    <div className="commercial-page">
      <h1>Bilan commercial</h1>
      <p className="commercial-lead">
        Tableau récapitulatif depuis le 09/06/2026. Montant grisé = commande en cours ; vert = livré
        (encaissé).
      </p>

      <div className="commercial-card">
        <div className="commercial-filters">
          <label>
            Produit
            <input
              value={filters.product}
              onChange={(e) => setFilters({ ...filters, product: e.target.value })}
              placeholder="Filtrer…"
            />
          </label>
          <label>
            Du
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </label>
          <label>
            Au
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </label>
          <label>
            Statut
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Tous</option>
              <option value="commande">Commande</option>
              <option value="confirme">Confirmé</option>
              <option value="relance">Relance</option>
              <option value="livree">Livré</option>
            </select>
          </label>
          <label>
            Source
            <select
              value={filters.offPlatform}
              onChange={(e) => setFilters({ ...filters, offPlatform: e.target.value })}
            >
              <option value="">Toutes</option>
              <option value="true">Hors plateforme</option>
              <option value="false">Plateforme</option>
            </select>
          </label>
          <button type="button" className="commercial-btn commercial-btn--outline" onClick={load}>
            Filtrer
          </button>
          <button type="button" className="commercial-btn commercial-btn--primary" onClick={handleExport}>
            Exporter Excel (CSV)
          </button>
          <button
            type="button"
            className="commercial-btn commercial-btn--outline"
            onClick={() => setShowForm(!showForm)}
          >
            + Commande hors plateforme
          </button>
        </div>

        {showForm ? (
          <form onSubmit={submitOffPlatform} style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem' }}>Nouvelle commande hors plateforme</h3>
            <div className="commercial-form-grid">
              <div className="commercial-form-field">
                <label>Date</label>
                <input
                  type="date"
                  value={form.orderDate}
                  onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
                  required
                />
              </div>
              <div className="commercial-form-field">
                <label>Produit</label>
                <input
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  required
                />
              </div>
              <div className="commercial-form-field">
                <label>N° commande</label>
                <input
                  value={form.orderNumber}
                  onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
                  required
                />
              </div>
              <div className="commercial-form-field">
                <label>Quantité</label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="commercial-form-field">
                <label>Lieu</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                />
              </div>
              <div className="commercial-form-field">
                <label>Montant (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="commercial-form-field">
                <label>Statut</label>
                <select
                  value={form.commercialStatus}
                  onChange={(e) => setForm({ ...form, commercialStatus: e.target.value })}
                >
                  <option value="commande">Commande</option>
                  <option value="livree">Livré</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: 8 }}>
              <button
                type="submit"
                className="commercial-btn commercial-btn--primary"
                disabled={busy}
              >
                Enregistrer
              </button>
              <button
                type="button"
                className="commercial-btn commercial-btn--outline"
                onClick={() => setShowForm(false)}
              >
                Annuler
              </button>
            </div>
          </form>
        ) : null}

        <div className="commercial-table-wrap">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Qté</th>
                <th>N° commande</th>
                <th>Lieu</th>
                <th>Statut</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                  <td>
                    {row.productName}
                    {row.isOffPlatform ? (
                      <span className="commercial-badge commercial-badge--off" style={{ marginLeft: 4 }}>
                        HP
                      </span>
                    ) : null}
                  </td>
                  <td>{row.quantityLabel || row.quantity}</td>
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
          {rows.length === 0 ? <p style={{ padding: '1rem' }}>Aucune ligne pour ces filtres.</p> : null}
        </div>
      </div>
    </div>
  );
}
