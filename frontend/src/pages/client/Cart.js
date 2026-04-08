import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LanguageContext from '../../context/LanguageContext';
import BottomNavbar from '../../components/BottomNavbar';
import TopNavbar from '../../components/TopNavbar';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { cartQualifiesFreeDeliveryPromo } from '../../utils/cartPromo';
import './Cart.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const Cart = () => {
  const navigate = useNavigate();
  const { t, productDisplayName } = useContext(LanguageContext);
  const [cart, setCart] = useState([]);
  const [fraisLivraison, setFraisLivraison] = useState(0);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
    
    // Récupérer les frais de livraison du restaurant
    if (savedCart.length > 0) {
      const restaurantId = savedCart[0].restaurantId;
      axios.get(`${API_URL}/restaurants/${restaurantId}`)
        .then(res => {
          setFraisLivraison(res.data.fraisLivraison || 0);
        })
        .catch(err => console.error('Erreur récupération restaurant:', err));
    }
  }, []);

  const itemId = (item) => item.cartLineId || (item.productId != null ? String(item.productId) : String(item.platId));

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }
    const newCart = cart.map(item =>
      itemId(item) === id ? { ...item, quantite: newQuantity } : item
    );
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (id) => {
    const newCart = cart.filter(item => itemId(item) !== id);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const getSubTotal = () => {
    return cart.reduce((sum, item) => sum + (item.prix * item.quantite), 0);
  };

  const getFraisLivraisonEffectif = () => {
    if (cartQualifiesFreeDeliveryPromo(cart)) return 0;
    return fraisLivraison;
  };

  const getTotal = () => {
    return getSubTotal() + getFraisLivraisonEffectif();
  };

  const getRestaurantId = () => {
    return cart.length > 0 ? cart[0].restaurantId : null;
  };

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <TopNavbar />
        <div className="cart-header-mobile">
          <button className="back-btn-icon" onClick={() => navigate('/home')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1>{t('cart', 'title')}</h1>
        </div>
        <div className="empty-cart">
          <div className="empty-icon">🛒</div>
          <h2>{t('cart', 'emptyTitle')}</h2>
          <p>{t('cart', 'emptySubtitle')}</p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>
            {t('cart', 'discoverStructures')}
          </button>
        </div>
        <BottomNavbar />
      </div>
    );
  }

  return (
    <div className="cart-page">
      <TopNavbar />
      <div className="cart-header-mobile">
        <button className="back-btn-icon" onClick={() => navigate('/home')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1>{t('cart', 'title')}</h1>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {cart.map((item) => {
            const lineId = itemId(item);
            const lineName = productDisplayName(item);
            const imgSrc = item.image && item.image.startsWith('/') ? `${BASE_URL}${item.image}` : getImageUrl(item.image, { nom: lineName, categorie: item.categorie }, BASE_URL);
            return (
              <div key={lineId} className="cart-item">
                <img
                  src={imgSrc}
                  alt={lineName}
                  className="cart-item-image"
                  onError={(e) => { e.target.src = getImageUrl(null, { nom: lineName }, BASE_URL); }}
                />
                <div className="cart-item-info">
                  <h3>{lineName}</h3>
                  <p className="cart-item-price">
                    {item.prixCatalogue != null ? (
                      <>
                        <span className="cart-price-current">{Number(item.prix).toFixed(0)} FCFA</span>
                        <span className="cart-price-old">{Number(item.prixCatalogue).toFixed(0)} FCFA</span>
                      </>
                    ) : (
                      <>{Number(item.prix).toFixed(0)} FCFA</>
                    )}
                  </p>
                  {Array.isArray(item.accompagnementsSelected) && item.accompagnementsSelected.length > 0 && (
                    <div className="cart-item-acc-list">
                      {item.accompagnementsSelected.map((acc) => (
                        <span key={acc.optionId || acc.nom} className="cart-item-acc-chip">
                          + {acc.nom} ({Number(acc.prixSupp || 0).toFixed(0)} FCFA)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="cart-item-controls">
                  <button type="button" className="quantity-btn" onClick={() => updateQuantity(lineId, item.quantite - 1)}>−</button>
                  <span className="quantity">{item.quantite}</span>
                  <button type="button" className="quantity-btn" onClick={() => updateQuantity(lineId, item.quantite + 1)}>+</button>
                </div>
                <div className="cart-item-total">{(item.prix * item.quantite).toFixed(0)} FCFA</div>
                <button type="button" className="remove-btn" onClick={() => removeItem(lineId)} aria-label="Retirer">×</button>
              </div>
            );
          })}
        </div>

        <div className="cart-summary">
          <div className="summary-row">
            <span>{t('cart', 'subTotal')}</span>
            <span>{getSubTotal().toFixed(0)} FCFA</span>
          </div>
          <div className="summary-row">
            <span>{t('cart', 'deliveryFee')}</span>
            <span>
              {cartQualifiesFreeDeliveryPromo(cart) ? (
                <>
                  <span className="cart-fee-struck">{fraisLivraison.toFixed(0)} FCFA</span>
                  <span className="cart-fee-free">0 FCFA</span>
                </>
              ) : (
                <>{fraisLivraison.toFixed(0)} FCFA</>
              )}
            </span>
          </div>
          {cartQualifiesFreeDeliveryPromo(cart) && (
            <p className="cart-promo-delivery-note">{t('cart', 'freeDeliveryPromoNote')}</p>
          )}
          <div className="summary-row total">
            <span>{t('cart', 'total')}</span>
            <span>{getTotal().toFixed(0)} FCFA</span>
          </div>
          <button
            className="btn btn-primary btn-large"
            onClick={() => navigate('/checkout')}
          >
            {t('cart', 'checkout')}
          </button>
        </div>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default Cart;
