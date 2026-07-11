import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import MediaPickerModal from '../../components/MediaPickerModal';
import { getImageUrl } from '../../utils/imagePlaceholder';
import {
  getShopPromoState,
  formatPriceXof,
  applyBoostDefaults,
  promoPayloadFromForm,
  DEFAULT_BOOST_HOURS,
} from '../../utils/shopPromo';
import {
  closurePayloadFromForm,
  formatClosureDateTime,
  formatDailyTime,
  isoToDailyTime,
} from '../../utils/shopClosure';
import {
  dailyOrderLimitPayloadFromForm,
  getShopAvailabilityState,
} from '../../utils/shopOrderLimit';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopCopyBlockEditor from '../../components/shop/ShopCopyBlockEditor';
import ShopFormSectionHead from '../../components/shop/ShopFormSectionHead';
import ShopImageUploadZone from '../../components/shop/ShopImageUploadZone';
import SectionRefreshButton from '../../components/dashboard/SectionRefreshButton';
import { useRegisterDashboardRefresh } from '../../context/DashboardRefreshContext';
import '../../components/dashboard/section-refresh.css';
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
  FaStore,
  FaDoorOpen,
  FaLock,
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
  deliveryFee: '',
  quantityUnit: DEFAULT_SHOP_QUANTITY_UNIT,
  published: false,
  mainImage: '',
  images: [],
  copySections: [emptyCopyBlock('text')],
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
  shopClosure: {
    enabled: false,
    dailyCloseTime: '22:00',
    dailyOpenTime: '08:00',
    message: '',
    manualOverride: null,
  },
  dailyOrderLimit: {
    enabled: false,
    maxOrders: 50,
  },
  ordersTodayPreview: 0,
  whatsappNumber: '',
  contactPhone: '',
  ctaLabel: 'Commander maintenant',
  showDeliveryNotice: true,
});

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function coerceImageList(images) {
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    const raw = images.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

function mergeGallery(mainImage, images) {
  const urls = [];
  if (typeof mainImage === 'string' && mainImage.trim()) urls.push(mainImage.trim());
  for (const u of coerceImageList(images)) {
    if (typeof u !== 'string') continue;
    const clean = u.trim();
    if (clean && !urls.includes(clean)) urls.push(clean);
  }
  return urls;
}

function appendUrlsToForm(f, urls) {
  if (!urls?.length) return f;
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
}

function buildProductPayload(f, galleryList) {
  const gallery = galleryList ?? mergeGallery(f.mainImage, f.images);
  const copySections = Array.isArray(f.copySections) ? f.copySections : [];
  return {
    name: f.name.trim(),
    slug: f.slug.trim() || undefined,
    shortDescription: f.shortDescription,
    basePrice: Number(f.basePrice),
    deliveryFee: Math.max(0, Number(f.deliveryFee) || 0),
    quantityUnit: f.quantityUnit,
    published: f.published,
    mainImage: gallery[0] || null,
    images: JSON.stringify(gallery),
    copySections: JSON.stringify(copySections),
    promo: JSON.stringify(
      promoPayloadFromForm(f.promo.active ? applyBoostDefaults(f.promo, f.promo.boostHours) : f.promo)
    ),
    shopClosure: JSON.stringify(closurePayloadFromForm(f.shopClosure)),
    dailyOrderLimit: JSON.stringify(dailyOrderLimitPayloadFromForm(f.dailyOrderLimit)),
    whatsappNumber: f.whatsappNumber,
    contactPhone: f.contactPhone,
    ctaLabel: f.ctaLabel,
    showDeliveryNotice: f.showDeliveryNotice !== false,
  };
}

function canPersistProduct(f) {
  if (!f.name.trim()) return false;
  if (f.basePrice === '' || f.basePrice == null) return false;
  const basePrice = Number(f.basePrice);
  return Number.isFinite(basePrice) && basePrice >= 0;
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
  const [refreshingPage, setRefreshingPage] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [schedulingClosure, setSchedulingClosure] = useState(false);
  const [shopNoticeMessage, setShopNoticeMessage] = useState('');
  const [shopNoticeDefault, setShopNoticeDefault] = useState('');
  const [savingNotice, setSavingNotice] = useState(false);

  const formRef = useRef(form);
  const editingIdRef = useRef(editingId);
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

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
    axios
      .get(`${API_URL}/shop-settings`, authHeaders)
      .then((res) => {
        setShopNoticeMessage(res.data?.deliveryNoticeMessage || '');
        setShopNoticeDefault(res.data?.deliveryNoticeMessageDefault || '');
      })
      .catch(() => {});
  }, [loadProducts, authHeaders]);

  const publicOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    editingIdRef.current = null;
    setShowForm(false);
  };

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    editingIdRef.current = null;
    setShowForm(true);
  };

  const fillFormFromProduct = useCallback((p) => {
    const safeGallery = mergeGallery(p.mainImage, p.images);
    const nextForm = {
      name: p.name || '',
      slug: p.slug || '',
      shortDescription: p.shortDescription || '',
      basePrice: String(p.basePrice ?? ''),
      deliveryFee: p.deliveryFee != null && p.deliveryFee !== '' ? String(p.deliveryFee) : '',
      quantityUnit: normalizeShopQuantityUnit(p.quantityUnit),
      published: !!p.published,
      mainImage: safeGallery[0] || '',
      images: safeGallery.slice(1),
      copySections:
        p.copySections?.length > 0
          ? p.copySections.map((s) => normalizeCopyBlockForForm(s))
          : [emptyCopyBlock('text')],
      promo: {
        active: !!p.promo?.active,
        priceMode: p.promo?.priceMode === 'manual' ? 'manual' : 'percent',
        discountPercent: p.promo?.discountPercent ?? 10,
        manualPrice:
          p.promo?.manualPrice != null && p.promo?.manualPrice !== '' ? String(p.promo.manualPrice) : '',
        freeDelivery: !!p.promo?.freeDelivery,
        startsAt: toDatetimeLocal(p.promo?.startsAt),
        endsAt: toDatetimeLocal(p.promo?.endsAt),
        runUntilStopped: p.promo?.runUntilStopped !== false,
        boostHours: DEFAULT_BOOST_HOURS,
      },
      shopClosure: {
        enabled: !!p.shopClosure?.enabled,
        dailyCloseTime:
          p.shopClosure?.dailyCloseTime || isoToDailyTime(p.shopClosure?.closedFrom) || '22:00',
        dailyOpenTime:
          p.shopClosure?.dailyOpenTime || isoToDailyTime(p.shopClosure?.closedUntil) || '08:00',
        message: p.shopClosure?.message || '',
        manualOverride: p.shopClosure?.manualOverride || null,
      },
      dailyOrderLimit: {
        enabled: !!p.dailyOrderLimit?.enabled,
        maxOrders: p.dailyOrderLimit?.maxOrders ?? 50,
      },
      ordersTodayPreview: p.ordersToday ?? 0,
      whatsappNumber: p.whatsappNumber || '',
      contactPhone: p.contactPhone || '',
      ctaLabel: p.ctaLabel || 'Commander maintenant',
      showDeliveryNotice: p.showDeliveryNotice !== false,
    };
    setEditingId(p._id);
    editingIdRef.current = p._id;
    setForm(nextForm);
    formRef.current = nextForm;
  }, []);

  const openEdit = (p) => {
    fillFormFromProduct(p);
    setShowForm(true);
  };

  const refreshPage = useCallback(async () => {
    setRefreshingPage(true);
    try {
      await loadProducts();
      const id = editingIdRef.current;
      if (id) {
        const res = await axios.get(`${API_URL}/shop-products/${id}`, authHeaders);
        if (res.data) {
          fillFormFromProduct(res.data);
          setShowForm(true);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible d’actualiser la page.');
    } finally {
      setRefreshingPage(false);
    }
  }, [authHeaders, fillFormFromProduct, loadProducts]);

  useRegisterDashboardRefresh(refreshPage);

  const galleryUrls = useMemo(
    () => mergeGallery(form.mainImage, form.images),
    [form.mainImage, form.images]
  );

  const formPromoPreview = useMemo(
    () =>
      getShopPromoState({
        basePrice: Number(form.basePrice) || 0,
        published: form.published,
        promo: {
          ...form.promo,
          manualPrice:
            form.promo.manualPrice === '' ? null : Number(form.promo.manualPrice),
        },
      }),
    [form.basePrice, form.published, form.promo]
  );

  const formAvailabilityPreview = useMemo(
    () =>
      getShopAvailabilityState({
        shopClosure: {
          enabled: form.shopClosure.enabled,
          dailyCloseTime: form.shopClosure.dailyCloseTime,
          dailyOpenTime: form.shopClosure.dailyOpenTime,
          message: form.shopClosure.message,
          manualOverride: form.shopClosure.manualOverride,
        },
        dailyOrderLimit: form.dailyOrderLimit,
        ordersToday: form.ordersTodayPreview,
      }),
    [form.shopClosure, form.dailyOrderLimit, form.ordersTodayPreview]
  );

  const patchClosureAndRefresh = useCallback(
    async (productId, closureBody) => {
      await axios.patch(`${API_URL}/shop-products/${productId}/closure`, closureBody, authHeaders);
      await loadProducts();
      const res = await axios.get(`${API_URL}/shop-products/${productId}`, authHeaders);
      if (res.data) fillFormFromProduct(res.data);
    },
    [authHeaders, fillFormFromProduct, loadProducts]
  );

  const saveDailySchedule = async () => {
    if (!form.shopClosure.dailyCloseTime || !form.shopClosure.dailyOpenTime) {
      alert('Indiquez l’heure de fermeture et de réouverture quotidiennes.');
      return;
    }
    if (form.shopClosure.dailyCloseTime === form.shopClosure.dailyOpenTime) {
      alert('Les horaires de fermeture et d’ouverture doivent être différents.');
      return;
    }
    const payload = closurePayloadFromForm({ ...form.shopClosure, enabled: true });
    setSchedulingClosure(true);
    try {
      let id = editingId;
      if (!id) {
        const saved = await persistProduct({
          formState: { ...form, shopClosure: { ...form.shopClosure, enabled: true } },
        });
        if (!saved.ok) {
          alert('Enregistrez d’abord le nom et le prix du produit.');
          return;
        }
        id = saved.id;
        await patchClosureAndRefresh(id, payload);
      } else {
        await patchClosureAndRefresh(id, payload);
      }
      setForm((f) => ({
        ...f,
        shopClosure: { ...f.shopClosure, enabled: true, manualOverride: null },
      }));
      alert(
        'Horaires enregistrés. La boutique se fermera et s’ouvrira automatiquement chaque jour — plus besoin de reprogrammer.'
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible d’enregistrer les horaires.');
    } finally {
      setSchedulingClosure(false);
    }
  };

  const cancelClosure = async () => {
    if (!editingId) {
      setForm((f) => ({
        ...f,
        shopClosure: {
          ...f.shopClosure,
          enabled: false,
          manualOverride: null,
        },
      }));
      return;
    }
    setSchedulingClosure(true);
    try {
      await patchClosureAndRefresh(editingId, {
        enabled: false,
        dailyCloseTime: form.shopClosure.dailyCloseTime,
        dailyOpenTime: form.shopClosure.dailyOpenTime,
        message: form.shopClosure.message,
        manualOverride: null,
      });
      setForm((f) => ({
        ...f,
        shopClosure: { ...f.shopClosure, enabled: false, manualOverride: null },
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setSchedulingClosure(false);
    }
  };

  const clearClosureOverride = async () => {
    if (!editingId) return;
    setSchedulingClosure(true);
    try {
      await patchClosureAndRefresh(editingId, { clearOverride: true });
      setForm((f) => ({
        ...f,
        shopClosure: { ...f.shopClosure, manualOverride: null },
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de réactiver l’horaire automatique.');
    } finally {
      setSchedulingClosure(false);
    }
  };

  const openShopNow = async () => {
    if (!editingId) {
      alert('Enregistrez d’abord le produit.');
      return;
    }
    setSchedulingClosure(true);
    try {
      await patchClosureAndRefresh(editingId, { openNow: true });
      setForm((f) => ({
        ...f,
        shopClosure: { ...f.shopClosure, manualOverride: 'open' },
      }));
      alert(
        'Boutique ouverte en mode exceptionnel. L’horaire automatique reprendra à la prochaine fermeture programmée, ou cliquez « Réactiver l’horaire automatique ».'
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible d’ouvrir la boutique.');
    } finally {
      setSchedulingClosure(false);
    }
  };

  const closeShopNow = async () => {
    if (!editingId) {
      alert('Enregistrez d’abord le produit.');
      return;
    }
    setSchedulingClosure(true);
    try {
      await patchClosureAndRefresh(editingId, {
        closeNow: true,
        message: form.shopClosure.message,
      });
      setForm((f) => ({
        ...f,
        shopClosure: { ...f.shopClosure, manualOverride: 'closed' },
      }));
      alert(
        'Boutique fermée manuellement. Réouverture automatique à la prochaine heure d’ouverture quotidienne.'
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible de fermer la boutique.');
    } finally {
      setSchedulingClosure(false);
    }
  };

  const persistProduct = useCallback(
    async ({ formState, galleryList, closeAfter = false } = {}) => {
      const f = formState ?? formRef.current;
      const gallery = galleryList ?? mergeGallery(f.mainImage, f.images);

      if (!canPersistProduct(f)) {
        return { ok: false, needsFields: true };
      }

      setSaving(true);
      try {
        const payload = buildProductPayload(f, gallery);
        let id = editingIdRef.current;
        if (id) {
          await axios.put(`${API_URL}/shop-products/${id}`, payload, authHeaders);
        } else {
          const res = await axios.post(`${API_URL}/shop-products`, payload, authHeaders);
          id = res.data._id;
          setEditingId(id);
          editingIdRef.current = id;
        }
        await loadProducts();
        if (closeAfter) resetForm();
        return { ok: true, id };
      } catch (err) {
        alert(err.response?.data?.message || 'Erreur lors de l’enregistrement');
        return { ok: false };
      } finally {
        setSaving(false);
      }
    },
    [authHeaders, loadProducts]
  );

  const autoSaveAfterGalleryChange = useCallback(
    async (formState, { quiet = false } = {}) => {
      const gallery = mergeGallery(formState.mainImage, formState.images);
      if (!canPersistProduct(formState)) {
        return { ok: false, needsFields: true };
      }
      const result = await persistProduct({ formState, galleryList: gallery, closeAfter: false });
      if (result.needsFields && !quiet) {
        alert('Indiquez le nom et le prix du produit pour enregistrer la galerie automatiquement.');
      }
      return result;
    },
    [persistProduct]
  );

  const onMediaChosen = async (path) => {
    const cleanPath = typeof path === 'string' ? path.trim() : '';
    if (!cleanPath) {
      setMediaPickerOpen(false);
      setMediaPickerTarget(null);
      return;
    }
    const target = mediaPickerTarget;
    setMediaPickerOpen(false);
    setMediaPickerTarget(null);

    if (target?.kind === 'gallery') {
      const f = formRef.current;
      const images = f.images.includes(cleanPath) ? f.images : [...f.images, cleanPath];
      const newForm = { ...f, images, mainImage: f.mainImage || cleanPath };
      setForm(newForm);
      await autoSaveAfterGalleryChange(newForm);
    } else if (target?.kind === 'block') {
      const idx = target.index;
      const f = formRef.current;
      const copySections = [...f.copySections];
      copySections[idx] = { ...copySections[idx], mediaUrl: cleanPath };
      const newForm = { ...f, copySections };
      setForm(newForm);
      await persistProduct({ formState: newForm, closeAfter: false });
    } else {
      const newForm = { ...formRef.current, mainImage: cleanPath };
      setForm(newForm);
      await autoSaveAfterGalleryChange(newForm);
    }
  };

  const addGalleryImage = () => {
    setMediaPickerTarget({ kind: 'gallery' });
    setMediaPickerOpen(true);
  };

  const handleGalleryUpload = async (files) => {
    if (!token) return;
    setUploadingGallery(true);
    try {
      const urls = await uploadShopProductImages(files, token);
      if (!urls.length) {
        alert('Aucune image valide sélectionnée.');
        return;
      }
      const newForm = appendUrlsToForm(formRef.current, urls);
      setForm(newForm);
      await autoSaveAfterGalleryChange(newForm);
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
      const f = formRef.current;
      const copySections = [...f.copySections];
      copySections[blockIndex] = { ...copySections[blockIndex], mediaUrl: path };
      const newForm = { ...f, copySections };
      setForm(newForm);
      const result = await persistProduct({ formState: newForm, closeAfter: false });
      if (result.needsFields) {
        alert('Indiquez le nom et le prix du produit pour enregistrer automatiquement.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de l’import');
    } finally {
      setUploadingBlockIndex(null);
    }
  };

  const setPrimaryImage = async (url) => {
    const f = formRef.current;
    const all = mergeGallery(f.mainImage, f.images);
    const reordered = [url, ...all.filter((u) => u !== url)];
    const newForm = {
      ...f,
      mainImage: reordered[0] || '',
      images: reordered.slice(1),
    };
    setForm(newForm);
    await autoSaveAfterGalleryChange(newForm);
  };

  const removeGalleryImage = async (url) => {
    const target = typeof url === 'string' ? url.trim() : '';
    if (!target) return;

    try {
      const f = formRef.current;
      const remaining = mergeGallery(f.mainImage, f.images).filter((u) => u !== target);
      const sections = Array.isArray(f.copySections) ? f.copySections : [];
      const newForm = {
        ...f,
        mainImage: remaining[0] || '',
        images: remaining.slice(1),
        copySections: sections.map((sec) =>
          sec?.mediaUrl === target ? { ...sec, mediaUrl: '' } : sec
        ),
      };
      setForm(newForm);
      formRef.current = newForm;
      await autoSaveAfterGalleryChange(newForm, { quiet: true });
    } catch (err) {
      console.error('removeGalleryImage', err);
      alert('Impossible de retirer cette image. Réessayez.');
    }
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

  const patchPromoAndRefresh = useCallback(
    async (productId, promoBody, { publish = true } = {}) => {
      const res = await axios.patch(
        `${API_URL}/shop-products/${productId}/promo`,
        { ...promoBody, ...(publish ? { published: true } : {}) },
        authHeaders
      );
      const updated = res.data;
      setProducts((prev) => prev.map((item) => (item._id === productId ? updated : item)));
      if (editingIdRef.current === productId) {
        fillFormFromProduct(updated);
      }
      return updated;
    },
    [authHeaders, fillFormFromProduct]
  );

  const saveProduct = async (e) => {
    e.preventDefault();
    const formToSave = {
      ...form,
      published: form.promo.active ? true : form.published,
      promo: form.promo.active ? applyBoostDefaults(form.promo, form.promo.boostHours) : form.promo,
    };
    setForm(formToSave);
    await persistProduct({ formState: formToSave, galleryList: galleryUrls, closeAfter: true });
  };

  const boostNow = async () => {
    if (!canPersistProduct(form)) {
      alert('Indiquez le nom et le prix de base avant de booster.');
      return;
    }
    const boostedPromo = applyBoostDefaults(
      { ...form.promo, active: true, runUntilStopped: true },
      form.promo.boostHours
    );
    setBoosting(true);
    try {
      let id = editingIdRef.current;
      if (!id) {
        const minimal = {
          ...form,
          published: true,
          promo: boostedPromo,
        };
        const result = await persistProduct({ formState: minimal, closeAfter: false });
        if (!result.ok) return;
        id = editingIdRef.current;
      }
      await patchPromoAndRefresh(id, promoPayloadFromForm(boostedPromo), { publish: true });
      setForm((f) => ({ ...f, promo: boostedPromo, published: true }));
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors du boost');
    } finally {
      setBoosting(false);
    }
  };

  const launchPromo = async (p) => {
    const boosted = applyBoostDefaults(
      {
        active: true,
        priceMode: p.promo?.priceMode === 'manual' ? 'manual' : 'percent',
        discountPercent: p.promo?.discountPercent ?? 10,
        manualPrice: p.promo?.manualPrice ?? null,
        freeDelivery: !!p.promo?.freeDelivery,
        runUntilStopped: true,
        startsAt: p.promo?.startsAt,
        endsAt: p.promo?.endsAt,
      },
      DEFAULT_BOOST_HOURS
    );
    setBoosting(true);
    try {
      await patchPromoAndRefresh(p._id, promoPayloadFromForm(boosted), { publish: true });
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur promo');
    } finally {
      setBoosting(false);
    }
  };

  const stopPromo = async (p) => {
    try {
      await patchPromoAndRefresh(
        p._id,
        {
          active: false,
          discountPercent: 0,
          manualPrice: null,
          priceMode: 'percent',
          freeDelivery: false,
          endsAt: null,
          startsAt: null,
          runUntilStopped: false,
        },
        { publish: false }
      );
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
            <div className="shop-dash-form-header-actions">
              <SectionRefreshButton onRefresh={refreshPage} loading={refreshingPage} />
              <button type="button" className="shop-dash-btn secondary" onClick={resetForm}>
                Fermer
              </button>
            </div>
          </header>
          <section className="shop-dash-form-block">
            <ShopFormSectionHead
              step="1"
              title="Informations produit"
              subtitle="Nom, prix et visibilité."
              onRefresh={refreshPage}
              refreshing={refreshingPage}
            />
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
              <label>Prix initial (CFA) *</label>
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
              <label>Prix actuel promo (CFA)</label>
              <input
                className="shop-dash-input"
                type="number"
                min="0"
                value={form.promo.priceMode === 'manual' ? form.promo.manualPrice : ''}
                disabled={form.promo.priceMode !== 'manual'}
                placeholder={
                  form.promo.priceMode === 'percent' && formPromoPreview.isPromoLive
                    ? String(formPromoPreview.promoPrice)
                    : 'Via % ou mode manuel'
                }
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    promo: { ...f.promo, priceMode: 'manual', manualPrice: e.target.value, active: true },
                  }))
                }
              />
              <p className="shop-dash-hint shop-dash-hint--inline">
                {formPromoPreview.isPromoLive ? (
                  <>
                    Affiché : <strong>{formatPriceXof(formPromoPreview.promoPrice)}</strong>
                    {formPromoPreview.discountPercent > 0 ? ` (−${formPromoPreview.discountPercent}%)` : null}
                  </>
                ) : (
                  'Activez la promo (section 3) pour afficher un prix barré.'
                )}
              </p>
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
            <ShopFormSectionHead
              step="2"
              title="Galerie & accroche"
              subtitle="Visuels carrés 1080×1080 — image principale en premier."
              onRefresh={refreshPage}
              refreshing={refreshingPage}
            />
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
              Importez depuis votre PC ou la médiathèque — la galerie est{' '}
              <strong>enregistrée automatiquement</strong> après chaque ajout ou retrait (nom et prix requis pour un
              nouveau produit). L’image « Principale » s’affiche en premier.
            </p>
            {saving ? <p className="shop-dash-hint shop-dash-hint--saving">Enregistrement en cours…</p> : null}
            <ShopImageUploadZone
              onFiles={handleGalleryUpload}
              uploading={uploadingGallery || saving}
              label="Importer des photos depuis mon PC"
              hint="Plusieurs fichiers possibles — sauvegarde automatique après import"
            />
            <div className="shop-dash-upload-actions">
              <button type="button" className="shop-dash-btn secondary" onClick={addGalleryImage}>
                Choisir dans la galerie médias
              </button>
            </div>
            {galleryUrls.length ? (
              <div className="shop-dash-gallery-grid">
                {galleryUrls.map((url, index) => (
                  <div key={`gallery-${index}-${url}`} className="shop-dash-gallery-item">
                    <img src={getImageUrl(url, null, BASE_URL)} alt="" />
                    {form.mainImage === url ? <span className="shop-dash-gallery-primary">Principale</span> : null}
                    <div className="shop-dash-gallery-actions">
                      {form.mainImage !== url ? (
                        <button type="button" title="Définir comme principale" onClick={() => setPrimaryImage(url)}>
                          <FaStar />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        title="Retirer"
                        aria-label="Retirer cette image"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void removeGalleryImage(url);
                        }}
                      >
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
            <ShopFormSectionHead
              step="3"
              title="Campagne promo express"
              subtitle="Réduction, livraison gratuite et compteur. Une fiche publiée reste en promo jusqu’à arrêt manuel."
              onRefresh={refreshPage}
              refreshing={refreshingPage}
            />
          <div className="shop-dash-promo-box">
            <div className="shop-dash-boost-actions">
              <button
                type="button"
                className="shop-dash-btn primary"
                disabled={boosting || saving}
                onClick={() => void boostNow()}
              >
                <FaRocket /> {boosting ? 'Boost en cours…' : 'Booster maintenant (rapide)'}
              </button>
              <p className="shop-dash-hint">
                Lance la promo + compteur + publication <strong>sans</strong> ré-enregistrer toute la fiche (plus
                rapide). « Enregistrer » en bas applique aussi le boost si la promo est cochée.
              </p>
            </div>

            <div className="shop-dash-grid">
              <label className="shop-dash-check">
                <input
                  type="checkbox"
                  checked={form.promo.active}
                  onChange={(e) => {
                    const active = e.target.checked;
                    setForm((f) => ({
                      ...f,
                      published: active ? true : f.published,
                      promo: active
                        ? applyBoostDefaults({ ...f.promo, active: true }, f.promo.boostHours)
                        : { ...f.promo, active: false },
                    }));
                  }}
                />
                Promo active
              </label>

              <div className="shop-dash-field-full">
                <span className="shop-dash-label-inline">Type de prix promo</span>
                <div className="shop-dash-price-mode">
                  <label className="shop-dash-check">
                    <input
                      type="radio"
                      name="promoPriceMode"
                      checked={form.promo.priceMode !== 'manual'}
                      onChange={() =>
                        setForm((f) => ({ ...f, promo: { ...f.promo, priceMode: 'percent' } }))
                      }
                    />
                    Réduction en %
                  </label>
                  <label className="shop-dash-check">
                    <input
                      type="radio"
                      name="promoPriceMode"
                      checked={form.promo.priceMode === 'manual'}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          promo: { ...f.promo, priceMode: 'manual', active: true },
                        }))
                      }
                    />
                    Prix actuel fixe (manuel)
                  </label>
                </div>
              </div>

              {form.promo.priceMode === 'manual' ? (
                <div>
                  <label>Prix actuel (CFA)</label>
                  <input
                    className="shop-dash-input"
                    type="number"
                    min="0"
                    value={form.promo.manualPrice}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        promo: { ...f.promo, manualPrice: e.target.value, active: true },
                      }))
                    }
                  />
                </div>
              ) : (
                <div>
                  <label>% réduction</label>
                  <input
                    className="shop-dash-input"
                    type="number"
                    min="0"
                    max="90"
                    value={form.promo.discountPercent}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        promo: { ...f.promo, discountPercent: e.target.value, active: true },
                      }))
                    }
                  />
                </div>
              )}

              <div>
                <label>Durée du compteur (heures)</label>
                <input
                  className="shop-dash-input"
                  type="number"
                  min="1"
                  max="720"
                  value={form.promo.boostHours}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      promo: { ...f.promo, boostHours: e.target.value, endsAt: '' },
                    }))
                  }
                />
                <p className="shop-dash-hint shop-dash-hint--inline">
                  Rempli automatiquement au boost ({DEFAULT_BOOST_HOURS} h par défaut).
                </p>
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

              {!form.promo.freeDelivery ? (
                <div>
                  <label>Frais de livraison (FCFA)</label>
                  <input
                    className="shop-dash-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ex. 1500"
                    value={form.deliveryFee}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))}
                  />
                  <p className="shop-dash-hint shop-dash-hint--inline">
                    Montant ajouté au total payé par le client (facture et récap commande).
                  </p>
                </div>
              ) : null}

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
                <label>Fin affichée du compteur</label>
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

            {formPromoPreview.isPromoLive ? (
              <p className="shop-dash-promo-preview">
                Aperçu client :{' '}
                <span className="shop-dash-price-old">{formatPriceXof(formPromoPreview.basePrice)}</span>{' '}
                <span className="shop-dash-price-promo">{formatPriceXof(formPromoPreview.promoPrice)}</span>
              </p>
            ) : null}

            <div className="shop-dash-closure-box">
              <h3 className="shop-dash-closure-title">
                <FaStore aria-hidden /> Horaires quotidiens de la boutique
              </h3>
              <p className="shop-dash-hint">
                Définissez une fois l’heure de fermeture et de réouverture : chaque jour la boutique
                se ferme et s’ouvre automatiquement (fuseau Bénin). Plus besoin de reprogrammer.
                Les boutons manuels servent uniquement aux cas exceptionnels.
              </p>

              {formAvailabilityPreview.manualOverride === 'open' ? (
                <p className="shop-dash-closure-status shop-dash-closure-status--pending">
                  Ouverture <strong>exceptionnelle</strong> — l’horaire automatique reprendra à la
                  prochaine fermeture ({formatDailyTime(formAvailabilityPreview.dailyCloseTime)}).
                </p>
              ) : formAvailabilityPreview.isShopClosed ? (
                <p className="shop-dash-closure-status shop-dash-closure-status--closed">
                  Boutique <strong>fermée</strong> — réouverture{' '}
                  {formAvailabilityPreview.closureReopensAt
                    ? formatClosureDateTime(formAvailabilityPreview.closureReopensAt)
                    : formatDailyTime(formAvailabilityPreview.dailyOpenTime)}
                </p>
              ) : form.shopClosure.enabled ? (
                <p className="shop-dash-closure-status shop-dash-closure-status--pending">
                  Boutique <strong>ouverte</strong> — fermeture automatique à{' '}
                  {formatDailyTime(formAvailabilityPreview.dailyCloseTime)} · réouverture à{' '}
                  {formatDailyTime(formAvailabilityPreview.dailyOpenTime)}
                </p>
              ) : null}

              <div className="shop-dash-grid">
                <div>
                  <label>Fermeture quotidienne</label>
                  <input
                    className="shop-dash-input"
                    type="time"
                    value={form.shopClosure.dailyCloseTime}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shopClosure: { ...f.shopClosure, dailyCloseTime: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <label>Réouverture quotidienne</label>
                  <input
                    className="shop-dash-input"
                    type="time"
                    value={form.shopClosure.dailyOpenTime}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shopClosure: { ...f.shopClosure, dailyOpenTime: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="shop-dash-field-full">
                  <label>Message aux visiteurs (optionnel)</label>
                  <textarea
                    className="shop-dash-input shop-dash-textarea"
                    rows={2}
                    placeholder="Ex. : Nous préparons vos commandes et revenons très vite !"
                    value={form.shopClosure.message}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shopClosure: { ...f.shopClosure, message: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="shop-dash-closure-actions">
                <button
                  type="button"
                  className="shop-dash-btn primary"
                  disabled={schedulingClosure || saving}
                  onClick={() => void saveDailySchedule()}
                >
                  {schedulingClosure ? 'Enregistrement…' : 'Enregistrer les horaires quotidiens'}
                </button>
                {formAvailabilityPreview.isShopClosed ? (
                  <button
                    type="button"
                    className="shop-dash-btn primary shop-dash-btn--open"
                    disabled={schedulingClosure || saving || !editingId}
                    onClick={() => void openShopNow()}
                  >
                    <FaDoorOpen aria-hidden /> Ouvrir la boutique (cas exceptionnel)
                  </button>
                ) : (
                  <button
                    type="button"
                    className="shop-dash-btn secondary shop-dash-btn--close"
                    disabled={schedulingClosure || saving || !editingId}
                    onClick={() => void closeShopNow()}
                  >
                    <FaLock aria-hidden /> Fermer la boutique maintenant
                  </button>
                )}
                {formAvailabilityPreview.manualOverride ? (
                  <button
                    type="button"
                    className="shop-dash-btn secondary"
                    disabled={schedulingClosure || saving || !editingId}
                    onClick={() => void clearClosureOverride()}
                  >
                    Réactiver l’horaire automatique
                  </button>
                ) : null}
                {form.shopClosure.enabled ? (
                  <button
                    type="button"
                    className="shop-dash-btn secondary"
                    disabled={schedulingClosure || saving}
                    onClick={() => void cancelClosure()}
                  >
                    Désactiver les horaires automatiques
                  </button>
                ) : null}
              </div>
            </div>

            <div className="shop-dash-closure-box shop-dash-order-limit-box">
              <h3 className="shop-dash-closure-title">
                <FaShoppingBag aria-hidden /> Quota de commandes journalier
              </h3>
              <p className="shop-dash-hint">
                Définissez le nombre maximum de commandes acceptées chaque jour. Quand le quota est
                atteint, la boutique se ferme automatiquement (même avant l’heure de fermeture) et
                rouvre à l’heure habituelle le lendemain. Le décompte s’affiche en temps réel sur la
                page boutique.
              </p>

              {form.dailyOrderLimit.enabled ? (
                <p className="shop-dash-closure-status shop-dash-closure-status--pending">
                  Aujourd’hui :{' '}
                  <strong>
                    {form.ordersTodayPreview} / {form.dailyOrderLimit.maxOrders}
                  </strong>{' '}
                  commandes
                  {formAvailabilityPreview.isOrderLimitReached ? (
                    <> — <strong>quota atteint</strong></>
                  ) : (
                    <> — il reste <strong>{formAvailabilityPreview.ordersRemaining}</strong></>
                  )}
                </p>
              ) : null}

              <label className="shop-dash-check shop-dash-check--wide">
                <input
                  type="checkbox"
                  checked={form.dailyOrderLimit.enabled}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dailyOrderLimit: { ...f.dailyOrderLimit, enabled: e.target.checked },
                    }))
                  }
                />
                Activer le quota journalier de commandes
              </label>

              {form.dailyOrderLimit.enabled ? (
                <div className="shop-dash-grid shop-dash-grid--limit">
                  <div>
                    <label>Nombre de commandes max / jour</label>
                    <input
                      className="shop-dash-input"
                      type="number"
                      min="1"
                      max="9999"
                      value={form.dailyOrderLimit.maxOrders}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          dailyOrderLimit: { ...f.dailyOrderLimit, maxOrders: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              <p className="shop-dash-hint shop-dash-hint--inline">
                Enregistrez la fiche produit pour appliquer le quota. Le compteur repart chaque jour
                à minuit (fuseau Bénin).
              </p>
            </div>
          </div>
          </section>

          <section className="shop-dash-form-block">
            <ShopFormSectionHead
              step="4"
              title="Contenu de la page"
              subtitle="Textes, images, vidéos et FAQ sous la fiche produit."
              onRefresh={refreshPage}
              refreshing={refreshingPage}
            />
          <div className="shop-dash-form-section shop-dash-form-section--flat">
            <p className="shop-dash-hint">
              Composez la page comme une landing : titres, visuels et questions fréquentes.
            </p>
            <ShopCopyBlockEditor
              sections={Array.isArray(form.copySections) ? form.copySections : [emptyCopyBlock('text')]}
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
            <ShopFormSectionHead
              step="5"
              title="Contact & commande"
              subtitle="WhatsApp pour recevoir les commandes clients."
              onRefresh={refreshPage}
              refreshing={refreshingPage}
            />
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
          <label className="shop-dash-check">
            <input
              type="checkbox"
              checked={form.showDeliveryNotice !== false}
              onChange={(e) => setForm((f) => ({ ...f, showDeliveryNotice: e.target.checked }))}
            />
              Afficher le message NB livraison sur la fiche produit
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

      <div className="shop-dash-card shop-dash-form" style={{ marginBottom: 20 }}>
        <header className="shop-dash-form-header">
          <div>
            <h3 className="shop-dash-form-title">Message NB livraison</h3>
            <p className="shop-dash-form-sub">
              Message général affiché sur les fiches produit où le NB est activé. Utilisez{' '}
              <code>{'{date}'}</code> pour la date de livraison.
            </p>
          </div>
        </header>
        <textarea
          className="shop-dash-input"
          rows={3}
          value={shopNoticeMessage}
          onChange={(e) => setShopNoticeMessage(e.target.value)}
          placeholder={
            shopNoticeDefault ||
            'Commandez aujourd’hui, livraison un jour après, le {date}. Soyez joignable à l’adresse indiquée.'
          }
        />
        {products.length ? (
          <div style={{ marginTop: 12 }}>
            <p className="shop-dash-hint" style={{ marginBottom: 8 }}>
              Attribuer le NB aux produits :
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
                          `${API_URL}/shop-products/${p._id}`,
                          { showDeliveryNotice: checked },
                          authHeaders
                        );
                        setProducts((list) =>
                          list.map((x) => (x._id === p._id ? { ...x, showDeliveryNotice: checked } : x))
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
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="shop-dash-btn shop-dash-btn--primary"
            disabled={savingNotice}
            onClick={async () => {
              setSavingNotice(true);
              try {
                const res = await axios.put(
                  `${API_URL}/shop-settings`,
                  { deliveryNoticeMessage: shopNoticeMessage },
                  authHeaders
                );
                setShopNoticeMessage(res.data?.deliveryNoticeMessage || '');
                if (res.data?.deliveryNoticeMessageDefault) {
                  setShopNoticeDefault(res.data.deliveryNoticeMessageDefault);
                }
              } catch (err) {
                alert(err.response?.data?.message || 'Erreur');
              } finally {
                setSavingNotice(false);
              }
            }}
          >
            {savingNotice ? 'Enregistrement…' : 'Enregistrer le message'}
          </button>
        </div>
      </div>

      <div className="shop-dash-card">
        <div className="shop-dash-list-head">
          <h3 className="shop-dash-list-title">
            Produits <span className="shop-dash-count">{products.length}</span>
          </h3>
          <SectionRefreshButton onRefresh={refreshPage} loading={refreshingPage} />
        </div>
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
                  <img src={getImageUrl(p.mainImage || p.images?.[0], null, BASE_URL)} alt="" />
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
                  {promo.freeDelivery ? (
                    <span className="shop-dash-tag">Livraison gratuite</span>
                  ) : Number(p.deliveryFee) > 0 ? (
                    <span className="shop-dash-tag">Livraison {formatPriceXof(p.deliveryFee)}</span>
                  ) : null}
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
