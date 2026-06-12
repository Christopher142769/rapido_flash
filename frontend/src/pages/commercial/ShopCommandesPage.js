import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import PageLoader from '../../components/PageLoader';
import { useModal } from '../../context/ModalContext';
import {
  confirmCommercialOrder,
  fetchShopOrders,
  updateOrderSpecifications,
  updateShopOrderStatut,
} from '../../utils/commercialApi';
import { formatDeliveryDateShort } from '../../utils/shopDeliveryDate';
import '../restaurant/RestaurantCommandes.css';
import './commercial.css';

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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [specsOrder, setSpecsOrder] = useState(null);
  const [specsText, setSpecsText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setOrders(await fetchShopOrders());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredOrders = useMemo(() => {
    const list = filter ? orders.filter((o) => o.statut === filter) : orders;
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, filter]);

  const run = async (fn, msg, { closeSpecs = false } = {}) => {
    setBusy(true);
    try {
      await fn();
      showSuccess(msg);
      await load();
      if (closeSpecs) setSpecsOrder(null);
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const updateStatut = (order, statut) => {
    run(() => updateShopOrderStatut(order._id, statut), 'Statut mis à jour');
  };

  const openSpecs = (order) => {
    setSpecsOrder(order);
    setSpecsText(order.clientSpecifications || '');
  };

  const submitSpecs = () => {
    if (!specsOrder) return;
    run(
      () => updateOrderSpecifications(specsOrder._id, specsText),
      'Spécifications enregistrées',
      { closeSpecs: true }
    );
  };

  useEffect(() => {
    if (!specsOrder) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) setSpecsOrder(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [specsOrder, busy]);

  if (loading) return <PageLoader message="Chargement des commandes Shop..." />;

  const specsModal =
    specsOrder &&
    createPortal(
      <div
        className="commercial-modal-backdrop"
        role="presentation"
        onClick={() => !busy && setSpecsOrder(null)}
      >
        <div
          className="commercial-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="specs-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="specs-modal-title">Spécifications client</h3>
          <p className="commercial-modal-lead">
            N° {specsOrder.orderNumber || '—'} · {specsOrder.productName}
          </p>
          <div className="commercial-form-field">
            <label htmlFor="client-specs">Instructions pour le livreur</label>
            <textarea
              id="client-specs"
              rows={5}
              value={specsText}
              onChange={(e) => setSpecsText(e.target.value)}
              placeholder="Ex. appeler avant livraison, livrer au gardien, produit fragile…"
              maxLength={2000}
              autoFocus
            />
          </div>
          <div className="commercial-modal-actions">
            <button
              type="button"
              className="commercial-btn commercial-btn--outline"
              disabled={busy}
              onClick={() => setSpecsOrder(null)}
            >
              Fermer
            </button>
            <button
              type="button"
              className="commercial-btn commercial-btn--primary"
              disabled={busy}
              onClick={submitSpecs}
            >
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div className="commandes-page">
      <div className="commandes-content">
        <div className="commandes-header">
          <h1>Commandes Shop</h1>
          <select
            className="restaurant-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="confirmee">Confirmée</option>
            <option value="en_preparation">En préparation</option>
            <option value="en_livraison">En livraison</option>
            <option value="livree">Livrée</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>

        <p className="commandes-shop-hint">
          Même processus que la section <strong>Commandes</strong> : confirmer, mettre en préparation,
          envoyer en livraison, marquer comme livrée. Les dates de livraison choisies par le client sont
          affichées ci-dessous.
        </p>

        {filteredOrders.length === 0 ? (
          <div className="no-commandes">
            <p>Aucune commande Shop{filter ? ' pour ce filtre' : ''}.</p>
          </div>
        ) : (
          <div className="commandes-list">
            {filteredOrders.map((order) => {
              const name = [order.customer?.firstName, order.customer?.lastName]
                .filter(Boolean)
                .join(' ');
              const addressLine = order.isOffPlatform
                ? order.offPlatformLocation
                : [order.customer?.city, order.customer?.addressDescription].filter(Boolean).join(' — ');
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
                            <Link to={`/shop/${order.slug}`} target="_blank" rel="noopener noreferrer">
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
                      onClick={() => openSpecs(order)}
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
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() => updateStatut(order, 'en_preparation')}
                      >
                        En préparation
                      </button>
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

      {specsModal}
    </div>
  );
}
