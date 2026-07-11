import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import ShopOrderSpecsModal from '../../components/commercial/ShopOrderSpecsModal';
import { useModal } from '../../context/ModalContext';
import { formatPriceXof } from '../../utils/shopPromo';
import CommandesFilterStats from '../../components/commercial/CommandesFilterStats';
import { sumMealOrdersQuantity } from '../../utils/commandesFilterStats';
import { CITY_FILTER_LABELS, POINTS_CITIES } from '../../utils/pointsByCity';
import { formatDeliveryDateShort } from '../../utils/shopDeliveryDate';
import '../restaurant/RestaurantCommandes.css';
import './commercial.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SHOP_ORDER_TZ = 'Africa/Porto-Novo';

const STATUT_LABELS = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

const STATUT_COLORS = {
  en_attente: '#FFA500',
  confirmee: '#2196F3',
  en_preparation: '#9C27B0',
  en_livraison: '#00BCD4',
  livree: '#4CAF50',
  annulee: '#F44336',
};

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const fmt = (d) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_ORDER_TZ }).format(d);
  return { dateFrom: fmt(start), dateTo: fmt(end) };
}

function orderDayKey(order) {
  const raw = order.orderDate || order.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_ORDER_TZ }).format(d);
}

function formatOrderDate(order) {
  const raw = order.orderDate || order.createdAt;
  if (!raw) return '—';
  return new Date(raw).toLocaleString('fr-FR');
}

function customerName(c) {
  if (!c) return '—';
  return `${c.firstName || ''} ${c.lastName || ''}`.trim() || '—';
}

function renderPhoneLink(phone) {
  const trimmed = typeof phone === 'string' ? phone.trim() : '';
  if (!trimmed) return <span>—</span>;
  const telDigits = trimmed.replace(/[^\d+]/g, '');
  const href = telDigits ? `tel:${telDigits}` : null;
  return href ? (
    <a href={href} className="commande-livraison-phone-link">
      {trimmed}
    </a>
  ) : (
    <span>{trimmed}</span>
  );
}

function filterMealOrders(orders, { dateFrom, dateTo, statut, productKey, city } = {}) {
  return (orders || []).filter((o) => {
    if (statut && o.statut !== statut) return false;
    if (city && o.customer?.city !== city) return false;
    if (productKey) {
      const hit = (o.items || []).some((it) => {
        const id = String(it.mealProduct?._id || it.mealProduct || '');
        const slug = it.slug || '';
        const name = it.productName || '';
        return (
          id === productKey ||
          `slug:${slug}` === productKey ||
          `name:${name}` === productKey
        );
      });
      if (!hit) return false;
    }
    const key = orderDayKey(o);
    if (!key) return false;
    if (dateFrom && key < dateFrom) return false;
    if (dateTo && key > dateTo) return false;
    return true;
  });
}

function getMealProductOptions(orders) {
  const map = new Map();
  for (const o of orders || []) {
    for (const it of o.items || []) {
      const id = it.mealProduct?._id || it.mealProduct;
      const key = id ? String(id) : it.slug ? `slug:${it.slug}` : `name:${it.productName}`;
      if (!key || map.has(key)) continue;
      map.set(key, it.productName || key);
    }
  }
  return [...map.entries()].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

function escapeCsv(v) {
  const s = String(v ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Page Commandes Repas — même disposition / workflow que Commandes Shop. */
export default function MealCommandesPage() {
  const { showSuccess, showError } = useModal();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(() => defaultDateRange().dateFrom);
  const [dateTo, setDateTo] = useState(() => defaultDateRange().dateTo);
  const [specsOrder, setSpecsOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/meal-orders`, { headers: authHeaders() });
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      showError(e.response?.data?.message || e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const productOptions = useMemo(() => getMealProductOptions(orders), [orders]);

  const filteredOrders = useMemo(() => {
    const list = filterMealOrders(orders, {
      dateFrom,
      dateTo,
      statut: filter || undefined,
      productKey: productFilter || undefined,
      city: cityFilter || undefined,
    });
    return [...list].sort(
      (a, b) =>
        new Date(a.orderDate || a.createdAt).getTime() -
        new Date(b.orderDate || b.createdAt).getTime()
    );
  }, [orders, filter, productFilter, cityFilter, dateFrom, dateTo]);

  const selectedProductLabel =
    productOptions.find((p) => p.key === productFilter)?.label || 'Tous les plats';
  const selectedStatutLabel = filter ? STATUT_LABELS[filter] || filter : 'Tous les statuts';
  const selectedCityLabel = CITY_FILTER_LABELS[cityFilter] || 'Toutes les villes';

  const filterStats = useMemo(() => {
    const totalAmount = filteredOrders.reduce(
      (s, o) => s + (o.statut === 'annulee' ? 0 : Number(o.totalPrice) || 0),
      0
    );
    return {
      orderCount: filteredOrders.length,
      totalQuantity: sumMealOrdersQuantity(filteredOrders),
      totalAmount,
    };
  }, [filteredOrders]);

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      showSuccess(msg);
      await load();
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const updateStatut = (order, statut) => {
    run(
      () =>
        axios.put(
          `${API_URL}/meal-orders/${order._id}/statut`,
          { statut },
          { headers: authHeaders() }
        ),
      'Statut mis à jour'
    );
  };

  const handleSaveSpecs = async (text) => {
    if (!specsOrder) return;
    setBusy(true);
    try {
      await axios.put(
        `${API_URL}/meal-orders/${specsOrder._id}/statut`,
        { clientSpecifications: text },
        { headers: authHeaders() }
      );
      showSuccess('Spécifications enregistrées');
      setSpecsOrder(null);
      await load();
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = () => {
    if (!filteredOrders.length) {
      showError('Aucune commande à exporter pour cette période et ce filtre.');
      return;
    }
    const rows = [
      ['Réf', 'Date', 'Statut', 'Client', 'Téléphone', 'Ville', 'Adresse', 'Plats', 'Sous-total', 'Livraison', 'Total'],
      ...filteredOrders.map((o) => [
        o.orderNumber || '',
        formatOrderDate(o),
        STATUT_LABELS[o.statut] || o.statut,
        customerName(o.customer),
        o.customer?.phone || '',
        o.customer?.city || '',
        o.customer?.addressDescription || '',
        (o.items || [])
          .map((i) => `${i.productName}×${i.quantity}`)
          .join(' | '),
        o.subtotalPrice,
        o.deliveryFee,
        o.totalPrice,
      ]),
    ];
    const csv = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commandes-repas-${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ShopOrderSpecsModal
        order={specsOrder}
        onClose={() => !busy && setSpecsOrder(null)}
        onSave={handleSaveSpecs}
        saving={busy}
      />

      {loading ? (
        <PageLoader message="Chargement des commandes Repas..." />
      ) : (
        <div className="commandes-page">
          <div className="commandes-content">
            <div className="commandes-header">
              <h1>Commandes Repas</h1>
            </div>

            <div className="commercial-card shop-commandes-filters">
              <div className="commercial-filters">
                <label>
                  Du
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </label>
                <label>
                  Au
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </label>
                <label>
                  Statut
                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="">Tous les statuts</option>
                    {Object.entries(STATUT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Plat
                  <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
                    <option value="">Tous les plats</option>
                    {productOptions.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Ville
                  <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                    <option value="">Toutes les villes</option>
                    {POINTS_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="commercial-btn commercial-btn--outline"
                  onClick={load}
                  disabled={busy}
                >
                  Actualiser
                </button>
              </div>

              <CommandesFilterStats
                orderCount={filterStats.orderCount}
                totalQuantity={filterStats.totalQuantity}
                totalAmount={filterStats.totalAmount}
                statutLabel={selectedStatutLabel}
                productLabel={selectedProductLabel}
                cityLabel={selectedCityLabel}
                formatPrice={formatPriceXof}
                quantityLabel="Quantité plats"
              />

              <div className="shop-commandes-export-bar">
                <p className="shop-commandes-export-summary">
                  <strong>{filterStats.orderCount}</strong> commande
                  {filterStats.orderCount > 1 ? 's' : ''} · Total {formatPriceXof(filterStats.totalAmount)}
                </p>
                <div className="commercial-filters" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    className="commercial-btn commercial-btn--primary"
                    onClick={handleExportCsv}
                    disabled={!filteredOrders.length}
                  >
                    Exporter CSV
                  </button>
                </div>
              </div>
            </div>

            <p className="commandes-shop-hint">
              Filtrez par <strong>date de commande</strong>, statut, plat et ville. Même processus
              opérationnel que Commandes Shop : confirmer, préparation, livraison, livrée.
            </p>

            {filteredOrders.length === 0 ? (
              <div className="no-commandes">
                <p>
                  Aucune commande Repas pour cette période
                  {filter || productFilter ? ' avec ces filtres' : ''}.
                </p>
              </div>
            ) : (
              <div className="commandes-list">
                {filteredOrders.map((order) => {
                  const name = customerName(order.customer);
                  const addressLine = [order.customer?.city, order.customer?.addressDescription]
                    .filter(Boolean)
                    .join(' — ');
                  const specs = String(order.clientSpecifications || '').trim();
                  const deliveryDate = order.requestedDeliveryAt
                    ? formatDeliveryDateShort(order.requestedDeliveryAt)
                    : null;
                  const firstSlug = order.items?.[0]?.slug;

                  return (
                    <div key={order._id} className="commande-card commande-card--shop">
                      <div className="commande-header">
                        <div className="commande-info">
                          <h3>
                            Commande #{order.orderNumber || order._id.slice(-6)}
                            <span className="commande-shop-badge">Shop repas</span>
                          </h3>
                          <p className="commande-structure-name">
                            <span className="commande-structure-label">Canal:</span> Lien Repas Rapido
                            {firstSlug ? (
                              <>
                                {' '}
                                ·{' '}
                                <Link to={`/repas/${firstSlug}`} target="_blank" rel="noopener noreferrer">
                                  Voir la fiche
                                </Link>
                              </>
                            ) : (
                              <>
                                {' '}
                                ·{' '}
                                <Link to="/repas" target="_blank" rel="noopener noreferrer">
                                  Voir la boutique
                                </Link>
                              </>
                            )}
                          </p>
                          <p className="commande-date">Commande le {formatOrderDate(order)}</p>
                          {deliveryDate ? (
                            <p className="commande-date">
                              <strong>Livraison souhaitée :</strong> {deliveryDate}
                            </p>
                          ) : null}
                        </div>
                        <div
                          className="commande-statut"
                          style={{ backgroundColor: STATUT_COLORS[order.statut] || '#666' }}
                        >
                          {STATUT_LABELS[order.statut] || order.statut}
                        </div>
                      </div>

                      <div className="commande-client">
                        <h4>Client:</h4>
                        <p>
                          <strong>{name}</strong>
                        </p>
                        {order.customer?.phone ? <p>📞 {order.customer.phone}</p> : null}
                      </div>

                      <div className="commande-plats">
                        <h4>Plats:</h4>
                        {(order.items || []).map((it, idx) => (
                          <div key={it._id || idx} className="plat-item">
                            <span>
                              {it.productName} · ×{it.quantity}
                              {(it.accompagnements || []).length
                                ? ` (+ ${(it.accompagnements || [])
                                    .map((a) => `${a.name}×${a.quantity}`)
                                    .join(', ')})`
                                : ''}
                            </span>
                            <span>{formatPriceXof(it.lineTotal)}</span>
                          </div>
                        ))}
                        {order.freeDelivery ? (
                          <p className="commande-shop-free-delivery">Livraison gratuite (promo)</p>
                        ) : null}
                      </div>

                      <div className="commande-livraison">
                        <h4>Adresse de livraison</h4>
                        <p>{addressLine || '—'}</p>
                        <div className="commande-livraison-extra">
                          <div className="commande-livraison-row">
                            <span className="commande-livraison-label">WhatsApp / téléphone</span>
                            {renderPhoneLink(order.customer?.phone)}
                          </div>
                          <div className="commande-livraison-row commande-livraison-instructions">
                            <span className="commande-livraison-label">Spécifications / instructions</span>
                            <span className="commande-livraison-instructions-text">{specs || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="commande-total">
                        {Number(order.subtotalPrice) > 0 && Number(order.deliveryFee) > 0 ? (
                          <span className="commande-shop-payment">
                            Sous-total {formatPriceXof(order.subtotalPrice)}
                            {' · '}
                            Livraison {formatPriceXof(order.deliveryFee)}
                          </span>
                        ) : order.freeDelivery ? (
                          <span className="commande-shop-payment">Livraison gratuite</span>
                        ) : null}
                        <strong>Total: {formatPriceXof(order.totalPrice)}</strong>
                        <span className="commande-shop-payment">Paiement à la livraison</span>
                      </div>

                      <div className="commande-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          disabled={busy}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSpecsOrder(order);
                          }}
                        >
                          Spécifications
                        </button>
                        {order.statut === 'en_attente' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busy}
                              onClick={() => updateStatut(order, 'confirmee')}
                            >
                              Confirmer
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              disabled={busy}
                              onClick={() => updateStatut(order, 'annulee')}
                            >
                              Annuler
                            </button>
                          </>
                        ) : null}
                        {order.statut === 'confirmee' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busy}
                              onClick={() => updateStatut(order, 'en_preparation')}
                            >
                              En préparation
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    'Annuler la confirmation de cette commande ? Elle repassera en attente.'
                                  )
                                ) {
                                  return;
                                }
                                updateStatut(order, 'en_attente');
                              }}
                            >
                              Annuler la confirmation
                            </button>
                          </>
                        ) : null}
                        {order.statut === 'en_preparation' ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busy}
                            onClick={() => updateStatut(order, 'en_livraison')}
                          >
                            En livraison
                          </button>
                        ) : null}
                        {order.statut === 'en_livraison' ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busy}
                            onClick={() => updateStatut(order, 'livree')}
                          >
                            Marquer comme livrée
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
