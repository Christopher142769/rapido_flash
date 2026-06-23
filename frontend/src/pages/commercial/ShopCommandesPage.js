import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageLoader from '../../components/PageLoader';
import ShopOrderSpecsModal from '../../components/commercial/ShopOrderSpecsModal';
import { useModal } from '../../context/ModalContext';
import {
  confirmCommercialOrder,
  fetchPointsProducts,
  fetchShopOrders,
  formatPrice,
  unconfirmCommercialOrder,
  updateOrderSpecifications,
  updateShopOrderStatut,
} from '../../utils/commercialApi';
import {
  exportShopOrdersToExcel,
  exportShopOrdersToPdf,
  filterShopOrders,
  getShopProductFilterOptions,
  prepareShopOrdersExport,
  SHOP_STATUT_LABELS,
} from '../../utils/exportShopOrders';
import { exportShopOrdersToWord } from '../../utils/exportCommandesWord';
import { formatDeliveryDateShort } from '../../utils/shopDeliveryDate';
import CommandesFilterStats from '../../components/commercial/CommandesFilterStats';
import { sumShopOrdersQuantity } from '../../utils/commandesFilterStats';
import '../restaurant/RestaurantCommandes.css';
import './commercial.css';

const STATUT_LABELS = SHOP_STATUT_LABELS;

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
  const { showSuccess, showError } = useModal();
  const [orders, setOrders] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(() => defaultDateRange().dateFrom);
  const [dateTo, setDateTo] = useState(() => defaultDateRange().dateTo);
  const [specsOrder, setSpecsOrder] = useState(null);
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

  const filteredOrders = useMemo(() => {
    const list = filterShopOrders(orders, {
      dateFrom,
      dateTo,
      statut: filter || undefined,
      productKey: productFilter || undefined,
    });
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, filter, productFilter, dateFrom, dateTo]);

  const selectedProductLabel =
    productOptions.find((p) => p.key === productFilter)?.label || 'Tous les produits';

  const selectedStatutLabel = filter ? STATUT_LABELS[filter] || filter : 'Tous les statuts';

  const exportData = useMemo(
    () =>
      prepareShopOrdersExport(filteredOrders, {
        dateFrom,
        dateTo,
        statutFilter: filter,
        statutLabel: filter ? STATUT_LABELS[filter] || filter : 'Tous les statuts',
        productFilter,
        productLabel: selectedProductLabel,
      }),
    [filteredOrders, dateFrom, dateTo, filter, productFilter, selectedProductLabel]
  );

  const filterStats = useMemo(
    () => ({
      orderCount: filteredOrders.length,
      totalQuantity: sumShopOrdersQuantity(filteredOrders),
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

  return (
    <>
      <ShopOrderSpecsModal
        order={specsOrder}
        onClose={() => !busy && setSpecsOrder(null)}
        onSave={handleSaveSpecs}
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
              formatPrice={formatPrice}
              quantityLabel="Quantité produits"
            />

            <div className="shop-commandes-export-bar">
              <p className="shop-commandes-export-summary">
                <strong>{exportData.orderCount}</strong> commande{exportData.orderCount > 1 ? 's' : ''}{' '}
                · Total {formatPrice(exportData.totalAmount)}
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
            Filtrez par <strong>date de commande</strong>, statut et produit, puis exportez le détail complet en
            PDF, Excel ou Word. Même processus opérationnel : confirmer, préparation, livraison, livrée.
          </p>

          {filteredOrders.length === 0 ? (
            <div className="no-commandes">
              <p>
                Aucune commande Shop pour cette période
                {filter || productFilter ? ' avec ces filtres' : ''}.
              </p>
            </div>
          ) : (
            <div className="commandes-list">
              {filteredOrders.map((order) => {
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
          )}
        </div>
      </div>
      )}
    </>
  );
}
