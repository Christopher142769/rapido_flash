import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import MediaPickerModal from '../../components/MediaPickerModal';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { getShopPromoState, formatPriceXof } from '../../utils/shopPromo';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopCopyBlockEditor from '../../components/shop/ShopCopyBlockEditor';
import ShopImageUploadZone from '../../components/shop/ShopImageUploadZone';
import { uploadShopProductImages } from '../../utils/shopImageUpload';
import { emptyCopyBlock, normalizeCopyBlockForForm } from '../../utils/shopProductMedia';
import {
  DEFAULT_SHOP_QUANTITY_UNIT,
  SHOP_QUANTITY_UNITS,
  normalizeShopQuantityUnit,
} from '../../utils/shopQuantityUnit';
import {
  FaCopy,
  FaEdit,
  FaRocket,
  FaStop,
  FaTrash,
  FaExternalLinkAlt,
  FaStar,
  FaShoppingBag,
  FaEye,
} from 'react-icons/fa';
import '../../components/shop/ShopImageUploadZone.css';
import './ShopDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const emptyForm = () => ({
  name: '',
  slug: '',
  shortDescription: '',
  basePrice: '',
  quantityUnit: DEFAULT_SHOP_QUANTITY_UNIT,
  published: false,
  mainImage: '',
  images: [],
  copySections: [emptyCopyBlock('text')],
  promo: {
    active: false,
    discountPercent: 10,
    freeDelivery: false,
    startsAt: '',
    endsAt: '',
    runUntilStopped: true,
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

function mergeGallery(mainImage, images) {
  const urls = [];
  if (mainImage) urls.push(mainImage);
  for (const u of images || []) {
    if (u && !urls.includes(u)) urls.push(u);
  }
  return urls;
}

export default function ShopDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingBlockIndex, setUploadingBlockIndex] = useState(null);

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
      quantityUnit: normalizeShopQuantityUnit(p.quantityUnit),
      published: !!p.published,
      mainImage: p.mainImage || '',
      images: Array.isArray(p.images) ? p.images : [],
      copySections:
        p.copySections?.length > 0
          ? p.copySections.map((s) => normalizeCopyBlockForForm(s))
          : [emptyCopyBlock('text')],
      promo: {
        active: !!p.promo?.active,
        discountPercent: p.promo?.discountPercent ?? 10,
        freeDelivery: !!p.promo?.freeDelivery,
        startsAt: toDatetimeLocal(p.promo?.startsAt),
        endsAt: toDatetimeLocal(p.promo?.endsAt),
        runUntilStopped: p.promo?.runUntilStopped !== false,
      },
      whatsappNumber: p.whatsappNumber || '',
      contactPhone: p.contactPhone || '',
      ctaLabel: p.ctaLabel || 'Commander maintenant',
    });
    setShowForm(true);
  };

  const galleryUrls = useMemo(
    () => mergeGallery(form.mainImage, form.images),
    [form.mainImage, form.images]
  );

  const onMediaChosen = (path) => {
    if (mediaPickerTarget?.kind === 'gallery') {
      setForm((f) => {
        const images = f.images.includes(path) ? f.images : [...f.images, path];
        const mainImage = f.mainImage || path;
        return { ...f, images, mainImage };
      });
    } else if (mediaPickerTarget?.kind === 'block') {
      const idx = mediaPickerTarget.index;
      setForm((f) => {
        const copySections = [...f.copySections];
        copySections[idx] = { ...copySections[idx], mediaUrl: path };
        return { ...f, copySections };
      });
    } else {
      setForm((f) => ({ ...f, mainImage: path }));
    }
    setMediaPickerOpen(false);
    setMediaPickerTarget(null);
  };

  const addGalleryImage = () => {
    setMediaPickerTarget({ kind: 'gallery' });
    setMediaPickerOpen(true);
  };

  const appendUrlsToGallery = useCallback((urls) => {
    if (!urls?.length) return;
    setForm((f) => {
      const merged = mergeGallery(f.mainImage, f.images);
      const next = [...merged];
      for (const path of urls) {
        if (path && !next.includes(path)) next.push(path);
      }
      return {
        ...f,
        mainImage: next[0] || '',
        images: next.slice(1),
      };
    });
  }, []);

  const handleGalleryUpload = async (files) => {
    if (!token) return;
    setUploadingGallery(true);
    try {
      const urls = await uploadShopProductImages(files, token);
      if (!urls.length) {
        alert('Aucune image valide sélectionnée.');
        return;
      }
      appendUrlsToGallery(urls);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de l’import des images');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleBlockImageUpload = async (blockIndex, files) => {
    if (!token) return;
    setUploadingBlockIndex(blockIndex);
    try {
      const urls = await uploadShopProductImages(files, token);
      const path = urls[0];
      if (!path) {
        alert('Aucune image valide.');
        return;
      }
      setForm((f) => {
        const copySections = [...f.copySections];
        copySections[blockIndex] = { ...copySections[blockIndex], mediaUrl: path };
        return { ...f, copySections };
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de l’import');
    } finally {
      setUploadingBlockIndex(null);
    }
  };

  const setPrimaryImage = (url) => {
    setForm((f) => {
      const all = mergeGallery(f.mainImage, f.images);
      const reordered = [url, ...all.filter((u) => u !== url)];
      return { mainImage: reordered[0] || '', images: reordered.slice(1) };
    });
  };

  const removeGalleryImage = (url) => {
    setForm((f) => {
      const remaining = mergeGallery(f.mainImage, f.images).filter((u) => u !== url);
      return { mainImage: remaining[0] || '', images: remaining.slice(1) };
    });
  };

  const addSection = () => {
    setForm((f) => ({
      ...f,
      copySections: [...f.copySections, emptyCopyBlock('text')],
    }));
  };

  const removeSection = (index) => {
    setForm((f) => ({
      ...f,
      copySections: f.copySections.filter((_, i) => i !== index),
    }));
  };

  const moveSection = (index, dir) => {
    setForm((f) => {
      const next = [...f.copySections];
      const j = index + dir;
      if (j < 0 || j >= next.length) return f;
      [next[index], next[j]] = [next[j], next[index]];
      return { ...f, copySections: next };
    });
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
        quantityUnit: form.quantityUnit,
        published: form.published,
        mainImage: form.mainImage || galleryUrls[0] || null,
        images: JSON.stringify(galleryUrls),
        copySections: JSON.stringify(form.copySections),
        promo: JSON.stringify({
          active: form.promo.active,
          discountPercent: Number(form.promo.discountPercent),
          freeDelivery: form.promo.freeDelivery,
          startsAt: form.promo.startsAt ? new Date(form.promo.startsAt).toISOString() : null,
          endsAt: form.promo.endsAt ? new Date(form.promo.endsAt).toISOString() : null,
          runUntilStopped: !!form.promo.runUntilStopped,
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
    const hours = window.prompt(
      'Durée affichée du compte à rebours (heures) ? La promo reste active jusqu’à arrêt manuel.',
      '168'
    );
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
          runUntilStopped: true,
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
        { active: false, discountPercent: 0, freeDelivery: false, endsAt: null, runUntilStopped: false },
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

  const stats = useMemo(() => {
    let published = 0;
    let promoLive = 0;
    for (const p of products) {
      if (p.published) published += 1;
      if (getShopPromoState(p).isPromoLive) promoLive += 1;
    }
    return { total: products.length, published, promoLive };
  }, [products]);

  if (loading) return <PageLoader />;

  return (
    <div className="shop-dash">
      <ShopBrandHeader variant="dashboard" />

      <section className="shop-dash-hero">
        <div className="shop-dash-hero-main">
          <span className="shop-dash-hero-badge">
            <FaShoppingBag aria-hidden /> Rapido Shop express
          </span>
          <h1>Ventes express</h1>
          <p>
            Pages produit dédiées à vos campagnes publicitaires. Chaque article publié est accessible sur{' '}
            <code className="shop-dash-code">/shop/nom-du-produit</code>.
          </p>
          <div className="shop-dash-stats">
            <div className="shop-dash-stat">
              <strong>{stats.total}</strong>
              <span>Produits</span>
            </div>
            <div className="shop-dash-stat">
              <strong>{stats.published}</strong>
              <span>Publiés</span>
            </div>
            <div className="shop-dash-stat shop-dash-stat--accent">
              <strong>{stats.promoLive}</strong>
              <span>Promos actives</span>
            </div>
          </div>
        </div>
        <button type="button" className="shop-dash-btn shop-dash-btn--primary shop-dash-btn--hero" onClick={openCreate}>
          + Nouveau produit
        </button>
      </section>

      {showForm ? (
        <form className="shop-dash-card shop-dash-form" onSubmit={saveProduct}>
          <header className="shop-dash-form-header">
            <div>
              <h3 className="shop-dash-form-title">{editingId ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              <p className="shop-dash-form-sub">Configurez la page publique, la galerie et le copywriting.</p>
            </div>
            <button type="button" className="shop-dash-btn secondary" onClick={resetForm}>
              Fermer
            </button>
          </header>
          <section className="shop-dash-form-block">
            <div className="shop-dash-form-block-head">
              <span className="shop-dash-form-step">1</span>
              <div>
                <h4>Informations produit</h4>
                <p>Nom, prix et visibilité.</p>
              </div>
            </div>
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
            <div>
              <label>Type de quantité *</label>
              <select
                className="shop-dash-input shop-dash-select"
                value={form.quantityUnit}
                onChange={(e) => setForm((f) => ({ ...f, quantityUnit: e.target.value }))}
              >
                {SHOP_QUANTITY_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <p className="shop-dash-hint shop-dash-hint--inline">
                Affiché sur la page shop lors du choix de quantité (ex. kg, litre, pièce).
              </p>
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
          </section>

          <section className="shop-dash-form-block">
            <div className="shop-dash-form-block-head">
              <span className="shop-dash-form-step">2</span>
              <div>
                <h4>Galerie & accroche</h4>
                <p>Visuels carrés 1080×1080 — image principale en premier.</p>
              </div>
            </div>
          <div className="shop-dash-field">
            <label>Accroche courte</label>
            <textarea
              className="shop-dash-textarea"
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
            />
          </div>

          <div className="shop-dash-form-section">
            <h4 className="shop-dash-section-title">Galerie photos</h4>
            <p className="shop-dash-hint">
              Importez depuis votre PC (recommandé) ou choisissez dans la médiathèque. L’image « Principale » s’affiche en premier.
            </p>
            <ShopImageUploadZone
              onFiles={handleGalleryUpload}
              uploading={uploadingGallery}
              label="Importer des photos depuis mon PC"
              hint="Plusieurs fichiers possibles — ajout direct à la galerie du produit"
            />
            <div className="shop-dash-upload-actions">
              <button type="button" className="shop-dash-btn secondary" onClick={addGalleryImage}>
                Choisir dans la galerie médias
              </button>
            </div>
            {galleryUrls.length ? (
              <div className="shop-dash-gallery-grid">
                {galleryUrls.map((url) => (
                  <div key={url} className="shop-dash-gallery-item">
                    <img src={getImageUrl(url, BASE_URL)} alt="" />
                    {form.mainImage === url ? <span className="shop-dash-gallery-primary">Principale</span> : null}
                    <div className="shop-dash-gallery-actions">
                      {form.mainImage !== url ? (
                        <button type="button" title="Définir comme principale" onClick={() => setPrimaryImage(url)}>
                          <FaStar />
                        </button>
                      ) : null}
                      <button type="button" title="Retirer" onClick={() => removeGalleryImage(url)}>
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          </section>

          <section className="shop-dash-form-block shop-dash-form-block--promo">
            <div className="shop-dash-form-block-head">
              <span className="shop-dash-form-step">3</span>
              <div>
                <h4>Campagne promo express</h4>
                <p>Réduction, livraison gratuite et compteur. Une fiche publiée reste en promo jusqu’à arrêt manuel.</p>
              </div>
            </div>
          <div className="shop-dash-promo-box">
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
                <label>Fin affichée du compteur (optionnel)</label>
                <input
                  className="shop-dash-input"
                  type="datetime-local"
                  value={form.promo.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, promo: { ...f.promo, endsAt: e.target.value } }))}
                />
              </div>
              <label className="shop-dash-check shop-dash-check--wide">
                <input
                  type="checkbox"
                  checked={form.promo.runUntilStopped}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, promo: { ...f.promo, runUntilStopped: e.target.checked } }))
                  }
                />
                Garder la promo active après la date du compteur (recommandé)
              </label>
            </div>
          </div>
          </section>

          <section className="shop-dash-form-block">
            <div className="shop-dash-form-block-head">
              <span className="shop-dash-form-step">4</span>
              <div>
                <h4>Contenu de la page</h4>
                <p>Textes, images, vidéos et FAQ sous la fiche produit.</p>
              </div>
            </div>
          <div className="shop-dash-form-section shop-dash-form-section--flat">
            <p className="shop-dash-hint">
              Composez la page comme une landing : titres, visuels et questions fréquentes.
            </p>
            <ShopCopyBlockEditor
              sections={form.copySections}
              onChange={(copySections) => setForm((f) => ({ ...f, copySections }))}
              onPickMedia={(index) => {
                setMediaPickerTarget({ kind: 'block', index });
                setMediaPickerOpen(true);
              }}
              onUploadImage={handleBlockImageUpload}
              uploadingBlockIndex={uploadingBlockIndex}
              onRemove={removeSection}
              onAdd={addSection}
              onMove={moveSection}
            />
          </div>
          </section>

          <section className="shop-dash-form-block">
            <div className="shop-dash-form-block-head">
              <span className="shop-dash-form-step">5</span>
              <div>
                <h4>Contact & commande</h4>
                <p>WhatsApp pour recevoir les commandes clients.</p>
              </div>
            </div>
          <div className="shop-dash-grid">
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
          </section>

          <div className="shop-dash-form-footer">
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
                  <p className="shop-dash-product-card-slug">
                    <FaEye aria-hidden /> /shop/{p.slug}
                  </p>
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
            <div className="shop-dash-empty">
              <div className="shop-dash-empty-icon" aria-hidden>
                <FaShoppingBag />
              </div>
              <h4>Aucune page produit</h4>
              <p>Créez votre première fiche pour vos campagnes Facebook, TikTok ou WhatsApp.</p>
              <button type="button" className="shop-dash-btn shop-dash-btn--primary" onClick={openCreate}>
                + Créer un produit
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <MediaPickerModal open={mediaPickerOpen} onClose={() => setMediaPickerOpen(false)} onSelect={onMediaChosen} />
    </div>
  );
}
