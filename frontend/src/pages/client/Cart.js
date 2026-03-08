import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BottomNavbar from '../../components/BottomNavbar';
import TopNavbar from '../../components/TopNavbar';
import { getImageUrl } from '../../utils/imagePlaceholder';
import './Cart.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const Cart = () => {
  const navigate = useNavigate();
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

  const updateQuantity = (platId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(platId);
      return;
    }

    const newCart = cart.map(item =>
      item.platId === platId ? { ...item, quantite: newQuantity } : item
    );
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (platId) => {
    const newCart = cart.filter(item => item.platId !== platId);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const getSubTotal = () => {
    return cart.reduce((sum, item) => sum + (item.prix * item.quantite), 0);
  };

  const getTotal = () => {
    return getSubTotal() + fraisLivraison;
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
          <h1>Panier</h1>
        </div>
        <div className="empty-cart">
          <div className="empty-icon">🛒</div>
          <h2>Votre panier est vide</h2>
          <p>Ajoutez des plats pour commencer</p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>
            Découvrir les restaurants
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
        <h1>Panier</h1>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.platId} className="cart-item">
              <img 
                src={getImageUrl(item.image, { nom: item.nom, categorie: item.categorie }, BASE_URL)} 
                alt={item.nom} 
                className="cart-item-image"
                onError={(e) => {
                  e.target.src = getImageUrl(null, { nom: item.nom, categorie: item.categorie }, BASE_URL);
                }}
              />
              <div className="cart-item-info">
                <h3>{item.nom}</h3>
                <p className="cart-item-price">{item.prix.toFixed(2)} FCFA</p>
              </div>
              <div className="cart-item-controls">
                <button
                  className="quantity-btn"
                  onClick={() => updateQuantity(item.platId, item.quantite - 1)}
                >
                  −
                </button>
                <span className="quantity">{item.quantite}</span>
                <button
                  className="quantity-btn"
                  onClick={() => updateQuantity(item.platId, item.quantite + 1)}
                >
                  +
                </button>
              </div>
              <div className="cart-item-total">
                {(item.prix * item.quantite).toFixed(2)} FCFA
              </div>
              <button
                className="remove-btn"
                onClick={() => removeItem(item.platId)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="summary-row">
            <span>Sous-total</span>
            <span>{getSubTotal().toFixed(2)} FCFA</span>
          </div>
          <div className="summary-row">
            <span>Frais de livraison</span>
            <span>{fraisLivraison.toFixed(2)} FCFA</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{getTotal().toFixed(2)} FCFA</span>
          </div>
          <button
            className="btn btn-primary btn-large"
            onClick={() => navigate('/checkout')}
          >
            Passer la commande
          </button>
        </div>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default Cart;
