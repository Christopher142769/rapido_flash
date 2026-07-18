import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { POINTS_CITIES } from '../../utils/pointsByCity';
import './ShopOrderSpecsModal.css';

function toDateInputValue(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function emptyForm() {
  return {
    productName: '',
    quantity: '',
    quantityUnit: 'kg',
    unitPrice: '',
    deliveryFee: '',
    eviscerationCleaning: false,
    clientSpecifications: '',
    requestedDeliveryAt: '',
    orderDate: '',
    offPlatformLocation: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: 'Cotonou',
    addressDescription: '',
  };
}

function formFromOrder(order) {
  if (!order) return emptyForm();
  return {
    productName: order.productName || '',
    quantity: order.quantity != null ? String(order.quantity) : '',
    quantityUnit: order.quantityUnit || 'kg',
    unitPrice: order.unitPrice != null ? String(order.unitPrice) : '',
    deliveryFee: order.deliveryFee != null ? String(order.deliveryFee) : '0',
    eviscerationCleaning: !!order.eviscerationCleaning,
    clientSpecifications: String(order.clientSpecifications || ''),
    requestedDeliveryAt: toDateInputValue(order.requestedDeliveryAt),
    orderDate: toDateInputValue(order.orderDate || order.createdAt),
    offPlatformLocation: order.offPlatformLocation || '',
    firstName: order.customer?.firstName || '',
    lastName: order.customer?.lastName || '',
    phone: order.customer?.phone || '',
    email: order.customer?.email || '',
    city: order.customer?.city || 'Cotonou',
    addressDescription: order.customer?.addressDescription || '',
  };
}

export default function ShopOrderEditModal({ order, onClose, onSave, saving = false }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(formFromOrder(order));
  }, [order]);

  useEffect(() => {
    if (!order) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [order, saving, onClose]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const previewTotal = useMemo(() => {
    const qty = Number(form.quantity) || 0;
    const unit = Number(form.unitPrice) || 0;
    const delivery = Number(form.deliveryFee) || 0;
    const subtotal = Math.round(qty * unit);
    const evisc = form.eviscerationCleaning ? Math.round(200 * qty) : 0;
    return subtotal + delivery + evisc;
  }, [form.quantity, form.unitPrice, form.deliveryFee, form.eviscerationCleaning]);

  if (!order) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);
    const deliveryFee = Number(form.deliveryFee);

    if (!form.productName.trim()) return;
    if (!Number.isFinite(quantity) || quantity < 0.001) return;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return;
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) return;

    onSave({
      productName: form.productName.trim(),
      quantity,
      quantityUnit: form.quantityUnit,
      unitPrice,
      deliveryFee,
      eviscerationCleaning: !!form.eviscerationCleaning,
      clientSpecifications: form.clientSpecifications.trim(),
      requestedDeliveryAt: form.requestedDeliveryAt || null,
      orderDate: form.orderDate || null,
      offPlatformLocation: form.offPlatformLocation.trim(),
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        city: form.city,
        addressDescription: form.addressDescription.trim(),
      },
    });
  };

  return createPortal(
    <div
      className="shop-specs-modal-overlay"
      role="presentation"
      onClick={() => !saving && onClose()}
    >
      <div
        className="shop-specs-modal shop-specs-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-edit-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="shop-specs-modal-close"
          aria-label="Fermer"
          disabled={saving}
          onClick={onClose}
        >
          ×
        </button>
        <h3 id="shop-edit-modal-title">Modifier la commande</h3>
        <p className="shop-specs-modal-lead">
          N° {order.orderNumber || '—'} · Admin uniquement
        </p>

        <form className="shop-edit-form" onSubmit={handleSubmit}>
          <fieldset className="shop-edit-fieldset">
            <legend>Produit</legend>
            <label className="shop-specs-modal-label">
              Nom du produit
              <input
                className="shop-edit-input"
                value={form.productName}
                onChange={(e) => setField('productName', e.target.value)}
                required
              />
            </label>
            <div className="shop-edit-row">
              <label className="shop-specs-modal-label">
                Quantité
                <input
                  className="shop-edit-input"
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={form.quantity}
                  onChange={(e) => setField('quantity', e.target.value)}
                  required
                />
              </label>
              <label className="shop-specs-modal-label">
                Unité
                <select
                  className="shop-edit-input"
                  value={form.quantityUnit}
                  onChange={(e) => setField('quantityUnit', e.target.value)}
                >
                  <option value="kg">kg</option>
                  <option value="unit">unité</option>
                  <option value="g">g</option>
                  <option value="litre">litre</option>
                  <option value="tonne">tonne</option>
                  <option value="m3">m³</option>
                </select>
              </label>
            </div>
            <div className="shop-edit-row">
              <label className="shop-specs-modal-label">
                Prix unitaire (FCFA)
                <input
                  className="shop-edit-input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.unitPrice}
                  onChange={(e) => setField('unitPrice', e.target.value)}
                  required
                />
              </label>
              <label className="shop-specs-modal-label">
                Livraison (FCFA)
                <input
                  className="shop-edit-input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.deliveryFee}
                  onChange={(e) => setField('deliveryFee', e.target.value)}
                  required
                />
              </label>
            </div>
            <label className="shop-edit-check">
              <input
                type="checkbox"
                checked={form.eviscerationCleaning}
                onChange={(e) => setField('eviscerationCleaning', e.target.checked)}
              />
              Éviscération et nettoyage
            </label>
            <p className="shop-edit-total">
              Total estimé : <strong>{previewTotal.toLocaleString('fr-FR')} FCFA</strong>
            </p>
          </fieldset>

          <fieldset className="shop-edit-fieldset">
            <legend>Client & livraison</legend>
            <div className="shop-edit-row">
              <label className="shop-specs-modal-label">
                Prénom
                <input
                  className="shop-edit-input"
                  value={form.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  required={!order.isOffPlatform}
                />
              </label>
              <label className="shop-specs-modal-label">
                Nom
                <input
                  className="shop-edit-input"
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  required={!order.isOffPlatform}
                />
              </label>
            </div>
            <div className="shop-edit-row">
              <label className="shop-specs-modal-label">
                Téléphone
                <input
                  className="shop-edit-input"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  required={!order.isOffPlatform}
                />
              </label>
              <label className="shop-specs-modal-label">
                Email
                <input
                  className="shop-edit-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </label>
            </div>
            <div className="shop-edit-row">
              <label className="shop-specs-modal-label">
                Ville
                <select
                  className="shop-edit-input"
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                >
                  {POINTS_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="shop-specs-modal-label">
                Date commande
                <input
                  className="shop-edit-input"
                  type="date"
                  value={form.orderDate}
                  onChange={(e) => setField('orderDate', e.target.value)}
                />
              </label>
            </div>
            <label className="shop-specs-modal-label">
              Adresse de livraison
              <input
                className="shop-edit-input"
                value={form.addressDescription}
                onChange={(e) => setField('addressDescription', e.target.value)}
                required={!order.isOffPlatform}
              />
            </label>
            {order.isOffPlatform ? (
              <label className="shop-specs-modal-label">
                Lieu hors plateforme
                <input
                  className="shop-edit-input"
                  value={form.offPlatformLocation}
                  onChange={(e) => setField('offPlatformLocation', e.target.value)}
                />
              </label>
            ) : null}
            <label className="shop-specs-modal-label">
              Livraison souhaitée
              <input
                className="shop-edit-input"
                type="date"
                value={form.requestedDeliveryAt}
                onChange={(e) => setField('requestedDeliveryAt', e.target.value)}
              />
            </label>
            <label className="shop-specs-modal-label" htmlFor="shop-edit-specs">
              Spécifications / instructions
            </label>
            <textarea
              id="shop-edit-specs"
              className="shop-specs-modal-textarea"
              rows={3}
              value={form.clientSpecifications}
              onChange={(e) => setField('clientSpecifications', e.target.value)}
              maxLength={2000}
            />
          </fieldset>

          <div className="shop-specs-modal-actions">
            <button
              type="button"
              className="shop-specs-modal-btn shop-specs-modal-btn--outline"
              disabled={saving}
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="shop-specs-modal-btn shop-specs-modal-btn--primary"
              disabled={saving}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
