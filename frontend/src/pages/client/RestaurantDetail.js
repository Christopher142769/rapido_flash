import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import TopNavbar from '../../components/TopNavbar';
import PageLoader from '../../components/PageLoader';
import { getImageUrl, generateBannerPlaceholderSVG } from '../../utils/imagePlaceholder';
import './RestaurantDetail.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RestaurantDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const platId = searchParams.get('platId');
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [plats, setPlats] = useState([]);
  const [allPlats, setAllPlats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState(null);
  const [selectedPlat, setSelectedPlat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('cart') || '[]'));
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchData = useCallback(async (restaurantId, currentPlatId) => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Récupérer toutes les données en parallèle pour un chargement plus rapide
      const [restaurantRes, platsRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/restaurants/${restaurantId}`).catch(err => {
          console.error('Erreur restaurant:', err);
          throw err;
        }),
        axios.get(`${API_URL}/plats?restaurantId=${restaurantId}`).catch(err => {
          console.error('Erreur plats:', err);
          return { data: [] };
        }),
        axios.get(`${API_URL}/plats/categories?restaurantId=${restaurantId}`).catch(err => {
          console.error('Erreur catégories:', err);
          return { data: [] };
        })
      ]);
      
      // Définir le restaurant immédiatement
      setRestaurant(restaurantRes.data);
      console.log('✅ Restaurant chargé:', restaurantRes.data);
      
      const platsData = platsRes.data || [];
      const categoriesData = categoriesRes.data || [];
      
      console.log('✅ Plats chargés:', platsData.length, platsData);
      console.log('✅ Catégories chargées:', categoriesData);
      
      setAllPlats(platsData);
      setCategories(categoriesData);
      
      // Si un platId est fourni, mettre ce plat en premier et afficher sa bannière
      if (currentPlatId && platsData.length > 0) {
        const platIndex = platsData.findIndex(p => {
          const platIdStr = p._id?.toString() || p._id;
          const searchPlatIdStr = currentPlatId.toString();
          return platIdStr === searchPlatIdStr;
        });
        
        if (platIndex !== -1) {
          const selectedPlatData = platsData[platIndex];
          setSelectedPlat(selectedPlatData);
          // Réorganiser pour mettre le plat sélectionné en premier
          const reorderedPlats = [selectedPlatData, ...platsData.filter((p, i) => i !== platIndex)];
          setPlats(reorderedPlats);
        } else {
          setPlats(platsData);
          setSelectedPlat(null);
        }
      } else {
        setPlats(platsData);
        setSelectedPlat(null);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération:', error);
      if (error.response?.status === 404) {
        setRestaurant(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(id, platId);
  }, [id, platId, fetchData]);

  const handleCategorieFilter = (categorie) => {
    if (selectedCategorie === categorie) {
      // Si la catégorie est déjà sélectionnée, réinitialiser le filtre
      setSelectedCategorie(null);
      setPlats(allPlats);
    } else {
      // Filtrer les plats par catégorie
      setSelectedCategorie(categorie);
      const filtered = allPlats.filter(plat => plat.categorie === categorie);
      setPlats(filtered);
    }
  };

  const addToCart = (plat) => {
    try {
      const existingItem = cart.find(item => item.platId === plat._id);
      let newCart;

      if (existingItem) {
        newCart = cart.map(item =>
          item.platId === plat._id
            ? { ...item, quantite: item.quantite + 1 }
            : item
        );
      } else {
        newCart = [...cart, {
          platId: plat._id,
          nom: plat.nom,
          prix: plat.prix,
          image: plat.image,
          quantite: 1,
          restaurantId: id
        }];
      }

      setCart(newCart);
      localStorage.setItem('cart', JSON.stringify(newCart));
      
      // Feedback visuel (optionnel - peut être amélioré avec une notification)
      console.log('✅ Plat ajouté au panier:', plat.nom);
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout au panier:', error);
    }
  };

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantite, 0);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.prix * item.quantite), 0);
  };

  if (loading) {
    return <PageLoader message="Chargement du restaurant..." />;
  }

  if (!restaurant) {
    return (
      <div className="restaurant-detail-page">
        <TopNavbar />
        <div className="error-state">
          <h2>Restaurant non trouvé</h2>
          <p>Le restaurant demandé n'existe pas ou a été supprimé.</p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const BASE_URL = API_URL.replace('/api', '');


  return (
    <div className="restaurant-detail-page" style={{ minHeight: '100vh', display: 'block', width: '100%', background: '#f5f5f5', position: 'relative' }}>
      <TopNavbar />
      
      {/* Bannière du plat sélectionné ou du restaurant */}
      <div className="restaurant-banner-card" style={{ display: 'block', visibility: 'visible', opacity: 1 }}>
        {selectedPlat ? (
          <img 
            src={getImageUrl(selectedPlat.image, selectedPlat, BASE_URL)} 
            alt={selectedPlat.nom} 
            className="banner-card-img" 
            onError={(e) => {
              e.target.src = getImageUrl(null, selectedPlat, BASE_URL);
            }}
            onLoad={(e) => {
              e.target.style.opacity = '1';
            }}
            style={{ opacity: 0, transition: 'opacity 0.3s' }}
          />
        ) : restaurant.banniere && !restaurant.banniere.includes('placeholder.com') ? (
          <img 
            src={`${BASE_URL}${restaurant.banniere}`} 
            alt={restaurant.nom} 
            className="banner-card-img" 
            onError={(e) => {
              e.target.src = generateBannerPlaceholderSVG(0);
            }}
            onLoad={(e) => {
              e.target.style.opacity = '1';
            }}
            style={{ opacity: 0, transition: 'opacity 0.3s' }}
          />
        ) : (
          <img 
            src={generateBannerPlaceholderSVG(0)} 
            alt={restaurant.nom} 
            className="banner-card-img" 
          />
        )}
      </div>

      {/* Conteneur courbé avec drop shadow */}
      <div className="restaurant-content-container" style={{ display: 'block', visibility: 'visible', opacity: 1, position: 'relative', zIndex: 1 }}>
        <button className="back-btn-curved" onClick={() => navigate('/home')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="restaurant-info-curved">
          <div className="restaurant-logo-wrapper">
            {restaurant.logo ? (
              <img 
                src={`${BASE_URL}${restaurant.logo}`} 
                alt={restaurant.nom} 
                className="restaurant-logo-curved"
                onError={(e) => {
                  // Si le logo échoue, afficher un placeholder
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="restaurant-logo-placeholder"
              style={{ display: restaurant.logo ? 'none' : 'flex' }}
            >
              <span style={{ fontSize: '48px' }}>🍽️</span>
            </div>
          </div>
          <h1 className="restaurant-name-curved">{restaurant.nom}</h1>
          {restaurant.description && (
            <p className="restaurant-description-curved">{restaurant.description}</p>
          )}
        </div>

        {/* Section Plats */}
        <div className="plats-section-curved">
          <h2 className="plats-title-curved">Nos Plats</h2>
          
          {/* Filtres de catégories */}
          {categories.length > 0 && (
            <div className="categories-filter">
              <button
                className={`category-btn ${selectedCategorie === null ? 'active' : ''}`}
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
                  className={`category-btn ${selectedCategorie === categorie ? 'active' : ''}`}
                  onClick={() => handleCategorieFilter(categorie)}
                >
                  {categorie}
                </button>
              ))}
            </div>
          )}
          
          {loading ? (
            <div className="no-plats-curved">
              <p>Chargement des plats...</p>
            </div>
          ) : plats.length === 0 ? (
            <div className="no-plats-curved">
              <p>Aucun plat disponible</p>
              <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
                {allPlats.length === 0 
                  ? 'Aucun plat trouvé pour ce restaurant.'
                  : 'Aucun plat ne correspond aux filtres sélectionnés.'}
              </p>
            </div>
          ) : (
            <div className="plats-list-curved">
              {plats.map((plat) => {
                console.log('Rendering plat:', plat.nom, plat._id, plat);
                return (
                <div key={plat._id} className="plat-item-curved">
                  <div className="plat-image-square">
                    <img 
                      src={getImageUrl(plat.image, plat, BASE_URL)} 
                      alt={plat.nom} 
                      className="plat-image-small"
                      onClick={() => {
                        setSelectedImage(getImageUrl(plat.image, plat, BASE_URL));
                        setShowImageModal(true);
                      }}
                      onError={(e) => {
                        e.target.src = getImageUrl(null, plat, BASE_URL);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div className="plat-details-curved">
                    <h3 className="plat-name-curved">{plat.nom}</h3>
                    {plat.description && (
                      <p className="plat-description-curved">{plat.description}</p>
                    )}
                    <span className="plat-prix-curved">{plat.prix.toFixed(2)} FCFA</span>
                  </div>
                  <button
                    className="btn-add-cart-inline"
                    onClick={() => addToCart(plat)}
                    title="Ajouter au panier"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Panier flottant */}
      {getCartCount() > 0 && (
        <div className="floating-cart" onClick={() => navigate('/cart')}>
          <div className="cart-icon">🛒</div>
          <div className="cart-info">
            <span className="cart-count">{getCartCount()} article(s)</span>
            <span className="cart-total">{getCartTotal().toFixed(2)} FCFA</span>
          </div>
          <button className="btn btn-secondary">Voir le panier</button>
        </div>
      )}

      {/* Modal pour voir l'image en grand */}
      {showImageModal && selectedImage && (
        <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setShowImageModal(false)}>
              ×
            </button>
            <img src={selectedImage} alt="Vue agrandie" className="image-modal-img" />
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetail;
