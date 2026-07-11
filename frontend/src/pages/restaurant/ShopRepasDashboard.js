import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { formatPriceXof, applyBoostDefaults, promoPayloadFromForm, DEFAULT_BOOST_HOURS } from '../../utils/shopPromo';
import SectionRefreshButton from '../../components/dashboard/SectionRefreshButton';
import { useRegisterDashboardRefresh } from '../../context/DashboardRefreshContext';
import {
  FaCopy,
  FaEdit,
  FaTrash,
  FaExternalLinkAlt,
  FaPlus,
  FaUtensils,
  FaStore,
} from 'react-icons/fa';
import '../restaurant/ShopDashboard.css';
import './ShopRepasDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const emptyAcc = () => ({ name: '', price: '', required: false, maxQuantity: 5 });

const emptyForm = () => ({
  name: '',
  slug: '',
  shortDescription: '',
  basePrice: '',
  category: '',
  published: false,
  mainImage: '',
  images: [],
  accompagnements: [],
  promo: {
    active: false,
    priceMode: 'percent',
    discountPercent: 10,
    manualPrice: '',
    freeDelivery: false,
    startsAt: '',
    endsAt: '',
    runUntilStopped: true,
    boostHours: DEFAULT_BOOST_HOURS,
  },
});

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ShopRepasDashboard() {
  const [tab, setTab] = useState('plats');
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const publicUrl = `${window.location.origin}/repas`;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/meal-products`, { headers: authHeaders() }),
        axios.get(`${API_URL}/meal-shop`, { headers: authHeaders() }),
      ]);
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setSettings(sRes.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRegisterDashboardRefresh(load);

  const stats = useMemo(() => {
    const published = products.filter((p) => p.published).length;
    const promo = products.filter((p) => p.isPromoLive).length;
    return { total: products.length, published, promo };
  }, [products]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setTab('form');
    setOk('');
    setError('');
  };

  const startEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name || '',
      slug: p.slug || '',
      shortDescription: p.shortDescription || '',
      basePrice: p.basePrice ?? '',
      category: p.category || '',
      published: !!p.published,
      mainImage: p.mainImage || '',
      images: p.images || [],
      accompagnements: (p.accompagnements || []).map((a) => ({
        name: a.name,
        price: a.price,
        required: !!a.required,
        maxQuantity: a.maxQuantity || 5,
        _id: a._id,
      })),
      promo: {
        active: !!p.promo?.active,
        priceMode: p.promo?.priceMode || 'percent',
        discountPercent: p.promo?.discountPercent ?? 10,
        manualPrice: p.promo?.manualPrice ?? '',
        freeDelivery: !!p.promo?.freeDelivery,
        startsAt: '',
        endsAt: '',
        runUntilStopped: p.promo?.runUntilStopped !== false,
        boostHours: DEFAULT_BOOST_HOURS,
      },
    });
    setTab('form');
    setOk('');
    setError('');
  };

  const uploadImages = async (files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images', f));
    const res = await axios.post(`${API_URL}/meal-products/upload`, fd, {
      headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
    });
    return res.data.urls || [];
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk('');
    try {
      const promo = form.promo.active
        ? promoPayloadFromForm(applyBoostDefaults(form.promo, form.promo.boostHours))
        : promoPayloadFromForm(form.promo);
      const payload = {
        name: form.name,
        slug: form.slug,
        shortDescription: form.shortDescription,
        basePrice: Number(form.basePrice),
        category: form.category,
        published: form.published,
        mainImage: form.mainImage,
        images: form.images,
        accompagnements: form.accompagnements
          .filter((a) => a.name?.trim())
          .map((a) => ({
            name: a.name.trim(),
            price: Math.max(0, Number(a.price) || 0),
            required: !!a.required,
            maxQuantity: Math.max(1, Number(a.maxQuantity) || 5),
          })),
        promo,
      };

      if (editingId) {
        await axios.put(`${API_URL}/meal-products/${editingId}`, payload, { headers: authHeaders() });
        setOk('Plat mis à jour');
      } else {
        await axios.post(`${API_URL}/meal-products`, payload, { headers: authHeaders() });
        setOk('Plat créé');
      }
      await load();
      setTab('plats');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Supprimer ce plat ?')) return;
    try {
      await axios.delete(`${API_URL}/meal-products/${id}`, { headers: authHeaders() });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const saveSettings = async (patch) => {
    setSaving(true);
    setError('');
    try {
      const res = await axios.put(
        `${API_URL}/meal-shop`,
        { ...settings, ...patch },
        { headers: authHeaders() }
      );
      setSettings(res.data);
      setOk('Boutique mise à jour');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadSlide = async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await axios.post(`${API_URL}/meal-shop/upload-slide`, fd, {
      headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  };

  if (loading && !products.length) return <PageLoader />;

  return (
    <div className="dashboard-page shop-repas-dash">
      <div className="dashboard-header">
        <div>
          <h1>
            <FaUtensils style={{ marginRight: 10 }} />
            Shop repas
          </h1>
          <p className="plats-subhint">Boutique multi-plats — {publicUrl}</p>
        </div>
        <div className="shop-repas-dash-actions">
          <SectionRefreshButton onRefresh={load} />
          <button type="button" className="btn-outline" onClick={() => navigator.clipboard.writeText(publicUrl)}>
            <FaCopy /> Copier le lien
          </button>
          <a className="btn-outline" href="/repas" target="_blank" rel="noreferrer">
            <FaExternalLinkAlt /> Voir /repas
          </a>
          <button type="button" className="btn-primary" onClick={startCreate}>
            <FaPlus /> Nouveau plat
          </button>
        </div>
      </div>

      <div className="shop-repas-tabs">
        <button type="button" className={tab === 'plats' ? 'is-active' : ''} onClick={() => setTab('plats')}>
          Plats
        </button>
        <button type="button" className={tab === 'form' ? 'is-active' : ''} onClick={() => (editingId || tab === 'form' ? setTab('form') : startCreate())}>
          {editingId ? 'Modifier' : 'Créer'}
        </button>
        <button type="button" className={tab === 'boutique' ? 'is-active' : ''} onClick={() => setTab('boutique')}>
          <FaStore /> Boutique
        </button>
      </div>

      {error ? <p className="shop-repas-msg shop-repas-msg--err">{error}</p> : null}
      {ok ? <p className="shop-repas-msg shop-repas-msg--ok">{ok}</p> : null}

      {tab === 'plats' ? (
        <>
          <div className="shop-repas-stats">
            <span>{stats.total} plats</span>
            <span>{stats.published} publiés</span>
            <span>{stats.promo} en promo</span>
          </div>
          <div className="shop-repas-grid">
            {products.map((p) => (
              <article key={p._id} className="shop-repas-card">
                <div className="shop-repas-card-img">
                  {p.mainImage || p.images?.[0] ? (
                    <img src={getImageUrl(p.mainImage || p.images[0], API_URL.replace('/api', ''))} alt="" />
                  ) : (
                    <div className="shop-repas-card-ph">—</div>
                  )}
                </div>
                <div className="shop-repas-card-body">
                  <h3>{p.name}</h3>
                  <p>{formatPriceXof(p.isPromoLive ? p.promoPrice : p.basePrice)}</p>
                  <p className="shop-repas-meta">
                    {p.category || 'Sans catégorie'} · {p.published ? 'Publié' : 'Brouillon'}
                    {p.accompagnements?.length ? ` · ${p.accompagnements.length} acc.` : ''}
                  </p>
                  <div className="shop-repas-card-actions">
                    <button type="button" className="btn-outline" onClick={() => startEdit(p)}>
                      <FaEdit />
                    </button>
                    <button type="button" className="btn-outline" onClick={() => deleteProduct(p._id)}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!products.length ? <p className="shop-repas-empty">Aucun plat — créez le premier.</p> : null}
          </div>
        </>
      ) : null}

      {tab === 'form' ? (
        <form className="restaurant-form shop-repas-form" onSubmit={saveProduct}>
          <div className="form-section">
            <h2>Informations</h2>
            <div className="form-group">
              <label>Nom du plat</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Slug (optionnel)</label>
              <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Description courte</label>
              <textarea
                rows={2}
                value={form.shortDescription}
                onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Prix (FCFA)</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.basePrice}
                  onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Catégorie</label>
                <input
                  list="meal-cats"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Plats, Entrées…"
                />
                <datalist id="meal-cats">
                  {(settings?.categories || []).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <label className="shop-repas-check">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              />
              Publié sur /repas
            </label>
          </div>

          <div className="form-section">
            <h2>Images</h2>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                if (!e.target.files?.length) return;
                try {
                  const urls = await uploadImages(e.target.files);
                  setForm((f) => ({
                    ...f,
                    images: [...f.images, ...urls],
                    mainImage: f.mainImage || urls[0] || '',
                  }));
                } catch (err) {
                  setError(err.response?.data?.message || err.message);
                }
              }}
            />
            <div className="shop-repas-thumbs">
              {form.images.map((url) => (
                <button
                  key={url}
                  type="button"
                  className={`shop-repas-thumb${form.mainImage === url ? ' is-main' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, mainImage: url }))}
                >
                  <img src={getImageUrl(url, API_URL.replace('/api', ''))} alt="" />
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h2>Accompagnements</h2>
            <p className="plats-subhint">Précisez le nom, le prix, et si le choix est obligatoire.</p>
            {form.accompagnements.map((a, idx) => (
              <div key={idx} className="shop-repas-acc-row">
                <input
                  placeholder="Nom"
                  value={a.name}
                  onChange={(e) =>
                    setForm((f) => {
                      const next = [...f.accompagnements];
                      next[idx] = { ...next[idx], name: e.target.value };
                      return { ...f, accompagnements: next };
                    })
                  }
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Prix"
                  value={a.price}
                  onChange={(e) =>
                    setForm((f) => {
                      const next = [...f.accompagnements];
                      next[idx] = { ...next[idx], price: e.target.value };
                      return { ...f, accompagnements: next };
                    })
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={!!a.required}
                    onChange={(e) =>
                      setForm((f) => {
                        const next = [...f.accompagnements];
                        next[idx] = { ...next[idx], required: e.target.checked };
                        return { ...f, accompagnements: next };
                      })
                    }
                  />
                  Requis
                </label>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      accompagnements: f.accompagnements.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-outline"
              onClick={() => setForm((f) => ({ ...f, accompagnements: [...f.accompagnements, emptyAcc()] }))}
            >
              + Accompagnement
            </button>
          </div>

          <div className="form-section">
            <h2>Promo</h2>
            <label className="shop-repas-check">
              <input
                type="checkbox"
                checked={form.promo.active}
                onChange={(e) => setForm((f) => ({ ...f, promo: { ...f.promo, active: e.target.checked } }))}
              />
              Promo active
            </label>
            <div className="form-group">
              <label>Réduction %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.promo.discountPercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, promo: { ...f.promo, discountPercent: e.target.value } }))
                }
              />
            </div>
            <label className="shop-repas-check">
              <input
                type="checkbox"
                checked={form.promo.freeDelivery}
                onChange={(e) =>
                  setForm((f) => ({ ...f, promo: { ...f.promo, freeDelivery: e.target.checked } }))
                }
              />
              Livraison gratuite (commande)
            </label>
          </div>

          <div className="shop-repas-form-footer">
            <button type="button" className="btn-outline" onClick={() => setTab('plats')}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      ) : null}

      {tab === 'boutique' && settings ? (
        <div className="restaurant-form shop-repas-form">
          <div className="form-section">
            <h2>Frais de livraison (commande)</h2>
            <div className="form-group">
              <input
                type="number"
                min={0}
                value={settings.deliveryFee ?? 500}
                onChange={(e) => setSettings((s) => ({ ...s, deliveryFee: e.target.value }))}
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => saveSettings({ deliveryFee: Number(settings.deliveryFee) || 0 })}
            >
              Enregistrer les frais
            </button>
          </div>

          <div className="form-section">
            <h2>Catégories affichées</h2>
            <div className="form-group">
              <input
                value={(settings.categories || []).join(', ')}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    categories: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                  }))
                }
                placeholder="Entrées, Plats, Desserts, Boissons"
              />
            </div>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => saveSettings({ categories: settings.categories })}>
              Enregistrer les catégories
            </button>
          </div>

          <div className="form-section">
            <h2>Carrousel hero</h2>
            {(settings.heroSlides || []).map((slide, idx) => (
              <div key={idx} className="shop-repas-slide">
                {slide.imageUrl ? (
                  <img src={getImageUrl(slide.imageUrl, API_URL.replace('/api', ''))} alt="" />
                ) : null}
                <input
                  placeholder="Titre"
                  value={slide.title || ''}
                  onChange={(e) => {
                    const heroSlides = [...(settings.heroSlides || [])];
                    heroSlides[idx] = { ...heroSlides[idx], title: e.target.value };
                    setSettings((s) => ({ ...s, heroSlides }));
                  }}
                />
                <input
                  placeholder="Sous-titre"
                  value={slide.subtitle || ''}
                  onChange={(e) => {
                    const heroSlides = [...(settings.heroSlides || [])];
                    heroSlides[idx] = { ...heroSlides[idx], subtitle: e.target.value };
                    setSettings((s) => ({ ...s, heroSlides }));
                  }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadSlide(file);
                      const heroSlides = [...(settings.heroSlides || [])];
                      heroSlides[idx] = { ...heroSlides[idx], imageUrl: url };
                      setSettings((s) => ({ ...s, heroSlides }));
                    } catch (err) {
                      setError(err.response?.data?.message || err.message);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      heroSlides: (s.heroSlides || []).filter((_, i) => i !== idx),
                    }))
                  }
                >
                  Retirer
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-outline"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  heroSlides: [...(s.heroSlides || []), { imageUrl: '', title: '', subtitle: '', ctaLabel: 'Commander', ctaHref: '#meal-products' }],
                }))
              }
            >
              + Slide
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ marginLeft: 8 }}
              disabled={saving}
              onClick={() => saveSettings({ heroSlides: settings.heroSlides })}
            >
              Enregistrer le carrousel
            </button>
          </div>

          <div className="form-section">
            <h2>Bannière promo</h2>
            <label className="shop-repas-check">
              <input
                type="checkbox"
                checked={!!settings.promoBanner?.active}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    promoBanner: { ...s.promoBanner, active: e.target.checked },
                  }))
                }
              />
              Active
            </label>
            <div className="form-group">
              <label>Titre</label>
              <input
                value={settings.promoBanner?.title || ''}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    promoBanner: { ...s.promoBanner, title: e.target.value },
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Sous-titre</label>
              <input
                value={settings.promoBanner?.subtitle || ''}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    promoBanner: { ...s.promoBanner, subtitle: e.target.value },
                  }))
                }
              />
            </div>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => saveSettings({ promoBanner: settings.promoBanner })}>
              Enregistrer la bannière
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
