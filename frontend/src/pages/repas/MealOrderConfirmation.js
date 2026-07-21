import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { loadMealOrder, openMealOrderWhatsAppTrack } from '../../utils/mealOrder';
import {
  formatCustomerFullName,
  formatCustomerAddress,
  formatWhatsAppDisplay,
} from '../../utils/shopOrder';
import { formatPriceXof } from '../../utils/shopPromo';
import { mealCatalogPath, mealConfirmationPath, mealProductPath } from '../../utils/mealPaths';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopPrivacyFooter from '../../components/shop/ShopPrivacyFooter';
import ShopDeliveryNotice, {
  DEFAULT_MEAL_DELIVERY_NOTICE_MESSAGE,
} from '../../components/shop/ShopDeliveryNotice';
import { getTodayDateKey } from '../../utils/shopDeliveryDate';
import '../shop/shopTypography.css';
import '../shop/ShopOrderConfirmation.css';

export default function MealOrderConfirmation() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const order = useMemo(() => loadMealOrder(), []);
  const shopWaDisplay = formatWhatsAppDisplay(order?.whatsappNumber);

  useEffect(() => {
    if (!order) {
      navigate(slug ? mealProductPath(slug) : mealCatalogPath(), { replace: true });
      return;
    }
    if (slug && order.slug && order.slug !== slug) {
      navigate(mealConfirmationPath(order.slug), { replace: true });
      return;
    }
    document.title = 'Commande confirmée | Rapido Repas';
  }, [order, slug, navigate]);

  if (!order) return null;

  const fullName = formatCustomerFullName(order.customer);
  const fullAddress = formatCustomerAddress(order.customer);
  const city = order.customer?.city;
  const addressLine = order.customer?.addressDescription || fullAddress || '—';
  const backHref = mealProductPath(order.slug);

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

        <ShopDeliveryNotice
          variant="confirm"
          defaultMessage={DEFAULT_MEAL_DELIVERY_NOTICE_MESSAGE}
          dateKey={getTodayDateKey()}
        />

        <article className="shop-confirm-card">
          <div className="shop-confirm-card-head">
            <p className="shop-confirm-product">Shop repas</p>
            <p className="shop-confirm-qty">{order.orderNumber || ''}</p>
          </div>

          <dl className="shop-confirm-dl">
            {(order.items || []).map((it, idx) => {
              const platSubtotal = Math.round((Number(it.unitPrice) || 0) * (Number(it.quantity) || 0));
              return (
                <React.Fragment key={it._id || idx}>
                  <div className="shop-confirm-item-main">
                    <dt>{it.productName}</dt>
                    <dd>
                      ×{it.quantity} — {formatPriceXof(platSubtotal)}
                    </dd>
                  </div>
                  {(it.options || []).map((o, oi) => (
                    <div key={`${it._id || idx}-opt-${oi}`} className="shop-confirm-item-acc">
                      <dt>
                        • {o.groupName}: {o.choiceLabel}
                      </dt>
                      <dd>{Number(o.price) > 0 ? formatPriceXof(o.price) : 'Inclus'}</dd>
                    </div>
                  ))}
                  {(it.accompagnements || []).map((a, ai) => (
                    <div key={`${it._id || idx}-acc-${ai}`} className="shop-confirm-item-acc">
                      <dt>
                        + {a.name} ×{a.quantity}
                      </dt>
                      <dd>{formatPriceXof((Number(a.price) || 0) * (Number(a.quantity) || 0))}</dd>
                    </div>
                  ))}
                  {it.specifications ? (
                    <div className="shop-confirm-item-acc">
                      <dt>📝 {it.specifications}</dt>
                      <dd />
                    </div>
                  ) : null}
                </React.Fragment>
              );
            })}
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

      <ShopPrivacyFooter className="shop-privacy-footer--sticky-pad" />

      <div className="shop-confirm-sticky">
        <button type="button" className="shop-confirm-cta shop-confirm-cta--wa" onClick={handleTrack}>
          Suivre ma commande
        </button>
      </div>
    </div>
  );
}
