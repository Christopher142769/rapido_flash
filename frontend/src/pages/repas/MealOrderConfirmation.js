import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { loadMealOrder, openMealOrderWhatsAppTrack } from '../../utils/mealOrder';
import {
  formatCustomerFullName,
  formatCustomerAddress,
  getShopWhatsAppDisplay,
} from '../../utils/shopOrder';
import { formatPriceXof } from '../../utils/shopPromo';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import '../shop/shopTypography.css';
import '../shop/ShopOrderConfirmation.css';

export default function MealOrderConfirmation() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const order = useMemo(() => loadMealOrder(), []);
  const shopWaDisplay = getShopWhatsAppDisplay();

  useEffect(() => {
    if (!order) {
      navigate(slug ? `/repas/${slug}` : '/repas', { replace: true });
      return;
    }
    if (slug && order.slug && order.slug !== slug) {
      navigate(`/repas/${order.slug}/commande`, { replace: true });
      return;
    }
    document.title = 'Commande confirmée | Rapido Repas';
  }, [order, slug, navigate]);

  if (!order) return null;

  const fullName = formatCustomerFullName(order.customer);
  const fullAddress = formatCustomerAddress(order.customer);
  const city = order.customer?.city;
  const addressLine = order.customer?.addressDescription || fullAddress || '—';
  const backHref = order.slug ? `/repas/${order.slug}` : '/repas';

  const handleTrack = async (e) => {
    e.preventDefault();
    const opened = await openMealOrderWhatsAppTrack(order);
    if (!opened) {
      alert(`WhatsApp indisponible. Contactez Rapido au ${shopWaDisplay}.`);
    }
  };

  return (
    <div className="shop-confirm">
      <ShopBrandHeader />
      <div className="shop-confirm-inner">
        <header className="shop-confirm-hero">
          <div className="shop-confirm-badge" aria-hidden>
            ✓
          </div>
          <h1 className="shop-confirm-title">Commande confirmée</h1>
        </header>

        <article className="shop-confirm-card">
          <div className="shop-confirm-card-head">
            <p className="shop-confirm-product">Shop repas</p>
            <p className="shop-confirm-qty">{order.orderNumber || ''}</p>
          </div>

          <dl className="shop-confirm-dl">
            {(order.items || []).map((it, idx) => (
              <div key={it._id || idx}>
                <dt>{it.productName}</dt>
                <dd>
                  ×{it.quantity} — {formatPriceXof(it.lineTotal)}
                  {(it.accompagnements || []).length
                    ? ` (${it.accompagnements.map((a) => `${a.name}×${a.quantity}`).join(', ')})`
                    : ''}
                </dd>
              </div>
            ))}
            {order.freeDelivery ? (
              <div>
                <dt>Livraison</dt>
                <dd className="shop-confirm-highlight">Gratuite</dd>
              </div>
            ) : Number(order.deliveryFee) > 0 ? (
              <div>
                <dt>Livraison</dt>
                <dd>{formatPriceXof(order.deliveryFee)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="shop-confirm-total-row">
            <span>Total à payer</span>
            <strong>{formatPriceXof(order.totalPrice)}</strong>
          </div>

          <div className="shop-confirm-customer">
            <p className="shop-confirm-customer-name">{fullName}</p>
            <p>
              <a href={`tel:${String(order.customer?.phone || '').replace(/\s/g, '')}`}>
                {order.customer?.phone}
              </a>
            </p>
            <p>
              {city}
              {addressLine && addressLine !== city ? ` · ${addressLine}` : ''}
            </p>
          </div>
        </article>

        <div className="shop-confirm-actions">
          <button type="button" className="shop-confirm-cta shop-confirm-cta--wa" onClick={handleTrack}>
            Suivre ma commande
          </button>
          <Link className="shop-confirm-link shop-confirm-link--muted" to={backHref}>
            ← Retour au plat
          </Link>
          <Link className="shop-confirm-link shop-confirm-link--muted" to="/repas">
            Voir tous les plats
          </Link>
        </div>
      </div>

      <div className="shop-confirm-sticky">
        <button type="button" className="shop-confirm-cta shop-confirm-cta--wa" onClick={handleTrack}>
          Suivre ma commande
        </button>
      </div>
    </div>
  );
}
