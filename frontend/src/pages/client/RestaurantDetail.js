import React, { useState, useEffect, useCallback, useContext } from 'react';
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
  FaPlus,
  FaShoppingCart,
  FaStore,
  FaCalendarAlt,
  FaClock,
  FaTimes,
  FaBars,
} from 'react-icons/fa';
import { pickLocalized } from '../../utils/i18nContent';
import './RestaurantDetail.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const JOUR_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Image carte liste / grille : visuel accueil si défini, sinon galerie */
function productCardImageSrc(produit, baseUrl) {
  const carte = produit.imageCarteHome;
  if (carte && String(carte).trim() && !String(carte).includes('placeholder.com')) {
    return `${baseUrl}${carte}`;
  }
  if (produit.images?.[0]) return `${baseUrl}${produit.images[0]}`;
  return null;
}

/** Grande image à l’ouverture : bannière produit si définie, sinon galerie */
function productOpenImageSrc(produit, baseUrl) {
  const ban = produit.banniereProduit;
  if (ban && String(ban).trim() && !String(ban).includes('placeholder.com')) {
    return `${baseUrl}${ban}`;
  }
  if (produit.images?.[0]) return `${baseUrl}${produit.images[0]}`;
  return null;
}

function formatJoursVente(arr) {
  if (!arr || !arr.length) return null;
  return [...arr].sort((a, b) => a - b).map((d) => JOUR_LABELS[d]).join(' · ');
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

  const BASE_URL = API_URL.replace('/api', '');

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

  /** Scroll + surbrillance sur la carte produit */
  useEffect(() => {
    if (!produitFocusId || loading) return;
    const inList = products.some((x) => String(x._id) === String(produitFocusId));
    if (!inList) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`product-card-${produitFocusId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('product-card-highlight');
        window.setTimeout(() => el.classList.remove('product-card-highlight'), 2400);
      }
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.delete('produit');
          return n;
        },
        { replace: true }
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [produitFocusId, loading, products, setSearchParams]);

  const addToCart = (produit) => {
    const imageUrl = produit.imageCarteHome || (produit.images && produit.images[0]) || null;
    const existing = cart.find(
      (item) => String(item.productId) === String(produit._id) && String(item.restaurantId) === String(id)
    );
    let newCart;
    if (existing) {
      newCart = cart.map(item =>
        String(item.productId) === String(produit._id) && String(item.restaurantId) === String(id)
          ? { ...item, quantite: item.quantite + 1 }
          : item
      );
    } else {
      newCart = [...cart, {
        productId: produit._id,
        nom: produit.nom,
        nomEn: produit.nomEn,
        nomAfficheAccueil: produit.nomAfficheAccueil,
        nomAfficheAccueilEn: produit.nomAfficheAccueilEn,
        prix: produit.prix,
        image: imageUrl,
        quantite: 1,
        restaurantId: id
      }];
    }
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
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

  const bannerUrl = restaurant.banniere && !restaurant.banniere.includes('placeholder.com')
    ? `${BASE_URL}${restaurant.banniere}`
    : generateBannerPlaceholderSVG(0);

  const tel = (restaurant.telephone || '').trim();
  const waNumber = tel.replace(/\D/g, '');

  const cartForRestaurant = cart.filter((item) => String(item.restaurantId) === String(id));
  const cartCountRestaurant = cartForRestaurant.reduce((sum, item) => sum + item.quantite, 0);
  const cartTotalRestaurant = cartForRestaurant.reduce((sum, item) => sum + item.prix * item.quantite, 0);

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
            {restaurant.logo ? <img src={`${BASE_URL}${restaurant.logo}`} alt={localized(restaurant, 'nom')} onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} /> : null}
            <div className="store-info-logo-ph-mobile" style={{ display: restaurant.logo ? 'none' : 'flex' }}><FaStore size={28} aria-hidden /></div>
          </div>
          <h1 className="store-info-name-mobile">{localized(restaurant, 'nom')}</h1>
          {localized(restaurant, 'description') ? <p className="store-info-desc-mobile">{localized(restaurant, 'description')}</p> : null}
          {restaurant.telephone && (
            <p className="store-info-phone-mobile">
              <FaPhoneAlt className="store-info-phone-icon" size={16} aria-hidden />
              {restaurant.telephone}
            </p>
          )}
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
            <img src={`${BASE_URL}${restaurant.logo}`} alt={localized(restaurant, 'nom')} onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
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
            {tel && (
              <div className="store-hero-contact-links">
                <a href={`tel:${tel}`} className="store-hero-contact-link" title={t('store', 'callTitle')} onClick={(e) => e.stopPropagation()}>
                  <FaPhoneAlt size={18} aria-hidden />
                  <span>{restaurant.telephone}</span>
                </a>
                <a href={waNumber ? `https://wa.me/${waNumber}` : '#'} target="_blank" rel="noopener noreferrer" className="store-hero-contact-link store-hero-contact-wa" title={t('store', 'whatsappTitle')} onClick={(e) => e.stopPropagation()}>
                  <FaWhatsapp size={20} aria-hidden />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="restaurant-content-container">
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
                  {cat.image ? <img src={`${BASE_URL}${cat.image}`} alt={pickLocalized(language, cat, 'nom')} className="category-btn-img" /> : <span className="category-btn-emoji" aria-hidden><FaBoxOpen size={18} /></span>}
                  <span>{pickLocalized(language, cat, 'nom')}</span>
                </button>
              ))}
            </div>
          )}
          {products.length === 0 ? (
            <div className="no-plats-curved">
              <p>{t('store', 'noProducts')}</p>
              <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
                {allProducts.length === 0 ? t('store', 'noProductsStructure') : t('store', 'noProductsCategory')}
              </p>
            </div>
          ) : (
            <div className="plats-list-curved">
              {products.map((produit) => {
                const displayName = productDisplayName(produit);
                const imgSrc = productCardImageSrc(produit, BASE_URL) || getImageUrl(null, { nom: displayName }, BASE_URL);
                const zoomSrc = productOpenImageSrc(produit, BASE_URL) || imgSrc;
                return (
                  <div key={produit._id} id={`product-card-${produit._id}`} className="plat-item-curved">
                    <div className="plat-image-square" onClick={() => { setSelectedImage(zoomSrc); setShowImageModal(true); }}>
                      <img src={imgSrc} alt={displayName} className="plat-image-small" onError={(e) => { e.target.src = getImageUrl(null, { nom: displayName }, BASE_URL); }} />
                    </div>
                    <div className="plat-details-curved">
                      <h3 className="plat-name-curved">{displayName}</h3>
                      {localized(produit, 'description') ? <p className="plat-description-curved">{localized(produit, 'description')}</p> : null}
                      <span className="plat-prix-curved">{Number(produit.prix).toFixed(0)} FCFA</span>
                    </div>
                    <button type="button" className="btn-add-cart-inline" onClick={() => addToCart(produit)} title={t('store', 'addToCart')}>
                      <FaPlus size={22} aria-hidden />
                    </button>
                  </div>
                );
              })}
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
            {products.length === 0 ? (
              <div className="no-plats-curved no-plats-desktop">{t('store', 'noProductsCategoryDesktop')}</div>
            ) : (
              <div className="products-grid-desktop">
                {products.map((produit) => {
                  const displayName = productDisplayName(produit);
                  const imgSrc = productCardImageSrc(produit, BASE_URL) || getImageUrl(null, { nom: displayName }, BASE_URL);
                  const zoomSrc = productOpenImageSrc(produit, BASE_URL) || imgSrc;
                  return (
                    <div key={produit._id} id={`product-card-${produit._id}`} className="product-card-desktop">
                      <div className="product-card-image-wrap" onClick={() => { setSelectedImage(zoomSrc); setShowImageModal(true); }}>
                        <img src={imgSrc} alt={displayName} onError={(e) => { e.target.src = getImageUrl(null, { nom: displayName }, BASE_URL); }} />
                        <span className="product-card-share" onClick={(e) => { e.stopPropagation(); }} title={t('store', 'share')} aria-hidden>
                          <FaShare size={15} />
                        </span>
                      </div>
                      <div className="product-card-body">
                        <h3 className="product-card-name">{displayName}</h3>
                        <span className="product-card-price">{Number(produit.prix).toFixed(0)} FCFA</span>
                        {localized(produit, 'description') ? <p className="product-card-desc">{localized(produit, 'description')}</p> : null}
                        <div className="product-card-footer">
                          <button type="button" className="product-card-add-btn" onClick={() => addToCart(produit)} title={t('store', 'addToCart')}>
                            <FaPlus size={22} aria-hidden />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
