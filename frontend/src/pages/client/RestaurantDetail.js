import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import LanguageContext from '../../context/LanguageContext';
import TopNavbar from '../../components/TopNavbar';
import BottomNavbar from '../../components/BottomNavbar';
import PageLoader from '../../components/PageLoader';
import LocationEditor from '../../components/LocationEditor';
import FreeDeliveryBanner from '../../components/FreeDeliveryBanner';
import { getImageUrl, generateBannerPlaceholderSVG } from '../../utils/imagePlaceholder';
import {
  FaChevronLeft,
  FaPhoneAlt,
  FaWhatsapp,
  FaSearch,
  FaBoxOpen,
  FaShare,
  FaShoppingCart,
  FaStore,
  FaCalendarAlt,
  FaClock,
  FaTimes,
  FaBars,
} from 'react-icons/fa';
import { pickLocalized } from '../../utils/i18nContent';
import ProductPromoBadges from '../../components/ProductPromoBadges';
import ProductDescriptionRich from '../../components/ProductDescriptionRich';
import ProductReviewsSection, { StarsDisplay } from '../../components/ProductReviewsSection';
import { effectiveProductPrice, hasFreeDeliveryPromo, hasPricePromo } from '../../utils/productPromo';
import { getRapidoTelHref, getRapidoWhatsAppLink, getRapidoPhoneDisplay } from '../../config/rapidoWhatsApp';
import './RestaurantDetail.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const JOUR_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Image carte liste / grille : visuel accueil si défini, sinon galerie */
function productCardImageSrc(produit, baseUrl) {
  const carte = produit.imageCarteHome;
  if (carte && String(carte).trim() && !String(carte).includes('placeholder.com')) {
    return String(carte).startsWith('http') ? carte : `${baseUrl}${carte}`;
  }
  if (produit.images?.[0]) return String(produit.images[0]).startsWith('http') ? produit.images[0] : `${baseUrl}${produit.images[0]}`;
  return null;
}

/** Grande image à l’ouverture : bannière produit si définie, sinon galerie */
function productOpenImageSrc(produit, baseUrl) {
  const ban = produit.banniereProduit;
  if (ban && String(ban).trim() && !String(ban).includes('placeholder.com')) {
    return String(ban).startsWith('http') ? ban : `${baseUrl}${ban}`;
  }
  if (produit.images?.[0]) return String(produit.images[0]).startsWith('http') ? produit.images[0] : `${baseUrl}${produit.images[0]}`;
  return null;
}

function formatJoursVente(arr) {
  if (!arr || !arr.length) return null;
  return [...arr].sort((a, b) => a - b).map((d) => JOUR_LABELS[d]).join(' · ');
}

/** URLs galerie produit (bannière détail, carte accueil, puis images) — ordre type fiche produit */
function productGalleryUrls(produit, baseUrl) {
  if (!produit) return [];
  const urls = [];
  const add = (raw) => {
    if (!raw || String(raw).trim() === '' || String(raw).includes('placeholder.com')) return;
    const u = String(raw).startsWith('http') ? raw : `${baseUrl}${raw}`;
    if (!urls.includes(u)) urls.push(u);
  };
  add(produit.banniereProduit);
  add(produit.imageCarteHome);
  (produit.images || []).forEach((img) => add(img));
  return urls;
}

/** Puces « caractéristiques » : EN si renseignées, sinon FR */
function productCaracteristiquesList(language, produit) {
  if (!produit) return [];
  const en = String(language || '').toLowerCase().startsWith('en');
  const enList = (produit.caracteristiquesEn || []).map((s) => String(s).trim()).filter(Boolean);
  const frList = (produit.caracteristiques || []).map((s) => String(s).trim()).filter(Boolean);
  if (en && enList.length) return enList;
  return frList;
}

const RestaurantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, t, localized, productDisplayName } = useContext(LanguageContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const produitFocusId = searchParams.get('produit');
  const [locationAddress, setLocationAddress] = useState('');
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [navbarSearch, setNavbarSearch] = useState('');
  const [restaurant, setRestaurant] = useState(null);
  const [productCategories, setProductCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedCategorieId, setSelectedCategorieId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('cart') || '[]'));
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [showAllAfterFocus, setShowAllAfterFocus] = useState(false);
  const [pdpImageIndex, setPdpImageIndex] = useState(0);
  const [selectedAccompagnementIds, setSelectedAccompagnementIds] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const handleReviewStats = useCallback((s) => {
    setReviewStats(s);
  }, []);

  const BASE_URL = API_URL.replace('/api', '');

  const highlightedProduct = useMemo(() => {
    if (!produitFocusId || !allProducts.length) return null;
    return allProducts.find((p) => String(p._id) === String(produitFocusId)) || null;
  }, [produitFocusId, allProducts]);

  const highlightedGalleryUrls = useMemo(() => {
    if (!highlightedProduct) return [];
    return productGalleryUrls(highlightedProduct, BASE_URL);
  }, [highlightedProduct, BASE_URL]);

  useEffect(() => {
    setPdpImageIndex(0);
  }, [produitFocusId]);

  useEffect(() => {
    setReviewStats(null);
  }, [produitFocusId]);

  useEffect(() => {
    setSelectedAccompagnementIds([]);
  }, [produitFocusId]);

  useEffect(() => {
    const updateLocationAddress = () => {
      const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
      setLocationAddress(
        userLocation.adresse ||
          `${userLocation.latitude?.toFixed(4) || '--'}, ${userLocation.longitude?.toFixed(4) || '--'}`
      );
    };
    updateLocationAddress();
    window.addEventListener('locationUpdated', updateLocationAddress);
    return () => window.removeEventListener('locationUpdated', updateLocationAddress);
  }, []);

  const fetchData = useCallback(async (restaurantId) => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [restaurantRes, categoriesRes, produitsRes] = await Promise.all([
        axios.get(`${API_URL}/restaurants/${restaurantId}`),
        axios.get(`${API_URL}/categories-produit?restaurantId=${restaurantId}`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/produits?restaurantId=${restaurantId}`).catch(() => ({ data: [] }))
      ]);
      setRestaurant(restaurantRes.data);
      setProductCategories(categoriesRes.data || []);
      setAllProducts(produitsRes.data || []);
      setProducts(produitsRes.data || []);
    } catch (err) {
      console.error('Erreur chargement structure:', err);
      if (err.response?.status === 404) setRestaurant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedCategorieId(null);
    setProductSearch('');
    setShowAllAfterFocus(false);
    fetchData(id);
  }, [id, fetchData]);

  useEffect(() => {
    let list = allProducts;
    if (selectedCategorieId) {
      list = list.filter(
        (p) => p.categorieProduit && String(p.categorieProduit._id) === String(selectedCategorieId)
      );
    }
    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      list = list.filter((p) => {
        const hay = [
          p.nom,
          p.nomEn,
          p.nomAfficheAccueil,
          p.nomAfficheAccueilEn,
          p.description,
          p.descriptionEn,
          ...(p.caracteristiques || []),
          ...(p.caracteristiquesEn || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    setProducts(list);
  }, [selectedCategorieId, allProducts, productSearch]);

  /** Ouvre la bonne catégorie quand on arrive depuis l’accueil (?produit=) */
  useEffect(() => {
    if (!produitFocusId || loading || !allProducts.length) return;
    const p = allProducts.find((x) => String(x._id) === String(produitFocusId));
    if (!p) {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.delete('produit');
          return n;
        },
        { replace: true }
      );
      return;
    }
    if (p.categorieProduit?._id) {
      setSelectedCategorieId(p.categorieProduit._id);
    } else {
      setSelectedCategorieId(null);
    }
  }, [produitFocusId, loading, allProducts, setSearchParams]);

  const addToCart = (produit, accompagnementIds = []) => {
    const imageUrl = produit.imageCarteHome || (produit.images && produit.images[0]) || null;
    const options = Array.isArray(produit.accompagnements) ? produit.accompagnements : [];
    const selectedOptions = options
      .filter((o) => o?.actif !== false && accompagnementIds.includes(String(o._id)))
      .map((o) => ({
        optionId: String(o._id),
        nom: o.nom,
        nomEn: o.nomEn || '',
        prixSupp: Math.max(0, Number(o.prixSupp || 0)),
      }));
    const signature = selectedOptions.map((o) => o.optionId).sort().join('|');
    const cartLineId = `${produit._id}::${signature || 'none'}`;
    const existing = cart.find(
      (item) =>
        String(item.productId) === String(produit._id) &&
        String(item.restaurantId) === String(id) &&
        String(item.cartLineId || `${item.productId}::none`) === cartLineId
    );
    let newCart;
    if (existing) {
      newCart = cart.map(item =>
        String(item.productId) === String(produit._id) &&
        String(item.restaurantId) === String(id) &&
        String(item.cartLineId || `${item.productId}::none`) === cartLineId
          ? { ...item, quantite: item.quantite + 1 }
          : item
      );
    } else {
      const eff = effectiveProductPrice(produit);
      const supplement = selectedOptions.reduce((sum, o) => sum + Number(o.prixSupp || 0), 0);
      const showOld = hasPricePromo(produit);
      newCart = [...cart, {
        cartLineId,
        productId: produit._id,
        nom: produit.nom,
        nomEn: produit.nomEn,
        nomAfficheAccueil: produit.nomAfficheAccueil,
        nomAfficheAccueilEn: produit.nomAfficheAccueilEn,
        prix: eff + supplement,
        prixBase: eff,
        prixCatalogue: showOld ? Number(produit.prix) : undefined,
        accompagnementsSelected: selectedOptions,
        promoLivraisonGratuite: !!produit.promoLivraisonGratuite,
        image: imageUrl,
        quantite: 1,
        restaurantId: id
      }];
    }
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  /** Ajoute au panier puis ouvre la page panier (bouton Acheter). */
  const buyProduct = (produit, accompagnementIds = []) => {
    addToCart(produit, accompagnementIds);
    navigate('/cart');
  };

  /** Navigation "chaîne" : ouvrir la fiche produit dans le même `/restaurant/:id` */
  const goToProduct = (productId) => {
    if (!productId) return;
    const nextUrl = `/restaurant/${id}?produit=${productId}`;
    const isSameProduct = String(produitFocusId || '') === String(productId);
    navigate(nextUrl);

    // Conserve l'effet de redirection vers la fiche produit sélectionnée.
    window.requestAnimationFrame(() => {
      const target = document.getElementById('section-product-focus');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (isSameProduct) setShowAllAfterFocus(false);
  };

  const getCartCount = () => cart.reduce((sum, item) => sum + item.quantite, 0);
  const getCartTotal = () => cart.reduce((sum, item) => sum + item.prix * item.quantite, 0);

  if (loading) {
    return <PageLoader message={t('store', 'loading')} />;
  }

  if (!restaurant) {
    return (
      <div className="restaurant-detail-page">
        <TopNavbar
          locationAddress={locationAddress}
          onLocationClick={() => setShowLocationEditor(true)}
          searchTerm={navbarSearch}
          onSearchChange={(e) => setNavbarSearch(e.target.value)}
          onSearchSubmit={(q) => navigate(`/home?q=${encodeURIComponent(q || '')}`)}
          sectionLinks={[]}
        />
        <FreeDeliveryBanner message={t('home', 'freeDeliveryCotonou')} dismissLabel={t('home', 'hideBannerToday')} />
        <div className="error-state">
          <h2>{t('store', 'notFound')}</h2>
          <p>{t('store', 'notFoundDesc')}</p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>{t('store', 'backHome')}</button>
        </div>
        {showLocationEditor && (
          <LocationEditor
            onClose={() => setShowLocationEditor(false)}
            onSave={(locationData) => {
              setLocationAddress(
                locationData.adresse ||
                  `${locationData.latitude?.toFixed(4)}, ${locationData.longitude?.toFixed(4)}`
              );
              setShowLocationEditor(false);
            }}
          />
        )}
      </div>
    );
  }

  const bannerUrl =
    restaurant.banniere && !restaurant.banniere.includes('placeholder.com')
      ? (String(restaurant.banniere).startsWith('http') ? restaurant.banniere : `${BASE_URL}${restaurant.banniere}`)
      : generateBannerPlaceholderSVG(0);

  const rapidoTelHref = getRapidoTelHref();
  const rapidoWaHref = getRapidoWhatsAppLink();
  const rapidoPhoneLabel = getRapidoPhoneDisplay();

  const cartForRestaurant = cart.filter((item) => String(item.restaurantId) === String(id));
  const cartCountRestaurant = cartForRestaurant.reduce((sum, item) => sum + item.quantite, 0);
  const cartTotalRestaurant = cartForRestaurant.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  const hasFocusedProduct = Boolean(highlightedProduct);
  const highlightedDescriptionFull = String(
    hasFocusedProduct ? localized(highlightedProduct, 'description') || '' : ''
  );
  const highlightedCaracteristiques = hasFocusedProduct
    ? productCaracteristiquesList(language, highlightedProduct)
    : [];
  const highlightedAccompagnements = hasFocusedProduct
    ? (highlightedProduct.accompagnements || []).filter((a) => a?.actif !== false && a?.nom)
    : [];
  const otherProducts = hasFocusedProduct
    ? products.filter((p) => String(p._id) !== String(highlightedProduct._id))
    : products;
  const visibleProducts = hasFocusedProduct && !showAllAfterFocus
    ? otherProducts.slice(0, 6)
    : otherProducts;

  return (
    <div className="restaurant-detail-page">
      <TopNavbar
        locationAddress={locationAddress}
        onLocationClick={() => setShowLocationEditor(true)}
        searchTerm={navbarSearch}
        onSearchChange={(e) => setNavbarSearch(e.target.value)}
        onSearchSubmit={(q) => navigate(`/home?q=${encodeURIComponent(q || '')}`)}
        sectionLinks={[{ id: 'section-store-products', labelKey: 'sectionProducts' }]}
        onScrollToSection={(sectionId) => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
      <FreeDeliveryBanner message={t('home', 'freeDeliveryCotonou')} dismissLabel={t('home', 'hideBannerToday')} />

      {/* Recherche produits : sous la navbar, avant la bannière structure */}
      <div className="restaurant-product-search-wrap">
        <div className="restaurant-product-search-bar">
          <span className="store-search-icon" aria-hidden>
            <FaSearch size={18} />
          </span>
          <input
            type="search"
            placeholder={t('store', 'productSearchPlaceholder')}
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="store-search-input"
            aria-label={t('store', 'productSearchAria')}
          />
        </div>
      </div>

      {/* Mobile : hero comme avant (bannière + une carte avec logo, nom, desc, téléphone, bouton) */}
      <div className="store-hero-mobile">
        <div className="store-banner-mobile">
          <img src={bannerUrl} alt={localized(restaurant, 'nom')} onError={(e) => { e.target.src = generateBannerPlaceholderSVG(0); }} />
        </div>
        <button type="button" className="store-back-mobile" onClick={() => navigate('/home')} aria-label={t('store', 'back')}>
          <FaChevronLeft size={22} />
        </button>
        <div className="store-info-card-mobile">
          <div className="store-info-logo-mobile">
            {restaurant.logo ? (
              <img
                src={String(restaurant.logo).startsWith('http') ? restaurant.logo : `${BASE_URL}${restaurant.logo}`}
                alt={localized(restaurant, 'nom')}
                onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div className="store-info-logo-ph-mobile" style={{ display: restaurant.logo ? 'none' : 'flex' }}><FaStore size={28} aria-hidden /></div>
          </div>
          <h1 className="store-info-name-mobile">{localized(restaurant, 'nom')}</h1>
          {localized(restaurant, 'description') ? <p className="store-info-desc-mobile">{localized(restaurant, 'description')}</p> : null}
          {rapidoTelHref !== '#' && rapidoPhoneLabel ? (
            <p className="store-info-phone-mobile">
              <a href={rapidoTelHref} className="store-info-phone-mobile-link">
                <FaPhoneAlt className="store-info-phone-icon" size={16} aria-hidden />
                {rapidoPhoneLabel}
              </a>
            </p>
          ) : null}
        </div>
      </div>

      {/* Desktop + Mobile : bannière avec overlay, logo dans le coin, Nom et Description | Contact */}
      <div className="store-hero-desktop">
        <img src={bannerUrl} alt={localized(restaurant, 'nom')} className="store-hero-banner" onError={(e) => { e.target.src = generateBannerPlaceholderSVG(0); }} />
        <div className="store-hero-overlay" aria-hidden />
        <button type="button" className="store-hero-back" onClick={() => navigate('/home')} aria-label={t('store', 'back')}>
          <FaChevronLeft size={22} />
        </button>
        <div className="store-hero-logo-corner">
          {restaurant.logo ? (
            <img
              src={String(restaurant.logo).startsWith('http') ? restaurant.logo : `${BASE_URL}${restaurant.logo}`}
              alt={localized(restaurant, 'nom')}
              onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div className="store-hero-logo-corner-placeholder" style={{ display: restaurant.logo ? 'none' : 'flex' }}><FaStore size={26} aria-hidden /></div>
        </div>
        <div className="store-hero-bottom">
          <div className="store-hero-info">
            <h1 className="store-hero-info-name">{localized(restaurant, 'nom')}</h1>
            {localized(restaurant, 'description') ? <p className="store-hero-info-desc">{localized(restaurant, 'description')}</p> : null}
          </div>
          <div className="store-hero-contact">
            <span className="store-hero-contact-title">{t('store', 'contact')}</span>
            {rapidoTelHref !== '#' && (
              <div className="store-hero-contact-links">
                <a href={rapidoTelHref} className="store-hero-contact-link" title={t('store', 'callTitle')} onClick={(e) => e.stopPropagation()}>
                  <FaPhoneAlt size={18} aria-hidden />
                  <span>{rapidoPhoneLabel}</span>
                </a>
                <a href={rapidoWaHref} target="_blank" rel="noopener noreferrer" className="store-hero-contact-link store-hero-contact-wa" title={t('store', 'whatsappTitle')} onClick={(e) => e.stopPropagation()}>
                  <FaWhatsapp size={20} aria-hidden />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="restaurant-content-container">
        {hasFocusedProduct && (
          <section id="section-product-focus" className="pdp-nike" aria-label={t('store', 'productPageAria')}>
            <div className="pdp-nike-inner">
              <div className="pdp-nike-gallery">
                <button
                  type="button"
                  className="pdp-nike-main"
                  onClick={() => {
                    const src =
                      highlightedGalleryUrls[pdpImageIndex] ||
                      productOpenImageSrc(highlightedProduct, BASE_URL) ||
                      productCardImageSrc(highlightedProduct, BASE_URL);
                    if (src) {
                      setSelectedImage(src);
                      setShowImageModal(true);
                    }
                  }}
                  aria-label={t('store', 'zoomAlt')}
                >
                  <ProductPromoBadges product={highlightedProduct} />
                  <img
                    src={
                      highlightedGalleryUrls[pdpImageIndex] ||
                      productOpenImageSrc(highlightedProduct, BASE_URL) ||
                      productCardImageSrc(highlightedProduct, BASE_URL) ||
                      getImageUrl(null, { nom: productDisplayName(highlightedProduct) }, BASE_URL)
                    }
                    alt={productDisplayName(highlightedProduct)}
                    className="pdp-nike-main-img"
                    onError={(e) => {
                      e.target.src = getImageUrl(null, { nom: productDisplayName(highlightedProduct) }, BASE_URL);
                    }}
                  />
                </button>
                {highlightedGalleryUrls.length > 1 && (
                  <div className="pdp-nike-thumbs" role="tablist" aria-label={t('store', 'productGalleryThumbsAria')}>
                    {highlightedGalleryUrls.map((url, i) => (
                      <button
                        key={`${url}-${i}`}
                        type="button"
                        role="tab"
                        aria-selected={i === pdpImageIndex}
                        className={`pdp-nike-thumb ${i === pdpImageIndex ? 'pdp-nike-thumb--active' : ''}`}
                        onClick={() => setPdpImageIndex(i)}
                      >
                        <img src={url} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="pdp-nike-buybox">
                <p className="pdp-nike-eyebrow">
                  {highlightedProduct.categorieProduit
                    ? pickLocalized(language, highlightedProduct.categorieProduit, 'nom')
                    : t('store', 'productDefaultEyebrow')}
                </p>
                <h1 className="pdp-nike-title">{productDisplayName(highlightedProduct)}</h1>
                {highlightedProduct.recommande ? (
                  <p className="pdp-nike-recommended-badge">{t('reviews', 'recommendedBadge')}</p>
                ) : null}
                {hasPricePromo(highlightedProduct) ? (
                  <p className="pdp-nike-price pdp-nike-price--promo">
                    <span className="pdp-nike-price-current">{effectiveProductPrice(highlightedProduct)} FCFA</span>
                    <span className="pdp-nike-price-old">{Number(highlightedProduct.prix).toFixed(0)} FCFA</span>
                  </p>
                ) : (
                  <p className="pdp-nike-price">{Number(highlightedProduct.prix).toFixed(0)} FCFA</p>
                )}
                {hasFreeDeliveryPromo(highlightedProduct) ? (
                  <p className="pdp-nike-promo-shipping">{t('home', 'promoFreeDelivery')}</p>
                ) : null}
                <div className="pdp-nike-rating-row" aria-label={t('reviews', 'sectionTitle')}>
                  {reviewStats !== null &&
                    (reviewStats.nombre > 0 ? (
                      <>
                        <StarsDisplay note={Math.round(reviewStats.moyenne)} size={20} />
                        <span className="pdp-nike-rating-meta">
                          {reviewStats.moyenne} · {reviewStats.nombre} {t('reviews', 'reviewCount')}
                        </span>
                      </>
                    ) : (
                      <span className="pdp-nike-rating-meta pdp-nike-rating-meta--muted">{t('reviews', 'noReviewsYet')}</span>
                    ))}
                </div>
                <button
                  type="button"
                  className="pdp-nike-cta"
                  onClick={() => buyProduct(highlightedProduct, selectedAccompagnementIds)}
                >
                  {t('store', 'buy')}
                </button>
                {highlightedAccompagnements.length > 0 ? (
                  <div className="pdp-nike-accompagnements">
                    <h3 className="pdp-nike-accompagnements-title">Accompagnements</h3>
                    <div className="pdp-nike-accompagnements-list">
                      {highlightedAccompagnements.map((acc) => {
                        const checked = selectedAccompagnementIds.includes(String(acc._id));
                        return (
                          <label key={String(acc._id)} className="pdp-nike-acc-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const v = String(acc._id);
                                setSelectedAccompagnementIds((prev) =>
                                  e.target.checked ? [...prev, v] : prev.filter((x) => x !== v)
                                );
                              }}
                            />
                            <span className="pdp-nike-acc-name">
                              {language.startsWith('en') && acc.nomEn ? acc.nomEn : acc.nom}
                            </span>
                            <span className="pdp-nike-acc-price">+{Number(acc.prixSupp || 0).toFixed(0)} FCFA</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {highlightedDescriptionFull.trim() ? (
                  <details className="pdp-nike-details pdp-nike-description-details">
                    <summary className="pdp-nike-details-summary">{t('store', 'productDescriptionHeading')}</summary>
                    <div className="pdp-nike-details-body">
                      <ProductDescriptionRich text={highlightedDescriptionFull} className="pdp-nike-description-body" />
                    </div>
                  </details>
                ) : null}
                <p className="pdp-nike-zoom-hint">{t('store', 'zoomHint')}</p>
                <details className="pdp-nike-details">
                  <summary className="pdp-nike-details-summary">{t('store', 'productDetailsTitle')}</summary>
                  <div className="pdp-nike-details-body">
                    <ul className="pdp-nike-meta-list">
                      <li>
                        <span className="pdp-nike-meta-label">{t('store', 'productCategoryLabel')}</span>
                        {highlightedProduct.categorieProduit
                          ? pickLocalized(language, highlightedProduct.categorieProduit, 'nom')
                          : '—'}
                      </li>
                      <li>
                        <span className="pdp-nike-meta-label">{t('store', 'productReferenceLabel')}</span>
                        {String(highlightedProduct._id).slice(-8).toUpperCase()}
                      </li>
                    </ul>
                    {highlightedCaracteristiques.length > 0 && (
                      <>
                        <h3 className="pdp-nike-features-title">{t('store', 'productCharacteristicsHeading')}</h3>
                        <ul className="pdp-nike-characteristics-list">
                          {highlightedCaracteristiques.map((line, cIdx) => (
                            <li key={cIdx}>{line}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </details>
                <ProductReviewsSection produitId={highlightedProduct._id} onStatsChange={handleReviewStats} />
                <button
                  type="button"
                  className="pdp-nike-more-link"
                  onClick={() =>
                    document.getElementById('section-store-products')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                  }
                >
                  {t('store', 'viewOtherProducts')}
                </button>
              </div>
            </div>
          </section>
        )}

        {(formatJoursVente(restaurant.joursVente) || restaurant.commanderVeille) && (
          <div className="restaurant-vente-info" role="region" aria-label="Informations commandes">
            {formatJoursVente(restaurant.joursVente) && (
              <p className="restaurant-vente-line">
                <FaCalendarAlt className="restaurant-vente-icon" aria-hidden />
                <span><strong>{t('store', 'orderDaysLabel')}</strong> {formatJoursVente(restaurant.joursVente)}</span>
              </p>
            )}
            {restaurant.commanderVeille && (
              <p className="restaurant-vente-line restaurant-vente-alert">
                <FaClock className="restaurant-vente-icon" aria-hidden />
                <span>{t('store', 'orderDayBefore')}</span>
              </p>
            )}
          </div>
        )}

        <div id="section-store-products" className="restaurant-store-catalog">
        {/* Mobile : filtres catégories + liste produits */}
        <div className="store-mobile-section">
          {productCategories.length > 0 && (
            <div className="categories-filter">
              <button className={`category-btn ${selectedCategorieId === null ? 'active' : ''}`} onClick={() => setSelectedCategorieId(null)}>{t('store', 'filterAll')}</button>
              {productCategories.map((cat) => (
                <button
                  key={cat._id}
                  className={`category-btn category-btn-with-img ${selectedCategorieId === cat._id ? 'active' : ''}`}
                  onClick={() => setSelectedCategorieId(selectedCategorieId === cat._id ? null : cat._id)}
                >
                  {cat.image ? (
                    <img
                      src={String(cat.image).startsWith('http') ? cat.image : `${BASE_URL}${cat.image}`}
                      alt={pickLocalized(language, cat, 'nom')}
                      className="category-btn-img"
                    />
                  ) : (
                    <span className="category-btn-emoji" aria-hidden><FaBoxOpen size={18} /></span>
                  )}
                  <span>{pickLocalized(language, cat, 'nom')}</span>
                </button>
              ))}
            </div>
          )}
          {visibleProducts.length === 0 ? (
            <div className="no-plats-curved">
              <p>{t('store', 'noProducts')}</p>
              <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
                {allProducts.length === 0 ? t('store', 'noProductsStructure') : t('store', 'noProductsCategory')}
              </p>
            </div>
          ) : (
            <div className="plats-list-curved">
              {visibleProducts.map((produit) => {
                const displayName = productDisplayName(produit);
                const imgSrc = productCardImageSrc(produit, BASE_URL) || getImageUrl(null, { nom: displayName }, BASE_URL);
                const zoomSrc = productOpenImageSrc(produit, BASE_URL) || imgSrc;
                return (
                  <div
                    key={produit._id}
                    id={`product-card-${produit._id}`}
                    className="plat-item-curved"
                    role="button"
                    tabIndex={0}
                    onClick={() => goToProduct(produit._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goToProduct(produit._id);
                      }
                    }}
                  >
                    <div
                      className="plat-image-square"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToProduct(produit._id);
                      }}
                    >
                      <ProductPromoBadges product={produit} />
                      <img src={imgSrc} alt={displayName} className="plat-image-small" onError={(e) => { e.target.src = getImageUrl(null, { nom: displayName }, BASE_URL); }} />
                    </div>
                    <div className="plat-details-curved">
                      <h3 className="plat-name-curved">{displayName}</h3>
                      {hasPricePromo(produit) ? (
                        <span className="plat-prix-curved plat-prix-curved--promo">
                          <span className="plat-prix-current">{effectiveProductPrice(produit)} FCFA</span>
                          <span className="plat-prix-old">{Number(produit.prix).toFixed(0)} FCFA</span>
                        </span>
                      ) : (
                        <span className="plat-prix-curved">{Number(produit.prix).toFixed(0)} FCFA</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-add-cart-inline"
                      onClick={(e) => {
                        e.stopPropagation();
                        buyProduct(produit);
                      }}
                    >
                      {t('store', 'buy')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {hasFocusedProduct && otherProducts.length > 6 && !showAllAfterFocus && (
            <div className="see-more-wrap">
              <button type="button" className="see-more-btn" onClick={() => setShowAllAfterFocus(true)}>
                {String(language || '').toLowerCase().startsWith('en') ? 'See more products' : 'Voir plus de produits'}
              </button>
            </div>
          )}
        </div>

        {/* Desktop : 3 colonnes Menu | Produits | Chariot */}
        <div className="store-layout-desktop">
          <aside className="store-menu-column">
            <h2 className="store-menu-title">
              <FaBars className="store-menu-icon" size={18} aria-hidden /> {t('store', 'menu')}
            </h2>
            <nav className="store-menu-nav">
              <button type="button" className={`store-menu-item ${selectedCategorieId === null ? 'active' : ''}`} onClick={() => setSelectedCategorieId(null)}>{t('store', 'filterAllProducts')}</button>
              {productCategories.map((cat) => {
                const productsInCat = allProducts.filter(p => p.categorieProduit && p.categorieProduit._id === cat._id);
                return (
                  <div key={cat._id} className="store-menu-category-block">
                    <button
                      type="button"
                      className={`store-menu-item ${selectedCategorieId === cat._id ? 'active' : ''}`}
                      onClick={() => setSelectedCategorieId(selectedCategorieId === cat._id ? null : cat._id)}
                    >
                      {pickLocalized(language, cat, 'nom')}
                    </button>
                    {productsInCat.length > 0 && (
                      <ul className="store-menu-product-list">
                        {productsInCat.map((produit) => (
                          <li key={produit._id}>
                            <button
                              type="button"
                              className={`store-menu-product-item ${selectedCategorieId === cat._id ? 'active' : ''}`}
                              onClick={() => setSelectedCategorieId(cat._id)}
                            >
                              {productDisplayName(produit)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>
          <main className="store-products-column">
            {visibleProducts.length === 0 ? (
              <div className="no-plats-curved no-plats-desktop">{t('store', 'noProductsCategoryDesktop')}</div>
            ) : (
              <div className="products-grid-desktop">
                {visibleProducts.map((produit) => {
                  const displayName = productDisplayName(produit);
                  const imgSrc = productCardImageSrc(produit, BASE_URL) || getImageUrl(null, { nom: displayName }, BASE_URL);
                  const zoomSrc = productOpenImageSrc(produit, BASE_URL) || imgSrc;
                  return (
                    <div
                      key={produit._id}
                      id={`product-card-${produit._id}`}
                      className="product-card-desktop"
                      role="button"
                      tabIndex={0}
                      onClick={() => goToProduct(produit._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          goToProduct(produit._id);
                        }
                      }}
                    >
                      <div
                        className="product-card-image-wrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToProduct(produit._id);
                        }}
                      >
                        <ProductPromoBadges product={produit} />
                        <img src={imgSrc} alt={displayName} onError={(e) => { e.target.src = getImageUrl(null, { nom: displayName }, BASE_URL); }} />
                        <span className="product-card-share" onClick={(e) => { e.stopPropagation(); }} title={t('store', 'share')} aria-hidden>
                          <FaShare size={15} />
                        </span>
                      </div>
                      <div className="product-card-body">
                        <h3 className="product-card-name">{displayName}</h3>
                        {hasPricePromo(produit) ? (
                          <span className="product-card-price product-card-price--promo">
                            <span className="product-card-price-current">{effectiveProductPrice(produit)} FCFA</span>
                            <span className="product-card-price-was">{Number(produit.prix).toFixed(0)} FCFA</span>
                          </span>
                        ) : (
                          <span className="product-card-price">{Number(produit.prix).toFixed(0)} FCFA</span>
                        )}
                        <div className="product-card-footer">
                          <button
                            type="button"
                            className="product-card-add-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              buyProduct(produit);
                            }}
                          >
                            {t('store', 'buy')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {hasFocusedProduct && otherProducts.length > 6 && !showAllAfterFocus && (
              <div className="see-more-wrap">
                <button type="button" className="see-more-btn" onClick={() => setShowAllAfterFocus(true)}>
                  {String(language || '').toLowerCase().startsWith('en') ? 'See more products' : 'Voir plus de produits'}
                </button>
              </div>
            )}
          </main>
          <aside className="store-cart-column">
            <h2 className="store-cart-title">
              <FaShoppingCart className="store-cart-icon" size={20} aria-hidden /> {t('store', 'cartTitle')}
            </h2>
            <div className="store-cart-content">
              {cartCountRestaurant === 0 ? (
                <div className="store-cart-empty">
                  <FaShoppingCart className="store-cart-empty-icon" size={40} aria-hidden />
                  <p>{t('store', 'cartEmpty')}</p>
                </div>
              ) : (
                <>
                  <ul className="store-cart-list">
                    {cartForRestaurant.map((item) => (
                      <li key={item.productId} className="store-cart-item">
                        <span className="store-cart-item-name">{productDisplayName(item)}</span>
                        <span className="store-cart-item-qty">×{item.quantite}</span>
                        <span className="store-cart-item-price">{Number(item.prix * item.quantite).toFixed(0)} FCFA</span>
                      </li>
                    ))}
                  </ul>
                  <div className="store-cart-total">
                    <span>{t('store', 'total')}</span>
                    <strong>{cartTotalRestaurant.toFixed(0)} FCFA</strong>
                  </div>
                  <button type="button" className="store-cart-btn" onClick={() => navigate('/cart')}>{t('store', 'viewCart')}</button>
                </>
              )}
            </div>
          </aside>
        </div>
        </div>
      </div>

      {getCartCount() > 0 && (
        <div className="floating-cart" onClick={() => navigate('/cart')}>
          <div className="cart-icon" aria-hidden><FaShoppingCart size={26} /></div>
          <div className="cart-info">
            <span className="cart-count">{getCartCount()} {t('store', 'articles')}</span>
            <span className="cart-total">{getCartTotal().toFixed(0)} FCFA</span>
          </div>
          <button type="button" className="btn btn-secondary">{t('store', 'viewCart')}</button>
        </div>
      )}

      {showImageModal && selectedImage && (
        <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="image-modal-close" onClick={() => setShowImageModal(false)} aria-label={t('store', 'close')}><FaTimes size={22} /></button>
            <img src={selectedImage} alt={t('store', 'zoomAlt')} className="image-modal-img" />
          </div>
        </div>
      )}

      <BottomNavbar />

      {showLocationEditor && (
        <LocationEditor
          onClose={() => setShowLocationEditor(false)}
          onSave={(locationData) => {
            setLocationAddress(
              locationData.adresse ||
                `${locationData.latitude?.toFixed(4)}, ${locationData.longitude?.toFixed(4)}`
            );
            setShowLocationEditor(false);
          }}
        />
      )}
    </div>
  );
};

export default RestaurantDetail;
