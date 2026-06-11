import React, { useCallback, useEffect, useState } from 'react';
import PageLoader from '../../components/PageLoader';
import { useModal } from '../../context/ModalContext';
import {
  cancelCommercialOrder,
  confirmCommercialOrder,
  deliverCommercialOrder,
  fetchCommercialOrders,
  formatCommercialStatus,
  formatPrice,
  resolveCommercialStatus,
  setOrderRelance,
  updateOrderSpecifications,
} from '../../utils/commercialApi';
import './commercial.css';

export default function CommercialCommandesPage() {
  const { showSuccess, showError } = useModal();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [relanceId, setRelanceId] = useState(null);
  const [relanceDate, setRelanceDate] = useState('');
  const [specsOrder, setSpecsOrder] = useState(null);
  const [specsText, setSpecsText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter ? { status: filter } : {};
      setOrders(await fetchCommercialOrders(params));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

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
      setRelanceId(null);
      setSpecsOrder(null);
    }
  };

  const submitRelance = (id) => {
    if (!relanceDate) {
      showError('Indiquez la date et l’heure de livraison');
      return;
    }
    run(() => setOrderRelance(id, new Date(relanceDate).toISOString()), 'Relance planifiée');
  };

  const openSpecs = (order) => {
    setSpecsOrder(order);
    setSpecsText(order.clientSpecifications || '');
  };

  const submitSpecs = () => {
    if (!specsOrder) return;
    run(
      () => updateOrderSpecifications(specsOrder._id, specsText),
      'Spécifications enregistrées'
    );
  };

  if (loading) return <PageLoader />;

  return (
    <div className="commercial-page">
      <h1>Commandes Shop</h1>
      <p className="commercial-lead">
        Confirmez les commandes, ajoutez des spécifications client, planifiez une relance, annulez ou
        marquez comme livré.
      </p>

      <div className="commercial-filters">
        <label>
          Statut
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Tous</option>
            <option value="commande">Commande</option>
            <option value="confirme">Confirmé</option>
            <option value="relance">Relance</option>
            <option value="livree">Livré</option>
            <option value="annulee">Annulée</option>
          </select>
        </label>
        <button type="button" className="commercial-btn commercial-btn--outline" onClick={load}>
          Actualiser
        </button>
      </div>

      {orders.length === 0 ? (
        <p>Aucune commande depuis le 09/06/2026.</p>
      ) : (
        orders.map((o) => {
          const status = resolveCommercialStatus(o);
          const name = [o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(' ');
          const lieu = o.isOffPlatform
            ? o.offPlatformLocation
            : [o.customer?.city, o.customer?.addressDescription].filter(Boolean).join(' — ');
          const specs = String(o.clientSpecifications || '').trim();
          return (
            <div key={o._id} className="commercial-order-card">
              <h3>
                {o.productName} · {o.quantityLabel || o.quantity}
                {o.isOffPlatform ? (
                  <span className="commercial-badge commercial-badge--off" style={{ marginLeft: 8 }}>
                    Hors plateforme
                  </span>
                ) : null}
              </h3>
              <div className="commercial-order-meta">
                <div>
                  <strong>N° {o.orderNumber || '—'}</strong> ·{' '}
                  {new Date(o.createdAt).toLocaleString('fr-FR')}
                </div>
                <div>
                  {name || 'Client'} · {o.customer?.phone || '—'}
                </div>
                <div>{lieu}</div>
                {specs ? (
                  <div className="commercial-order-specs">
                    <strong>Spécifications :</strong> {specs}
                  </div>
                ) : null}
                {o.requestedDeliveryAt ? (
                  <div>
                    Livraison demandée : {new Date(o.requestedDeliveryAt).toLocaleString('fr-FR')}
                  </div>
                ) : null}
                {o.scheduledDeliveryAt ? (
                  <div>
                    Relance prévue : {new Date(o.scheduledDeliveryAt).toLocaleString('fr-FR')}
                  </div>
                ) : null}
                <div style={{ marginTop: 6 }}>
                  <span className={`commercial-badge commercial-badge--${status}`}>
                    {formatCommercialStatus(status)}
                  </span>
                  <span
                    style={{ marginLeft: 12 }}
                    className={
                      status === 'livree'
                        ? 'commercial-amount--received'
                        : status === 'annulee'
                          ? 'commercial-amount--pending'
                          : 'commercial-amount--pending'
                    }
                  >
                    {formatPrice(o.totalPrice)}
                  </span>
                </div>
              </div>

              {relanceId === o._id ? (
                <div className="commercial-form-grid" style={{ marginBottom: 8 }}>
                  <div className="commercial-form-field">
                    <label>Date et heure de livraison</label>
                    <input
                      type="datetime-local"
                      value={relanceDate}
                      onChange={(e) => setRelanceDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      className="commercial-btn commercial-btn--primary commercial-btn--sm"
                      disabled={busy}
                      onClick={() => submitRelance(o._id)}
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      className="commercial-btn commercial-btn--outline commercial-btn--sm"
                      onClick={() => setRelanceId(null)}
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="commercial-order-actions">
                <button
                  type="button"
                  className="commercial-btn commercial-btn--outline commercial-btn--sm"
                  disabled={busy}
                  onClick={() => openSpecs(o)}
                >
                  Spécifications
                </button>
                {status === 'commande' ? (
                  <button
                    type="button"
                    className="commercial-btn commercial-btn--primary commercial-btn--sm"
                    disabled={busy}
                    onClick={() => run(() => confirmCommercialOrder(o._id), 'Commande confirmée')}
                  >
                    Confirmer
                  </button>
                ) : null}
                {status !== 'livree' && status !== 'annulee' ? (
                  <>
                    <button
                      type="button"
                      className="commercial-btn commercial-btn--outline commercial-btn--sm"
                      disabled={busy}
                      onClick={() => {
                        setRelanceId(o._id);
                        setRelanceDate('');
                      }}
                    >
                      Relance livraison
                    </button>
                    {(status === 'confirme' || status === 'relance') ? (
                      <button
                        type="button"
                        className="commercial-btn commercial-btn--danger commercial-btn--sm"
                        disabled={busy}
                        onClick={() =>
                          run(() => cancelCommercialOrder(o._id), 'Commande annulée')
                        }
                      >
                        Annuler
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="commercial-btn commercial-btn--success commercial-btn--sm"
                      disabled={busy}
                      onClick={() => run(() => deliverCommercialOrder(o._id), 'Marqué comme livré')}
                    >
                      Marquer livré
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      {specsOrder ? (
        <div className="commercial-modal-backdrop" role="presentation" onClick={() => setSpecsOrder(null)}>
          <div
            className="commercial-modal"
            role="dialog"
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
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
