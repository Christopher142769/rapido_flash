import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MealShopChrome from '../../components/shop/MealShopChrome';
import ShopOrderForm from '../../components/shop/ShopOrderForm';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { formatPriceXof } from '../../utils/shopPromo';
import {
  loadMealCart,
  saveMealCart,
  clearMealCart,
  updateMealCartLine,
  removeMealCartLine,
  estimateMealCartTotals,
  mealCartCount,
  lineMealSubtotal,
} from '../../utils/mealCart';
import {
  emptyCustomerForm,
  validateCustomerForm,
  submitMealOrderToApi,
  saveMealOrder,
} from '../../utils/mealOrder';
import './MealCartPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

export default function MealCartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => loadMealCart());
  const [customer, setCustomer] = useState(() => emptyCustomerForm());
  const [errors, setErrors] = useState({});
  const [deliveryFee, setDeliveryFee] = useState(500);
  const [shopClosed, setShopClosed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const refresh = useCallback(() => setItems(loadMealCart()), []);

  useEffect(() => {
    document.title = 'Panier | Rapido Repas';
    axios
      .get(`${API_URL}/meal-shop/public`)
      .then((res) => {
        setDeliveryFee(Number(res.data?.deliveryFee) || 0);
        setShopClosed(!!res.data?.isShopClosed);
      })
      .catch(() => {});
    const onCart = () => refresh();
    window.addEventListener('rapido-meal-cart', onCart);
    window.addEventListener('storage', onCart);
    return () => {
      window.removeEventListener('rapido-meal-cart', onCart);
      window.removeEventListener('storage', onCart);
    };
  }, [refresh]);

  useEffect(() => {
    if (!checkoutOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setCheckoutOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [checkoutOpen]);

  const totals = useMemo(
    () => estimateMealCartTotals(items, deliveryFee, false),
    [items, deliveryFee]
  );
  const cartCount = mealCartCount(items);

  const sync = (next) => {
    setItems(next);
    saveMealCart(next);
  };

  const handleFieldChange = (field, value) => {
    setCustomer((c) => ({ ...c, [field]: value }));
    setErrors((e) => {
      const n = { ...e };
      delete n[field];
      return n;
    });
  };

  const openCheckout = () => {
    if (shopClosed) {
      setSubmitError('La boutique est temporairement fermée.');
      return;
    }
    setSubmitError('');
    setCheckoutOpen(true);
  };

  const checkout = async (e) => {
    e.preventDefault();
    if (!items.length) return;
    if (shopClosed) {
      setSubmitError('La boutique est temporairement fermée.');
      return;
    }
    const nextErrors = validateCustomerForm(customer);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const order = await submitMealOrderToApi(items, customer);
      saveMealOrder({
        ...order,
        orderId: order._id,
        slug: order.items?.[0]?.slug || items[0]?.slug,
      });
      clearMealCart();
      setCheckoutOpen(false);
      const slug = order.items?.[0]?.slug || items[0]?.slug;
      navigate(slug ? `/repas/${slug}/commande` : '/repas/commande', { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="meal-cart">
      <MealShopChrome cartCount={cartCount} showBack backTo="/repas" backLabel="Boutique" />

      <div className="meal-cart-head">
        <h1>Votre panier</h1>
        <p>
          {cartCount
            ? `${cartCount} article${cartCount > 1 ? 's' : ''} — vérifiez votre récapitulatif`
            : 'Ajoutez des plats depuis la boutique'}
        </p>
      </div>

      {!items.length ? (
        <div className="meal-cart-empty">
          <p>Votre panier est vide.</p>
          <Link to="/repas" className="meal-cart-cta">
            Voir les plats
          </Link>
        </div>
      ) : (
        <div className="meal-cart-inner">
          <ul className="meal-cart-lines">
            {items.map((it) => (
              <li key={it.lineKey} className="meal-cart-line">
                <Link to={`/repas/${it.slug}`} className="meal-cart-line-img">
                  {it.image ? (
                    <img src={getImageUrl(it.image, BASE_URL)} alt="" />
                  ) : (
                    <div className="meal-cart-line-ph" />
                  )}
                </Link>
                <div className="meal-cart-line-body">
                  <Link to={`/repas/${it.slug}`} className="meal-cart-line-name">
                    {it.productName}
                  </Link>
                  <span>
                    {formatPriceXof(it.unitPrice)} / plat
                    {it.isPromoLive && it.discountPercent ? ` (−${it.discountPercent}%)` : ''}
                  </span>
                  {(it.accompagnements || []).map((a, i) => (
                    <span key={i} className="meal-cart-acc">
                      + {a.name} ×{a.quantity}
                      {a.price != null ? ` — ${formatPriceXof(a.price * a.quantity)}` : ''}
                    </span>
                  ))}
                  <div className="meal-cart-line-footer">
                    <div className="meal-cart-line-ctrl">
                      <button
                        type="button"
                        aria-label="Diminuer"
                        onClick={() =>
                          sync(
                            updateMealCartLine(it.lineKey, {
                              quantity: Math.max(1, it.quantity - 1),
                            })
                          )
                        }
                      >
                        −
                      </button>
                      <span>{it.quantity}</span>
                      <button
                        type="button"
                        aria-label="Augmenter"
                        onClick={() =>
                          sync(updateMealCartLine(it.lineKey, { quantity: it.quantity + 1 }))
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="meal-cart-remove"
                        onClick={() => sync(removeMealCartLine(it.lineKey))}
                      >
                        Retirer
                      </button>
                    </div>
                    <strong className="meal-cart-line-total">{formatPriceXof(lineMealSubtotal(it))}</strong>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="meal-cart-totals">
            <div>
              <span>Sous-total</span>
              <strong>{formatPriceXof(totals.subtotalPrice)}</strong>
            </div>
            <div>
              <span>Livraison</span>
              <strong>{formatPriceXof(totals.deliveryFee)}</strong>
            </div>
            <div className="meal-cart-total">
              <span>Total</span>
              <strong>{formatPriceXof(totals.totalPrice)}</strong>
            </div>
          </div>

          {shopClosed && !checkoutOpen ? (
            <p className="meal-cart-err">La boutique est temporairement fermée.</p>
          ) : null}
          {submitError && !checkoutOpen ? <p className="meal-cart-err">{submitError}</p> : null}

          <div className="meal-cart-actions">
            <button
              type="button"
              className="meal-cart-cta"
              disabled={shopClosed}
              onClick={openCheckout}
            >
              Commander — {formatPriceXof(totals.totalPrice)}
            </button>
            <Link to="/repas" className="meal-cart-continue">
              ← Continuer mes achats
            </Link>
          </div>
        </div>
      )}

      {checkoutOpen ? (
        <div
          className="meal-cart-modal-overlay"
          role="presentation"
          onClick={() => !submitting && setCheckoutOpen(false)}
        >
          <div
            className="meal-cart-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="meal-cart-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="meal-cart-modal-close"
              aria-label="Fermer"
              disabled={submitting}
              onClick={() => setCheckoutOpen(false)}
            >
              ×
            </button>
            <h2 id="meal-cart-modal-title">Finaliser la commande</h2>
            <p className="meal-cart-modal-lead">
              Total à payer : <strong>{formatPriceXof(totals.totalPrice)}</strong>
            </p>
            <form onSubmit={checkout}>
              <ShopOrderForm
                customer={customer}
                errors={errors}
                onFieldChange={handleFieldChange}
                idPrefix="meal-cart"
              />
              {submitError ? <p className="meal-cart-err">{submitError}</p> : null}
              <button type="submit" className="meal-cart-cta" disabled={submitting || shopClosed}>
                {submitting ? 'Envoi…' : `Confirmer — ${formatPriceXof(totals.totalPrice)}`}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
