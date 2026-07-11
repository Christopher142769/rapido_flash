import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from '../../utils/mealCart';
import {
  emptyCustomerForm,
  validateCustomerForm,
  submitMealOrderToApi,
  saveMealOrder,
} from '../../utils/mealOrder';
import axios from 'axios';
import './MealCartPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

export default function MealCartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => loadMealCart());
  const [customer, setCustomer] = useState(() => emptyCustomerForm());
  const [errors, setErrors] = useState({});
  const [deliveryFee, setDeliveryFee] = useState(500);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    document.title = 'Panier | Rapido Repas';
    axios
      .get(`${API_URL}/meal-shop/public`)
      .then((res) => setDeliveryFee(Number(res.data?.deliveryFee) || 0))
      .catch(() => {});
  }, []);

  const totals = useMemo(
    () => estimateMealCartTotals(items, deliveryFee, false),
    [items, deliveryFee]
  );

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
      });
      clearMealCart();
      navigate('/repas/commande', { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="meal-cart">
      <header className="meal-cart-top">
        <Link to="/repas">← Continuer</Link>
        <h1>Panier</h1>
      </header>

      {!items.length ? (
        <div className="meal-cart-empty">
          <p>Votre panier est vide.</p>
          <Link to="/repas" className="meal-cart-cta">
            Voir les plats
          </Link>
        </div>
      ) : (
        <form className="meal-cart-inner" onSubmit={checkout}>
          <ul className="meal-cart-lines">
            {items.map((it) => (
              <li key={it.lineKey} className="meal-cart-line">
                <div className="meal-cart-line-img">
                  {it.image ? (
                    <img src={getImageUrl(it.image, BASE_URL)} alt="" />
                  ) : (
                    <div className="meal-cart-line-ph" />
                  )}
                </div>
                <div className="meal-cart-line-body">
                  <strong>{it.productName}</strong>
                  <span>{formatPriceXof(it.unitPrice)} / unité</span>
                  {(it.accompagnements || []).map((a, i) => (
                    <span key={i} className="meal-cart-acc">
                      + {a.name} ×{a.quantity}
                    </span>
                  ))}
                  <div className="meal-cart-line-ctrl">
                    <button
                      type="button"
                      onClick={() =>
                        sync(updateMealCartLine(it.lineKey, { quantity: Math.max(1, it.quantity - 1) }))
                      }
                    >
                      −
                    </button>
                    <span>{it.quantity}</span>
                    <button
                      type="button"
                      onClick={() => sync(updateMealCartLine(it.lineKey, { quantity: it.quantity + 1 }))}
                    >
                      +
                    </button>
                    <button type="button" className="meal-cart-remove" onClick={() => sync(removeMealCartLine(it.lineKey))}>
                      Retirer
                    </button>
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

          <ShopOrderForm
            customer={customer}
            errors={errors}
            onFieldChange={handleFieldChange}
            idPrefix="meal"
          />

          {submitError ? <p className="meal-cart-err">{submitError}</p> : null}

          <button type="submit" className="meal-cart-cta" disabled={submitting}>
            {submitting ? 'Envoi…' : 'Confirmer la commande'}
          </button>
        </form>
      )}
    </div>
  );
}
