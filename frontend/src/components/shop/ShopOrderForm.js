import React from 'react';
import './ShopOrderForm.css';

export default function ShopOrderForm({ customer, errors, onFieldChange, idPrefix = 'shop' }) {
  const setField = (field, value) => onFieldChange(field, value);

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
        <label htmlFor={`${idPrefix}-phone`}>Numéro de téléphone joignable *</label>
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

      <div className="shop-order-form-field">
        <label htmlFor={`${idPrefix}-address`}>Adresse de livraison *</label>
        <input
          id={`${idPrefix}-address`}
          className={errors.address ? 'has-error' : ''}
          value={customer.address}
          onChange={(e) => setField('address', e.target.value)}
          placeholder="Quartier, rue, maison…"
          autoComplete="street-address"
        />
        {errors.address ? <span className="shop-order-form-error">{errors.address}</span> : null}
      </div>

      <div className="shop-order-form-field">
        <label htmlFor={`${idPrefix}-addressDesc`}>Description de l&apos;adresse *</label>
        <textarea
          id={`${idPrefix}-addressDesc`}
          rows={3}
          className={errors.addressDescription ? 'has-error' : ''}
          value={customer.addressDescription}
          onChange={(e) => setField('addressDescription', e.target.value)}
          placeholder="Repères, couleur du portail, étage, personne à contacter sur place…"
        />
        {errors.addressDescription ? (
          <span className="shop-order-form-error">{errors.addressDescription}</span>
        ) : null}
      </div>
    </div>
  );
}
