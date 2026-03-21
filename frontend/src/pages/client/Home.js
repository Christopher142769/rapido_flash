import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import BottomNavbar from '../../components/BottomNavbar';
import TopNavbar from '../../components/TopNavbar';
import InstallButton from '../../components/InstallButton';
import LangSwitcher from '../../components/LangSwitcher';
import LocationEditor from '../../components/LocationEditor';
import PageLoader from '../../components/PageLoader';
import FreeDeliveryPopup from '../../components/FreeDeliveryPopup';
import { generateBannerPlaceholderSVG } from '../../utils/imagePlaceholder';
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

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
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
    if (bannieres.length > 0) {
      const interval = setInterval(() => {
        setCurrentBannerIndex(prev => (prev + 1) % bannieres.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [bannieres.length]);

  const filteredStructures = structures.filter(s =>
    (s.nom || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

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
          { id: 'section-structures', labelKey: 'sectionStructures' },
        ]}
        onScrollToSection={(id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
      />

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

      {bannieres.length > 0 ? (
        <div className="banners-carousel-mobile">
          <div className="banners-wrapper" style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}>
            {bannieres.map((banniere, index) => {
              const imageUrl = banniere.image && !banniere.image.includes('placeholder.com')
                ? `${BASE_URL}${banniere.image}`
                : generateBannerPlaceholderSVG(index);
              return (
                <div key={banniere._id} className="banner-slide">
                  <img src={imageUrl} alt={`Banner ${index + 1}`} onError={(e) => { e.target.src = generateBannerPlaceholderSVG(index); }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  {cat.icone ? (
                    <img src={`${BASE_URL}${cat.icone}`} alt={cat.nom} className="category-icon-img" />
                  ) : (
                    <span className="category-icon-emoji">📦</span>
                  )}
                </span>
                <span className="category-label">{cat.nom}</span>
              </button>
            ))}
            </div>
          </>
        )}
        {error && <div className="no-results"><p>{error}</p></div>}
        {!error && filteredStructures.length === 0 && (
          <div className="no-results">
            <p>{t('home', 'noStructuresFound')}</p>
          </div>
        )}
        {!error && filteredStructures.length > 0 && (
          <div className="plats-grid-mobile structures-grid-mobile">
            {filteredStructures.map((structure) => {
              const minutes = distanceToMinutes(structure.distance);
              const distanceKm = structure.distance != null ? structure.distance.toFixed(2) : null;
              const logoUrl = structure.logo ? `${BASE_URL}${structure.logo}` : null;
              const apercu = structure.produitsApercu && structure.produitsApercu.length > 0
                ? structure.produitsApercu
                : null;
              return (
                <div
                  key={structure._id}
                  className="plat-card-mobile structure-card-mobile structure-card-mobile-products"
                  onClick={() => navigate(`/restaurant/${structure._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/restaurant/${structure._id}`); }}
                >
                  <div className="structure-card-mosaic-wrap-mobile">
                    <div className="structure-product-mosaic-mobile">
                      {apercu
                        ? apercu.slice(0, 4).map((p, idx) => (
                          <div key={`${structure._id}-p-${idx}`} className="mosaic-cell-mobile">
                            <img src={productThumbUrl(p, BASE_URL, idx)} alt="" onError={(e) => { e.target.src = generateBannerPlaceholderSVG(idx); }} />
                          </div>
                        ))
                        : [0, 1, 2, 3].map((idx) => (
                          <div key={idx} className="mosaic-cell-mobile mosaic-cell-empty-mobile">
                            <span aria-hidden>✦</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="structure-card-body-mobile structure-card-footer-compact-mobile">
                    <div className="structure-card-title-row-mobile">
                      {logoUrl ? (
                        <img className="structure-card-tiny-logo-mobile" src={logoUrl} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <span className="structure-card-tiny-logo-ph-mobile" aria-hidden>🏪</span>
                      )}
                      <div className="structure-card-info-mobile">
                        <h3 className="structure-card-name-mobile">{structure.nom}</h3>
                        <p className="structure-card-meta-mobile">
                          {structure.categorie?.nom || structure.position?.adresse || '—'}
                        </p>
                        <div className="structure-card-pills-mobile">
                          {minutes != null && <span className="structure-pill-mobile">~{minutes} min</span>}
                          {distanceKm != null && <span className="structure-pill-mobile">{distanceKm} km</span>}
                        </div>
                      </div>
                      {structure.telephone && (
                        <div className="structure-card-quick-actions-mobile" onClick={(e) => e.stopPropagation()}>
                          <a href={`tel:${structure.telephone.trim()}`} className="structure-quick-icon-mobile" title={t('home', 'call')} aria-label={t('home', 'call')}>📞</a>
                          <a href={phoneToWa(structure.telephone) ? `https://wa.me/${phoneToWa(structure.telephone)}` : '#'} target="_blank" rel="noopener noreferrer" className="structure-quick-icon-mobile" title={t('home', 'whatsapp')} aria-label={t('home', 'whatsapp')}>💬</a>
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
                return <img key={banniere._id} src={imageUrl} alt="" onError={(e) => { e.target.src = generateBannerPlaceholderSVG(index); }} />;
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
          {categoriesDomaine.length > 0 && (
            <section id="section-categories" className="home-categories-section-desktop">
              <h2 className="home-section-title-desktop">{t('home', 'categories')}</h2>
              <div className="categories-scroll-wrap-desktop">
                <button type="button" className="categories-scroll-arrow left" onClick={() => categoriesScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} aria-label={t('home', 'previous')}>
                  ‹
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
                        {cat.icone ? (
                          <img src={`${BASE_URL}${cat.icone}`} alt={cat.nom} />
                        ) : (
                          <span className="category-square-emoji">📦</span>
                        )}
                      </span>
                      <span className="category-square-label">{cat.nom}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="categories-scroll-arrow right" onClick={() => categoriesScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} aria-label={t('home', 'next')}>
                  ›
                </button>
              </div>
            </section>
          )}

          {!error && filteredStructures.length === 0 && (
            <div id="section-structures" className="no-results-desktop"><p>{t('home', 'noStructuresFound')}</p></div>
          )}
          {!error && filteredStructures.length > 0 && (
            <div id="section-structures" className="structures-grid-desktop">
              {filteredStructures.map((structure) => {
                const minutes = distanceToMinutes(structure.distance);
                const distanceKm = structure.distance != null ? structure.distance.toFixed(2) : null;
                const logoUrl = structure.logo ? `${BASE_URL}${structure.logo}` : null;
                const apercu = structure.produitsApercu && structure.produitsApercu.length > 0 ? structure.produitsApercu : null;
                return (
                  <div
                    key={structure._id}
                    className="structure-card-desktop structure-card-desktop-products"
                    onClick={() => navigate(`/restaurant/${structure._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/restaurant/${structure._id}`); }}
                  >
                    <div className="structure-card-mosaic-wrap">
                      <div className="structure-product-mosaic-desktop">
                        {apercu
                          ? apercu.slice(0, 4).map((p, idx) => (
                            <div key={`${structure._id}-d-${idx}`} className="mosaic-cell-desktop">
                              <img src={productThumbUrl(p, BASE_URL, idx)} alt="" onError={(e) => { e.target.src = generateBannerPlaceholderSVG(idx); }} />
                            </div>
                          ))
                          : [0, 1, 2, 3].map((idx) => (
                            <div key={idx} className="mosaic-cell-desktop mosaic-cell-empty-desktop">
                              <span aria-hidden>✦</span>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="structure-card-body structure-card-body-compact-desktop">
                      <div className="structure-card-footer-row-desktop">
                        <div className="structure-card-tiny-logo-wrap">
                          {logoUrl ? (
                            <img className="structure-card-tiny-logo" src={logoUrl} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <span className="structure-card-tiny-logo-ph" aria-hidden>🏪</span>
                          )}
                        </div>
                        <div className="structure-card-info structure-card-info-compact">
                          <h3 className="structure-card-name">{structure.nom}</h3>
                          <p className="structure-card-meta">
                            {structure.categorie?.nom || structure.position?.adresse || '—'}
                          </p>
                          <div className="structure-card-pills">
                            {minutes != null && <span className="structure-pill">~{minutes} min</span>}
                            {distanceKm != null && <span className="structure-pill">{distanceKm} km</span>}
                          </div>
                        </div>
                        {structure.telephone && (
                          <div className="structure-card-quick-actions-desktop" onClick={(e) => e.stopPropagation()}>
                            <a href={`tel:${structure.telephone.trim()}`} className="structure-quick-dot-desktop" title={t('home', 'call')} aria-label={t('home', 'call')}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            </a>
                            <a href={phoneToWa(structure.telephone) ? `https://wa.me/${phoneToWa(structure.telephone)}` : '#'} target="_blank" rel="noopener noreferrer" className="structure-quick-dot-desktop wa" title={t('home', 'whatsapp')} aria-label={t('home', 'whatsapp')}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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

      <FreeDeliveryPopup message={t('home', 'freeDeliveryCotonou')} ctaLabel={t('home', 'gotIt')} />
    </div>
  );
};

export default Home;
