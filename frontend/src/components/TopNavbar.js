import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import InstallButton from './InstallButton';
import './TopNavbar.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const TopNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useContext(AuthContext);
  const [cartCount, setCartCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    updateCartCount();
    const interval = setInterval(updateCartCount, 1000);
    return () => clearInterval(interval);
  }, [location]);

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantite, 0);
    setCartCount(count);
  };

  const navItems = [
    { path: '/home', label: 'Accueil', icon: '🏠' },
    { path: '/cart', label: 'Panier', icon: '🛒', badge: cartCount },
    { path: '/orders', label: 'Commandes', icon: '📦' },
    { path: '/settings', label: 'Paramètres', icon: '⚙️' }
  ];

  return (
    <nav className="top-navbar-desktop">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand" onClick={() => navigate('/home')}>
          <img src="/images/logo.png" alt="Rapido" className="navbar-logo-desktop" />
          <span className="navbar-brand-text">Rapido</span>
        </div>

        {/* Navigation items */}
        <div className="navbar-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-link-desktop ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-link-icon">{item.icon}</span>
              <span className="nav-link-label">{item.label}</span>
              {item.badge > 0 && (
                <span className="nav-link-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Bouton d'installation */}
        <div className="navbar-install">
          <InstallButton variant="icon" />
        </div>

        {/* User menu */}
        <div className="navbar-user">
          <button
            className="user-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">
              {user?.photo ? (
                <img 
                  src={user.photo.startsWith('http') ? user.photo : `${BASE_URL}${user.photo}`} 
                  alt={user?.nom || 'User'} 
                  className="user-avatar-img"
                />
              ) : (
                <span className="user-avatar-initial">
                  {user?.nom?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <span className="user-name">{user?.nom || 'Utilisateur'}</span>
            <span className="user-arrow">▼</span>
          </button>
          
          {showUserMenu && (
            <div className="user-dropdown">
              <button onClick={() => navigate('/settings')}>
                ⚙️ Paramètres
              </button>
              <button onClick={logout}>
                🚪 Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar;
