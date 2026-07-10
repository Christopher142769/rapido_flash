import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import {
  formatCustomerAddress,
  formatCustomerFullName,
  loadShopOrder,
  openShopOrderWhatsAppTrack,
  buildWhatsAppSupportUrl,
} from '../../utils/shopOrder';
import { formatPriceXof } from '../../utils/shopPromo';
import { isEviscerationApplicable } from '../../utils/shopEvisceration';
import { getPriceUnitSuffix } from '../../utils/shopQuantityUnit';
import './shopTypography.css';
import './ShopOrderConfirmation.css';

export default function ShopOrderConfirmation() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const order = useMemo(() => loadShopOrder(slug), [slug]);

  useEffect(() => {
    if (!order) {
      navigate(`/shop/${slug}`, { replace: true });
      return;
    }
    document.title = `Commande confirmée | Rapido Shop`;
  }, [order, slug, navigate]);

  if (!order) return null;

  const supportWaUrl = buildWhatsAppSupportUrl(order);
  const fullName = formatCustomerFullName(order.customer);
  const fullAddress = formatCustomerAddress(order.customer);
  const city = order.customer.city || order.customer.address;
  const addressLine = order.customer.addressDescription || fullAddress || '—';

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    const opened = await openShopOrderWhatsAppTrack(order);
    if (!opened) {
      alert(
        'WhatsApp indisponible pour ce produit. Votre commande est confirmée — contactez Rapido au +229 40 39 39 94.'
      );
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
            <p className="shop-confirm-product">{order.productName}</p>
            <p className="shop-confirm-qty">{order.quantityLabel || order.quantity}</p>
          </div>

          <dl className="shop-confirm-dl">
            <div>
              <dt>Prix unitaire</dt>
              <dd>
                {formatPriceXof(order.unitPrice)}
                {getPriceUnitSuffix(order.quantityUnit)}
              </dd>
            </div>
            <div>
              <dt>Sous-total</dt>
              <dd>
                {formatPriceXof(
                  order.subtotalPrice ?? Number(order.unitPrice || 0) * Number(order.quantity || 0)
                )}
              </dd>
            </div>
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
            {Number(order.eviscerationFee) > 0 ? (
              <div>
                <dt>Éviscération</dt>
                <dd>{formatPriceXof(order.eviscerationFee)}</dd>
              </div>
            ) : isEviscerationApplicable(order.quantityUnit) ? (
              <div>
                <dt>Éviscération</dt>
                <dd>Non</dd>
              </div>
            ) : null}
            {order.deliveryDateLabel || order.requestedDeliveryAt ? (
              <div>
                <dt>Livraison prévue</dt>
                <dd>
                  {order.deliveryDateLabel ||
                    new Date(order.requestedDeliveryAt).toLocaleDateString('fr-FR')}
                </dd>
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
              <a href={`tel:${order.customer.phone.replace(/\s/g, '')}`}>{order.customer.phone}</a>
            </p>
            <p>
              {city}
              {addressLine && addressLine !== city ? ` · ${addressLine}` : ''}
            </p>
          </div>
        </article>

        <div className="shop-confirm-actions">
          <button
            type="button"
            className="shop-confirm-cta shop-confirm-cta--wa"
            onClick={handleTrackOrder}
          >
            Suivre ma commande
          </button>
          {supportWaUrl ? (
            <a
              className="shop-confirm-link"
              href={supportWaUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Une question ? Contacter Rapido
            </a>
          ) : (
            <p className="shop-confirm-warn">Pour toute question, appelez le +229 40 39 39 94.</p>
          )}
          <Link className="shop-confirm-link shop-confirm-link--muted" to={`/shop/${slug}`}>
            ← Retour à la fiche produit
          </Link>
        </div>
      </div>

      <div className="shop-confirm-sticky">
        <button
          type="button"
          className="shop-confirm-cta shop-confirm-cta--wa"
          onClick={handleTrackOrder}
        >
          Suivre ma commande
        </button>
      </div>
    </div>
  );
}
