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

function formFromOrder(order) {
  if (!order) {
    return {
      deliveryFee: '0',
      clientSpecifications: '',
      requestedDeliveryAt: '',
      orderDate: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      city: 'Cotonou',
      addressDescription: '',
      items: [],
    };
  }
  return {
    deliveryFee: order.deliveryFee != null ? String(order.deliveryFee) : '0',
    clientSpecifications: String(order.clientSpecifications || ''),
    requestedDeliveryAt: toDateInputValue(order.requestedDeliveryAt),
    orderDate: toDateInputValue(order.orderDate || order.createdAt),
    firstName: order.customer?.firstName || '',
    lastName: order.customer?.lastName || '',
    phone: order.customer?.phone || '',
    email: order.customer?.email || '',
    city: order.customer?.city || 'Cotonou',
    addressDescription: order.customer?.addressDescription || '',
    items: (order.items || []).map((it) => ({
      _id: it._id,
      productName: it.productName || '',
      quantity: String(it.quantity ?? 1),
      unitPrice: String(it.unitPrice ?? 0),
      specifications: String(it.specifications || ''),
    })),
  };
}

export default function MealOrderEditModal({ order, onClose, onSave, saving = false }) {
  const [form, setForm] = useState(() => formFromOrder(null));

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

  const setItemField = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, [key]: value } : it)),
    }));
  };

  const previewTotal = useMemo(() => {
    const itemsSub = (form.items || []).reduce((sum, it) => {
      const qty = Number(it.quantity) || 0;
      const unit = Number(it.unitPrice) || 0;
      return sum + Math.round(qty * unit);
    }, 0);
    const delivery = Number(form.deliveryFee) || 0;
    return itemsSub + delivery;
  }, [form.items, form.deliveryFee]);

  if (!order) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;

    const deliveryFee = Number(form.deliveryFee);
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) return;

    const items = form.items.map((it) => ({
      _id: it._id,
      productName: it.productName.trim(),
      quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
      unitPrice: Math.max(0, Math.round(Number(it.unitPrice) || 0)),
      specifications: it.specifications.trim(),
    }));

    if (items.some((it) => !it.productName)) return;

    onSave({
      deliveryFee,
      clientSpecifications: form.clientSpecifications.trim(),
      requestedDeliveryAt: form.requestedDeliveryAt || null,
      orderDate: form.orderDate || null,
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        city: form.city,
        addressDescription: form.addressDescription.trim(),
      },
      items,
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
        aria-labelledby="meal-edit-modal-title"
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
        <h3 id="meal-edit-modal-title">Modifier la commande repas</h3>
        <p className="shop-specs-modal-lead">
          N° {order.orderNumber || '—'} · Admin uniquement
        </p>

        <form className="shop-edit-form" onSubmit={handleSubmit}>
          <fieldset className="shop-edit-fieldset">
            <legend>Plats</legend>
            {form.items.map((it, index) => (
              <div key={it._id || index} className="shop-edit-meal-item">
                <label className="shop-specs-modal-label">
                  Nom du plat
                  <input
                    className="shop-edit-input"
                    value={it.productName}
                    onChange={(e) => setItemField(index, 'productName', e.target.value)}
                    required
                  />
                </label>
                <div className="shop-edit-row">
                  <label className="shop-specs-modal-label">
                    Quantité
                    <input
                      className="shop-edit-input"
                      type="number"
                      min="1"
                      step="1"
                      value={it.quantity}
                      onChange={(e) => setItemField(index, 'quantity', e.target.value)}
                      required
                    />
                  </label>
                  <label className="shop-specs-modal-label">
                    Prix unitaire (FCFA)
                    <input
                      className="shop-edit-input"
                      type="number"
                      min="0"
                      step="1"
                      value={it.unitPrice}
                      onChange={(e) => setItemField(index, 'unitPrice', e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="shop-specs-modal-label">
                  Spécifications du plat
                  <input
                    className="shop-edit-input"
                    value={it.specifications}
                    onChange={(e) => setItemField(index, 'specifications', e.target.value)}
                    maxLength={500}
                  />
                </label>
              </div>
            ))}
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
            <p className="shop-edit-total">
              Total estimé (hors options/acc.) :{' '}
              <strong>{previewTotal.toLocaleString('fr-FR')} FCFA</strong>
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
                  required
                />
              </label>
              <label className="shop-specs-modal-label">
                Nom
                <input
                  className="shop-edit-input"
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  required
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
                  required
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
                required
              />
            </label>
            <label className="shop-specs-modal-label">
              Livraison souhaitée
              <input
                className="shop-edit-input"
                type="date"
                value={form.requestedDeliveryAt}
                onChange={(e) => setField('requestedDeliveryAt', e.target.value)}
              />
            </label>
            <label className="shop-specs-modal-label" htmlFor="meal-edit-specs">
              Spécifications / instructions
            </label>
            <textarea
              id="meal-edit-specs"
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
