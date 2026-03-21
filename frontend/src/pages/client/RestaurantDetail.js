import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopNavbar from '../../components/TopNavbar';
import BottomNavbar from '../../components/BottomNavbar';
import PageLoader from '../../components/PageLoader';
import { getImageUrl, generateBannerPlaceholderSVG } from '../../utils/imagePlaceholder';
import './RestaurantDetail.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const JOUR_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function formatJoursVente(arr) {
  if (!arr || !arr.length) return null;
  return [...arr].sort((a, b) => a - b).map((d) => JOUR_LABELS[d]).join(' · ');
}

const RestaurantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
    fetchData(id);
  }, [id, fetchData]);

  useEffect(() => {
    let list = allProducts;
    if (selectedCategorieId) {
      list = list.filter(p => (p.categorieProduit && p.categorieProduit._id) === selectedCategorieId);
    }
    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      list = list.filter(p => (p.nom || '').toLowerCase().includes(q));
    }
    setProducts(list);
  }, [selectedCategorieId, allProducts, productSearch]);

  const addToCart = (produit) => {
    const imageUrl = (produit.images && produit.images[0]) ? produit.images[0] : null;
    const existing = cart.find(item => item.productId === produit._id);
    let newCart;
    if (existing) {
      newCart = cart.map(item =>
        item.productId === produit._id ? { ...item, quantite: item.quantite + 1 } : item
      );
    } else {
      newCart = [...cart, {
        productId: produit._id,
        nom: produit.nom,
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
    return <PageLoader message="Chargement de la structure..." />;
  }

  if (!restaurant) {
    return (
      <div className="restaurant-detail-page">
        <TopNavbar />
        <div className="error-state">
          <h2>Structure non trouvée</h2>
          <p>La structure demandée n'existe pas ou a été supprimée.</p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  const bannerUrl = restaurant.banniere && !restaurant.banniere.includes('placeholder.com')
    ? `${BASE_URL}${restaurant.banniere}`
    : generateBannerPlaceholderSVG(0);

  const tel = (restaurant.telephone || '').trim();
  const waNumber = tel.replace(/\D/g, '');

  const cartForRestaurant = cart.filter(item => item.restaurantId === id);
  const cartCountRestaurant = cartForRestaurant.reduce((sum, item) => sum + item.quantite, 0);
  const cartTotalRestaurant = cartForRestaurant.reduce((sum, item) => sum + item.prix * item.quantite, 0);

  return (
    <div className="restaurant-detail-page">
      <TopNavbar />

      {/* Mobile : hero comme avant (bannière + une carte avec logo, nom, desc, téléphone, bouton) */}
      <div className="store-hero-mobile">
        <div className="store-banner-mobile">
          <img src={bannerUrl} alt={restaurant.nom} onError={(e) => { e.target.src = generateBannerPlaceholderSVG(0); }} />
        </div>
        <button type="button" className="store-back-mobile" onClick={() => navigate('/home')} aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18L9 12L15 6"/></svg>
        </button>
        <div className="store-info-card-mobile">
          <div className="store-info-logo-mobile">
            {restaurant.logo ? <img src={`${BASE_URL}${restaurant.logo}`} alt={restaurant.nom} onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} /> : null}
            <div className="store-info-logo-ph-mobile" style={{ display: restaurant.logo ? 'none' : 'flex' }}>🏪</div>
          </div>
          <h1 className="store-info-name-mobile">{restaurant.nom}</h1>
          {restaurant.description && <p className="store-info-desc-mobile">{restaurant.description}</p>}
          {restaurant.telephone && <p className="store-info-phone-mobile">📞 {restaurant.telephone}</p>}
        </div>
      </div>

      {/* Desktop + Mobile : bannière avec overlay, logo dans le coin, Nom et Description | Contact */}
      <div className="store-hero-desktop">
        <img src={bannerUrl} alt={restaurant.nom} className="store-hero-banner" onError={(e) => { e.target.src = generateBannerPlaceholderSVG(0); }} />
        <div className="store-hero-overlay" aria-hidden />
        <button type="button" className="store-hero-back" onClick={() => navigate('/home')} aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18L9 12L15 6"/></svg>
        </button>
        <div className="store-hero-logo-corner">
          {restaurant.logo ? (
            <img src={`${BASE_URL}${restaurant.logo}`} alt={restaurant.nom} onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
          ) : null}
          <div className="store-hero-logo-corner-placeholder" style={{ display: restaurant.logo ? 'none' : 'flex' }}>🏪</div>
        </div>
        <div className="store-hero-bottom">
          <div className="store-hero-info">
            <h1 className="store-hero-info-name">{restaurant.nom}</h1>
            {restaurant.description && <p className="store-hero-info-desc">{restaurant.nom ? ' et ' : ''}{restaurant.description}</p>}
          </div>
          <div className="store-hero-contact">
            <span className="store-hero-contact-title">Contact</span>
            {tel && (
              <div className="store-hero-contact-links">
                <a href={`tel:${tel}`} className="store-hero-contact-link" title="Appeler" onClick={(e) => e.stopPropagation()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span>{restaurant.telephone}</span>
                </a>
                <a href={waNumber ? `https://wa.me/${waNumber}` : '#'} target="_blank" rel="noopener noreferrer" className="store-hero-contact-link store-hero-contact-wa" title="Contacter par WhatsApp" onClick={(e) => e.stopPropagation()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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
                <span className="restaurant-vente-icon" aria-hidden>📅</span>
                <span><strong>Jours de commande / vente :</strong> {formatJoursVente(restaurant.joursVente)}</span>
              </p>
            )}
            {restaurant.commanderVeille && (
              <p className="restaurant-vente-line restaurant-vente-alert">
                <span className="restaurant-vente-icon" aria-hidden>⏰</span>
                <span>
                  Pensez à commander <strong>la veille</strong> pour être livré le jour prévu.
                </span>
              </p>
            )}
          </div>
        )}

        {/* Barre de recherche produits (desktop uniquement) */}
        <div className="store-search-bar store-search-desktop">
          <span className="store-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Recherche de produits"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="store-search-input"
          />
        </div>

        {/* Mobile : filtres catégories + liste produits */}
        <div className="store-mobile-section">
          {productCategories.length > 0 && (
            <div className="categories-filter">
              <button className={`category-btn ${selectedCategorieId === null ? 'active' : ''}`} onClick={() => setSelectedCategorieId(null)}>Tous</button>
              {productCategories.map((cat) => (
                <button
                  key={cat._id}
                  className={`category-btn category-btn-with-img ${selectedCategorieId === cat._id ? 'active' : ''}`}
                  onClick={() => setSelectedCategorieId(selectedCategorieId === cat._id ? null : cat._id)}
                >
                  {cat.image ? <img src={`${BASE_URL}${cat.image}`} alt={cat.nom} className="category-btn-img" /> : <span className="category-btn-emoji">📦</span>}
                  <span>{cat.nom}</span>
                </button>
              ))}
            </div>
          )}
          {products.length === 0 ? (
            <div className="no-plats-curved">
              <p>Aucun produit disponible</p>
              <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
                {allProducts.length === 0 ? 'Aucun produit pour cette structure.' : 'Aucun produit dans cette catégorie.'}
              </p>
            </div>
          ) : (
            <div className="plats-list-curved">
              {products.map((produit) => {
                const imgSrc = (produit.images && produit.images[0]) ? `${BASE_URL}${produit.images[0]}` : getImageUrl(null, { nom: produit.nom }, BASE_URL);
                return (
                  <div key={produit._id} className="plat-item-curved">
                    <div className="plat-image-square" onClick={() => { setSelectedImage(imgSrc); setShowImageModal(true); }}>
                      <img src={imgSrc} alt={produit.nom} className="plat-image-small" onError={(e) => { e.target.src = getImageUrl(null, { nom: produit.nom }, BASE_URL); }} />
                    </div>
                    <div className="plat-details-curved">
                      <h3 className="plat-name-curved">{produit.nom}</h3>
                      {produit.description && <p className="plat-description-curved">{produit.description}</p>}
                      <span className="plat-prix-curved">{Number(produit.prix).toFixed(0)} FCFA</span>
                    </div>
                    <button type="button" className="btn-add-cart-inline" onClick={() => addToCart(produit)} title="Ajouter au panier">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5V19M5 12H19"/></svg>
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
              <span className="store-menu-icon">☰</span> Menu
            </h2>
            <nav className="store-menu-nav">
              <button type="button" className={`store-menu-item ${selectedCategorieId === null ? 'active' : ''}`} onClick={() => setSelectedCategorieId(null)}>Tous les produits</button>
              {productCategories.map((cat) => {
                const productsInCat = allProducts.filter(p => p.categorieProduit && p.categorieProduit._id === cat._id);
                return (
                  <div key={cat._id} className="store-menu-category-block">
                    <button
                      type="button"
                      className={`store-menu-item ${selectedCategorieId === cat._id ? 'active' : ''}`}
                      onClick={() => setSelectedCategorieId(selectedCategorieId === cat._id ? null : cat._id)}
                    >
                      {cat.nom}
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
                              {produit.nom}
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
              <div className="no-plats-curved no-plats-desktop">Aucun produit dans cette catégorie.</div>
            ) : (
              <div className="products-grid-desktop">
                {products.map((produit) => {
                  const imgSrc = (produit.images && produit.images[0]) ? `${BASE_URL}${produit.images[0]}` : getImageUrl(null, { nom: produit.nom }, BASE_URL);
                  return (
                    <div key={produit._id} className="product-card-desktop">
                      <div className="product-card-image-wrap" onClick={() => { setSelectedImage(imgSrc); setShowImageModal(true); }}>
                        <img src={imgSrc} alt={produit.nom} onError={(e) => { e.target.src = getImageUrl(null, { nom: produit.nom }, BASE_URL); }} />
                        <span className="product-card-share" onClick={(e) => { e.stopPropagation(); }} title="Partager" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        </span>
                      </div>
                      <div className="product-card-body">
                        <h3 className="product-card-name">{produit.nom}</h3>
                        <span className="product-card-price">{Number(produit.prix).toFixed(0)} FCFA</span>
                        {produit.description && <p className="product-card-desc">{produit.description}</p>}
                        <div className="product-card-footer">
                          <button type="button" className="product-card-add-btn" onClick={() => addToCart(produit)} title="Ajouter au panier">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
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
              <span className="store-cart-icon">🛒</span> Chariot
            </h2>
            <div className="store-cart-content">
              {cartCountRestaurant === 0 ? (
                <div className="store-cart-empty">
                  <span className="store-cart-empty-icon">🛒</span>
                  <p>Ajouter un élément pour commencer</p>
                </div>
              ) : (
                <>
                  <ul className="store-cart-list">
                    {cartForRestaurant.map((item) => (
                      <li key={item.productId} className="store-cart-item">
                        <span className="store-cart-item-name">{item.nom}</span>
                        <span className="store-cart-item-qty">×{item.quantite}</span>
                        <span className="store-cart-item-price">{Number(item.prix * item.quantite).toFixed(0)} FCFA</span>
                      </li>
                    ))}
                  </ul>
                  <div className="store-cart-total">
                    <span>Total</span>
                    <strong>{cartTotalRestaurant.toFixed(0)} FCFA</strong>
                  </div>
                  <button type="button" className="store-cart-btn" onClick={() => navigate('/cart')}>Voir le panier</button>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {getCartCount() > 0 && (
        <div className="floating-cart" onClick={() => navigate('/cart')}>
          <div className="cart-icon">🛒</div>
          <div className="cart-info">
            <span className="cart-count">{getCartCount()} article(s)</span>
            <span className="cart-total">{getCartTotal().toFixed(0)} FCFA</span>
          </div>
          <button type="button" className="btn btn-secondary">Voir le panier</button>
        </div>
      )}

      {showImageModal && selectedImage && (
        <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setShowImageModal(false)}>×</button>
            <img src={selectedImage} alt="Vue agrandie" className="image-modal-img" />
          </div>
        </div>
      )}

      <BottomNavbar />
    </div>
  );
};

export default RestaurantDetail;
