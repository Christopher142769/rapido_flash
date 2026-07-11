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
      document.getElementById('meal-cart-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            ? `${cartCount} article${cartCount > 1 ? 's' : ''} — finalisez votre commande`
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
        <form id="meal-cart-form" className="meal-cart-inner" onSubmit={checkout}>
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

          <div className="meal-cart-form-block">
            <h2>Vos coordonnées</h2>
            <ShopOrderForm
              customer={customer}
              errors={errors}
              onFieldChange={handleFieldChange}
              idPrefix="meal-cart"
            />
          </div>

          {shopClosed ? (
            <p className="meal-cart-err">La boutique est temporairement fermée.</p>
          ) : null}
          {submitError ? <p className="meal-cart-err">{submitError}</p> : null}

          <div className="meal-cart-actions">
            <button type="submit" className="meal-cart-cta" disabled={submitting || shopClosed}>
              {submitting ? 'Envoi…' : `Commander — ${formatPriceXof(totals.totalPrice)}`}
            </button>
            <Link to="/repas" className="meal-cart-continue">
              ← Continuer mes achats
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
