import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import BottomNavbar from '../../components/BottomNavbar';
import TopNavbar from '../../components/TopNavbar';
import LocationEditor from '../../components/LocationEditor';
import PageLoader from '../../components/PageLoader';
import { getImageUrl, generateBannerPlaceholderSVG } from '../../utils/imagePlaceholder';
import './Home.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [restaurants, setRestaurants] = useState([]);
  const [plats, setPlats] = useState([]);
  const [allPlats, setAllPlats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState(null);
  const [bannieres, setBannieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [locationAddress, setLocationAddress] = useState('');
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [error, setError] = useState(null);

  // Mettre à jour l'adresse depuis localStorage
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
    updateCartCount();
  }, [location]);

  // Charger les données au montage du composant
  useEffect(() => {
    fetchData();
  }, []);

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantite, 0);
    setCartCount(count);
  };

  const fetchData = async () => {
    try {
      const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
      
      // Récupérer les restaurants
      const restaurantsRes = await axios.get(`${API_URL}/restaurants`, {
        params: userLocation.latitude ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        } : {},
        timeout: 10000 // Timeout de 10 secondes
      });
      setRestaurants(restaurantsRes.data);
      console.log('Restaurants chargés:', restaurantsRes.data);

      // Récupérer les plats et catégories
      const [platsRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/plats`, { timeout: 10000 }),
        axios.get(`${API_URL}/plats/categories`, { timeout: 10000 })
      ]);
      setAllPlats(platsRes.data);
      setPlats(platsRes.data);
      setCategories(categoriesRes.data);
      console.log('Plats chargés:', platsRes.data);
      console.log('Catégories chargées:', categoriesRes.data);
      platsRes.data.forEach(plat => {
        console.log('Plat:', plat.nom, 'Restaurants associés:', plat.restaurants);
      });

      // Récupérer les bannières actives
      const bannieresRes = await axios.get(`${API_URL}/bannieres`, { timeout: 10000 });
      // Le backend retourne déjà les bannières actives, mais on filtre au cas où
      const activeBannieres = bannieresRes.data.filter(b => b.actif !== false);
      console.log('Bannières chargées:', activeBannieres);
      console.log('URL base:', BASE_URL);
      activeBannieres.forEach(b => {
        console.log('URL image:', `${BASE_URL}${b.image}`);
        console.log('Restaurant associé:', b.restaurant);
        console.log('Restaurant ID:', b.restaurant?._id || b.restaurant);
        console.log('Bannière complète:', JSON.stringify(b, null, 2));
      });
      setBannieres(activeBannieres);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        const errorMessage = 'Le serveur backend n\'est pas accessible. Assurez-vous que le serveur est démarré sur le port 5000.';
        console.error('❌', errorMessage);
        setError(errorMessage);
        // Initialiser avec des tableaux vides pour éviter les erreurs
        setRestaurants([]);
        setPlats([]);
        setAllPlats([]);
        setCategories([]);
        setBannieres([]);
      } else {
        console.error('Erreur détaillée:', error.response?.data || error.message);
        setError('Erreur lors du chargement des données. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-défilement des bannières
  useEffect(() => {
    if (bannieres.length > 0) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % bannieres.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [bannieres.length]);

  const handleCategorieFilter = (categorie) => {
    if (selectedCategorie === categorie) {
      setSelectedCategorie(null);
      setPlats(allPlats);
    } else {
      setSelectedCategorie(categorie);
      const filtered = allPlats.filter(plat => plat.categorie === categorie);
      setPlats(filtered);
    }
  };

  const filteredPlats = plats.filter(plat =>
    plat.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (plat.description && plat.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <PageLoader message="Chargement des plats..." />;
  }

  return (
    <div className="home-page">
      {/* Navbar en haut (desktop) */}
      <TopNavbar />

      {/* Section Localisation Web */}
      <div className="location-section-desktop">
        <div className="location-container-desktop">
          <button 
            className="location-display-btn-desktop"
            onClick={() => setShowLocationEditor(true)}
          >
            <div className="location-icon-wrapper-desktop">
              <svg className="location-icon-desktop" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#8B4513"/>
              </svg>
            </div>
            <div className="location-info-desktop">
              <span className="location-label-desktop">📍 Adresse de livraison</span>
              <span className="location-address-desktop">
                {locationAddress || 'Cliquez pour sélectionner une adresse'}
              </span>
            </div>
            <svg className="edit-icon-desktop" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.12 5.13L18.87 8.88L20.71 7.04Z" fill="#8B4513"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Section Localisation Mobile */}
      <div className="location-section-mobile">
        <button 
          className="location-display-btn"
          onClick={() => setShowLocationEditor(true)}
        >
          <svg className="location-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#8B4513"/>
          </svg>
          <div className="location-info">
            <span className="location-label">Livraison à</span>
            <span className="location-address">
              {locationAddress || 'Sélectionner une adresse'}
            </span>
          </div>
          <svg className="edit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.12 5.13L18.87 8.88L20.71 7.04Z" fill="#8B4513"/>
          </svg>
        </button>
        <button 
          className="cart-icon-btn-mobile"
          onClick={() => navigate('/cart')}
        >
          <svg className="cart-icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V17C17 18.1 17.9 19 19 19C20.1 19 21 18.1 21 17V13M9 19.5C9.8 19.5 10.5 20.2 10.5 21C10.5 21.8 9.8 22.5 9 22.5C8.2 22.5 7.5 21.8 7.5 21C7.5 20.2 8.2 19.5 9 19.5ZM20 19.5C20.8 19.5 21.5 20.2 21.5 21C21.5 21.8 20.8 22.5 20 22.5C19.2 22.5 18.5 21.8 18.5 21C18.5 20.2 19.2 19.5 20 19.5Z" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {cartCount > 0 && (
            <span className="cart-badge-mobile">{cartCount}</span>
          )}
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="search-section-mobile">
        <div className="search-bar-mobile">
          <span className="search-icon-mobile">🔍</span>
          <input
            type="text"
            placeholder="Rechercher un plat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-mobile"
          />
        </div>
      </div>

      {/* Carrousel de bannières mobile */}
      {bannieres.length > 0 ? (
        <div className="banners-carousel-mobile">
          <div 
            className="banners-wrapper"
            style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
          >
                {bannieres.map((banniere, index) => {
                  const imageUrl = banniere.image && !banniere.image.includes('placeholder.com') 
                    ? `${BASE_URL}${banniere.image}` 
                    : generateBannerPlaceholderSVG(index);
                  // Gérer le cas où restaurant est un objet peuplé ou juste un ID
                  const restaurantId = banniere.restaurant?._id || banniere.restaurant;
                  const hasRestaurant = !!restaurantId;
                  
                  return (
                    <div 
                      key={banniere._id} 
                      className="banner-slide"
                      style={{ cursor: 'default' }}
                    >
                      <img 
                        src={imageUrl} 
                        alt={`Banner ${index + 1}`}
                        onError={(e) => {
                          // Si l'image échoue, utiliser le placeholder
                          e.target.src = generateBannerPlaceholderSVG(index);
                        }}
                        onLoad={(e) => {
                          console.log('✅ Image chargée avec succès:', imageUrl);
                          e.target.style.opacity = '1';
                        }}
                        style={{ opacity: 0, transition: 'opacity 0.3s', width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="eager"
                        crossOrigin="anonymous"
                      />
                    </div>
                  );
                })}
          </div>
          {/* Indicateurs de points */}
          <div className="banner-indicators">
            {bannieres.map((_, index) => (
              <button
                key={index}
                className={`indicator-dot ${index === currentBannerIndex ? 'active' : ''}`}
                onClick={() => setCurrentBannerIndex(index)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="banners-carousel-mobile">
          <div className="banner-slide">
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--light-yellow) 0%, var(--primary-white) 100%)'
            }}>
              <span style={{ fontSize: '48px', opacity: 0.3 }}>📷</span>
            </div>
          </div>
        </div>
      )}

      {/* Section Plats - Mobile */}
      <div className="plats-section-mobile">
        <h2 className="plats-section-title">Nos plats</h2>
        
        {/* Filtres de catégories - Mobile */}
        {categories.length > 0 && (
          <div className="categories-filter-home-mobile">
            <button
              className={`category-btn-home ${selectedCategorie === null ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategorie(null);
                setPlats(allPlats);
              }}
            >
              Tous
            </button>
            {categories.map((categorie) => (
              <button
                key={categorie}
                className={`category-btn-home ${selectedCategorie === categorie ? 'active' : ''}`}
                onClick={() => handleCategorieFilter(categorie)}
              >
                {categorie}
              </button>
            ))}
          </div>
        )}
        
        {filteredPlats.length === 0 ? (
          <div className="no-results">
            <p>Aucun plat trouvé</p>
          </div>
        ) : (
          <div className="plats-grid-mobile">
            {filteredPlats.map((plat) => {
              // Trouver le restaurant qui propose ce plat
              // Le restaurant peut être dans plat.restaurants[0].restaurant (peuplé ou ID)
              let restaurant = null;
              let restaurantId = null;
              
              if (plat.restaurants && plat.restaurants.length > 0) {
                const restaurantPlat = plat.restaurants[0];
                // Si restaurant est un objet peuplé
                if (restaurantPlat.restaurant && typeof restaurantPlat.restaurant === 'object' && restaurantPlat.restaurant._id) {
                  restaurantId = restaurantPlat.restaurant._id;
                  restaurant = restaurantPlat.restaurant;
                } 
                // Si restaurant est juste un ID (string ou ObjectId)
                else if (restaurantPlat.restaurant) {
                  restaurantId = restaurantPlat.restaurant.toString();
                  // Chercher dans la liste des restaurants chargés
                  restaurant = restaurants.find(r => {
                    const rId = (r._id?.toString() || r._id?.toString());
                    const pId = restaurantId.toString();
                    return rId === pId;
                  });
                  
                  // Si pas trouvé dans la liste, utiliser quand même l'ID pour la navigation
                  if (!restaurant) {
                    console.log('⚠️ Restaurant ID trouvé mais pas dans la liste chargée:', restaurantId);
                    // On utilisera restaurantId directement pour la navigation
                  }
                }
              }
              
              // Si toujours pas de restaurant, utiliser le premier restaurant disponible comme fallback
              if (!restaurantId && restaurants.length > 0) {
                restaurant = restaurants[0];
                restaurantId = (restaurant._id?.toString() || restaurant._id);
                console.log('⚠️ Utilisation du restaurant par défaut pour le plat:', plat.nom, restaurant.nom);
              }
              
              // Log pour débogage
              if (!restaurantId) {
                console.error('❌ Aucun restaurant ID trouvé pour le plat:', plat.nom, plat.restaurants);
              }
              
              const handleCardClick = (e) => {
                // Ne pas naviguer si on clique sur le badge (il est dans l'image)
                if (e.target.closest('.plat-restaurant-badge') || 
                    e.target.closest('.plat-restaurant-badge-desktop')) {
                  return;
                }
                
                // Naviguer vers la page du restaurant (même si on clique sur l'image)
                console.log('🚀 Navigation vers restaurant pour plat:', plat.nom);
                e.preventDefault();
                e.stopPropagation();
                
                // Utiliser restaurantId en priorité (même si restaurant n'est pas dans la liste)
                if (restaurantId) {
                  const targetId = restaurantId.toString();
                  console.log('✅ Navigation avec restaurantId:', targetId);
                  navigate(`/restaurant/${targetId}?platId=${plat._id}`);
                } else if (restaurant) {
                  const targetId = (restaurant._id?.toString() || restaurant._id);
                  console.log('✅ Navigation avec restaurant objet:', targetId);
                  navigate(`/restaurant/${targetId}?platId=${plat._id}`);
                } else if (restaurants.length > 0) {
                  // Utiliser le premier restaurant comme dernier recours
                  const fallbackRestaurant = restaurants[0];
                  const targetId = (fallbackRestaurant._id?.toString() || fallbackRestaurant._id);
                  console.log('⚠️ Navigation avec restaurant par défaut:', targetId);
                  navigate(`/restaurant/${targetId}?platId=${plat._id}`);
                } else {
                  console.error('❌ Aucun restaurant disponible pour navigation');
                }
              };
              
              return (
                <div
                  key={plat._id}
                  className="plat-card-mobile"
                  onClick={handleCardClick}
                  style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCardClick(e);
                    }
                  }}
                >
                  <div className="plat-image-container">
                    <img 
                      src={getImageUrl(plat.image, plat, BASE_URL)} 
                      alt={plat.nom}
                      className="plat-image-mobile"
                      onError={(e) => {
                        // Si l'image échoue, utiliser le placeholder
                        e.target.src = getImageUrl(null, plat, BASE_URL);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    {restaurant && (
                      <div className="plat-restaurant-badge">
                        {restaurant.logo ? (
                          <img src={`${BASE_URL}${restaurant.logo}`} alt={restaurant.nom} />
                        ) : (
                          <span>🍽️</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="plat-info-mobile">
                    <h3 className="plat-name-mobile">{plat.nom}</h3>
                    {restaurant && (
                      <p className="plat-restaurant-name">{restaurant.nom}</p>
                    )}
                    <div className="plat-footer-mobile">
                      <span className="plat-price-mobile">{plat.prix.toFixed(2)} FCFA</span>
                      {restaurant && (restaurant.telephone || restaurant.whatsapp) && (
                        <div className="plat-contact-icons">
                          {restaurant.telephone && (
                            <a 
                              href={`tel:${restaurant.telephone.replace(/\s/g, '')}`}
                              className="contact-icon phone-icon"
                              onClick={(e) => e.stopPropagation()}
                              title={`Appeler ${restaurant.nom}`}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4742 21.8325 20.7292C21.7209 20.9841 21.5573 21.2126 21.3522 21.3999C21.1471 21.5872 20.9053 21.7292 20.6419 21.8167C20.3786 21.9042 20.0995 21.9354 19.8233 21.9083C16.4283 21.5733 13.1362 20.4961 10.1373 18.7403C7.30601 17.1058 4.86795 14.8401 3.02 12.12C1.31638 9.61072 0.313506 6.7563 0.08 3.82C0.0528036 3.54478 0.0836538 3.26696 0.170737 3.00492C0.25782 2.74288 0.399071 2.50247 0.585566 2.29868C0.772062 2.09489 0.999811 1.93219 1.25438 1.82098C1.50895 1.70977 1.78475 1.65234 2.06333 1.65234H5.06333C5.61589 1.64948 6.14668 1.86699 6.54033 2.26L8.41033 4.13C8.80307 4.52274 9.02058 5.05274 9.01772 5.6053C9.01486 6.15786 8.79178 6.68466 8.39372 7.0723C7.99566 7.45994 7.45372 7.67834 6.90033 7.68C6.61972 7.6809 6.34372 7.73734 6.08633 7.8463C5.82894 7.95526 5.59533 8.11434 5.40033 8.3143L4.41033 9.3043C5.37347 11.0025 6.66372 12.4927 8.20033 13.68L9.19033 12.69C9.39029 12.495 9.54937 12.2614 9.65833 12.004C9.76729 11.7466 9.82372 11.4706 9.82462 11.19C9.82748 10.6366 10.044 10.1066 10.4367 9.71386L12.3067 7.84386C12.6998 7.45121 13.2298 7.2337 13.7823 7.23656C14.3349 7.23942 14.8617 7.4625 15.2493 7.86056C15.637 8.25862 15.8554 8.80056 15.8573 9.35386C15.8582 9.63447 15.8018 9.91047 15.6928 10.1679C15.5839 10.4253 15.4248 10.6589 15.2248 10.8539L13.3548 12.7239C13.7475 13.1166 13.965 13.6466 13.9679 14.1992C13.9707 14.7517 13.7477 15.2785 13.3496 15.6661C12.9516 16.0538 12.4096 16.2722 11.8563 16.2741H11.8563Z" fill="currentColor"/>
                              </svg>
                            </a>
                          )}
                          {restaurant.whatsapp && (
                            <a 
                              href={`https://wa.me/${restaurant.whatsapp.replace(/[^0-9+]/g, '').replace(/^\+/, '')}`}
                              className="contact-icon whatsapp-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Formatage du numéro pour WhatsApp
                                const phoneNumber = restaurant.whatsapp.replace(/[^0-9+]/g, '').replace(/^\+/, '');
                                window.open(`https://wa.me/${phoneNumber}`, '_blank');
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Contacter ${restaurant.nom} sur WhatsApp`}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor"/>
                              </svg>
                            </a>
                          )}
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

      {/* Carrousel de bannières desktop */}
      {bannieres.length > 0 && (
        <div className="banners-carousel-desktop">
          <div 
            className="banners-wrapper-desktop"
            style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
          >
                {bannieres.map((banniere, index) => {
                  const imageUrl = banniere.image && !banniere.image.includes('placeholder.com') 
                    ? `${BASE_URL}${banniere.image}` 
                    : generateBannerPlaceholderSVG(index);
                  
                  return (
                    <div 
                      key={banniere._id} 
                      className="banner-slide-desktop"
                      style={{ cursor: 'default' }}
                    >
                      <img 
                        src={imageUrl} 
                        alt={`Banner ${index + 1}`}
                        onError={(e) => {
                          // Si l'image échoue, utiliser le placeholder
                          e.target.src = generateBannerPlaceholderSVG(index);
                        }}
                        onLoad={(e) => {
                          console.log('✅ Image desktop chargée avec succès:', imageUrl);
                          e.target.style.opacity = '1';
                        }}
                        style={{ opacity: 0, transition: 'opacity 0.3s', width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="eager"
                        crossOrigin="anonymous"
                      />
                    </div>
                  );
                })}
          </div>
          <div className="banner-indicators-desktop">
            {bannieres.map((_, index) => (
              <button
                key={index}
                className={`indicator-dot-desktop ${index === currentBannerIndex ? 'active' : ''}`}
                onClick={() => setCurrentBannerIndex(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Barre de recherche desktop */}
      <div className="search-section-desktop">
        <div className="search-bar-desktop">
          <span className="search-icon-desktop">🔍</span>
          <input
            type="text"
            placeholder="Rechercher un plat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-desktop"
          />
        </div>
      </div>

          {/* Section Plats - Desktop */}
          <div className="plats-section-desktop">
            <div className="container-desktop">
              <h2 className="plats-section-title-desktop">Nos plats</h2>
              
              {/* Filtres de catégories - Desktop */}
              {categories.length > 0 && (
                <div className="categories-filter-home-desktop">
                  <button
                    className={`category-btn-home ${selectedCategorie === null ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategorie(null);
                      setPlats(allPlats);
                    }}
                  >
                    Tous
                  </button>
                  {categories.map((categorie) => (
                    <button
                      key={categorie}
                      className={`category-btn-home ${selectedCategorie === categorie ? 'active' : ''}`}
                      onClick={() => handleCategorieFilter(categorie)}
                    >
                      {categorie}
                    </button>
                  ))}
                </div>
              )}
              
              {filteredPlats.length === 0 ? (
            <div className="no-results-desktop">
              <p>Aucun plat trouvé</p>
            </div>
          ) : (
            <div className="plats-grid-desktop">
              {filteredPlats.map((plat) => {
                // Trouver le restaurant qui propose ce plat
                // Le restaurant peut être dans plat.restaurants[0].restaurant (peuplé ou ID)
                let restaurant = null;
                let restaurantId = null;
                
                if (plat.restaurants && plat.restaurants.length > 0) {
                  const restaurantPlat = plat.restaurants[0];
                  // Si restaurant est un objet peuplé
                  if (restaurantPlat.restaurant && typeof restaurantPlat.restaurant === 'object' && restaurantPlat.restaurant._id) {
                    restaurantId = restaurantPlat.restaurant._id;
                    restaurant = restaurantPlat.restaurant;
                  } 
                  // Si restaurant est juste un ID (string ou ObjectId)
                  else if (restaurantPlat.restaurant) {
                    restaurantId = restaurantPlat.restaurant.toString();
                    // Chercher dans la liste des restaurants chargés
                    restaurant = restaurants.find(r => {
                      const rId = (r._id?.toString() || r._id?.toString());
                      const pId = restaurantId.toString();
                      return rId === pId;
                    });
                    
                    // Si pas trouvé dans la liste, utiliser quand même l'ID pour la navigation
                    if (!restaurant) {
                      console.log('⚠️ [DESKTOP] Restaurant ID trouvé mais pas dans la liste chargée:', restaurantId);
                    }
                  }
                }
                
                // Si toujours pas de restaurant, utiliser le premier restaurant disponible comme fallback
                if (!restaurantId && restaurants.length > 0) {
                  restaurant = restaurants[0];
                  restaurantId = (restaurant._id?.toString() || restaurant._id);
                  console.log('⚠️ [DESKTOP] Utilisation du restaurant par défaut pour le plat:', plat.nom, restaurant.nom);
                }
                
                // Log pour débogage
                if (!restaurantId) {
                  console.error('❌ [DESKTOP] Aucun restaurant ID trouvé pour le plat:', plat.nom, plat.restaurants);
                }
                
                    const handleCardClickDesktop = (e) => {
                      // Ne pas naviguer si on clique sur le badge (il est dans l'image)
                      if (e.target.closest('.plat-restaurant-badge-desktop')) {
                        return;
                      }
                      
                      // Naviguer vers la page du restaurant (même si on clique sur l'image)
                      console.log('🚀 [DESKTOP] Navigation vers restaurant pour plat:', plat.nom);
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Utiliser restaurantId en priorité (même si restaurant n'est pas dans la liste)
                      if (restaurantId) {
                        const targetId = restaurantId.toString();
                        console.log('✅ [DESKTOP] Navigation avec restaurantId:', targetId);
                        navigate(`/restaurant/${targetId}?platId=${plat._id}`);
                      } else if (restaurant) {
                        const targetId = (restaurant._id?.toString() || restaurant._id);
                        console.log('✅ [DESKTOP] Navigation avec restaurant objet:', targetId);
                        navigate(`/restaurant/${targetId}?platId=${plat._id}`);
                      } else if (restaurants.length > 0) {
                        // Utiliser le premier restaurant comme dernier recours
                        const fallbackRestaurant = restaurants[0];
                        const targetId = (fallbackRestaurant._id?.toString() || fallbackRestaurant._id);
                        console.log('⚠️ [DESKTOP] Navigation avec restaurant par défaut:', targetId);
                        navigate(`/restaurant/${targetId}?platId=${plat._id}`);
                      } else {
                        console.error('❌ [DESKTOP] Aucun restaurant disponible pour navigation');
                      }
                    };
                
                return (
                  <div
                    key={plat._id}
                    className="plat-card-desktop"
                    onClick={handleCardClickDesktop}
                    style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleCardClickDesktop(e);
                      }
                    }}
                  >
                    <div className="plat-image-container-desktop">
                      <img 
                        src={getImageUrl(plat.image, plat, BASE_URL)} 
                        alt={plat.nom}
                        className="plat-image-desktop"
                        onError={(e) => {
                          // Si l'image échoue, utiliser le placeholder
                          e.target.src = getImageUrl(null, plat, BASE_URL);
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      {restaurant && (
                        <div className="plat-restaurant-badge-desktop">
                          {restaurant.logo ? (
                            <img src={`${BASE_URL}${restaurant.logo}`} alt={restaurant.nom} />
                          ) : (
                            <span>🍽️</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="plat-info-desktop">
                      <h3 className="plat-name-desktop">{plat.nom}</h3>
                      {restaurant && (
                        <p className="plat-restaurant-name-desktop">{restaurant.nom}</p>
                      )}
                      <div className="plat-footer-desktop">
                        <span className="plat-price-desktop">{plat.prix.toFixed(2)} FCFA</span>
                        {restaurant && (restaurant.telephone || restaurant.whatsapp) && (
                          <div className="plat-contact-icons">
                            {restaurant.telephone && (
                              <a 
                                href={`tel:${restaurant.telephone.replace(/\s/g, '')}`}
                                className="contact-icon phone-icon"
                                onClick={(e) => e.stopPropagation()}
                                title={`Appeler ${restaurant.nom}`}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4742 21.8325 20.7292C21.7209 20.9841 21.5573 21.2126 21.3522 21.3999C21.1471 21.5872 20.9053 21.7292 20.6419 21.8167C20.3786 21.9042 20.0995 21.9354 19.8233 21.9083C16.4283 21.5733 13.1362 20.4961 10.1373 18.7403C7.30601 17.1058 4.86795 14.8401 3.02 12.12C1.31638 9.61072 0.313506 6.7563 0.08 3.82C0.0528036 3.54478 0.0836538 3.26696 0.170737 3.00492C0.25782 2.74288 0.399071 2.50247 0.585566 2.29868C0.772062 2.09489 0.999811 1.93219 1.25438 1.82098C1.50895 1.70977 1.78475 1.65234 2.06333 1.65234H5.06333C5.61589 1.64948 6.14668 1.86699 6.54033 2.26L8.41033 4.13C8.80307 4.52274 9.02058 5.05274 9.01772 5.6053C9.01486 6.15786 8.79178 6.68466 8.39372 7.0723C7.99566 7.45994 7.45372 7.67834 6.90033 7.68C6.61972 7.6809 6.34372 7.73734 6.08633 7.8463C5.82894 7.95526 5.59533 8.11434 5.40033 8.3143L4.41033 9.3043C5.37347 11.0025 6.66372 12.4927 8.20033 13.68L9.19033 12.69C9.39029 12.495 9.54937 12.2614 9.65833 12.004C9.76729 11.7466 9.82372 11.4706 9.82462 11.19C9.82748 10.6366 10.044 10.1066 10.4367 9.71386L12.3067 7.84386C12.6998 7.45121 13.2298 7.2337 13.7823 7.23656C14.3349 7.23942 14.8617 7.4625 15.2493 7.86056C15.637 8.25862 15.8554 8.80056 15.8573 9.35386C15.8582 9.63447 15.8018 9.91047 15.6928 10.1679C15.5839 10.4253 15.4248 10.6589 15.2248 10.8539L13.3548 12.7239C13.7475 13.1166 13.965 13.6466 13.9679 14.1992C13.9707 14.7517 13.7477 15.2785 13.3496 15.6661C12.9516 16.0538 12.4096 16.2722 11.8563 16.2741H11.8563Z" fill="currentColor"/>
                                </svg>
                              </a>
                            )}
                            {restaurant.whatsapp && (
                              <a 
                                href={`https://wa.me/${restaurant.whatsapp.replace(/[^0-9+]/g, '').replace(/^\+/, '')}`}
                                className="contact-icon whatsapp-icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Formatage du numéro pour WhatsApp (sans espaces, sans +, uniquement chiffres)
                                  const phoneNumber = restaurant.whatsapp.replace(/[^0-9+]/g, '').replace(/^\+/, '');
                                  window.open(`https://wa.me/${phoneNumber}`, '_blank');
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Contacter ${restaurant.nom} sur WhatsApp`}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor"/>
                                </svg>
                              </a>
                            )}
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

      {/* Navbar en bas (mobile) */}
      <BottomNavbar />

      {/* Modal d'édition de localisation */}
      {showLocationEditor && (
        <LocationEditor
          onClose={() => setShowLocationEditor(false)}
          onSave={(locationData) => {
            setLocationAddress(locationData.adresse || `${locationData.latitude?.toFixed(4)}, ${locationData.longitude?.toFixed(4)}`);
            setShowLocationEditor(false);
            fetchData(); // Recharger les restaurants avec la nouvelle localisation
          }}
        />
      )}

    </div>
  );
};

export default Home;
