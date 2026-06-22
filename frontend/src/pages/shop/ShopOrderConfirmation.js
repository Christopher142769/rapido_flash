import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopDeliveryNotice from '../../components/shop/ShopDeliveryNotice';
import {
  buildWhatsAppOrderUrl,
  formatCustomerAddress,
  formatCustomerFullName,
  loadShopOrder,
} from '../../utils/shopOrder';
import { formatPriceXof } from '../../utils/shopPromo';
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

  const waUrl = buildWhatsAppOrderUrl(order);
  const fullName = formatCustomerFullName(order.customer);
  const fullAddress = formatCustomerAddress(order.customer);

  return (
    <div className="shop-confirm">
      <ShopBrandHeader />

      <div className="shop-confirm-inner">
        <div className="shop-confirm-badge">✓</div>
        <h1 className="shop-confirm-title">Récapitulatif de votre commande</h1>
        <p className="shop-confirm-lead">
          Vérifiez vos informations puis contactez Rapido sur WhatsApp pour finaliser et suivre votre commande.
        </p>

        <ShopDeliveryNotice variant="confirm" />

        <section className="shop-confirm-section">
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
          {waUrl ? (
            <a
              className="shop-confirm-cta shop-confirm-cta--wa"
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Suivre ma commande
            </a>
          ) : (
            <p className="shop-confirm-warn">WhatsApp indisponible pour ce produit. Contactez Rapido par téléphone.</p>
          )}
          <Link className="shop-confirm-link" to={`/shop/${slug}`}>
            ← Retour à la fiche produit
          </Link>
        </div>
      </div>
    </div>
  );
}
