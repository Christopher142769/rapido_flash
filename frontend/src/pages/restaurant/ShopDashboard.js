import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import MediaPickerModal from '../../components/MediaPickerModal';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { getShopPromoState, formatPriceXof } from '../../utils/shopPromo';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import { FaCopy, FaEdit, FaRocket, FaStop, FaTrash, FaExternalLinkAlt } from 'react-icons/fa';
import './ShopDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const emptyForm = () => ({
  name: '',
  slug: '',
  shortDescription: '',
  basePrice: '',
  published: false,
  mainImage: '',
  images: [],
  copySections: [{ title: '', body: '', icon: '' }],
  promo: {
    active: false,
    discountPercent: 10,
    freeDelivery: false,
    startsAt: '',
    endsAt: '',
  },
  whatsappNumber: '',
  contactPhone: '',
  ctaLabel: 'Commander maintenant',
});

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ShopDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const token = localStorage.getItem('token');
  const authHeaders = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const loadProducts = useCallback(async () => {
    const res = await axios.get(`${API_URL}/shop-products`, authHeaders);
    setProducts(Array.isArray(res.data) ? res.data : []);
  }, [authHeaders]);

  useEffect(() => {
    loadProducts()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadProducts]);

  const publicOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name || '',
      slug: p.slug || '',
      shortDescription: p.shortDescription || '',
      basePrice: String(p.basePrice ?? ''),
      published: !!p.published,
      mainImage: p.mainImage || '',
      images: Array.isArray(p.images) ? p.images : [],
      copySections:
        p.copySections?.length > 0
          ? p.copySections.map((s) => ({ title: s.title || '', body: s.body || '', icon: s.icon || '' }))
          : [{ title: '', body: '', icon: '' }],
      promo: {
        active: !!p.promo?.active,
        discountPercent: p.promo?.discountPercent ?? 10,
        freeDelivery: !!p.promo?.freeDelivery,
        startsAt: toDatetimeLocal(p.promo?.startsAt),
        endsAt: toDatetimeLocal(p.promo?.endsAt),
      },
      whatsappNumber: p.whatsappNumber || '',
      contactPhone: p.contactPhone || '',
      ctaLabel: p.ctaLabel || 'Commander maintenant',
    });
    setShowForm(true);
  };

  const onMediaChosen = (path) => {
    setForm((f) => ({ ...f, mainImage: path }));
    setMediaPickerOpen(false);
  };

  const updateSection = (index, field, value) => {
    setForm((f) => {
      const copySections = [...f.copySections];
      copySections[index] = { ...copySections[index], [field]: value };
      return { ...f, copySections };
    });
  };

  const addSection = () => {
    setForm((f) => ({
      ...f,
      copySections: [...f.copySections, { title: '', body: '', icon: '' }],
    }));
  };

  const removeSection = (index) => {
    setForm((f) => ({
      ...f,
      copySections: f.copySections.filter((_, i) => i !== index),
    }));
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        shortDescription: form.shortDescription,
        basePrice: Number(form.basePrice),
        published: form.published,
        mainImage: form.mainImage,
        images: JSON.stringify(form.images),
        copySections: JSON.stringify(form.copySections),
        promo: JSON.stringify({
          active: form.promo.active,
          discountPercent: Number(form.promo.discountPercent),
          freeDelivery: form.promo.freeDelivery,
          startsAt: form.promo.startsAt ? new Date(form.promo.startsAt).toISOString() : null,
          endsAt: form.promo.endsAt ? new Date(form.promo.endsAt).toISOString() : null,
        }),
        whatsappNumber: form.whatsappNumber,
        contactPhone: form.contactPhone,
        ctaLabel: form.ctaLabel,
      };

      if (editingId) {
        await axios.put(`${API_URL}/shop-products/${editingId}`, payload, authHeaders);
      } else {
        await axios.post(`${API_URL}/shop-products`, payload, authHeaders);
      }
      await loadProducts();
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const launchPromo = async (p) => {
    const discount = window.prompt('Pourcentage de réduction (1-90) ?', String(p.promo?.discountPercent || 10));
    if (discount == null) return;
    const hours = window.prompt('Durée de la promo en heures ?', '48');
    if (hours == null) return;
    const endsAt = new Date(Date.now() + Number(hours) * 3600 * 1000).toISOString();
    const freeDelivery = window.confirm('Activer la livraison gratuite pour cette promo ?');
    try {
      await axios.patch(
        `${API_URL}/shop-products/${p._id}/promo`,
        {
          active: true,
          discountPercent: Number(discount),
          freeDelivery,
          endsAt,
          startsAt: new Date().toISOString(),
          published: true,
        },
        authHeaders
      );
      await loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur promo');
    }
  };

  const stopPromo = async (p) => {
    try {
      await axios.patch(
        `${API_URL}/shop-products/${p._id}/promo`,
        { active: false, discountPercent: 0, freeDelivery: false, endsAt: null },
        authHeaders
      );
      await loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const deleteProduct = async (p) => {
    if (!window.confirm(`Supprimer « ${p.name} » ?`)) return;
    try {
      await axios.delete(`${API_URL}/shop-products/${p._id}`, authHeaders);
      await loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur suppression');
    }
  };

  const copyLink = (slug) => {
    const url = `${publicOrigin}/shop/${slug}`;
    navigator.clipboard?.writeText(url).then(() => alert(`Lien copié :\n${url}`));
  };

  if (loading) return <PageLoader />;

  return (
    <div className="shop-dash">
      <ShopBrandHeader variant="dashboard" />

      <div className="shop-dash-hero">
        <div className="shop-dash-hero-text">
          <h1>Ventes express</h1>
          <p>
            Créez des pages produit pour vos campagnes pub. Chaque article publié est accessible sur{' '}
            <code className="shop-dash-code">/shop/nom-du-produit</code>.
          </p>
        </div>
        <button type="button" className="shop-dash-btn shop-dash-btn--primary" onClick={openCreate}>
          + Nouveau produit
        </button>
      </div>

      {showForm ? (
        <form className="shop-dash-card shop-dash-form" onSubmit={saveProduct}>
          <h3 className="shop-dash-form-title">{editingId ? 'Modifier le produit' : 'Nouveau produit'}</h3>
          <div className="shop-dash-grid">
            <div>
              <label>Nom du produit *</label>
              <input
                className="shop-dash-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label>Slug URL (optionnel)</label>
              <input
                className="shop-dash-input"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="auto depuis le nom"
              />
            </div>
            <div>
              <label>Prix de base (CFA) *</label>
              <input
                className="shop-dash-input"
                type="number"
                min="0"
                value={form.basePrice}
                onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                required
              />
            </div>
            <label className="shop-dash-check">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              />
              Publié (visible sur /shop/…)
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Accroche courte</label>
            <textarea
              className="shop-dash-textarea"
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Image principale</label>
            <div className="shop-dash-actions">
              <button type="button" className="shop-dash-btn secondary" onClick={() => setMediaPickerOpen(true)}>
                Galerie
              </button>
              {form.mainImage ? (
                <img src={getImageUrl(form.mainImage, BASE_URL)} alt="" style={{ height: 56, borderRadius: 8 }} />
              ) : null}
            </div>
          </div>

          <div className="shop-dash-promo-box shop-dash-form-section">
            <h4 className="shop-dash-section-title">Campagne promo express</h4>
            <div className="shop-dash-grid">
              <label className="shop-dash-check">
                <input
                  type="checkbox"
                  checked={form.promo.active}
                  onChange={(e) => setForm((f) => ({ ...f, promo: { ...f.promo, active: e.target.checked } }))}
                />
                Promo active
              </label>
              <div>
                <label>% réduction</label>
                <input
                  className="shop-dash-input"
                  type="number"
                  min="0"
                  max="90"
                  value={form.promo.discountPercent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, promo: { ...f.promo, discountPercent: e.target.value } }))
                  }
                />
              </div>
              <label className="shop-dash-check">
                <input
                  type="checkbox"
                  checked={form.promo.freeDelivery}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, promo: { ...f.promo, freeDelivery: e.target.checked } }))
                  }
                />
                Livraison gratuite
              </label>
              <div>
                <label>Début promo</label>
                <input
                  className="shop-dash-input"
                  type="datetime-local"
                  value={form.promo.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, promo: { ...f.promo, startsAt: e.target.value } }))}
                />
              </div>
              <div>
                <label>Fin promo (compteur)</label>
                <input
                  className="shop-dash-input"
                  type="datetime-local"
                  value={form.promo.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, promo: { ...f.promo, endsAt: e.target.value } }))}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <h4>Blocs copywriting</h4>
            {form.copySections.map((sec, i) => (
              <div key={i} className="shop-dash-section-block" style={{ marginBottom: 8 }}>
                <input
                  className="shop-dash-input"
                  placeholder="Emoji"
                  value={sec.icon}
                  onChange={(e) => updateSection(i, 'icon', e.target.value)}
                />
                <input
                  className="shop-dash-input"
                  placeholder="Titre"
                  value={sec.title}
                  onChange={(e) => updateSection(i, 'title', e.target.value)}
                />
                <textarea
                  className="shop-dash-textarea"
                  placeholder="Texte marketing"
                  value={sec.body}
                  onChange={(e) => updateSection(i, 'body', e.target.value)}
                />
                {form.copySections.length > 1 ? (
                  <button type="button" className="shop-dash-btn secondary" onClick={() => removeSection(i)}>
                    Retirer
                  </button>
                ) : null}
              </div>
            ))}
            <button type="button" className="shop-dash-btn secondary" onClick={addSection}>
              + Bloc
            </button>
          </div>

          <div className="shop-dash-grid" style={{ marginTop: 16 }}>
            <div>
              <label>WhatsApp (229…)</label>
              <input
                className="shop-dash-input"
                value={form.whatsappNumber}
                onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
              />
            </div>
            <div>
              <label>Téléphone</label>
              <input
                className="shop-dash-input"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              />
            </div>
            <div>
              <label>Bouton CTA</label>
              <input
                className="shop-dash-input"
                value={form.ctaLabel}
                onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
              />
            </div>
          </div>

          <div className="shop-dash-actions" style={{ marginTop: 16 }}>
            <button type="submit" className="shop-dash-btn shop-dash-btn--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className="shop-dash-btn secondary" onClick={resetForm}>
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      <div className="shop-dash-card">
        <h3 className="shop-dash-list-title">
          Produits <span className="shop-dash-count">{products.length}</span>
        </h3>
        <div className="shop-dash-product-grid">
          {products.map((p) => {
            const promo = getShopPromoState(p);
            const pubUrl = `${publicOrigin}/shop/${p.slug}`;
            return (
              <article
                key={p._id}
                className={`shop-dash-product-card${p.published ? '' : ' shop-dash-product-card--draft'}`}
              >
                <div className="shop-dash-product-card-img-wrap">
                  <img src={getImageUrl(p.mainImage || p.images?.[0], BASE_URL)} alt="" />
                  {promo.isPromoLive ? <span className="shop-dash-product-card-promo">Promo</span> : null}
                  {!p.published ? <span className="shop-dash-product-card-draft">Brouillon</span> : null}
                </div>
                <div className="shop-dash-product-card-body">
                  <h4>{p.name}</h4>
                  <p className="shop-dash-product-card-price">
                    {promo.isPromoLive ? (
                      <>
                        <span className="shop-dash-price-old">{formatPriceXof(promo.basePrice)}</span>
                        <span className="shop-dash-price-promo">{formatPriceXof(promo.promoPrice)}</span>
                      </>
                    ) : (
                      formatPriceXof(p.basePrice)
                    )}
                  </p>
                  {promo.freeDelivery ? <span className="shop-dash-tag">Livraison gratuite</span> : null}
                  <a className="shop-dash-link" href={pubUrl} target="_blank" rel="noopener noreferrer">
                    <FaExternalLinkAlt size={11} /> Voir la page
                  </a>
                  <div className="shop-dash-actions shop-dash-actions--card">
                    <button type="button" className="shop-dash-icon-btn" title="Copier le lien" onClick={() => copyLink(p.slug)}>
                      <FaCopy />
                    </button>
                    <button type="button" className="shop-dash-icon-btn" title="Modifier" onClick={() => openEdit(p)}>
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      className="shop-dash-icon-btn shop-dash-icon-btn--accent"
                      title="Lancer promo"
                      onClick={() => launchPromo(p)}
                    >
                      <FaRocket />
                    </button>
                    {p.promo?.active ? (
                      <button type="button" className="shop-dash-icon-btn" title="Arrêter promo" onClick={() => stopPromo(p)}>
                        <FaStop />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="shop-dash-icon-btn shop-dash-icon-btn--danger"
                      title="Supprimer"
                      onClick={() => deleteProduct(p)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {products.length === 0 ? (
            <p className="shop-dash-empty">Aucun produit. Créez votre première page campagne.</p>
          ) : null}
        </div>
      </div>

      <MediaPickerModal open={mediaPickerOpen} onClose={() => setMediaPickerOpen(false)} onSelect={onMediaChosen} />
    </div>
  );
}
