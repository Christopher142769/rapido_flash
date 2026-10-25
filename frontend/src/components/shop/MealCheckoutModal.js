import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ShopOrderForm from './ShopOrderForm';
import { MealDeliveryEtaNotice } from './ShopDeliveryNotice';
import { formatPriceXof } from '../../utils/shopPromo';
import { clearMealCart, estimateMealCartTotals } from '../../utils/mealCart';
import {
  emptyCustomerForm,
  validateCustomerForm,
  submitMealOrderToApi,
  saveMealOrder,
} from '../../utils/mealOrder';
import { mealDeliveryFeeForCity } from '../../utils/mealShopSettings';
import { loadMealCity, saveMealCity } from '../../utils/mealDeliveryEta';
import { mealConfirmationPath } from '../../utils/mealPaths';
import { trackCtaClick, trackInitiateCheckout } from '../../utils/analyticsBeacon';
import './MealCheckoutModal.css';

/**
 * Formulaire de commande du panier Repas, ouvert directement depuis le panier latéral
 * (plus de page panier intermédiaire). La ville choisie en haut de page est pré-remplie.
 */
export default function MealCheckoutModal({ open, items, settings, city, onClose }) {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(() => emptyCustomerForm());
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const trackedRef = useRef(false);

  const deliveryFee = mealDeliveryFeeForCity(settings, customer.city);
  const totals = estimateMealCartTotals(items, deliveryFee, false);

  useEffect(() => {
    if (!open) {
      trackedRef.current = false;
      return;
    }
    const startCity = customer.city || city || loadMealCity();
    setCustomer((c) => ({ ...c, city: startCity }));
    setSubmitError('');
    if (!trackedRef.current && items.length) {
      trackedRef.current = true;
      const value = estimateMealCartTotals(items, mealDeliveryFeeForCity(settings, startCity)).totalPrice;
      trackInitiateCheckout({ value, items, channel: 'repas' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  const handleFieldChange = (field, value) => {
    setCustomer((c) => ({ ...c, [field]: value }));
    if (field === 'city') saveMealCity(value);
    setErrors((e) => {
      const n = { ...e };
      delete n[field];
      return n;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!items.length) return;
    if (settings?.isShopClosed) {
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
      const slug = order.items?.[0]?.slug || items[0]?.slug;
      saveMealOrder({ ...order, orderId: order._id, slug });
      trackCtaClick('Confirmer la commande', { channel: 'repas', ctaId: 'meal-cart-checkout' });
      clearMealCart();
      onClose();
      navigate(mealConfirmationPath(slug), { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="meal-checkout-overlay" role="presentation" onClick={() => !submitting && onClose()}>
      <div
        className="meal-checkout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-checkout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="meal-checkout-close"
          aria-label="Fermer"
          disabled={submitting}
          onClick={onClose}
        >
          ×
        </button>
        <h2 id="meal-checkout-title">Finaliser la commande</h2>
        <p className="meal-checkout-lead">
          Total à payer à la livraison : <strong>{formatPriceXof(totals.totalPrice)}</strong>
          <small>
            {' '}
            (dont livraison {customer.city || 'selon la ville'}
            {customer.city ? ` ${formatPriceXof(totals.deliveryFee)}` : ''})
          </small>
        </p>
        <MealDeliveryEtaNotice />
        <form onSubmit={submit} noValidate>
          <ShopOrderForm
            customer={customer}
            errors={errors}
            onFieldChange={handleFieldChange}
            idPrefix="meal-checkout"
          />
          {submitError ? <p className="meal-checkout-err">{submitError}</p> : null}
          <button type="submit" className="meal-checkout-cta" disabled={submitting || settings?.isShopClosed}>
            {submitting ? 'Envoi…' : `Confirmer la commande — ${formatPriceXof(totals.totalPrice)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
