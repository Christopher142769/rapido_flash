import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import BottomNavbar from '../../components/BottomNavbar';
import TopNavbar from '../../components/TopNavbar';
import LangSwitcher from '../../components/LangSwitcher';
import LocationEditor from '../../components/LocationEditor';
import PageLoader from '../../components/PageLoader';
import FreeDeliveryBanner from '../../components/FreeDeliveryBanner';
import CategoryDomainIcon from '../../components/CategoryDomainIcon';
import { FaPhoneAlt, FaWhatsapp, FaPlus, FaComments, FaGift } from 'react-icons/fa';
import { IoChevronBack, IoChevronForward, IoSearchOutline } from 'react-icons/io5';
import { generateBannerPlaceholderSVG } from '../../utils/imagePlaceholder';
import { pickLocalized } from '../../utils/i18nContent';
import ProductPromoBadges from '../../components/ProductPromoBadges';
import { effectiveProductPrice, hasPricePromo } from '../../utils/productPromo';
import { getRapidoTelHref, getRapidoWhatsAppLink } from '../../config/rapidoWhatsApp';
import './Home.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

function distanceToMinutes(distanceKm) {
  if (distanceKm == null || typeof distanceKm !== 'number') return null;
  return Math.max(1, Math.round(distanceKm * 3));
}

function productThumbUrl(produit, baseUrl, index) {
  if (produit?.image) return String(produit.image).startsWith('http') ? produit.image : `${baseUrl}${produit.image}`;
  return generateBannerPlaceholderSVG(index);
}

/** Image mise en avant : visuel dédié accueil, sinon bannière, sinon 1er produit aperçu */
function structureSpotlightImageUrl(structure, baseUrl) {
  if (structure.visuelCarteAccueil && !structure.visuelCarteAccueil.includes('placeholder.com')) {
    return String(structure.visuelCarteAccueil).startsWith('http') ? structure.visuelCarteAccueil : `${baseUrl}${structure.visuelCarteAccueil}`;
  }
  if (structure.banniere && !structure.banniere.includes('placeholder.com')) {
    return String(structure.banniere).startsWith('http') ? structure.banniere : `${baseUrl}${structure.banniere}`;
  }
  const first = structure.produitsApercu?.[0];
  return productThumbUrl(first, baseUrl, 0);
}

/** Texte "produits aperçu" (Home) : nom + prix */
function structureProductNamesWithPricesText(structure, t, productDisplayName) {
  const fn = typeof productDisplayName === 'function' ? productDisplayName : (p) => pickLocalized('fr', p, 'nom');
  const prods = structure?.produitsApercu || [];
  const items = prods
    .map((p) => {
      const name = fn(p);
      if (!name) return null;
      if (p?.prix == null) return name;
      const price = hasPricePromo(p) ? effectiveProductPrice(p) : Number(p.prix);
      if (price == null || Number.isNaN(Number(price))) return name;
      return `${name} ${Number(price).toFixed(0)} FCFA`;
    })
    .filter(Boolean);

  if (items.length) return items.join(' · ');
  return t('home', 'noProductsPreview');
}

/** Structure rattachée à une catégorie domaine (boutique multi-catégories prise en charge) */
function structureHasDomainCategory(structure, catId) {
  const id = String(catId);
  const c = structure.categorie;
  if (c && String(c._id || c) === id) return true;
  const dom = structure.categoriesDomaine || [];
  return dom.some((x) => String(x._id || x) === id);
}

function mapPreviewToHomeProduct(p, s) {
  return {
    ...p,
    productId: p.productId || p._id,
    restaurantId: p.restaurantId || s._id,
    restaurant: s,
    imageCarteHome: p.image || null,
    images: p.image ? [p.image] : [],
  };
}

/** Image carte recherche produit (aligné sur RestaurantDetail) */
function productHitImageSrc(produit, baseUrl, idx) {
  const carte = produit.imageCarteHome;
  if (carte && String(carte).trim() && !String(carte).includes('placeholder.com')) {
    return String(carte).startsWith('http') ? carte : `${baseUrl}${carte}`;
  }
  if (produit.images?.[0]) return String(produit.images[0]).startsWith('http') ? produit.images[0] : `${baseUrl}${produit.images[0]}`;
  return generateBannerPlaceholderSVG(idx);
}

function categoryDisplayName(language, category) {
  const code = String(category?.code || '').toLowerCase();
  const labels = {
    restaurant: { fr: 'Restaurant', en: 'Restaurant' },
    'marche-frais': { fr: 'Marché frais', en: 'Fresh market' },
    construction: { fr: 'Construction', en: 'Construction' },
    'repas-sain': { fr: 'Repas sain', en: 'Healthy meals' },
    'cuisine-traditionnelle': { fr: 'Cuisine traditionnelle', en: 'Traditional cuisine' },
    'super-marche': { fr: 'Supermarché', en: 'Supermarket' },
    'fleurs-jardins': { fr: 'Fleurs & jardins', en: 'Flowers & gardens' },
    'nettoyage-sec': { fr: 'Nettoyage à sec', en: 'Dry cleaning' },
    'services-location': { fr: 'Services & location', en: 'Services & rental' },
    cosmetique: { fr: 'Cosmétique', en: 'Cosmetics' },
  };
  if (labels[code]) return language === 'en' ? labels[code].en : labels[code].fr;
  return pickLocalized(language, category, 'nom');
}

function requiresProductConfiguration(produit) {
  if (!produit) return false;
  const hasAccompagnements = Array.isArray(produit.accompagnements)
    && produit.accompagnements.some((a) => a?.actif !== false);
  const unit = String(produit.uniteVente || 'piece');
  const requiresVariableQty = unit === 'm3' || unit === 'kg' || unit === 'tonne';
  return hasAccompagnements || requiresVariableQty;
}

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const qFromUrl = searchParams.get('q');
  const { user } = useContext(AuthContext);
  const { language, t, localized, productDisplayName } = useContext(LanguageContext);
  const [structures, setStructures] = useState([]);
  const [categoriesDomaine, setCategoriesDomaine] = useState([]);
  const [selectedCategorieId, setSelectedCategorieId] = useState(null);
  const [bannieres, setBannieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 769px)').matches : false
  );
  const [cartCount, setCartCount] = useState(0);
  const [locationAddress, setLocationAddress] = useState('');
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [error, setError] = useState(null);
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [myPromoCodes, setMyPromoCodes] = useState([]);
  const [promoCopiedId, setPromoCopiedId] = useState('');
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoModalCode, setPromoModalCode] = useState(null);
  const [showPromoOffersPanel, setShowPromoOffersPanel] = useState(false);
  const [promoHasFreshNotice, setPromoHasFreshNotice] = useState(false);
  const categoriesScrollRef = useRef(null);

  useEffect(() => {
    const updateLocationAddress = () => {
      const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
      setLocationAddress(userLocation.adresse || `${userLocation.latitude?.toFixed(4) || '--'}, ${userLocation.longitude?.toFixed(4) || '--'}`);
    };
    updateLocationAddress();
    window.addEventListener('locationUpdated', updateLocationAddress);
    return () => window.removeEventListener('locationUpdated', updateLocationAddress);
  }, [location]);

  /** Recherche depuis la navbar (ex. page restaurant → /home?q=) */
  useEffect(() => {
    if (qFromUrl != null && qFromUrl !== '') setSearchTerm(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartCount(cart.reduce((sum, item) => sum + item.quantite, 0));
  }, [location]);

  useEffect(() => {
    fetchData();
  }, []);

  const authUserId = user?.id || user?._id || null;

  useEffect(() => {
    const loadMyPromos = async () => {
      if (!authUserId) {
        setMyPromoCodes([]);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setMyPromoCodes([]);
          return;
        }
        const res = await axios.get(`${API_URL}/promos/my-codes`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        setMyPromoCodes(Array.isArray(res.data) ? res.data : []);
      } catch (_) {
        setMyPromoCodes([]);
      }
    };
    loadMyPromos();
  }, [authUserId]);

  useEffect(() => {
    if (!authUserId || !Array.isArray(myPromoCodes) || myPromoCodes.length === 0) return;
    const storageKey = `rapido_seen_promos_${authUserId}`;
    let seen = [];
    try {
      seen = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(seen)) seen = [];
    } catch (_) {
      seen = [];
    }

    const unseen = myPromoCodes.filter((p) => !seen.includes(String(p.id)));
    if (unseen.length === 0) return;
    setPromoHasFreshNotice(true);

    const updatedSeen = [...new Set([...seen, ...unseen.map((p) => String(p.id))])];
    localStorage.setItem(storageKey, JSON.stringify(updatedSeen));

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      unseen.slice(0, 3).forEach((promo) => {
        try {
          new Notification('Rapido — Nouveau code promo', {
            body: `${promo.code} (${Number(promo.offer?.discountPercent || 0)}%): ${promo.offer?.title || 'Offre promo'}`,
            tag: `promo-${promo.id}`,
          });
        } catch (_) {}
      });
    }
  }, [myPromoCodes, authUserId]);

  useEffect(() => {
    if (!authUserId || !Array.isArray(myPromoCodes) || myPromoCodes.length === 0) {
      setShowPromoModal(false);
      setPromoModalCode(null);
      return;
    }
    const key = `rapido_home_promo_modal_seen_${authUserId}`;
    const today = new Date().toISOString().slice(0, 10);
    const seenToday = localStorage.getItem(key) === today;
    if (!seenToday) {
      setPromoModalCode(myPromoCodes[0]);
      setShowPromoModal(true);
      localStorage.setItem(key, today);
    }
  }, [myPromoCodes, authUserId]);

  const copyPromoCode = async (id, code) => {
    try {
      await navigator.clipboard.writeText(String(code || ''));
      setPromoCopiedId(String(id));
      window.setTimeout(() => setPromoCopiedId(''), 1800);
    } catch (_) {}
  };

  const firstPromo = myPromoCodes[0] || null;

  const fetchData = async () => {
    try {
      const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
      const params = {};
      if (userLocation.latitude) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
      }
      if (selectedCategorieId) params.categorieId = selectedCategorieId;

      const [restaurantsRes, categoriesRes, bannieresRes] = await Promise.all([
        axios.get(`${API_URL}/restaurants`, { params, timeout: 10000 }),
        axios.get(`${API_URL}/categories-domaine`, { timeout: 10000 }),
        axios.get(`${API_URL}/bannieres`, { timeout: 10000 }).catch(() => ({ data: [] }))
      ]);

      setStructures(restaurantsRes.data);
      setCategoriesDomaine(categoriesRes.data || []);
      setBannieres((bannieresRes.data || []).filter(b => b.actif !== false));
    } catch (err) {
      console.error('Erreur chargement Home:', err);
      if (err.code === 'ECONNREFUSED' || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        setError(null);
        setStructures([]);
        setCategoriesDomaine([]);
        setBannieres([]);
      } else {
        setError('Erreur lors du chargement. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
      const params = {};
      if (userLocation.latitude) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
      }
      if (selectedCategorieId) params.categorieId = selectedCategorieId;
      axios.get(`${API_URL}/restaurants`, { params, timeout: 10000 })
        .then(res => setStructures(res.data))
        .catch(() => {});
    }
  }, [selectedCategorieId]);

  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < 2) {
      setProductSearchResults([]);
      setProductSearchLoading(false);
      return undefined;
    }
    const handle = setTimeout(async () => {
      setProductSearchLoading(true);
      try {
        const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
        const params = { q };
        if (userLocation.latitude != null && userLocation.longitude != null) {
          params.latitude = userLocation.latitude;
          params.longitude = userLocation.longitude;
        }
        if (selectedCategorieId) params.categorieId = selectedCategorieId;
        const { data } = await axios.get(`${API_URL}/produits/search`, { params, timeout: 15000 });
        setProductSearchResults(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Recherche produits:', e);
        setProductSearchResults([]);
      } finally {
        setProductSearchLoading(false);
      }
    }, 320);
    return () => clearTimeout(handle);
  }, [searchTerm, selectedCategorieId]);

  const mobileBannieres = bannieres.filter((b) => (b.mode || 'web') === 'mobile');
  const webBannieres = bannieres.filter((b) => (b.mode || 'web') === 'web');
  const bannieresForMobile = mobileBannieres.length > 0 ? mobileBannieres : bannieres;
  const bannieresForDesktop = webBannieres.length > 0 ? webBannieres : bannieres;
  const activeBannieres = isDesktop ? bannieresForDesktop : bannieresForMobile;

  useEffect(() => {
    if (activeBannieres.length > 0) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % activeBannieres.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeBannieres.length]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  useEffect(() => {
    if (!activeBannieres.length) {
      setCurrentBannerIndex(0);
      return;
    }
    setCurrentBannerIndex((prev) => prev % activeBannieres.length);
  }, [activeBannieres.length]);

  const filteredStructures = structures.filter((s) => {
    const q = (searchTerm || '').toLowerCase();
    if (!q) return true;
    if ((s.nom || '').toLowerCase().includes(q)) return true;
    return (s.produitsApercu || []).some((p) => (p.nom || '').toLowerCase().includes(q));
  });

  const productQueryActive = searchTerm.trim().length >= 2;
  const showStructures = productQueryActive ? productSearchResults.length === 0 : false;

  /** Une section par catégorie domaine ; uniquement si la catégorie a au moins un produit */
  const categoryProductSections = useMemo(() => {
    if (productQueryActive) return [];
    const flatProducts = () =>
      filteredStructures.flatMap((s) =>
        (s.produitsApercu || []).map((p) => mapPreviewToHomeProduct(p, s))
      );
    if (!categoriesDomaine.length) {
      const products = flatProducts();
      if (!products.length) return [];
      return [
        {
          category: {
            _id: '__all__',
            nom: 'Tous les produits',
            nomEn: 'All products',
            code: 'super-marche',
          },
          products,
        },
      ];
    }
    return categoriesDomaine
      .map((cat) => {
        const catId = String(cat._id);
        const products = filteredStructures
          .filter((s) => structureHasDomainCategory(s, catId))
          .flatMap((s) => (s.produitsApercu || []).map((p) => mapPreviewToHomeProduct(p, s)));
        return { category: cat, products };
      })
      .filter((sec) => sec.products.length > 0);
  }, [filteredStructures, categoriesDomaine, productQueryActive]);

  const addProductFromHome = (previewProduit) => {
    if (!previewProduit?.productId || !previewProduit?.restaurantId) return;
    if (requiresProductConfiguration(previewProduit)) {
      navigate(`/restaurant/${previewProduit.restaurantId}?produit=${previewProduit.productId}`);
      return;
    }

    let newCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const pid = previewProduit.productId;
    const rid = previewProduit.restaurantId;
    const imageUrl = previewProduit.image || null;

    const existing = newCart.find(
      (item) => String(item.productId) === String(pid) && String(item.restaurantId) === String(rid)
    );

    if (existing) {
      newCart = newCart.map((item) =>
        String(item.productId) === String(pid) && String(item.restaurantId) === String(rid)
          ? { ...item, quantite: item.quantite + 1 }
          : item
      );
    } else {
      const eff = effectiveProductPrice(previewProduit);
      const showOld = hasPricePromo(previewProduit);
      newCart = [
        ...newCart,
        {
          productId: pid,
          nom: previewProduit.nom,
          nomEn: previewProduit.nomEn,
          nomAfficheAccueil: previewProduit.nomAfficheAccueil,
          nomAfficheAccueilEn: previewProduit.nomAfficheAccueilEn,
          prix: eff,
          prixCatalogue: showOld ? Number(previewProduit.prix) : undefined,
          promoLivraisonGratuite: !!previewProduit.promoLivraisonGratuite,
          image: imageUrl,
          quantite: 1,
          restaurantId: rid,
        },
      ];
    }

    localStorage.setItem('cart', JSON.stringify(newCart));
    setCartCount(newCart.reduce((sum, item) => sum + item.quantite, 0));
  };

  const addProductFromSearch = (produit, restaurantId) => {
    if (!produit?._id || !restaurantId) return;
    if (requiresProductConfiguration(produit)) {
      navigate(`/restaurant/${restaurantId}?produit=${produit._id}`);
      return;
    }
    let newCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const imageUrl = produit.imageCarteHome || (produit.images && produit.images[0]) || null;
    const pid = produit._id;
    const existing = newCart.find(
      (item) => String(item.productId) === String(pid) && String(item.restaurantId) === String(restaurantId)
    );
    if (existing) {
      newCart = newCart.map((item) =>
        String(item.productId) === String(pid) && String(item.restaurantId) === String(restaurantId)
          ? { ...item, quantite: item.quantite + 1 }
          : item
      );
    } else {
      const eff = effectiveProductPrice(produit);
      const showOld = hasPricePromo(produit);
      newCart = [
        ...newCart,
        {
          productId: pid,
          nom: produit.nom,
          nomEn: produit.nomEn,
          nomAfficheAccueil: produit.nomAfficheAccueil,
          nomAfficheAccueilEn: produit.nomAfficheAccueilEn,
          prix: eff,
          prixCatalogue: showOld ? Number(produit.prix) : undefined,
          promoLivraisonGratuite: !!produit.promoLivraisonGratuite,
          image: imageUrl,
          quantite: 1,
          restaurantId,
        },
      ];
    }
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCartCount(newCart.reduce((sum, item) => sum + item.quantite, 0));
  };

  const renderRailProductCard = useCallback(
    (produit, idx) => {
      const restaurantId = produit.restaurantId;
      const productId = produit.productId;
      const r = produit.restaurant;
      const imgSrc = productHitImageSrc(produit, BASE_URL, idx);
      const minutes = r?.distance != null ? distanceToMinutes(r.distance) : null;
      const rapidoTel = getRapidoTelHref();
      const shopName = localized(r, 'nom');

      return (
        <article
          className="home-rail-card"
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/restaurant/${restaurantId}?produit=${productId}`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/restaurant/${restaurantId}?produit=${productId}`);
            }
          }}
        >
          <div className="home-rail-card__media">
            <ProductPromoBadges product={produit} />
            <img
              src={imgSrc}
              alt=""
              onError={(e) => {
                e.target.src = generateBannerPlaceholderSVG(idx);
              }}
            />
          </div>
          <div className="home-rail-card__body">
            <h3 className="home-rail-card__name">{productDisplayName(produit)}</h3>
            {shopName ? <p className="home-rail-card__shop">{shopName}</p> : null}
            {produit.recommande ? (
              <span className="home-rail-card__reco">{t('reviews', 'recommendedBadge')}</span>
            ) : null}
            <div className="home-rail-card__prices">
              {hasPricePromo(produit) ? (
                <>
                  <span className="home-rail-card__price-now">{effectiveProductPrice(produit)} FCFA</span>
                  <span className="home-rail-card__price-was">{Number(produit.prix).toFixed(0)} FCFA</span>
                </>
              ) : (
                <span className="home-rail-card__price-single">{Number(produit.prix).toFixed(0)} FCFA</span>
              )}
            </div>
            <div className="home-rail-card__footer">
              {minutes != null ? (
                <span className="home-rail-card__eta">~{minutes} {t('home', 'min')}</span>
              ) : (
                <span className="home-rail-card__eta home-rail-card__eta--muted">—</span>
              )}
              <div className="home-rail-card__actions" onClick={(e) => e.stopPropagation()}>
                {rapidoTel !== '#' ? (
                  <a
                    href={rapidoTel}
                    className="home-rail-card__act"
                    title={t('home', 'call')}
                    aria-label={t('home', 'call')}
                  >
                    <FaPhoneAlt size={14} />
                  </a>
                ) : null}
                <button
                  type="button"
                  className="home-rail-card__act home-rail-card__act--msg"
                  title={t('chat', 'shopChat')}
                  aria-label={t('chat', 'shopChat')}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/chat/${restaurantId}?produit=${productId}`);
                  }}
                >
                  <FaComments size={15} />
                </button>
                <button
                  type="button"
                  className="home-rail-card__act home-rail-card__act--cart"
                  title={t('home', 'addToCartShort')}
                  aria-label={t('home', 'addToCartShort')}
                  onClick={(e) => {
                    e.stopPropagation();
                    addProductFromHome(produit);
                  }}
                >
                  <FaPlus size={14} />
                </button>
              </div>
            </div>
          </div>
        </article>
      );
    },
    [navigate, productDisplayName, t, localized, addProductFromHome]
  );

  const renderCategoryRails = (variant) =>
    categoryProductSections.map(({ category: cat, products }) => (
      <section
        key={String(cat._id)}
        className={`home-category-rail home-category-rail--${variant}`}
        id={variant === 'desktop' ? `section-category-${cat._id}` : undefined}
        aria-label={categoryDisplayName(language, cat)}
      >
        <header className="home-category-rail__head">
          <div className="home-category-rail__head-left">
            <span className="home-category-rail__icon-ring">
              <CategoryDomainIcon category={cat} baseUrl={BASE_URL} size={variant === 'desktop' ? 34 : 28} />
            </span>
            <div className="home-category-rail__head-text">
              <h2 className="home-category-rail__title">{categoryDisplayName(language, cat)}</h2>
              <p className="home-category-rail__subtitle">{t('home', 'railSwipeHint')}</p>
            </div>
          </div>
          <span className="home-category-rail__badge">
            {products.length} {t('home', 'productsListed')}
          </span>
        </header>
        <div className="home-category-rail__scroll-wrap">
          <div className="home-category-rail__track" role="list">
            {products.map((produit, idx) => (
              <div key={`${produit.productId}-${produit.restaurantId}-${idx}`} className="home-category-rail__item" role="listitem">
                {renderRailProductCard(produit, idx)}
              </div>
            ))}
          </div>
        </div>
      </section>
    ));

  const renderProductSearchSection = (layoutClass) => {
    if (!productQueryActive) return null;
    return (
      <section
        id={
          layoutClass === 'home-product-search--desktop'
            ? 'section-product-results-desktop'
            : 'section-product-results-mobile'
        }
        className={`home-product-search-section ${layoutClass}`}
        aria-label={t('home', 'productSearchTitle')}
      >
        <h2 className="home-product-search-title">{t('home', 'productSearchTitle')}</h2>
        {productSearchLoading && (
          <p className="home-product-search-meta">{t('home', 'productSearchLoading')}</p>
        )}
        {!productSearchLoading && productSearchResults.length === 0 && (
          <p className="home-product-search-meta home-product-search-empty">{t('home', 'productSearchEmpty')}</p>
        )}
        {!productSearchLoading && productSearchResults.length > 0 && (
          <div className="home-product-hits-grid">
            {productSearchResults.map((produit, idx) => {
              const r = produit.restaurant;
              const restaurantId = r?._id || r;
              const imgSrc = productHitImageSrc(produit, BASE_URL, idx);
              const dist =
                produit.distanceKm != null && typeof produit.distanceKm === 'number'
                  ? produit.distanceKm.toFixed(1)
                  : null;
              return (
                <article
                  key={`${produit._id}-${restaurantId}`}
                  className="home-product-hit-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/restaurant/${restaurantId}?produit=${produit._id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/restaurant/${restaurantId}?produit=${produit._id}`);
                    }
                  }}
                >
                  <div className="home-product-hit-media">
                    <ProductPromoBadges product={produit} />
                    <img
                      src={imgSrc}
                      alt=""
                      onError={(e) => {
                        e.target.src = generateBannerPlaceholderSVG(idx);
                      }}
                    />
                  </div>
                  <div className="home-product-hit-body">
                    <h3 className="home-product-hit-name">{productDisplayName(produit)}</h3>
                    <p className="home-product-hit-shop">{localized(r, 'nom') || '—'}</p>
                    <div className="home-product-hit-row">
                      <span className="home-product-hit-price">
                        {hasPricePromo(produit) ? (
                          <>
                            <span className="home-product-price-current">{effectiveProductPrice(produit)} FCFA</span>
                            <span className="home-product-price-old">{Number(produit.prix).toFixed(0)} FCFA</span>
                          </>
                        ) : (
                          <>{Number(produit.prix).toFixed(0)} FCFA</>
                        )}
                      </span>
                      {dist != null && (
                        <span className="home-product-hit-dist">
                          {dist} {t('home', 'distanceKm')}
                        </span>
                      )}
                    </div>
                    <div className="home-product-hit-actions">
                      <button
                        type="button"
                        className="home-product-hit-btn home-product-hit-btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/restaurant/${restaurantId}?produit=${produit._id}`);
                        }}
                      >
                        {t('home', 'openShop')}
                      </button>
                      <button
                        type="button"
                        className="home-product-hit-btn home-product-hit-btn-cart"
                        title={t('home', 'addToCartShort')}
                        aria-label={t('home', 'addToCartShort')}
                        onClick={(e) => {
                          e.stopPropagation();
                          addProductFromSearch(produit, restaurantId);
                        }}
                      >
                        <FaPlus size={18} aria-hidden />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="home-page">
      <TopNavbar
        locationAddress={locationAddress}
        onLocationClick={() => setShowLocationEditor(true)}
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        sectionLinks={[
          { id: 'section-categories', labelKey: 'sectionCategories' },
          { id: 'section-product-results', labelKey: 'sectionProducts' },
          { id: 'section-structures', labelKey: 'sectionStructures' },
        ]}
        onScrollToSection={(id) => {
          if (id === 'section-product-results') {
            const desktop = window.matchMedia('(min-width: 769px)').matches;
            const el = desktop
              ? document.getElementById('section-product-results-desktop')
              : document.getElementById('section-product-results-mobile');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
      <FreeDeliveryBanner message={t('home', 'freeDeliveryCotonou')} dismissLabel={t('home', 'hideBannerToday')} />

      <div className="location-section-mobile">
        <button className="location-display-btn" onClick={() => setShowLocationEditor(true)}>
          <svg className="location-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#8B4513"/>
          </svg>
          <div className="location-info">
            <span className="location-label">{t('home', 'deliveryTo')}</span>
            <span className="location-address">
              {locationAddress || t('home', 'selectAddress')}
            </span>
          </div>
          <svg className="edit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.12 5.13L18.87 8.88L20.71 7.04Z" fill="#8B4513"/>
          </svg>
        </button>
        <LangSwitcher variant="mobile" />
        <button className="cart-icon-btn-mobile" onClick={() => navigate('/cart')}>
          <svg className="cart-icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V17C17 18.1 17.9 19 19 19C20.1 19 21 18.1 21 17V13" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {cartCount > 0 && <span className="cart-badge-mobile">{cartCount}</span>}
        </button>
      </div>

      <div className="search-section-mobile">
        <div className="restaurant-product-search-wrap">
          <div className="restaurant-product-search-bar">
            <span className="store-search-icon" aria-hidden>
              <IoSearchOutline size={22} strokeWidth={2.5} />
            </span>
            <input
              type="search"
              enterKeyHint="search"
              placeholder={t('home', 'searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="store-search-input"
              aria-label={t('navbar', 'searchPlaceholder')}
            />
          </div>
        </div>
      </div>

      {firstPromo ? (
        <button
          type="button"
          className="home-promo-banner"
          onClick={() => setShowPromoOffersPanel(true)}
          aria-label="Voir les offres promo"
        >
          <span className="home-promo-banner__badge">OFFRE</span>
          <span className="home-promo-banner__icon" aria-hidden>
            <FaGift />
          </span>
          <span className="home-promo-banner__text">
            <strong>{firstPromo.offer?.title || 'Offre promo'}</strong>
            <small>
              Code {firstPromo.code} - {Number(firstPromo.offer?.discountPercent || 0)}% de reduction
            </small>
          </span>
          {promoHasFreshNotice ? <span className="home-promo-banner__new">NOUVELLE OFFRE</span> : null}
          <span className="home-promo-banner__cta">Voir toutes les offres</span>
        </button>
      ) : null}

      {renderProductSearchSection('home-product-search--mobile')}

      {bannieresForMobile.length > 0 ? (
        <div className="banners-carousel-mobile">
          <div className="banners-wrapper" style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}>
            {bannieresForMobile.map((banniere, index) => {
              const imageUrl =
                banniere.image && !banniere.image.includes('placeholder.com')
                  ? (String(banniere.image).startsWith('http') ? banniere.image : `${BASE_URL}${banniere.image}`)
                  : generateBannerPlaceholderSVG(index);
              return (
                <div key={banniere._id} className="banner-slide">
                  <img
                    src={imageUrl}
                    alt={`Banner ${index + 1}`}
                    className="banner-mobile-img"
                    onError={(e) => { e.target.src = generateBannerPlaceholderSVG(index); }}
                  />
                </div>
              );
            })}
          </div>
          <div className="banner-indicators">
            {bannieresForMobile.map((_, index) => (
              <button key={index} className={`indicator-dot ${index === currentBannerIndex ? 'active' : ''}`} onClick={() => setCurrentBannerIndex(index)} />
            ))}
          </div>
        </div>
      ) : (
        <div className="banners-carousel-mobile">
          <div className="banner-slide">
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--light-yellow) 0%, var(--primary-white) 100%)' }}>
              <span style={{ fontSize: '48px', opacity: 0.3 }}>📷</span>
            </div>
          </div>
        </div>
      )}

      <div className="plats-section-mobile">
        {categoriesDomaine.length > 0 && (
          <>
            <h2 className="plats-section-title plats-section-title-categories">{t('home', 'categories')}</h2>
            <div className="categories-filter-home-mobile">
            <button
              className={`category-btn-home category-btn-home-icon ${selectedCategorieId === null ? 'active' : ''}`}
              onClick={() => setSelectedCategorieId(null)}
            >
              <span className="category-circle-wrap">
                <span className="category-domain-icon-wrap">
                  <span className="category-icon-all">{t('home', 'all').toUpperCase()}</span>
                </span>
              </span>
              <span className="category-label">{t('home', 'all')}</span>
            </button>
            {categoriesDomaine.map((cat) => (
              <button
                key={cat._id}
                className={`category-btn-home category-btn-home-icon ${selectedCategorieId === cat._id ? 'active' : ''}`}
                onClick={() => setSelectedCategorieId(selectedCategorieId === cat._id ? null : cat._id)}
              >
                <span className="category-circle-wrap">
                  <CategoryDomainIcon category={cat} baseUrl={BASE_URL} size={34} />
                </span>
                <span className="category-label">{categoryDisplayName(language, cat)}</span>
              </button>
            ))}
            </div>
          </>
        )}
        {!productQueryActive && !error && categoryProductSections.length === 0 && (
          <div className="no-results">
            <p>{t('home', 'allProductsEmpty')}</p>
          </div>
        )}

        {!productQueryActive && !error && categoryProductSections.length > 0 && (
          <div id="section-home-products-mobile" className="home-by-category home-by-category--mobile">
            <h2 className="home-by-category-hero-title">
              {categoriesDomaine.length === 0 && categoryProductSections.length <= 1
                ? t('home', 'allProductsTitle')
                : t('home', 'shopByCategory')}
            </h2>
            {renderCategoryRails('mobile')}
          </div>
        )}

        {error && <div className="no-results"><p>{error}</p></div>}
        {!error && showStructures && filteredStructures.length === 0 && (
          <div className="no-results">
            <p>{t('home', 'noStructuresFound')}</p>
          </div>
        )}
        {!error && showStructures && filteredStructures.length > 0 && (
          <div className="plats-grid-mobile structures-grid-mobile">
            {filteredStructures.map((structure) => {
              const minutes = distanceToMinutes(structure.distance);
              const distanceKm = structure.distance != null ? structure.distance.toFixed(2) : null;
              const spotlightUrl = structureSpotlightImageUrl(structure, BASE_URL);
              return (
                <div
                  key={structure._id}
                  className="plat-card-mobile structure-card-mobile structure-spotlight-card-mobile"
                  onClick={() => navigate(`/restaurant/${structure._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/restaurant/${structure._id}`); }}
                >
                  <div className="structure-spotlight-media-mobile">
                    <img
                      src={spotlightUrl}
                      alt=""
                      className="structure-spotlight-img-mobile"
                      onError={(e) => { e.target.src = generateBannerPlaceholderSVG(0); }}
                    />
                  </div>
                  <div className="structure-spotlight-body-mobile">
                    <h3 className="structure-spotlight-titles-mobile">
                      {structureProductNamesWithPricesText(structure, t, productDisplayName)}
                    </h3>
                    <div className="structure-spotlight-row-mobile">
                      <div className="structure-card-pills-mobile">
                        {minutes != null && <span className="structure-pill-mobile">~{minutes} min</span>}
                        {distanceKm != null && <span className="structure-pill-mobile">{distanceKm} km</span>}
                      </div>
                      <div className="structure-spotlight-icons-mobile" onClick={(e) => e.stopPropagation()}>
                        <a href={getRapidoTelHref()} className="structure-spotlight-icon-btn-mobile" title={t('home', 'call')} aria-label={t('home', 'call')}>
                          <FaPhoneAlt size={17} />
                        </a>
                        <a
                          href={getRapidoWhatsAppLink()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="structure-spotlight-icon-btn-mobile structure-spotlight-icon-wa-mobile"
                          title={t('home', 'whatsapp')}
                          aria-label={t('home', 'whatsapp')}
                        >
                          <FaWhatsapp size={19} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPromoModal && promoModalCode ? (
        <div className="home-promo-modal-overlay" role="presentation" onClick={() => setShowPromoModal(false)}>
          <div
            className="home-promo-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Offre promotionnelle"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="home-promo-modal-close" onClick={() => setShowPromoModal(false)} aria-label="Fermer">
              ×
            </button>
            <div className="home-promo-modal-visual" aria-hidden>
              <div className="home-promo-modal-logos">
                <img src="/images/logo.png" alt="" className="home-promo-modal-logo" />
                {promoModalCode.offer?.restaurantLogo ? (
                  <img
                    src={String(promoModalCode.offer.restaurantLogo).startsWith('http')
                      ? promoModalCode.offer.restaurantLogo
                      : `${BASE_URL}${promoModalCode.offer.restaurantLogo}`}
                    alt=""
                    className="home-promo-modal-logo"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : null}
              </div>
              <span className="home-promo-modal-visual-badge">
                {promoModalCode.offer?.scopeType === 'platform'
                  ? 'OFFRE PLATEFORME'
                  : `OFFRE ${String(promoModalCode.offer?.restaurantName || '').toUpperCase()}`}
              </span>
              <strong>-{Number(promoModalCode.offer?.discountPercent || 0)}%</strong>
              <small>sur vos produits</small>
            </div>
            <div className="home-promo-modal-content">
              <p className="home-promo-modal-eyebrow">Offre spéciale</p>
              <h3 className="home-promo-modal-title">{promoModalCode.offer?.title || 'Code promo disponible'}</h3>
              <p className="home-promo-modal-discount">{Number(promoModalCode.offer?.discountPercent || 0)}% de réduction</p>
              <p className="home-promo-modal-products">
                {(promoModalCode.offer?.products || []).length > 0
                  ? promoModalCode.offer.products.map((p) => p.nom).slice(0, 5).join(', ')
                  : 'Valable sur tous les produits'}
              </p>
              <div className="home-promo-modal-code-row">
                <strong>{promoModalCode.code}</strong>
                <button
                  type="button"
                  onClick={() => copyPromoCode(promoModalCode.id, promoModalCode.code)}
                  className="home-promo-modal-copy"
                >
                  {promoCopiedId === String(promoModalCode.id) ? 'Copié' : 'Copier'}
                </button>
              </div>
              <button type="button" className="home-promo-modal-cta" onClick={() => setShowPromoModal(false)}>
                Utiliser cette offre
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPromoOffersPanel ? (
        <div className="home-promo-drawer-overlay" role="presentation" onClick={() => setShowPromoOffersPanel(false)}>
          <div
            className="home-promo-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Toutes les offres promo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="home-promo-drawer-head">
              <h3>Toutes vos offres promo</h3>
              <button type="button" onClick={() => setShowPromoOffersPanel(false)} aria-label="Fermer">×</button>
            </div>
            <div className="home-promo-drawer-list">
              {myPromoCodes.map((promo) => {
                const expiresLabel = promo.expiresAt ? new Date(promo.expiresAt).toLocaleString() : 'Sans expiration';
                const productsLabel =
                  (promo.offer?.products || []).length > 0
                    ? promo.offer.products.map((p) => p.nom).slice(0, 6).join(', ')
                    : 'Tous les produits';
                return (
                  <article key={`panel-${promo.id}`} className="home-promo-drawer-item">
                    <div className="home-promo-drawer-item-visual">
                      <div className="home-promo-drawer-item-logos">
                        <img src="/images/logo.png" alt="" className="home-promo-drawer-item-logo" />
                        {promo.offer?.restaurantLogo ? (
                          <img
                            src={String(promo.offer.restaurantLogo).startsWith('http')
                              ? promo.offer.restaurantLogo
                              : `${BASE_URL}${promo.offer.restaurantLogo}`}
                            alt=""
                            className="home-promo-drawer-item-logo"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : null}
                      </div>
                      <strong>-{Number(promo.offer?.discountPercent || 0)}%</strong>
                      <small>sur vos produits</small>
                    </div>
                    <div className="home-promo-drawer-item-content">
                      <p className="home-promo-drawer-title">{promo.offer?.title || 'Offre promo'}</p>
                      <p className="home-promo-drawer-discount">
                        {promo.offer?.scopeType === 'platform'
                          ? 'Offre valable sur la plateforme'
                          : `Offre ${promo.offer?.restaurantName || 'entreprise'}`}
                      </p>
                      <p className="home-promo-drawer-products">{productsLabel}</p>
                      <div className="home-promo-drawer-code">
                        <strong>{promo.code}</strong>
                        <button type="button" onClick={() => copyPromoCode(promo.id, promo.code)}>
                          {promoCopiedId === String(promo.id) ? 'Copié' : 'Copier'}
                        </button>
                      </div>
                      <small>Valide: {expiresLabel}</small>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Desktop: Bannières défilantes - images en valeur, sans overlay */}
      <div className="hero-desktop">
        <div className="hero-bg-desktop">
          {bannieresForDesktop.length > 0 ? (
            <div className="hero-carousel-desktop" style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}>
              {bannieresForDesktop.map((banniere, index) => {
                const imageUrl =
                  banniere.image && !banniere.image.includes('placeholder.com')
                    ? (String(banniere.image).startsWith('http') ? banniere.image : `${BASE_URL}${banniere.image}`)
                    : generateBannerPlaceholderSVG(index);
                return <img key={banniere._id} src={imageUrl} alt="" className="hero-carousel-img-desktop" onError={(e) => { e.target.src = generateBannerPlaceholderSVG(index); }} />;
              })}
            </div>
          ) : (
            <div className="hero-placeholder-desktop" />
          )}
        </div>
        {bannieresForDesktop.length > 1 && (
          <div className="hero-indicators-desktop">
            {bannieresForDesktop.map((_, index) => (
              <button key={index} type="button" className={index === currentBannerIndex ? 'active' : ''} onClick={() => setCurrentBannerIndex(index)} />
            ))}
          </div>
        )}
      </div>

      <div className="plats-section-desktop">
        <div className="container-desktop">
          {firstPromo ? (
            <button
              type="button"
              className="home-promo-banner home-promo-banner--desktop"
              onClick={() => setShowPromoOffersPanel(true)}
              aria-label="Voir les offres promo"
            >
              <span className="home-promo-banner__badge">OFFRE</span>
              <span className="home-promo-banner__icon" aria-hidden>
                <FaGift />
              </span>
              <span className="home-promo-banner__text">
                <strong>{firstPromo.offer?.title || 'Offre promo'}</strong>
                <small>
                  Code {firstPromo.code} - {Number(firstPromo.offer?.discountPercent || 0)}% de reduction
                </small>
              </span>
              {promoHasFreshNotice ? <span className="home-promo-banner__new">NOUVELLE OFFRE</span> : null}
              <span className="home-promo-banner__cta">Voir toutes les offres</span>
            </button>
          ) : null}

          {renderProductSearchSection('home-product-search--desktop')}
          {categoriesDomaine.length > 0 && (
            <section id="section-categories" className="home-categories-section-desktop">
              <h2 className="home-section-title-desktop">{t('home', 'categories')}</h2>
              <div className="categories-scroll-wrap-desktop">
                <button type="button" className="categories-scroll-arrow left" onClick={() => categoriesScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} aria-label={t('home', 'previous')}>
                  <IoChevronBack size={22} aria-hidden />
                </button>
                <div className="categories-scroll-desktop" ref={categoriesScrollRef}>
                  <button
                    type="button"
                    className={`category-square-desktop ${selectedCategorieId === null ? 'active' : ''}`}
                    onClick={() => setSelectedCategorieId(null)}
                  >
                    <span className="category-square-img">
                      <span className="category-domain-icon-wrap">
                        <span className="category-square-all">{t('home', 'all').toUpperCase()}</span>
                      </span>
                    </span>
                    <span className="category-square-label">{t('home', 'all')}</span>
                  </button>
                  {categoriesDomaine.map((cat) => (
                    <button
                      type="button"
                      key={cat._id}
                      className={`category-square-desktop ${selectedCategorieId === cat._id ? 'active' : ''}`}
                      onClick={() => setSelectedCategorieId(selectedCategorieId === cat._id ? null : cat._id)}
                    >
                      <span className="category-square-img">
                        <CategoryDomainIcon category={cat} baseUrl={BASE_URL} size={40} />
                      </span>
                      <span className="category-square-label">{categoryDisplayName(language, cat)}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="categories-scroll-arrow right" onClick={() => categoriesScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} aria-label={t('home', 'next')}>
                  <IoChevronForward size={22} aria-hidden />
                </button>
              </div>
            </section>
          )}

          {!productQueryActive && !error && categoryProductSections.length === 0 && (
            <div className="no-results-desktop">
              <p>{t('home', 'allProductsEmpty')}</p>
            </div>
          )}

          {!productQueryActive && !error && categoryProductSections.length > 0 && (
            <div id="section-home-products-desktop" className="home-by-category home-by-category--desktop">
              <h2 className="home-by-category-hero-title">
                {categoriesDomaine.length === 0 && categoryProductSections.length <= 1
                  ? t('home', 'allProductsTitle')
                  : t('home', 'shopByCategory')}
              </h2>
              {renderCategoryRails('desktop')}
            </div>
          )}

          {!error && showStructures && filteredStructures.length === 0 && (
            <div id="section-structures" className="no-results-desktop"><p>{t('home', 'noStructuresFound')}</p></div>
          )}
          {!error && showStructures && filteredStructures.length > 0 && (
            <div id="section-structures" className="structures-grid-desktop">
              {filteredStructures.map((structure) => {
                const minutes = distanceToMinutes(structure.distance);
                const distanceKm = structure.distance != null ? structure.distance.toFixed(2) : null;
                const spotlightUrl = structureSpotlightImageUrl(structure, BASE_URL);
                return (
                  <div
                    key={structure._id}
                    className="structure-card-desktop structure-spotlight-card-desktop"
                    onClick={() => navigate(`/restaurant/${structure._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/restaurant/${structure._id}`); }}
                  >
                    <div className="structure-spotlight-media-desktop">
                      <img
                        src={spotlightUrl}
                        alt=""
                        className="structure-spotlight-img-desktop"
                        onError={(e) => { e.target.src = generateBannerPlaceholderSVG(0); }}
                      />
                    </div>
                    <div className="structure-spotlight-body-desktop">
                      <h3 className="structure-spotlight-titles-desktop">
                        {structureProductNamesWithPricesText(structure, t, productDisplayName)}
                      </h3>
                      <div className="structure-spotlight-row-desktop">
                        <div className="structure-card-pills">
                          {minutes != null && <span className="structure-pill">~{minutes} min</span>}
                          {distanceKm != null && <span className="structure-pill">{distanceKm} km</span>}
                        </div>
                        <div className="structure-spotlight-icons-desktop" onClick={(e) => e.stopPropagation()}>
                          <a href={getRapidoTelHref()} className="structure-spotlight-icon-btn-desktop" title={t('home', 'call')} aria-label={t('home', 'call')}>
                            <FaPhoneAlt size={18} />
                          </a>
                          <a
                            href={getRapidoWhatsAppLink()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="structure-spotlight-icon-btn-desktop structure-spotlight-icon-wa-desktop"
                            title={t('home', 'whatsapp')}
                            aria-label={t('home', 'whatsapp')}
                          >
                            <FaWhatsapp size={20} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Carte d'installation masquée temporairement
      <div className="install-fab-desktop-wrap">
        <div className="install-download-callout">
          <p className="install-download-callout__eyebrow">{t('install', 'calloutEyebrow')}</p>
          <p className="install-download-callout__title">{t('install', 'calloutTitle')}</p>
          <p className="install-download-callout__desc">{t('install', 'calloutDesc')}</p>
          <InstallButton variant="download" />
        </div>
      </div>
      */}

      <BottomNavbar />

      {showLocationEditor && (
        <LocationEditor
          onClose={() => setShowLocationEditor(false)}
          onSave={(locationData) => {
            setLocationAddress(locationData.adresse || `${locationData.latitude?.toFixed(4)}, ${locationData.longitude?.toFixed(4)}`);
            setShowLocationEditor(false);
            fetchData();
          }}
        />
      )}

    </div>
  );
};

export default Home;
