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
        <div className="shop-confirm-badge">✓</div>
        <h1 className="shop-confirm-title">Commande confirmée</h1>

        <section className="shop-confirm-section shop-confirm-section--first">
          <h2>Commande</h2>
          <dl className="shop-confirm-dl">
            <div>
              <dt>Produit</dt>
              <dd>{order.productName}</dd>
            </div>
            <div>
              <dt>Quantité</dt>
              <dd>{order.quantityLabel || order.quantity}</dd>
            </div>
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
                <dd className="shop-confirm-highlight">Gratuite (offre en cours)</dd>
              </div>
            ) : Number(order.deliveryFee) > 0 ? (
              <div>
                <dt>Frais de livraison</dt>
                <dd>{formatPriceXof(order.deliveryFee)}</dd>
              </div>
            ) : null}
            {Number(order.eviscerationFee) > 0 ? (
              <div>
                <dt>Éviscération et nettoyage</dt>
                <dd>{formatPriceXof(order.eviscerationFee)}</dd>
              </div>
            ) : isEviscerationApplicable(order.quantityUnit) ? (
              <div>
                <dt>Éviscération et nettoyage</dt>
                <dd>Non</dd>
              </div>
            ) : null}
            <div className="shop-confirm-total">
              <dt>Total à payer</dt>
              <dd>{formatPriceXof(order.totalPrice)}</dd>
            </div>
            {order.deliveryDateLabel || order.requestedDeliveryAt ? (
              <div>
                <dt>Date de livraison souhaitée</dt>
                <dd>{order.deliveryDateLabel || new Date(order.requestedDeliveryAt).toLocaleDateString('fr-FR')}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="shop-confirm-section">
          <h2>Vos coordonnées</h2>
          <dl className="shop-confirm-dl">
            <div>
              <dt>Nom complet</dt>
              <dd>{fullName}</dd>
            </div>
            <div>
              <dt>Téléphone (WhatsApp)</dt>
              <dd>
                <a href={`tel:${order.customer.phone.replace(/\s/g, '')}`}>{order.customer.phone}</a>
              </dd>
            </div>
            <div>
              <dt>Ville</dt>
              <dd>{order.customer.city || order.customer.address}</dd>
            </div>
            <div>
              <dt>Adresse complète</dt>
              <dd>{order.customer.addressDescription || '—'}</dd>
            </div>
            {fullAddress && fullAddress !== (order.customer.city || order.customer.address) ? (
              <div>
                <dt>Livraison</dt>
                <dd>{fullAddress}</dd>
              </div>
            ) : null}
          </dl>
        </section>

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
              className="shop-confirm-link shop-confirm-link--wa"
              href={supportWaUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Une question ? Contacter Rapido
            </a>
          ) : (
            <p className="shop-confirm-warn">Pour toute question, appelez le +229 40 39 39 94.</p>
          )}
          <Link className="shop-confirm-link" to={`/shop/${slug}`}>
            ← Retour à la fiche produit
          </Link>
        </div>
      </div>
    </div>
  );
}
