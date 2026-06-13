import React from 'react';
import { SHOP_DELIVERY_CITIES } from '../../utils/shopDelivery';
// import { getDefaultDeliveryDateKey, getShopDeliveryDateOptions } from '../../utils/shopDeliveryDate';
import './ShopOrderForm.css';

export default function ShopOrderForm({ customer, errors, onFieldChange, idPrefix = 'shop' }) {
  const setField = (field, value) => onFieldChange(field, value);
  // const defaultDeliveryDate = useMemo(() => getDefaultDeliveryDateKey(), []);
  // const deliveryOptions = useMemo(() => getShopDeliveryDateOptions(), []);
  // const isDefaultDate = customer.deliveryDate === defaultDeliveryDate;

  return (
    <div className="shop-order-form">
      <h2 className="shop-order-form-title">Vos informations de livraison</h2>
      <p className="shop-order-form-lead">Remplissez le formulaire pour passer commande.</p>

      <div className="shop-order-form-row">
        <div className="shop-order-form-field">
          <label htmlFor={`${idPrefix}-firstName`}>Prénom *</label>
          <input
            id={`${idPrefix}-firstName`}
            className={errors.firstName ? 'has-error' : ''}
            value={customer.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            autoComplete="given-name"
          />
          {errors.firstName ? <span className="shop-order-form-error">{errors.firstName}</span> : null}
        </div>
        <div className="shop-order-form-field">
          <label htmlFor={`${idPrefix}-lastName`}>Nom *</label>
          <input
            id={`${idPrefix}-lastName`}
            className={errors.lastName ? 'has-error' : ''}
            value={customer.lastName}
            onChange={(e) => setField('lastName', e.target.value)}
            autoComplete="family-name"
          />
          {errors.lastName ? <span className="shop-order-form-error">{errors.lastName}</span> : null}
        </div>
      </div>

      <div className="shop-order-form-field">
        <label htmlFor={`${idPrefix}-phone`}>Numéro de téléphone joignable (WhatsApp) *</label>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          inputMode="tel"
          placeholder="Ex. 229 97 00 00 00"
          className={errors.phone ? 'has-error' : ''}
          value={customer.phone}
          onChange={(e) => setField('phone', e.target.value)}
          autoComplete="tel"
        />
        {errors.phone ? <span className="shop-order-form-error">{errors.phone}</span> : null}
      </div>

      {/* Date de livraison — désactivée temporairement pour conversion rapide
      <div
        className={`shop-order-form-field shop-order-form-field--delivery${
          isDefaultDate ? ' shop-order-form-field--delivery-default' : ''
        }`}
      >
        <label htmlFor={`${idPrefix}-deliveryDate`}>Date de livraison souhaitée *</label>
        <select
          id={`${idPrefix}-deliveryDate`}
          className={`shop-order-form-select shop-order-form-select--delivery${
            errors.deliveryDate ? ' has-error' : ''
          }${isDefaultDate ? ' shop-order-form-select--default' : ''}`}
          value={customer.deliveryDate || defaultDeliveryDate}
          onChange={(e) => setField('deliveryDate', e.target.value)}
        >
          {deliveryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.value === defaultDeliveryDate ? ' (par défaut)' : ''}
            </option>
          ))}
        </select>
        <p className="shop-order-form-hint">
          Par défaut, livraison le lendemain de votre commande. Choisissez un autre jour parmi les 7
          prochains si besoin.
        </p>
        {errors.deliveryDate ? (
          <span className="shop-order-form-error">{errors.deliveryDate}</span>
        ) : null}
      </div>
      */}

      <div className="shop-order-form-field">
        <label htmlFor={`${idPrefix}-city`}>Ville *</label>
        <select
          id={`${idPrefix}-city`}
          className={`shop-order-form-select${errors.city ? ' has-error' : ''}`}
          value={customer.city}
          onChange={(e) => setField('city', e.target.value)}
        >
          <option value="">Choisir une ville</option>
          {SHOP_DELIVERY_CITIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {errors.city ? <span className="shop-order-form-error">{errors.city}</span> : null}
      </div>

      <div className="shop-order-form-field">
        <label htmlFor={`${idPrefix}-addressDesc`}>Adresse complète *</label>
        <textarea
          id={`${idPrefix}-addressDesc`}
          rows={3}
          className={errors.addressDescription ? 'has-error' : ''}
          value={customer.addressDescription}
          onChange={(e) => setField('addressDescription', e.target.value)}
          placeholder="Quartier, rue, maison, repères, étage…"
          required
        />
        {errors.addressDescription ? (
          <span className="shop-order-form-error">{errors.addressDescription}</span>
        ) : null}
      </div>
    </div>
  );
}
