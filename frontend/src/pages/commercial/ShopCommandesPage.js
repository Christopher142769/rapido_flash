import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageLoader from '../../components/PageLoader';
import ShopOrderSpecsModal from '../../components/commercial/ShopOrderSpecsModal';
import ShopOrderEditModal from '../../components/commercial/ShopOrderEditModal';
import { useModal } from '../../context/ModalContext';
import AuthContext from '../../context/AuthContext';
import {
  confirmCommercialOrder,
  deleteShopOrder,
  fetchPointsProducts,
  fetchShopOrders,
  formatPrice,
  unconfirmCommercialOrder,
  updateOrderSpecifications,
  updateShopOrder,
  updateShopOrderStatut,
} from '../../utils/commercialApi';
import {
  buildShopLivreurSelection,
  exportShopOrdersToExcel,
  exportShopOrdersToPdf,
  filterShopOrders,
  getShopProductFilterOptions,
  prepareShopOrdersExport,
  sumShopOrdersQuantityKg,
  SHOP_STATUT_LABELS,
} from '../../utils/exportShopOrders';
import { exportShopOrdersToWord } from '../../utils/exportCommandesWord';
import { formatDeliveryDateShort } from '../../utils/shopDeliveryDate';
import CommandesFilterStats from '../../components/commercial/CommandesFilterStats';
import { formatFilterQuantity, sumShopOrdersQuantity } from '../../utils/commandesFilterStats';
import { CITY_FILTER_LABELS, POINTS_CITIES } from '../../utils/pointsByCity';
import '../restaurant/RestaurantCommandes.css';
import './commercial.css';

const STATUT_LABELS = SHOP_STATUT_LABELS;

const EVISCERATION_LABELS = {
  '': 'Toutes',
  oui: 'Éviscéré & nettoyé',
  non: 'Non éviscéré',
};

const STATUT_COLORS = {
  en_attente: '#FFA500',
  confirmee: '#2196F3',
  en_preparation: '#9C27B0',
  en_livraison: '#00BCD4',
  livree: '#4CAF50',
  annulee: '#F44336',
};

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
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

/** Page unique Commandes Shop — admin et commercial, cartes alignées sur Commandes. */
export default function ShopCommandesPage() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'restaurant';
  const { showSuccess, showError } = useModal();
  const [orders, setOrders] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [eviscerationFilter, setEviscerationFilter] = useState('');
  const [maxKg, setMaxKg] = useState('');
  const [maxKgEvisc, setMaxKgEvisc] = useState('');
  const [maxKgNonEvisc, setMaxKgNonEvisc] = useState('');
  const [splitLivreurLists, setSplitLivreurLists] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => defaultDateRange().dateFrom);
  const [dateTo, setDateTo] = useState(() => defaultDateRange().dateTo);
  const [specsOrder, setSpecsOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersList, productsList] = await Promise.all([
        fetchShopOrders(),
        fetchPointsProducts().catch(() => []),
      ]);
      setOrders(ordersList);
      setCatalogProducts(Array.isArray(productsList) ? productsList : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const productOptions = useMemo(
    () => getShopProductFilterOptions(catalogProducts, orders),
    [catalogProducts, orders]
  );

  const baseFilteredOrders = useMemo(() => {
    const list = filterShopOrders(orders, {
      dateFrom,
      dateTo,
      statut: filter || undefined,
      productKey: productFilter || undefined,
      city: cityFilter || undefined,
    });
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [orders, filter, productFilter, cityFilter, dateFrom, dateTo]);

  const livreurSelection = useMemo(
    () =>
      buildShopLivreurSelection(baseFilteredOrders, {
        evisceration: eviscerationFilter,
        maxKg,
        splitLivreurLists,
        maxKgEvisc,
        maxKgNonEvisc,
      }),
    [
      baseFilteredOrders,
      eviscerationFilter,
      maxKg,
      splitLivreurLists,
      maxKgEvisc,
      maxKgNonEvisc,
    ]
  );

  const filteredOrders = livreurSelection.orders;

  const selectedProductLabel =
    productOptions.find((p) => p.key === productFilter)?.label || 'Tous les produits';

  const selectedStatutLabel = filter ? STATUT_LABELS[filter] || filter : 'Tous les statuts';
  const selectedCityLabel = CITY_FILTER_LABELS[cityFilter] || 'Toutes les villes';
  const selectedEviscerationLabel = splitLivreurLists
    ? '2 listes (éviscéré / non)'
    : EVISCERATION_LABELS[eviscerationFilter] || 'Toutes';

  const maxKgLabel = useMemo(() => {
    if (splitLivreurLists) {
      const parts = [];
      if (Number(maxKgEvisc) > 0) parts.push(`max ${maxKgEvisc} kg éviscéré`);
      if (Number(maxKgNonEvisc) > 0) parts.push(`max ${maxKgNonEvisc} kg non éviscéré`);
      return parts.length ? parts.join(' · ') : 'Toutes quantités (2 listes)';
    }
    if (Number(maxKg) > 0) return `Max ${maxKg} kg (premières commandes)`;
    return '';
  }, [splitLivreurLists, maxKg, maxKgEvisc, maxKgNonEvisc]);

  const exportData = useMemo(
    () =>
      prepareShopOrdersExport(filteredOrders, {
        dateFrom,
        dateTo,
        statutFilter: filter,
        statutLabel: filter ? STATUT_LABELS[filter] || filter : 'Tous les statuts',
        productFilter,
        productLabel: selectedProductLabel,
        cityFilter,
        cityLabel: selectedCityLabel,
        eviscerationFilter,
        eviscerationLabel: selectedEviscerationLabel,
        maxKgLabel,
        splitLivreurLists: livreurSelection.split,
        lists: livreurSelection.lists,
      }),
    [
      filteredOrders,
      dateFrom,
      dateTo,
      filter,
      productFilter,
      cityFilter,
      eviscerationFilter,
      selectedProductLabel,
      selectedCityLabel,
      selectedEviscerationLabel,
      maxKgLabel,
      livreurSelection.split,
      livreurSelection.lists,
    ]
  );

  const filterStats = useMemo(
    () => ({
      orderCount: filteredOrders.length,
      totalQuantity: sumShopOrdersQuantity(filteredOrders),
      totalKg: sumShopOrdersQuantityKg(filteredOrders),
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
      await load();
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const updateStatut = (order, statut) => {
    run(() => updateShopOrderStatut(order._id, statut), 'Statut mis à jour');
  };

  const handleSaveSpecs = async (text) => {
    if (!specsOrder) return;
    setBusy(true);
    try {
      await updateOrderSpecifications(specsOrder._id, text);
      showSuccess('Spécifications enregistrées');
      setSpecsOrder(null);
      await load();
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (payload) => {
    if (!editOrder || !isAdmin) return;
    setBusy(true);
    try {
      await updateShopOrder(editOrder._id, payload);
      showSuccess('Commande modifiée');
      setEditOrder(null);
      await load();
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOrder = (order) => {
    if (!isAdmin || !order) return;
    const label = order.orderNumber || order._id?.slice(-6) || '';
    if (
      !window.confirm(
        `Supprimer définitivement la commande #${label} ?\nCette action est irréversible.`
      )
    ) {
      return;
    }
    run(() => deleteShopOrder(order._id), 'Commande supprimée');
  };

  return (
    <>
      <ShopOrderSpecsModal
        order={specsOrder}
        onClose={() => !busy && setSpecsOrder(null)}
        onSave={handleSaveSpecs}
        saving={busy}
      />
      <ShopOrderEditModal
        order={editOrder}
        onClose={() => !busy && setEditOrder(null)}
        onSave={handleSaveEdit}
        saving={busy}
      />

      {loading ? (
        <PageLoader message="Chargement des commandes Shop..." />
      ) : (
      <div className="commandes-page">
        <div className="commandes-content">
          <div className="commandes-header">
            <h1>Commandes Shop</h1>
          </div>

          <div className="commercial-card shop-commandes-filters">
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
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
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
                      {p.fromOrders ? ' (hors catalogue)' : ''}
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
              <label>
                Éviscération
                <select
                  value={eviscerationFilter}
                  onChange={(e) => setEviscerationFilter(e.target.value)}
                  disabled={splitLivreurLists}
                >
                  <option value="">Toutes</option>
                  <option value="oui">Éviscéré &amp; nettoyé</option>
                  <option value="non">Non éviscéré</option>
                </select>
              </label>
              {!splitLivreurLists ? (
                <label>
                  Quantité max (kg)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Ex. 30"
                    value={maxKg}
                    onChange={(e) => setMaxKg(e.target.value)}
                  />
                </label>
              ) : (
                <>
                  <label>
                    Max kg éviscéré
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Ex. 30"
                      value={maxKgEvisc}
                      onChange={(e) => setMaxKgEvisc(e.target.value)}
                    />
                  </label>
                  <label>
                    Max kg non éviscéré
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Ex. 30"
                      value={maxKgNonEvisc}
                      onChange={(e) => setMaxKgNonEvisc(e.target.value)}
                    />
                  </label>
                </>
              )}
              <label className="shop-commandes-split-toggle">
                <span>2 listes livreurs</span>
                <input
                  type="checkbox"
                  checked={splitLivreurLists}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setSplitLivreurLists(on);
                    if (on) setEviscerationFilter('');
                  }}
                />
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
              formatPrice={formatPrice}
              quantityLabel="Quantité produits"
            />
            <p className="shop-commandes-selection-hint">
              Sélection export : <strong>{selectedEviscerationLabel}</strong>
              {filterStats.totalKg > 0 ? (
                <>
                  {' '}
                  · <strong>{formatFilterQuantity(filterStats.totalKg)} kg</strong>
                </>
              ) : null}
              {maxKgLabel ? <> · {maxKgLabel}</> : null}
              {' '}
              · premières commandes d’abord
              {baseFilteredOrders.length !== filteredOrders.length ? (
                <>
                  {' '}
                  ({filteredOrders.length}/{baseFilteredOrders.length} commandes filtrées)
                </>
              ) : null}
            </p>

            <div className="shop-commandes-export-bar">
              <p className="shop-commandes-export-summary">
                <strong>{exportData.orderCount}</strong> commande
                {exportData.orderCount > 1 ? 's' : ''}
                {exportData.totalKg > 0
                  ? ` · ${formatFilterQuantity(exportData.totalKg)} kg`
                  : ''}{' '}
                · Total {formatPrice(exportData.totalAmount)}
                {livreurSelection.split ? ' · 2 listes livreurs' : ''}
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
          </div>

          <p className="commandes-shop-hint">
            Filtrez par date, statut, produit, ville et <strong>éviscération</strong>. Plafonnez en{' '}
            <strong>kg</strong> en partant des premières commandes, ou activez{' '}
            <strong>2 listes livreurs</strong> (éviscéré / non) pour distribuer aux livreurs.
          </p>

          {filteredOrders.length === 0 ? (
            <div className="no-commandes">
              <p>
                Aucune commande Shop pour cette période
                {filter || productFilter || eviscerationFilter || maxKg || maxKgEvisc || maxKgNonEvisc
                  ? ' avec ces filtres'
                  : ''}
                .
              </p>
            </div>
          ) : (
            <div className="commandes-list">
              {livreurSelection.lists
                .filter((list) => list.orders.length > 0)
                .map((list) => (
                <div key={list.key} className="shop-livreur-list">
                  {livreurSelection.split ? (
                    <div className="shop-livreur-list__header">
                      <h2>{list.label}</h2>
                      <p>
                        {list.orders.length} commande{list.orders.length > 1 ? 's' : ''}
                        {list.totalKg > 0
                          ? ` · ${formatFilterQuantity(list.totalKg)} kg`
                          : ''}
                      </p>
                    </div>
                  ) : null}
                  {list.orders.map((order) => {
                const name = [order.customer?.firstName, order.customer?.lastName]
                  .filter(Boolean)
                  .join(' ');
                const addressLine = order.isOffPlatform
                  ? order.offPlatformLocation
                  : [order.customer?.city, order.customer?.addressDescription]
                      .filter(Boolean)
                      .join(' — ');
                const specs = String(order.clientSpecifications || '').trim();
                const deliveryDate = order.requestedDeliveryAt
                  ? formatDeliveryDateShort(order.requestedDeliveryAt)
                  : null;

                return (
                  <div key={order._id} className="commande-card commande-card--shop">
                    <div className="commande-header">
                      <div className="commande-info">
                        <h3>
                          Commande #{order.orderNumber || order._id.slice(-6)}
                          <span className="commande-shop-badge">Shop express</span>
                          {order.isOffPlatform ? (
                            <span
                              className="commande-shop-badge"
                              style={{ marginLeft: 6, background: '#555' }}
                            >
                              Hors plateforme
                            </span>
                          ) : null}
                        </h3>
                        <p className="commande-structure-name">
                          <span className="commande-structure-label">Canal:</span> Lien Shop Rapido
                          {order.slug ? (
                            <>
                              {' '}
                              ·{' '}
                              <Link
                                to={`/shop/${order.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Voir la fiche
                              </Link>
                            </>
                          ) : null}
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
                      <div className="plat-item">
                        <span>
                          {order.productName} · {order.quantityLabel || order.quantity}
                          {order.eviscerationCleaning ? (
                            <span className="commande-shop-badge commande-shop-badge--evisc">
                              Éviscéré
                            </span>
                          ) : (
                            <span className="commande-shop-badge commande-shop-badge--raw">
                              Non éviscéré
                            </span>
                          )}
                        </span>
                        <span>{Number(order.totalPrice || 0).toFixed(0)} FCFA</span>
                      </div>
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
                          <span className="commande-livraison-instructions-text">
                            {specs || '—'}
                          </span>
                        </div>
                        {order.scheduledDeliveryAt ? (
                          <div className="commande-livraison-row">
                            <span className="commande-livraison-label">Relance planifiée</span>
                            <span>
                              {new Date(order.scheduledDeliveryAt).toLocaleString('fr-FR')}
                            </span>
                          </div>
                        ) : null}
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
                      {isAdmin ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline"
                            disabled={busy}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditOrder(order);
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-danger-outline"
                            disabled={busy}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteOrder(order);
                            }}
                          >
                            Supprimer
                          </button>
                        </>
                      ) : null}
                      {order.statut === 'en_attente' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busy}
                            onClick={() =>
                              run(() => confirmCommercialOrder(order._id), 'Commande confirmée')
                            }
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
                              run(
                                () => unconfirmCommercialOrder(order._id),
                                'Confirmation annulée — commande en attente'
                              );
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
              ))}
            </div>
          )}
        </div>
      </div>
      )}
    </>
  );
}
