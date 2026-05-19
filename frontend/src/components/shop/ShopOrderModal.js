import React, { useEffect, useState } from 'react';
import { emptyCustomerForm, validateCustomerForm } from '../../utils/shopOrder';
import './ShopOrderModal.css';

export default function ShopOrderModal({ open, onClose, onSubmit, productName, quantity, totalLabel }) {
  const [customer, setCustomer] = useState(emptyCustomerForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setCustomer(emptyCustomerForm());
    setErrors({});
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const setField = (field, value) => {
    setCustomer((c) => ({ ...c, [field]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validateCustomerForm(customer);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSubmit(customer);
  };

  return (
    <div className="shop-order-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="shop-order-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-order-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="shop-order-modal-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>

        <h2 id="shop-order-modal-title" className="shop-order-modal-title">
          Vos informations de livraison
        </h2>
        <p className="shop-order-modal-sub">
          {productName} · Qté {quantity} · <strong>{totalLabel}</strong>
        </p>

        <form className="shop-order-modal-form" onSubmit={handleSubmit} noValidate>
          <div className="shop-order-modal-row">
            <div className="shop-order-modal-field">
              <label htmlFor="shop-firstName">Prénom *</label>
              <input
                id="shop-firstName"
                className={errors.firstName ? 'has-error' : ''}
                value={customer.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                autoComplete="given-name"
              />
              {errors.firstName ? <span className="shop-order-modal-error">{errors.firstName}</span> : null}
            </div>
            <div className="shop-order-modal-field">
              <label htmlFor="shop-lastName">Nom *</label>
              <input
                id="shop-lastName"
                className={errors.lastName ? 'has-error' : ''}
                value={customer.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                autoComplete="family-name"
              />
              {errors.lastName ? <span className="shop-order-modal-error">{errors.lastName}</span> : null}
            </div>
          </div>

          <div className="shop-order-modal-field">
            <label htmlFor="shop-phone">Numéro de téléphone joignable *</label>
            <input
              id="shop-phone"
              type="tel"
              inputMode="tel"
              placeholder="Ex. 229 97 00 00 00"
              className={errors.phone ? 'has-error' : ''}
              value={customer.phone}
              onChange={(e) => setField('phone', e.target.value)}
              autoComplete="tel"
            />
            {errors.phone ? <span className="shop-order-modal-error">{errors.phone}</span> : null}
          </div>

          <div className="shop-order-modal-field">
            <label htmlFor="shop-address">Adresse de livraison *</label>
            <input
              id="shop-address"
              className={errors.address ? 'has-error' : ''}
              value={customer.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Quartier, rue, maison…"
              autoComplete="street-address"
            />
            {errors.address ? <span className="shop-order-modal-error">{errors.address}</span> : null}
          </div>

          <div className="shop-order-modal-field">
            <label htmlFor="shop-addressDesc">Description de l&apos;adresse *</label>
            <textarea
              id="shop-addressDesc"
              rows={3}
              className={errors.addressDescription ? 'has-error' : ''}
              value={customer.addressDescription}
              onChange={(e) => setField('addressDescription', e.target.value)}
              placeholder="Repères, couleur du portail, étage, personne à contacter sur place…"
            />
            {errors.addressDescription ? (
              <span className="shop-order-modal-error">{errors.addressDescription}</span>
            ) : null}
          </div>

          <div className="shop-order-modal-actions">
            <button type="button" className="shop-order-modal-btn shop-order-modal-btn--ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="shop-order-modal-btn shop-order-modal-btn--primary">
              Valider la commande
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
