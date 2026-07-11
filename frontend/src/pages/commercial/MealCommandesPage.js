import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import { formatPriceXof } from '../../utils/shopPromo';
import SectionRefreshButton from '../../components/dashboard/SectionRefreshButton';
import { useRegisterDashboardRefresh } from '../../context/DashboardRefreshContext';
import './MealCommandesPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const STATUTS = [
  { value: '', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'confirmee', label: 'Confirmée' },
  { value: 'en_livraison', label: 'En livraison' },
  { value: 'livree', label: 'Livrée' },
  { value: 'annulee', label: 'Annulée' },
];

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function customerName(c) {
  if (!c) return '—';
  return `${c.firstName || ''} ${c.lastName || ''}`.trim() || '—';
}

export default function MealCommandesPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statut) params.statut = statut;
      const res = await axios.get(`${API_URL}/meal-orders`, { headers: authHeaders(), params });
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [statut]);

  useEffect(() => {
    load();
  }, [load]);

  useRegisterDashboardRefresh(load);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((o) => {
      const hay = [
        o.orderNumber,
        customerName(o.customer),
        o.customer?.phone,
        ...(o.items || []).map((i) => i.productName),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [orders, q]);

  const updateStatut = async (id, next) => {
    try {
      await axios.put(
        `${API_URL}/meal-orders/${id}/statut`,
        { statut: next },
        { headers: authHeaders() }
      );
      await load();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Réf', 'Date', 'Client', 'Téléphone', 'Ville', 'Plats', 'Total', 'Statut'],
      ...filtered.map((o) => [
        o.orderNumber || '',
        o.createdAt ? new Date(o.createdAt).toLocaleString('fr-FR') : '',
        customerName(o.customer),
        o.customer?.phone || '',
        o.customer?.city || '',
        (o.items || []).map((i) => `${i.productName}×${i.quantity}`).join(' | '),
        o.totalPrice,
        o.statut,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commandes-repas-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !orders.length) return <PageLoader />;

  return (
    <div className="dashboard-page meal-cmd-page">
      <div className="dashboard-header">
        <div>
          <h1>Commandes Repas</h1>
          <p className="plats-subhint">Commandes multi-plats — plus anciennes en haut</p>
        </div>
        <div className="meal-cmd-actions">
          <SectionRefreshButton onRefresh={load} />
          <button type="button" className="btn-outline" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="meal-cmd-filters">
        <select value={statut} onChange={(e) => setStatut(e.target.value)}>
          {STATUTS.map((s) => (
            <option key={s.value || 'all'} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Rechercher…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error ? <p className="meal-cmd-err">{error}</p> : null}

      <div className="meal-cmd-list">
        {filtered.map((o) => (
          <article key={o._id} className="meal-cmd-card">
            <header className="meal-cmd-card-head">
              <div>
                <strong>{o.orderNumber || o._id?.slice(-6)}</strong>
                <span className="meal-cmd-date">
                  {o.createdAt ? new Date(o.createdAt).toLocaleString('fr-FR') : ''}
                </span>
              </div>
              <select
                value={o.statut}
                onChange={(e) => updateStatut(o._id, e.target.value)}
                className="meal-cmd-statut"
              >
                {STATUTS.filter((s) => s.value).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </header>
            <p className="meal-cmd-client">
              {customerName(o.customer)} · {o.customer?.phone} · {o.customer?.city}
            </p>
            <p className="meal-cmd-addr">{o.customer?.addressDescription}</p>
            <ul className="meal-cmd-items">
              {(o.items || []).map((it, idx) => (
                <li key={it._id || idx}>
                  <strong>
                    {it.productName} ×{it.quantity}
                  </strong>{' '}
                  — {formatPriceXof(it.lineTotal)}
                  {(it.accompagnements || []).length ? (
                    <ul>
                      {it.accompagnements.map((a, i) => (
                        <li key={i}>
                          {a.name} ×{a.quantity} ({formatPriceXof(a.price * a.quantity)})
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
            <footer className="meal-cmd-foot">
              <span>
                Sous-total {formatPriceXof(o.subtotalPrice)}
                {o.deliveryFee > 0 ? ` + livraison ${formatPriceXof(o.deliveryFee)}` : ''}
              </span>
              <strong>{formatPriceXof(o.totalPrice)}</strong>
            </footer>
          </article>
        ))}
        {!filtered.length ? <p className="meal-cmd-empty">Aucune commande.</p> : null}
      </div>
    </div>
  );
}
