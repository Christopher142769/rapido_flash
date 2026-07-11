import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import { getImageUrl } from '../../utils/imagePlaceholder';
import {
  formatPriceXof,
  applyBoostDefaults,
  promoPayloadFromForm,
  DEFAULT_BOOST_HOURS,
  getShopPromoState,
} from '../../utils/shopPromo';
import { emptyCopyBlock, normalizeCopyBlockForForm } from '../../utils/shopProductMedia';
import {
  mealUrgencyPayloadFromForm,
  DEFAULT_MEAL_COUNTDOWN_HOURS,
} from '../../utils/mealShopUrgency';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopFormSectionHead from '../../components/shop/ShopFormSectionHead';
import ShopCopyBlockEditor from '../../components/shop/ShopCopyBlockEditor';
import ShopBusyOverlay from '../../components/shop/ShopBusyOverlay';
import SectionRefreshButton from '../../components/dashboard/SectionRefreshButton';
import { useRegisterDashboardRefresh } from '../../context/DashboardRefreshContext';
import {
  FaCopy,
  FaEdit,
  FaTrash,
  FaExternalLinkAlt,
  FaUtensils,
  FaEye,
  FaStore,
  FaRocket,
  FaStop,
  FaFire,
} from 'react-icons/fa';
import '../../components/dashboard/section-refresh.css';
import './ShopDashboard.css';
import './ShopRepasDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const emptyAcc = () => ({ name: '', price: '', required: false, maxQuantity: 5 });

const emptySlide = () => ({
  imageUrl: '',
  imageUrls: [],
  title: '',
  subtitle: '',
  ctaLabel: 'Commander',
  ctaHref: '#meal-products',
});

const emptyUrgency = () => ({
  enabled: false,
  active: false,
  label: 'Offre limitée — commandez vite',
  expectedOrders: 0,
  durationHours: DEFAULT_MEAL_COUNTDOWN_HOURS,
  runUntilStopped: true,
  startsAt: null,
  endsAt: null,
});

const emptyForm = () => ({
  name: '',
  slug: '',
  shortDescription: '',
  basePrice: '',
  category: '',
  published: false,
  mainImage: '',
  images: [],
  copySections: [emptyCopyBlock('text')],
  accompagnements: [],
  showDeliveryNotice: true,
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
  return { headers: token ? { Authorization: `Bearer ${token}` } : {} };
}

function normalizeSlide(slide) {
  const urls = Array.isArray(slide?.imageUrls)
    ? slide.imageUrls.map((u) => String(u || '').trim()).filter(Boolean)
    : [];
  const primary = String(slide?.imageUrl || '').trim() || urls[0] || '';
  const imageUrls = primary ? [primary, ...urls.filter((u) => u !== primary)] : urls;
  return {
    imageUrl: primary,
    imageUrls,
    title: slide?.title || '',
    subtitle: slide?.subtitle || '',
    ctaLabel: slide?.ctaLabel || 'Commander',
    ctaHref: slide?.ctaHref || '#meal-products',
    _id: slide?._id,
  };
}

function applyUrgencyBoostDefaults(urgency, hours = DEFAULT_MEAL_COUNTDOWN_HOURS) {
  const h = Math.min(720, Math.max(1, Number(hours) || DEFAULT_MEAL_COUNTDOWN_HOURS));
  const now = new Date();
  const end = new Date(now.getTime() + h * 3600 * 1000);
  return {
    ...urgency,
    enabled: true,
    active: true,
    durationHours: h,
    runUntilStopped: urgency?.runUntilStopped !== false,
    startsAt: now.toISOString(),
    endsAt: end.toISOString(),
  };
}

export default function ShopRepasDashboard() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showBoutique, setShowBoutique] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busyMessage, setBusyMessage] = useState(null);
  const [uploadingBlockIndex, setUploadingBlockIndex] = useState(null);

  const publicOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${publicOrigin}/repas`;

  const load = useCallback(async () => {
    setError('');
    try {
      const [pRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/meal-products`, authHeaders()),
        axios.get(`${API_URL}/meal-shop`, authHeaders()),
      ]);
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      const raw = sRes.data || {};
      setSettings({
        ...raw,
        heroSlides: (raw.heroSlides || []).map(normalizeSlide),
        urgency: { ...emptyUrgency(), ...(raw.urgency || {}) },
      });
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Erreur de chargement');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refreshPage = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useRegisterDashboardRefresh(refreshPage);

  const stats = useMemo(() => {
    let published = 0;
    let promoLive = 0;
    for (const p of products) {
      if (p.published) published += 1;
      if (getShopPromoState(p).isPromoLive) promoLive += 1;
    }
    return { total: products.length, published, promoLive };
  }, [products]);

  const formPromoPreview = useMemo(() => getShopPromoState({ ...form, promo: form.promo }), [form]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setOk('');
    setError('');
    setUploadingBlockIndex(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setShowBoutique(false);
    setOk('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name || '',
      slug: p.slug || '',
      shortDescription: p.shortDescription || '',
      basePrice: p.basePrice ?? '',
      category: p.category || '',
      published: !!p.published,
      showDeliveryNotice: p.showDeliveryNotice !== false,
      mainImage: p.mainImage || '',
      images: Array.isArray(p.images) ? p.images : [],
      copySections:
        Array.isArray(p.copySections) && p.copySections.length > 0
          ? p.copySections.map((s) => normalizeCopyBlockForForm(s))
          : [emptyCopyBlock('text')],
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
    setShowForm(true);
    setShowBoutique(false);
    setOk('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uploadImages = async (files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images', f));
    const res = await axios.post(`${API_URL}/meal-products/upload`, fd, {
      ...authHeaders(),
      headers: { ...authHeaders().headers, 'Content-Type': 'multipart/form-data' },
    });
    return res.data.urls || [];
  };

  const uploadSlideImages = async (files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images', f));
    const res = await axios.post(`${API_URL}/meal-shop/upload-slide`, fd, {
      ...authHeaders(),
      headers: { ...authHeaders().headers, 'Content-Type': 'multipart/form-data' },
    });
    if (Array.isArray(res.data?.urls) && res.data.urls.length) return res.data.urls;
    if (res.data?.url) return [res.data.url];
    return [];
  };

  const galleryList = useMemo(() => {
    const urls = [];
    if (form.mainImage) urls.push(form.mainImage);
    for (const u of form.images || []) {
      if (u && !urls.includes(u)) urls.push(u);
    }
    return urls;
  }, [form.mainImage, form.images]);

  const handleBlockImageUpload = async (blockIndex, files) => {
    if (!files?.length) return;
    setUploadingBlockIndex(blockIndex);
    setBusyMessage('Import de l’image…');
    setError('');
    try {
      const urls = await uploadImages(files);
      const path = urls[0];
      if (!path) {
        setError('Aucune image valide.');
        return;
      }
      setForm((f) => {
        const copySections = [...(f.copySections || [])];
        copySections[blockIndex] = { ...copySections[blockIndex], mediaUrl: path };
        return { ...f, copySections };
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setUploadingBlockIndex(null);
      setBusyMessage(null);
    }
  };

  const addSection = () => {
    setForm((f) => ({
      ...f,
      copySections: [...(f.copySections || []), emptyCopyBlock('text')],
    }));
  };

  const removeSection = (index) => {
    setForm((f) => ({
      ...f,
      copySections: (f.copySections || []).filter((_, i) => i !== index),
    }));
  };

  const moveSection = (index, dir) => {
    setForm((f) => {
      const next = [...(f.copySections || [])];
      const j = index + dir;
      if (j < 0 || j >= next.length) return f;
      [next[index], next[j]] = [next[j], next[index]];
      return { ...f, copySections: next };
    });
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setBusyMessage(editingId ? 'Mise à jour du plat…' : 'Création du plat…');
    setError('');
    setOk('');
    try {
      const promo = form.promo.active
        ? promoPayloadFromForm(applyBoostDefaults(form.promo, form.promo.boostHours))
        : promoPayloadFromForm(form.promo);
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        shortDescription: form.shortDescription,
        basePrice: Number(form.basePrice),
        category: form.category,
        published: form.published,
        showDeliveryNotice: form.showDeliveryNotice !== false,
        mainImage: galleryList[0] || '',
        images: galleryList.slice(1),
        copySections: Array.isArray(form.copySections) ? form.copySections : [],
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
        await axios.put(`${API_URL}/meal-products/${editingId}`, payload, authHeaders());
        setOk('Plat mis à jour');
      } else {
        await axios.post(`${API_URL}/meal-products`, payload, authHeaders());
        setOk('Plat créé');
      }
      await load();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
      setBusyMessage(null);
    }
  };

  const deleteProduct = async (p) => {
    if (!window.confirm(`Supprimer « ${p.name} » ?`)) return;
    setBusyMessage('Suppression…');
    try {
      await axios.delete(`${API_URL}/meal-products/${p._id}`, authHeaders());
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setBusyMessage(null);
    }
  };

  const copyLink = (slug) => {
    const url = `${publicOrigin}/repas/${slug}`;
    navigator.clipboard?.writeText(url).then(() => alert(`Lien copié :\n${url}`));
  };

  const launchPromo = async (p) => {
    const boosted = applyBoostDefaults(
      { ...(p.promo || {}), active: true, discountPercent: p.promo?.discountPercent || 10 },
      DEFAULT_BOOST_HOURS
    );
    setBusyMessage('Lancement de la promo…');
    try {
      await axios.patch(
        `${API_URL}/meal-products/${p._id}/promo`,
        { promo: promoPayloadFromForm(boosted), published: true, active: true },
        authHeaders()
      );
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur promo');
    } finally {
      setBusyMessage(null);
    }
  };

  const stopPromo = async (p) => {
    setBusyMessage('Arrêt de la promo…');
    try {
      await axios.patch(
        `${API_URL}/meal-products/${p._id}/promo`,
        { active: false, promo: { active: false } },
        authHeaders()
      );
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setBusyMessage(null);
    }
  };

  const saveSettings = async (patch) => {
    setSaving(true);
    setBusyMessage('Enregistrement boutique…');
    setError('');
    try {
      const res = await axios.put(`${API_URL}/meal-shop`, { ...settings, ...patch }, authHeaders());
      const raw = res.data || {};
      setSettings({
        ...raw,
        heroSlides: (raw.heroSlides || []).map(normalizeSlide),
        urgency: { ...emptyUrgency(), ...(raw.urgency || {}) },
      });
      setOk('Boutique mise à jour');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
      setBusyMessage(null);
    }
  };

  const patchSlide = (idx, patch) => {
    setSettings((s) => {
      const heroSlides = [...(s.heroSlides || [])];
      heroSlides[idx] = normalizeSlide({ ...heroSlides[idx], ...patch });
      return { ...s, heroSlides };
    });
  };

  const appendImagesToSlide = async (idx, files) => {
    if (!files?.length) return;
    setBusyMessage('Import des images du slide…');
    setError('');
    try {
      const urls = await uploadSlideImages(files);
      if (!urls.length) {
        setError('Aucune image valide.');
        return;
      }
      setSettings((s) => {
        const heroSlides = [...(s.heroSlides || [])];
        const slide = normalizeSlide(heroSlides[idx] || emptySlide());
        const merged = [...slide.imageUrls];
        for (const u of urls) {
          if (u && !merged.includes(u)) merged.push(u);
        }
        heroSlides[idx] = normalizeSlide({
          ...slide,
          imageUrl: merged[0] || '',
          imageUrls: merged,
        });
        return { ...s, heroSlides };
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusyMessage(null);
    }
  };

  const addSlidesFromImages = async (files) => {
    if (!files?.length) return;
    setBusyMessage('Création des slides…');
    setError('');
    try {
      const urls = await uploadSlideImages(files);
      if (!urls.length) {
        setError('Aucune image valide.');
        return;
      }
      setSettings((s) => ({
        ...s,
        heroSlides: [
          ...(s.heroSlides || []),
          ...urls.map((url) =>
            normalizeSlide({
              ...emptySlide(),
              imageUrl: url,
              imageUrls: [url],
            })
          ),
        ],
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusyMessage(null);
    }
  };

  const launchCatalogueUrgency = async () => {
    if (!settings) return;
    const hours = Number(settings.urgency?.durationHours) || DEFAULT_MEAL_COUNTDOWN_HOURS;
    const boosted = applyUrgencyBoostDefaults(settings.urgency || emptyUrgency(), hours);
    const urgency = mealUrgencyPayloadFromForm(boosted);
    setSettings((s) => ({ ...s, urgency: { ...emptyUrgency(), ...urgency } }));
    await saveSettings({ urgency });
  };

  const stopCatalogueUrgency = async () => {
    if (!settings) return;
    const urgency = mealUrgencyPayloadFromForm({
      ...(settings.urgency || emptyUrgency()),
      active: false,
    });
    setSettings((s) => ({ ...s, urgency: { ...emptyUrgency(), ...urgency } }));
    await saveSettings({ urgency });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="shop-dash shop-repas-dash">
      <ShopBusyOverlay open={!!busyMessage} message={busyMessage || 'Chargement…'} />
      <ShopBrandHeader variant="dashboard" />

      <section className="shop-dash-hero">
        <div className="shop-dash-hero-main">
          <span className="shop-dash-hero-badge">
            <FaUtensils aria-hidden /> Rapido Shop repas
          </span>
          <h1>Boutique multi-plats</h1>
          <p>
            Chaque plat publié a sa propre page comme Shop Express, accessible sur{' '}
            <code className="shop-dash-code">/repas/nom-du-plat</code>. Catalogue public :{' '}
            <code className="shop-dash-code">/repas</code>.
          </p>
          <div className="shop-dash-stats">
            <div className="shop-dash-stat">
              <strong>{stats.total}</strong>
              <span>Plats</span>
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
          <div className="shop-repas-hero-links">
            <button
              type="button"
              className="shop-dash-btn secondary"
              onClick={() => navigator.clipboard?.writeText(publicUrl)}
            >
              <FaCopy /> Copier /repas
            </button>
            <a className="shop-dash-btn secondary" href="/repas" target="_blank" rel="noopener noreferrer">
              <FaExternalLinkAlt /> Voir la boutique
            </a>
            <button
              type="button"
              className="shop-dash-btn secondary"
              onClick={() => {
                setShowBoutique((v) => !v);
                setShowForm(false);
              }}
            >
              <FaStore /> {showBoutique ? 'Masquer boutique' : 'Réglages boutique'}
            </button>
          </div>
        </div>
        <button type="button" className="shop-dash-btn shop-dash-btn--primary shop-dash-btn--hero" onClick={openCreate}>
          + Nouveau plat
        </button>
      </section>

      {error ? <p className="shop-repas-flash shop-repas-flash--err">{error}</p> : null}
      {ok ? <p className="shop-repas-flash shop-repas-flash--ok">{ok}</p> : null}

      {showBoutique && settings ? (
        <div className="shop-dash-card shop-dash-form">
          <header className="shop-dash-form-header">
            <div>
              <h3 className="shop-dash-form-title">Réglages boutique</h3>
              <p className="shop-dash-form-sub">
                Carrousel, catégories, livraison, urgence et bannière promo du catalogue /repas.
              </p>
            </div>
            <button type="button" className="shop-dash-btn secondary" onClick={() => setShowBoutique(false)}>
              Fermer
            </button>
          </header>

          <section className="shop-dash-form-block">
            <ShopFormSectionHead step="1" title="Livraison & catégories" subtitle="Frais globaux et filtres du catalogue." />
            <div className="shop-dash-grid">
              <div>
                <label>Frais de livraison (FCFA)</label>
                <input
                  className="shop-dash-input"
                  type="number"
                  min={0}
                  value={settings.deliveryFee ?? 500}
                  onChange={(e) => setSettings((s) => ({ ...s, deliveryFee: e.target.value }))}
                />
              </div>
              <div>
                <label>Catégories (séparées par des virgules)</label>
                <input
                  className="shop-dash-input"
                  value={(settings.categories || []).join(', ')}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      categories: e.target.value
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="Entrées, Plats, Desserts, Boissons"
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label>Message NB livraison (général)</label>
              <textarea
                className="shop-dash-input"
                rows={3}
                value={settings.deliveryNoticeMessage ?? ''}
                onChange={(e) => setSettings((s) => ({ ...s, deliveryNoticeMessage: e.target.value }))}
                placeholder={
                  settings.deliveryNoticeMessageDefault ||
                  'Commandez aujourd’hui, livraison un jour après, le {date}. Soyez joignable à l’adresse indiquée.'
                }
              />
              <p className="shop-dash-hint">
                Utilisez <code>{'{date}'}</code> pour la date de livraison. Ce message s’affiche sur les plats où le NB
                est activé.
              </p>
            </div>
            {products.length ? (
              <div className="shop-repas-nb-assign" style={{ marginTop: 14 }}>
                <p className="shop-dash-hint" style={{ marginBottom: 8 }}>
                  Attribuer le NB aux plats :
                </p>
                <div className="shop-repas-nb-assign-list">
                  {products.map((p) => (
                    <label key={p._id} className="shop-dash-check">
                      <input
                        type="checkbox"
                        checked={p.showDeliveryNotice !== false}
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          try {
                            await axios.put(
                              `${API_URL}/meal-products/${p._id}`,
                              { showDeliveryNotice: checked },
                              authHeaders()
                            );
                            setProducts((list) =>
                              list.map((x) =>
                                x._id === p._id ? { ...x, showDeliveryNotice: checked } : x
                              )
                            );
                          } catch (err) {
                            alert(err.response?.data?.message || 'Erreur');
                          }
                        }}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="shop-dash-btn shop-dash-btn--primary"
              disabled={saving}
              onClick={() =>
                saveSettings({
                  deliveryFee: Number(settings.deliveryFee) || 0,
                  categories: settings.categories,
                  deliveryNoticeMessage: settings.deliveryNoticeMessage || '',
                })
              }
            >
              Enregistrer
            </button>
          </section>

          <section className="shop-dash-form-block">
            <ShopFormSectionHead
              step="2"
              title="Carrousel hero"
              subtitle="Images et textes du bandeau d’accueil. Plusieurs images par slide possibles."
            />
            {(settings.heroSlides || []).map((slide, idx) => (
              <div key={slide._id || idx} className="shop-repas-slide-card">
                {(slide.imageUrls || []).length ? (
                  <div className="shop-repas-thumbs">
                    {(slide.imageUrls || []).map((url) => (
                      <div key={url} className="shop-repas-thumb-wrap">
                        <button
                          type="button"
                          className={`shop-repas-thumb${slide.imageUrl === url ? ' is-main' : ''}`}
                          title="Définir comme image principale du slide"
                          onClick={() => {
                            const rest = (slide.imageUrls || []).filter((u) => u !== url);
                            patchSlide(idx, { imageUrl: url, imageUrls: [url, ...rest] });
                          }}
                        >
                          <img src={getImageUrl(url, null, BASE_URL)} alt="" />
                        </button>
                        <button
                          type="button"
                          className="shop-repas-thumb-remove"
                          title="Supprimer cette photo"
                          aria-label="Supprimer cette photo"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const nextUrls = (slide.imageUrls || []).filter((u) => u !== url);
                            const nextMain =
                              slide.imageUrl === url ? nextUrls[0] || '' : slide.imageUrl || nextUrls[0] || '';
                            patchSlide(idx, {
                              imageUrl: nextMain,
                              imageUrls: nextMain
                                ? [nextMain, ...nextUrls.filter((u) => u !== nextMain)]
                                : nextUrls,
                            });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : slide.imageUrl ? (
                  <div className="shop-repas-thumb-wrap shop-repas-thumb-wrap--wide">
                    <img src={getImageUrl(slide.imageUrl, null, BASE_URL)} alt="" className="shop-repas-slide-img" />
                    <button
                      type="button"
                      className="shop-repas-thumb-remove"
                      title="Supprimer cette photo"
                      aria-label="Supprimer cette photo"
                      onClick={() => patchSlide(idx, { imageUrl: '', imageUrls: [] })}
                    >
                      ×
                    </button>
                  </div>
                ) : null}
                <div className="shop-dash-grid">
                  <div>
                    <label>Titre</label>
                    <input
                      className="shop-dash-input"
                      value={slide.title || ''}
                      onChange={(e) => patchSlide(idx, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Sous-titre</label>
                    <input
                      className="shop-dash-input"
                      value={slide.subtitle || ''}
                      onChange={(e) => patchSlide(idx, { subtitle: e.target.value })}
                    />
                  </div>
                </div>
                <div className="shop-repas-slide-actions">
                  <label className="shop-dash-btn secondary shop-repas-file-btn">
                    Ajouter des images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files?.length) return;
                        await appendImagesToSlide(idx, files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="shop-dash-btn secondary"
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
              </div>
            ))}
            <div className="shop-repas-slide-actions">
              <button
                type="button"
                className="shop-dash-btn secondary"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    heroSlides: [...(s.heroSlides || []), emptySlide()],
                  }))
                }
              >
                + Slide
              </button>
              <label className="shop-dash-btn secondary shop-repas-file-btn">
                Ajouter plusieurs slides
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files?.length) return;
                    await addSlidesFromImages(files);
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                className="shop-dash-btn shop-dash-btn--primary"
                disabled={saving}
                onClick={() => saveSettings({ heroSlides: settings.heroSlides })}
              >
                Enregistrer le carrousel
              </button>
            </div>
          </section>

          <section className="shop-dash-form-block shop-dash-form-block--promo">
            <ShopFormSectionHead
              step="3"
              title="Urgence catalogue"
              subtitle="Compteur et quota affichés sur /repas (indépendant des promos par plat)."
            />
            <label className="shop-dash-check">
              <input
                type="checkbox"
                checked={!!settings.urgency?.enabled}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    urgency: { ...emptyUrgency(), ...s.urgency, enabled: e.target.checked },
                  }))
                }
              />
              Module urgence activé
            </label>
            <label className="shop-dash-check">
              <input
                type="checkbox"
                checked={!!settings.urgency?.active}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    urgency: { ...emptyUrgency(), ...s.urgency, active: e.target.checked },
                  }))
                }
              />
              Urgence en cours (active)
            </label>
            <div className="shop-dash-grid">
              <div>
                <label>Libellé</label>
                <input
                  className="shop-dash-input"
                  value={settings.urgency?.label || ''}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      urgency: { ...emptyUrgency(), ...s.urgency, label: e.target.value },
                    }))
                  }
                  placeholder="Offre limitée — commandez vite"
                />
              </div>
              <div>
                <label>Commandes attendues (quota)</label>
                <input
                  className="shop-dash-input"
                  type="number"
                  min={0}
                  value={settings.urgency?.expectedOrders ?? 0}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      urgency: {
                        ...emptyUrgency(),
                        ...s.urgency,
                        expectedOrders: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label>Durée (heures)</label>
                <input
                  className="shop-dash-input"
                  type="number"
                  min={1}
                  max={720}
                  value={settings.urgency?.durationHours ?? DEFAULT_MEAL_COUNTDOWN_HOURS}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      urgency: {
                        ...emptyUrgency(),
                        ...s.urgency,
                        durationHours: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>
            <label className="shop-dash-check">
              <input
                type="checkbox"
                checked={settings.urgency?.runUntilStopped !== false}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    urgency: {
                      ...emptyUrgency(),
                      ...s.urgency,
                      runUntilStopped: e.target.checked,
                    },
                  }))
                }
              />
              Tourner jusqu’à arrêt manuel
            </label>
            <div className="shop-repas-slide-actions">
              <button
                type="button"
                className="shop-dash-btn shop-dash-btn--primary"
                disabled={saving}
                onClick={launchCatalogueUrgency}
              >
                <FaFire /> Lancer l’urgence
              </button>
              {settings.urgency?.active ? (
                <button
                  type="button"
                  className="shop-dash-btn secondary"
                  disabled={saving}
                  onClick={stopCatalogueUrgency}
                >
                  <FaStop /> Arrêter l’urgence
                </button>
              ) : null}
              <button
                type="button"
                className="shop-dash-btn secondary"
                disabled={saving}
                onClick={() =>
                  saveSettings({
                    urgency: mealUrgencyPayloadFromForm(settings.urgency || emptyUrgency()),
                  })
                }
              >
                Enregistrer l’urgence
              </button>
            </div>
          </section>

          <section className="shop-dash-form-block shop-dash-form-block--promo">
            <ShopFormSectionHead step="4" title="Bannière promo" subtitle="Affichée sous la grille de plats." />
            <label className="shop-dash-check">
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
              Bannière active
            </label>
            <div className="shop-dash-grid">
              <div>
                <label>Titre</label>
                <input
                  className="shop-dash-input"
                  value={settings.promoBanner?.title || ''}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      promoBanner: { ...s.promoBanner, title: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label>Sous-titre</label>
                <input
                  className="shop-dash-input"
                  value={settings.promoBanner?.subtitle || ''}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      promoBanner: { ...s.promoBanner, subtitle: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
            <button
              type="button"
              className="shop-dash-btn shop-dash-btn--primary"
              disabled={saving}
              onClick={() => saveSettings({ promoBanner: settings.promoBanner })}
            >
              Enregistrer la bannière
            </button>
          </section>
        </div>
      ) : null}

      {showForm ? (
        <form className="shop-dash-card shop-dash-form" onSubmit={saveProduct}>
          <header className="shop-dash-form-header">
            <div>
              <h3 className="shop-dash-form-title">{editingId ? 'Modifier le plat' : 'Nouveau plat'}</h3>
              <p className="shop-dash-form-sub">
                Configurez la fiche publique <code className="shop-dash-code">/repas/…</code>, les images, le
                contenu et les accompagnements.
              </p>
            </div>
            <div className="shop-dash-form-header-actions">
              <SectionRefreshButton onRefresh={refreshPage} loading={refreshing} />
              <button type="button" className="shop-dash-btn secondary" onClick={resetForm}>
                Fermer
              </button>
            </div>
          </header>

          <section className="shop-dash-form-block">
            <ShopFormSectionHead
              step="1"
              title="Informations plat"
              subtitle="Nom, prix, catégorie et visibilité."
              onRefresh={refreshPage}
              refreshing={refreshing}
            />
            <div className="shop-dash-grid">
              <div>
                <label>Nom du plat *</label>
                <input
                  className="shop-dash-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                <label>Prix (FCFA) *</label>
                <input
                  className="shop-dash-input"
                  type="number"
                  min={0}
                  required
                  value={form.basePrice}
                  onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                />
              </div>
              <div>
                <label>Catégorie</label>
                <input
                  className="shop-dash-input"
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
            <div className="shop-dash-field">
              <label>Description courte</label>
              <textarea
                className="shop-dash-textarea"
                rows={2}
                value={form.shortDescription}
                onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
              />
            </div>
            <label className="shop-dash-check">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              />
              Publié sur /repas/{'{slug}'}
            </label>
            <label className="shop-dash-check">
              <input
                type="checkbox"
                checked={form.showDeliveryNotice !== false}
                onChange={(e) => setForm((f) => ({ ...f, showDeliveryNotice: e.target.checked }))}
              />
              Afficher le message NB livraison sur la fiche produit
            </label>
            {formPromoPreview.isPromoLive ? (
              <p className="shop-dash-hint">
                Prix affiché : <strong>{formatPriceXof(formPromoPreview.promoPrice)}</strong>
                {formPromoPreview.discountPercent > 0 ? ` (−${formPromoPreview.discountPercent}%)` : null}
              </p>
            ) : null}
          </section>

          <section className="shop-dash-form-block">
            <ShopFormSectionHead
              step="2"
              title="Galerie"
              subtitle="Cliquez une vignette pour la définir en image principale."
              onRefresh={refreshPage}
              refreshing={refreshing}
            />
            <label className="shop-dash-btn secondary shop-repas-file-btn">
              Ajouter des images
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={async (e) => {
                  if (!e.target.files?.length) return;
                  setBusyMessage('Import des images…');
                  setError('');
                  try {
                    const urls = await uploadImages(e.target.files);
                    setForm((f) => {
                      const next = [...(f.mainImage ? [f.mainImage, ...f.images] : f.images), ...urls];
                      const unique = [...new Set(next.filter(Boolean))];
                      return { ...f, mainImage: unique[0] || '', images: unique.slice(1) };
                    });
                  } catch (err) {
                    setError(err.response?.data?.message || err.message);
                  } finally {
                    setBusyMessage(null);
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <div className="shop-repas-thumbs">
              {galleryList.map((url) => (
                <div key={url} className="shop-repas-thumb-wrap">
                  <button
                    type="button"
                    className={`shop-repas-thumb${form.mainImage === url ? ' is-main' : ''}`}
                    title="Définir comme image principale"
                    onClick={() =>
                      setForm((f) => {
                        const all = galleryList.filter((u) => u !== url);
                        return { ...f, mainImage: url, images: all };
                      })
                    }
                  >
                    <img src={getImageUrl(url, null, BASE_URL)} alt="" />
                  </button>
                  <button
                    type="button"
                    className="shop-repas-thumb-remove"
                    title="Supprimer cette photo"
                    aria-label="Supprimer cette photo"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setForm((f) => {
                        const all = [f.mainImage, ...(f.images || [])].filter((u) => u && u !== url);
                        return { ...f, mainImage: all[0] || '', images: all.slice(1) };
                      });
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="shop-dash-form-block">
            <ShopFormSectionHead
              step="3"
              title="Contenu de la page"
              subtitle="Textes, images, vidéos et FAQ sous la fiche produit."
              onRefresh={refreshPage}
              refreshing={refreshing}
            />
            <div className="shop-dash-form-section shop-dash-form-section--flat">
              <p className="shop-dash-hint">
                Composez la page comme une landing : titres, visuels et questions fréquentes. Gras et
                italique via la barre de l’éditeur de texte.
              </p>
              <ShopCopyBlockEditor
                sections={
                  Array.isArray(form.copySections) && form.copySections.length
                    ? form.copySections
                    : [emptyCopyBlock('text')]
                }
                onChange={(copySections) => setForm((f) => ({ ...f, copySections }))}
                onPickMedia={() => {}}
                onUploadImage={handleBlockImageUpload}
                uploadingBlockIndex={uploadingBlockIndex}
                onRemove={removeSection}
                onAdd={addSection}
                onMove={moveSection}
              />
            </div>
          </section>

          <section className="shop-dash-form-block">
            <ShopFormSectionHead
              step="4"
              title="Accompagnements"
              subtitle="Si des accompagnements sont ajoutés, le client doit en choisir au moins un avant de commander."
              onRefresh={refreshPage}
              refreshing={refreshing}
            />
            {form.accompagnements.map((a, idx) => (
              <div key={idx} className="shop-repas-acc-row">
                <input
                  className="shop-dash-input"
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
                  className="shop-dash-input"
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
                <label className="shop-dash-check shop-repas-acc-check">
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
                  className="shop-dash-icon-btn shop-dash-icon-btn--danger"
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
              className="shop-dash-btn secondary"
              onClick={() => setForm((f) => ({ ...f, accompagnements: [...f.accompagnements, emptyAcc()] }))}
            >
              + Accompagnement
            </button>
          </section>

          <section className="shop-dash-form-block shop-dash-form-block--promo">
            <ShopFormSectionHead
              step="5"
              title="Promo"
              subtitle="Réduction et livraison gratuite."
              onRefresh={refreshPage}
              refreshing={refreshing}
            />
            <label className="shop-dash-check">
              <input
                type="checkbox"
                checked={form.promo.active}
                onChange={(e) => setForm((f) => ({ ...f, promo: { ...f.promo, active: e.target.checked } }))}
              />
              Promo active
            </label>
            <div className="shop-dash-grid">
              <div>
                <label>Réduction %</label>
                <input
                  className="shop-dash-input"
                  type="number"
                  min={0}
                  max={100}
                  value={form.promo.discountPercent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, promo: { ...f.promo, discountPercent: e.target.value } }))
                  }
                />
              </div>
            </div>
            <label className="shop-dash-check">
              <input
                type="checkbox"
                checked={form.promo.freeDelivery}
                onChange={(e) =>
                  setForm((f) => ({ ...f, promo: { ...f.promo, freeDelivery: e.target.checked } }))
                }
              />
              Livraison gratuite (commande)
            </label>
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
        <div className="shop-dash-list-head">
          <h3 className="shop-dash-list-title">
            Plats <span className="shop-dash-count">{products.length}</span>
          </h3>
          <SectionRefreshButton onRefresh={refreshPage} loading={refreshing} />
        </div>
        <div className="shop-dash-product-grid">
          {products.map((p) => {
            const promo = getShopPromoState(p);
            const pubUrl = `${publicOrigin}/repas/${p.slug}`;
            return (
              <article
                key={p._id}
                className={`shop-dash-product-card${p.published ? '' : ' shop-dash-product-card--draft'}`}
              >
                <div className="shop-dash-product-card-img-wrap">
                  <img src={getImageUrl(p.mainImage || p.images?.[0], null, BASE_URL)} alt="" />
                  {promo.isPromoLive ? <span className="shop-dash-product-card-promo">Promo</span> : null}
                  {!p.published ? <span className="shop-dash-product-card-draft">Brouillon</span> : null}
                </div>
                <div className="shop-dash-product-card-body">
                  <h4>{p.name}</h4>
                  <p className="shop-dash-product-card-slug">
                    <FaEye aria-hidden /> /repas/{p.slug}
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
                  {p.category ? <span className="shop-dash-tag">{p.category}</span> : null}
                  {(p.accompagnements || []).length ? (
                    <span className="shop-dash-tag">{p.accompagnements.length} acc.</span>
                  ) : null}
                  <a className="shop-dash-link" href={pubUrl} target="_blank" rel="noopener noreferrer">
                    <FaExternalLinkAlt size={11} /> Voir la fiche
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
                <FaUtensils />
              </div>
              <h4>Aucun plat</h4>
              <p>Créez votre premier plat : il aura automatiquement une page /repas/nom-du-plat.</p>
              <button type="button" className="shop-dash-btn shop-dash-btn--primary" onClick={openCreate}>
                + Créer un plat
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
