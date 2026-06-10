import React, { useCallback, useEffect, useState } from 'react';
import PageLoader from '../../components/PageLoader';
import { useModal } from '../../context/ModalContext';
import {
  deliverCommercialOrder,
  fetchTodayRelances,
  formatCommercialStatus,
  formatPrice,
} from '../../utils/commercialApi';
import './commercial.css';

export default function CommercialRelancesPage() {
  const { showSuccess, showError } = useModal();
  const [relances, setRelances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTodayRelances();
      setRelances(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const markDelivered = async (id) => {
    setBusy(true);
    try {
      await deliverCommercialOrder(id);
      showSuccess('Livraison confirmée');
      await load();
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="commercial-page">
      <h1>Relances du jour</h1>
      <p className="commercial-lead">
        Livraisons planifiées pour aujourd&apos;hui — relancez le client puis marquez livré une fois
        effectué.
      </p>

      {relances.length > 0 ? (
        <div className="commercial-relance-alert">
          <span style={{ fontSize: '1.5rem' }}>🔔</span>
          <div>
            <strong>{relances.length} relance(s) aujourd&apos;hui</strong>
            <div style={{ fontSize: '0.85rem', color: '#5d4037' }}>
              Pensez à contacter chaque client pour confirmer la livraison.
            </div>
          </div>
        </div>
      ) : (
        <div className="commercial-card">
          <p style={{ margin: 0 }}>Aucune relance prévue pour aujourd&apos;hui.</p>
        </div>
      )}

      {relances.map((r) => (
        <div key={r.id} className="commercial-order-card">
          <h3>{r.productName}</h3>
          <div className="commercial-order-meta">
            <div>
              <strong>{r.customerName || 'Client'}</strong> · {r.customerPhone || '—'}
            </div>
            <div>{r.location}</div>
            <div>
              Livraison prévue :{' '}
              <strong>{new Date(r.scheduledDeliveryAt).toLocaleString('fr-FR')}</strong>
            </div>
            <div>
              N° {r.orderNumber} ·{' '}
              <span className={`commercial-badge commercial-badge--${r.commercialStatus}`}>
                {formatCommercialStatus(r.commercialStatus)}
              </span>
              <span style={{ marginLeft: 10 }} className="commercial-amount--pending">
                {formatPrice(r.amount)}
              </span>
            </div>
          </div>
          <div className="commercial-order-actions">
            {r.customerPhone ? (
              <a
                className="commercial-btn commercial-btn--outline commercial-btn--sm"
                href={`https://wa.me/${String(r.customerPhone).replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp client
              </a>
            ) : null}
            <button
              type="button"
              className="commercial-btn commercial-btn--success commercial-btn--sm"
              disabled={busy}
              onClick={() => markDelivered(r.id)}
            >
              Marquer livré
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
