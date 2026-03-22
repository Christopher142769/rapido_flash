import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import BottomNavbar from '../../components/BottomNavbar';
import TopNavbar from '../../components/TopNavbar';
import InstallButton from '../../components/InstallButton';
import LangSwitcher from '../../components/LangSwitcher';
import LocationEditor from '../../components/LocationEditor';
import PageLoader from '../../components/PageLoader';
import FreeDeliveryBanner from '../../components/FreeDeliveryBanner';
import CategoryDomainIcon from '../../components/CategoryDomainIcon';
import { FaPhoneAlt, FaWhatsapp, FaPlus } from 'react-icons/fa';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { generateBannerPlaceholderSVG } from '../../utils/imagePlaceholder';
import { structureProductNamesText, pickLocalized } from '../../utils/i18nContent';
import './Home.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

function distanceToMinutes(distanceKm) {
  if (distanceKm == null || typeof distanceKm !== 'number') return null;
  return Math.max(1, Math.round(distanceKm * 3));
}

function phoneToWa(phone) {
  return (phone || '').trim().replace(/\D/g, '');
}

function productThumbUrl(produit, baseUrl, index) {
  if (produit?.image) return `${baseUrl}${produit.image}`;
  return generateBannerPlaceholderSVG(index);
}

/** Image mise en avant : visuel dédié accueil, sinon bannière, sinon 1er produit aperçu */
function structureSpotlightImageUrl(structure, baseUrl) {
  if (structure.visuelCarteAccueil && !structure.visuelCarteAccueil.includes('placeholder.com')) {
    return `${baseUrl}${structure.visuelCarteAccueil}`;
  }
  if (structure.banniere && !structure.banniere.includes('placeholder.com')) {
    return `${baseUrl}${structure.banniere}`;
  }
  const first = structure.produitsApercu?.[0];
  return productThumbUrl(first, baseUrl, 0);
}

/** Image carte recherche produit (aligné sur RestaurantDetail) */
function productHitImageSrc(produit, baseUrl, idx) {
  const carte = produit.imageCarteHome;
  if (carte && String(carte).trim() && !String(carte).includes('placeholder.com')) {
    return `${baseUrl}${carte}`;
  }
  if (produit.images?.[0]) return `${baseUrl}${produit.images[0]}`;
  return generateBannerPlaceholderSVG(idx);
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
  const [cartCount, setCartCount] = useState(0);
  const [locationAddress, setLocationAddress] = useState('');
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [error, setError] = useState(null);
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
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
        setError('Le serveur n\'est pas accessible. Vérifiez que le backend tourne sur le port 5000.');
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

  useEffect(() => {
    if (bannieres.length > 0) {
      const interval = setInterval(() => {
        setCurrentBannerIndex(prev => (prev + 1) % bannieres.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [bannieres.length]);

  const filteredStructures = structures.filter((s) => {
    const q = (searchTerm || '').toLowerCase();
    if (!q) return true;
    if ((s.nom || '').toLowerCase().includes(q)) return true;
    return (s.produitsApercu || []).some((p) => (p.nom || '').toLowerCase().includes(q));
  });

  const productQueryActive = searchTerm.trim().length >= 2;
  const showStructures = !productQueryActive || productSearchResults.length === 0;

  const addProductFromSearch = (produit, restaurantId) => {
    if (!produit?._id || !restaurantId) return;
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
      newCart = [
        ...newCart,
        {
          productId: pid,
          nom: produit.nom,
          nomEn: produit.nomEn,
          nomAfficheAccueil: produit.nomAfficheAccueil,
          nomAfficheAccueilEn: produit.nomAfficheAccueilEn,
          prix: produit.prix,
          image: imageUrl,
          quantite: 1,
          restaurantId,
        },
      ];
    }
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCartCount(newCart.reduce((sum, item) => sum + item.quantite, 0));
  };

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
                        {Number(produit.prix).toFixed(0)} FCFA
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
    return <PageLoader message="Chargement des structures..." />;
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
        <div className="search-bar-mobile">
          <span className="search-icon-mobile">🔍</span>
          <input
            type="text"
            placeholder={t('home', 'searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-mobile"
          />
        </div>
      </div>

      {renderProductSearchSection('home-product-search--mobile')}

      {bannieres.length > 0 ? (
        <div className="banners-carousel-mobile">
          <div className="banners-wrapper" style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}>
            {bannieres.map((banniere, index) => {
              const imageUrl = banniere.image && !banniere.image.includes('placeholder.com')
                ? `${BASE_URL}${banniere.image}`
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
            {bannieres.map((_, index) => (
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
                <span className="category-icon-all">{t('home', 'all').toUpperCase()}</span>
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
                <span className="category-label">{pickLocalized(language, cat, 'nom')}</span>
              </button>
            ))}
            </div>
          </>
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
                    <h3 className="structure-spotlight-titles-mobile">{structureProductNamesText(structure, t, productDisplayName)}</h3>
                    <div className="structure-spotlight-row-mobile">
                      <div className="structure-card-pills-mobile">
                        {minutes != null && <span className="structure-pill-mobile">~{minutes} min</span>}
                        {distanceKm != null && <span className="structure-pill-mobile">{distanceKm} km</span>}
                      </div>
                      {structure.telephone && (
                        <div className="structure-spotlight-icons-mobile" onClick={(e) => e.stopPropagation()}>
                          <a href={`tel:${structure.telephone.trim()}`} className="structure-spotlight-icon-btn-mobile" title={t('home', 'call')} aria-label={t('home', 'call')}>
                            <FaPhoneAlt size={17} />
                          </a>
                          <a
                            href={phoneToWa(structure.telephone) ? `https://wa.me/${phoneToWa(structure.telephone)}` : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="structure-spotlight-icon-btn-mobile structure-spotlight-icon-wa-mobile"
                            title={t('home', 'whatsapp')}
                            aria-label={t('home', 'whatsapp')}
                          >
                            <FaWhatsapp size={19} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: Bannières défilantes - images en valeur, sans overlay */}
      <div className="hero-desktop">
        <div className="hero-bg-desktop">
          {bannieres.length > 0 ? (
            <div className="hero-carousel-desktop" style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}>
              {bannieres.map((banniere, index) => {
                const imageUrl = banniere.image && !banniere.image.includes('placeholder.com') ? `${BASE_URL}${banniere.image}` : generateBannerPlaceholderSVG(index);
                return <img key={banniere._id} src={imageUrl} alt="" className="hero-carousel-img-desktop" onError={(e) => { e.target.src = generateBannerPlaceholderSVG(index); }} />;
              })}
            </div>
          ) : (
            <div className="hero-placeholder-desktop" />
          )}
        </div>
        {bannieres.length > 1 && (
          <div className="hero-indicators-desktop">
            {bannieres.map((_, index) => (
              <button key={index} type="button" className={index === currentBannerIndex ? 'active' : ''} onClick={() => setCurrentBannerIndex(index)} />
            ))}
          </div>
        )}
      </div>

      <div className="plats-section-desktop">
        <div className="container-desktop">
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
                      <span className="category-square-all">{t('home', 'all').toUpperCase()}</span>
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
                      <span className="category-square-label">{pickLocalized(language, cat, 'nom')}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="categories-scroll-arrow right" onClick={() => categoriesScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} aria-label={t('home', 'next')}>
                  <IoChevronForward size={22} aria-hidden />
                </button>
              </div>
            </section>
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
                      <h3 className="structure-spotlight-titles-desktop">{structureProductNamesText(structure, t, productDisplayName)}</h3>
                      <div className="structure-spotlight-row-desktop">
                        <div className="structure-card-pills">
                          {minutes != null && <span className="structure-pill">~{minutes} min</span>}
                          {distanceKm != null && <span className="structure-pill">{distanceKm} km</span>}
                        </div>
                        {structure.telephone && (
                          <div className="structure-spotlight-icons-desktop" onClick={(e) => e.stopPropagation()}>
                            <a href={`tel:${structure.telephone.trim()}`} className="structure-spotlight-icon-btn-desktop" title={t('home', 'call')} aria-label={t('home', 'call')}>
                              <FaPhoneAlt size={18} />
                            </a>
                            <a
                              href={phoneToWa(structure.telephone) ? `https://wa.me/${phoneToWa(structure.telephone)}` : '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="structure-spotlight-icon-btn-desktop structure-spotlight-icon-wa-desktop"
                              title={t('home', 'whatsapp')}
                              aria-label={t('home', 'whatsapp')}
                            >
                              <FaWhatsapp size={20} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bouton d'installation desktop : bas à droite, animation haut → bas */}
      <div className="install-fab-desktop-wrap">
        <InstallButton variant="icon" />
      </div>

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
