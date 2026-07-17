import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import ShopOrderSpecsModal from '../../components/commercial/ShopOrderSpecsModal';
import { useModal } from '../../context/ModalContext';
import { formatPrice } from '../../utils/commercialApi';
import {
  exportShopOrdersToExcel,
  exportShopOrdersToPdf,
  prepareShopOrdersExport,
  SHOP_STATUT_LABELS,
} from '../../utils/exportShopOrders';
import { exportShopOrdersToWord } from '../../utils/exportCommandesWord';
import { formatDeliveryDateShort } from '../../utils/shopDeliveryDate';
import CommandesFilterStats from '../../components/commercial/CommandesFilterStats';
import { sumMealOrdersQuantity } from '../../utils/commandesFilterStats';
import { CITY_FILTER_LABELS, POINTS_CITIES } from '../../utils/pointsByCity';
import '../restaurant/RestaurantCommandes.css';
import './commercial.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SHOP_ORDER_TZ = 'Africa/Porto-Novo';

const STATUT_LABELS = SHOP_STATUT_LABELS;

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
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
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
        return id === productKey || `slug:${slug}` === productKey || `name:${name}` === productKey;
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
  return [...map.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/** Aplatit une commande repas pour réutiliser les exports Shop (Excel / PDF / Word). */
function mealOrderToShopExportShape(order) {
  const items = order.items || [];
  const qty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const productName =
    items.map((it) => `${it.productName}×${it.quantity}`).join(', ') || '—';
  const accNote = items
    .flatMap((it) =>
      (it.accompagnements || []).map((a) => `${a.name}×${a.quantity}`)
    )
    .join(', ');
  const optNote = items
    .flatMap((it) => (it.options || []).map((o) => `${o.groupName}: ${o.choiceLabel}`))
    .join(', ');
  const specNote = items
    .map((it) => it.specifications)
    .filter(Boolean)
    .join(' | ');
  return {
    _id: order._id,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate || order.createdAt,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    deliveredAt: order.deliveredAt,
    statut: order.statut,
    commercialStatus: order.commercialStatus,
    productName,
    slug: items[0]?.slug || '',
    quantity: qty,
    quantityLabel: String(qty),
    quantityUnit: 'unit',
    unitPrice: items.length === 1 ? Number(items[0].unitPrice) || 0 : 0,
    subtotalPrice: Number(order.subtotalPrice) || 0,
    deliveryFee: Number(order.deliveryFee) || 0,
    eviscerationCleaning: false,
    eviscerationFee: 0,
    totalPrice: Number(order.totalPrice) || 0,
    freeDelivery: !!order.freeDelivery,
    isPromoLive: items.some((it) => it.isPromoLive),
    discountPercent: items.find((it) => it.discountPercent)?.discountPercent || 0,
    customer: order.customer,
    clientSpecifications: [
      order.clientSpecifications,
      optNote ? `Options: ${optNote}` : '',
      accNote ? `Acc.: ${accNote}` : '',
      specNote ? `Spéc.: ${specNote}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    requestedDeliveryAt: order.requestedDeliveryAt,
    scheduledDeliveryAt: null,
    isOffPlatform: false,
    paymentMode: 'livraison',
  };
}

/** Page Commandes Repas — clone UI / fonctionnalités de Commandes Shop.
 *  variant="kitchen" : vue cuisinier (workflow Accepter → En cuisine → Prêt). */
export default function MealCommandesPage({ variant = 'commercial', refreshKey = 0 }) {
  const isKitchen = variant === 'kitchen';
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get(`${API_URL}/meal-orders`, { headers: authHeaders() });
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      if (!silent) showError(e.response?.data?.message || e.message || 'Erreur de chargement');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!refreshKey) return;
    load(true);
  }, [refreshKey, load]);

  useEffect(() => {
    if (!isKitchen) return undefined;
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, [isKitchen, load]);

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
    productOptions.find((p) => p.key === productFilter)?.label || 'Tous les produits';
  const selectedStatutLabel = filter ? STATUT_LABELS[filter] || filter : 'Tous les statuts';
  const selectedCityLabel = CITY_FILTER_LABELS[cityFilter] || 'Toutes les villes';

  const exportData = useMemo(
    () =>
      prepareShopOrdersExport(filteredOrders.map(mealOrderToShopExportShape), {
        dateFrom,
        dateTo,
        statutFilter: filter,
        statutLabel: selectedStatutLabel,
        productFilter,
        productLabel: selectedProductLabel,
        cityFilter,
        cityLabel: selectedCityLabel,
      }),
    [
      filteredOrders,
      dateFrom,
      dateTo,
      filter,
      productFilter,
      cityFilter,
      selectedProductLabel,
      selectedStatutLabel,
      selectedCityLabel,
    ]
  );

  const filterStats = useMemo(
    () => ({
      orderCount: filteredOrders.length,
      totalQuantity: sumMealOrdersQuantity(filteredOrders),
      totalAmount: exportData.totalAmount,
    }),
    [filteredOrders, exportData.totalAmount]
  );

  const handleExportExcel = () => {
    if (!exportData.orders.length) {
      showError('Aucune commande à exporter pour cette période et ce filtre.');
      return;
    }
    exportShopOrdersToExcel(exportData);
  };

  const handleExportPdf = () => {
    if (!exportData.orders.length) {
      showError('Aucune commande à exporter pour cette période et ce filtre.');
      return;
    }
    exportShopOrdersToPdf(exportData);
  };

  const handleExportWord = () => {
    if (!exportData.orders.length) {
      showError('Aucune commande à exporter pour cette période et ce filtre.');
      return;
    }
    exportShopOrdersToWord(exportData);
  };

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      showSuccess(msg);
      await load(isKitchen);
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
      await load(isKitchen);
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
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
        <div className={`commandes-page${isKitchen ? ' commandes-page--cuisine' : ''}`}>
          <div className="commandes-content">
            {!isKitchen ? (
              <div className="commandes-header">
                <h1>Commandes Repas</h1>
              </div>
            ) : null}

            <div className="commercial-card shop-commandes-filters">
              {isKitchen ? (
                <button
                  type="button"
                  className="cuisine-filters-toggle"
                  onClick={() => setFiltersOpen((o) => !o)}
                  aria-expanded={filtersOpen}
                >
                  <span>
                    Filtres & statistiques
                    <span className="cuisine-filters-toggle__meta">
                      {filterStats.orderCount} commande{filterStats.orderCount > 1 ? 's' : ''}
                      {filter ? ` · ${selectedStatutLabel}` : ''}
                    </span>
                  </span>
                  <span className={`cuisine-filters-toggle__chevron${filtersOpen ? ' is-open' : ''}`}>
                    ▾
                  </span>
                </button>
              ) : null}
              <div
                className={`cuisine-filters-panel${isKitchen && !filtersOpen ? ' is-collapsed' : ''}`}
              >
              <div className="commercial-filters">
                <label>
                  Du
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label>
                  Au
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </label>
                <label>
                  Statut
                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="">Tous les statuts</option>
                    <option value="en_attente">En attente</option>
                    <option value="confirmee">Confirmée</option>
                    <option value="en_preparation">En préparation</option>
                    <option value="en_livraison">En livraison</option>
                    <option value="livree">Livrée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </label>
                <label>
                  Produit
                  <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
                    <option value="">Tous les produits</option>
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
                  onClick={() => load(isKitchen)}
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
                formatPrice={formatPrice}
                quantityLabel="Quantité produits"
              />

              {!isKitchen ? (
              <div className="shop-commandes-export-bar">
                <p className="shop-commandes-export-summary">
                  <strong>{exportData.orderCount}</strong> commande
                  {exportData.orderCount > 1 ? 's' : ''} · Total {formatPrice(exportData.totalAmount)}
                </p>
                <div className="commercial-filters" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    className="commercial-btn commercial-btn--primary"
                    onClick={handleExportExcel}
                    disabled={!exportData.orders.length}
                  >
                    Exporter Excel
                  </button>
                  <button
                    type="button"
                    className="commercial-btn commercial-btn--outline"
                    onClick={handleExportPdf}
                    disabled={!exportData.orders.length}
                  >
                    Exporter PDF
                  </button>
                  <button
                    type="button"
                    className="commercial-btn commercial-btn--outline"
                    onClick={handleExportWord}
                    disabled={!exportData.orders.length}
                  >
                    Exporter Word
                  </button>
                </div>
              </div>
              ) : null}
              </div>
            </div>

            {!isKitchen ? (
            <p className="commandes-shop-hint">
              Filtrez par <strong>date de commande</strong>, statut, produit et ville, puis exportez le
              détail complet en PDF, Excel ou Word. Même processus opérationnel : confirmer,
              préparation, livraison, livrée.
            </p>
            ) : null}

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
                  const name = [order.customer?.firstName, order.customer?.lastName]
                    .filter(Boolean)
                    .join(' ');
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
                                <Link
                                  to={`/repas/${firstSlug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
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
                          <strong>{name || '—'}</strong>
                        </p>
                        {order.customer?.phone ? <p>📞 {order.customer.phone}</p> : null}
                      </div>

                      <div className="commande-plats">
                        <h4>Produit Shop:</h4>
                        {(order.items || []).map((it, idx) => (
                          <div key={it._id || idx} className="plat-item">
                            <span>
                              {it.productName} · {it.quantity}
                              {(it.options || []).length
                                ? ` [${(it.options || [])
                                    .map((o) => `${o.groupName}: ${o.choiceLabel}`)
                                    .join(', ')}]`
                                : ''}
                              {(it.accompagnements || []).length
                                ? ` (+ ${(it.accompagnements || [])
                                    .map((a) => `${a.name}×${a.quantity}`)
                                    .join(', ')})`
                                : ''}
                              {it.specifications ? (
                                <em className="plat-item-spec"> — 📝 {it.specifications}</em>
                              ) : null}
                            </span>
                            <span>{Number(it.lineTotal || 0).toFixed(0)} FCFA</span>
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
                            <span className="commande-livraison-label">
                              Spécifications / instructions
                            </span>
                            <span className="commande-livraison-instructions-text">
                              {specs || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="commande-total">
                        {Number(order.subtotalPrice) > 0 && Number(order.deliveryFee) > 0 ? (
                          <span className="commande-shop-payment">
                            Sous-total {Number(order.subtotalPrice).toLocaleString('fr-FR')} FCFA
                            {' · '}
                            Livraison {Number(order.deliveryFee).toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : order.freeDelivery ? (
                          <span className="commande-shop-payment">Livraison gratuite</span>
                        ) : null}
                        <strong>Total: {Number(order.totalPrice || 0).toFixed(0)} FCFA</strong>
                        <span className="commande-shop-payment">Paiement à la livraison</span>
                      </div>

                      <div className="commande-actions">
                        {!isKitchen ? (
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
                        ) : null}
                        {isKitchen ? (
                          <>
                            {order.statut === 'en_attente' ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy}
                                onClick={() => updateStatut(order, 'confirmee')}
                              >
                                Accepter
                              </button>
                            ) : null}
                            {order.statut === 'confirmee' ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy}
                                onClick={() => updateStatut(order, 'en_preparation')}
                              >
                                Lancer en cuisine
                              </button>
                            ) : null}
                            {order.statut === 'en_preparation' ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy}
                                onClick={() => updateStatut(order, 'en_livraison')}
                              >
                                Plat prêt
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
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
