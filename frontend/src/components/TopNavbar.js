import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import LanguageContext from '../context/LanguageContext';
import LangSwitcher from './LangSwitcher';
import {
  FaHome,
  FaShoppingCart,
  FaClipboardList,
  FaSearch,
  FaMapMarkerAlt,
  FaGlobe,
  FaMapPin,
  FaCog,
  FaSignOutAlt,
  FaFileInvoice,
} from 'react-icons/fa';
import './TopNavbar.css';

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const TopNavbar = ({
  locationAddress,
  onLocationClick,
  searchTerm = '',
  onSearchChange,
  onSearchSubmit,
  sectionLinks = [],
  onScrollToSection,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useContext(AuthContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const [cartCount, setCartCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langWrapRef = useRef(null);
  const userWrapRef = useRef(null);
  const showHomeExtras =
    typeof onLocationClick === 'function' &&
    (location.pathname === '/home' || /^\/restaurant\/[^/]+$/.test(location.pathname));

  useEffect(() => {
    if (!showLangMenu) return;
    const handleClickOutside = (e) => {
      if (langWrapRef.current && !langWrapRef.current.contains(e.target)) setShowLangMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showLangMenu]);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e) => {
      if (userWrapRef.current && !userWrapRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserMenu]);

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
    { path: '/home', labelKey: 'home', Icon: FaHome },
    { path: '/cart', labelKey: 'cart', Icon: FaShoppingCart, badge: cartCount },
    { path: '/orders', labelKey: 'orders', Icon: FaClipboardList },
    { path: '/factures', labelKey: 'invoices', Icon: FaFileInvoice },
  ];

  return (
    <>
    <nav className="top-navbar-desktop" aria-label="Navigation principale">
      <div className="navbar-container">
        {/* Logo : seul, bien mis en valeur */}
        <div className="navbar-brand" onClick={() => navigate('/home')} title="Accueil">
          <img src="/images/logo.png" alt="Rapido" className="navbar-logo-desktop" />
        </div>

        {/* Localisation (CTA) + Recherche (bien visible) */}
        {showHomeExtras && (
          <div className="navbar-home-extras">
            <button type="button" className="navbar-location-cta" onClick={onLocationClick} title={t('navbar', 'changeDeliveryAddress')}>
              <span className="navbar-pin-icon" aria-hidden>
                <FaMapMarkerAlt size={18} />
              </span>
              <span className="navbar-location-address">{locationAddress || t('navbar', 'chooseAddress')}</span>
              <span className="navbar-location-hint">{t('navbar', 'modify')}</span>
            </button>
            <LangSwitcher variant="inline" />
            <div className="navbar-search-wrap">
              <span className="navbar-search-icon" aria-hidden>
                <FaSearch size={17} />
              </span>
              <input
                type="text"
                placeholder={t('navbar', 'searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => onSearchChange && onSearchChange(e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && typeof onSearchSubmit === 'function') {
                    e.preventDefault();
                    onSearchSubmit(searchTerm);
                  }
                }}
                className="navbar-search-input"
                aria-label={t('navbar', 'searchPlaceholder')}
              />
            </div>
          </div>
        )}

        {/* Nav : Accueil, Panier, Commandes (icône + texte) */}
        <div className="navbar-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-link-desktop ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-label={t('nav', item.labelKey)}
            >
              <span className="nav-link-icon-wrap" aria-hidden>
                <item.Icon className="nav-link-icon-svg" size={20} />
              </span>
              <span className="nav-link-label">{t('nav', item.labelKey)}</span>
              {item.badge > 0 && <span className="nav-link-badge">{item.badge}</span>}
            </button>
          ))}
        </div>

        {/* Langue FR / EN (caché sur Home : présent dans la barre localisation) */}
        {!showHomeExtras && (
          <div className="navbar-lang-wrap" ref={langWrapRef}>
            <button
              type="button"
              className="navbar-lang-btn"
              onClick={() => setShowLangMenu(!showLangMenu)}
              title={t('navbar', 'changeLanguage')}
              aria-label={t('navbar', 'changeLanguage')}
            >
              <FaGlobe className="navbar-lang-icon" size={22} aria-hidden />
              <span className="navbar-lang-code">{language.toUpperCase()}</span>
            </button>
            {showLangMenu && (
              <div className="navbar-lang-dropdown">
                <button type="button" className={language === 'fr' ? 'active' : ''} onClick={() => { setLanguage('fr'); setShowLangMenu(false); }}>{t('common', 'french')}</button>
                <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => { setLanguage('en'); setShowLangMenu(false); }}>{t('common', 'english')}</button>
              </div>
            )}
          </div>
        )}

        <div className="navbar-user" ref={userWrapRef}>
          <button
            type="button"
            className="user-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={user?.nom || t('common', 'user')}
            aria-label={t('navbar', 'userMenu')}
          >
            <div className="user-avatar">
              {user?.photo ? (
                <img src={user.photo.startsWith('http') ? user.photo : `${BASE_URL}${user.photo}`} alt={user?.nom || 'User'} className="user-avatar-img" />
              ) : (
                <span className="user-avatar-initial">{user?.nom?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <span className="user-name">{user?.nom || t('common', 'user')}</span>
          </button>
          {showUserMenu && (
            <div className="user-dropdown">
              {sectionLinks.length > 0 && (
                <>
                  {sectionLinks.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="user-dropdown-row"
                      onClick={() => {
                        if (onScrollToSection) onScrollToSection(item.id);
                        setShowUserMenu(false);
                      }}
                    >
                      <FaMapPin className="user-dropdown-row-icon" aria-hidden />
                      {t('navbar', item.labelKey)}
                    </button>
                  ))}
                  <div className="user-dropdown-divider" />
                </>
              )}
              <button type="button" className="user-dropdown-row" onClick={() => { navigate('/factures'); setShowUserMenu(false); }}>
                <FaFileInvoice className="user-dropdown-row-icon" aria-hidden />
                {t('nav', 'invoices')}
              </button>
              <button type="button" className="user-dropdown-row" onClick={() => { navigate('/settings'); setShowUserMenu(false); }}>
                <FaCog className="user-dropdown-row-icon" aria-hidden />
                {t('nav', 'settings')}
              </button>
              <button type="button" className="user-dropdown-row" onClick={() => { logout(); setShowUserMenu(false); }}>
                <FaSignOutAlt className="user-dropdown-row-icon" aria-hidden />
                {t('nav', 'logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
    <div className="top-navbar-spacer" aria-hidden="true" />
    </>
  );
};

export default TopNavbar;
