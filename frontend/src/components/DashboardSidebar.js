import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaStore,
  FaImages,
  FaLayerGroup,
  FaTags,
  FaBoxOpen,
  FaClipboardList,
  FaComments,
  FaStar,
  FaBullhorn,
  FaUsers,
} from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import LanguageContext from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import './DashboardSidebar.css';

const DashboardSidebar = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { pendingOrders, unreadMessages } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const isAdmin = user?.role === 'restaurant';
  const isGestionnaire = user?.role === 'gestionnaire';

  const menuItems = [
    { id: 'structure', label: 'Entreprise', path: '/dashboard' },
    { id: 'medias', label: 'Galerie d’images', path: '/dashboard/medias' },
    { id: 'vitrine', label: 'Vitrine accueil', path: '/dashboard/vitrine-accueil' },
    { id: 'categories-domaine', label: 'Catégories domaine', path: '/dashboard/categories-domaine' },
    { id: 'categories', label: 'Catégories produits', path: '/dashboard/categories' },
    { id: 'plats', label: 'Produits', path: '/dashboard/plats' },
    { id: 'commandes', label: 'Commandes', path: '/dashboard/commandes' },
    { id: 'messages', label: 'Messages', path: '/dashboard/messages' },
    { id: 'avis', label: t('reviews', 'sidebarReviews'), path: '/dashboard/avis' },
    { id: 'bannieres', label: 'Bannières', path: '/dashboard/bannieres' }
  ];

  if (isAdmin) {
    menuItems.push({ id: 'gestionnaires', label: 'Gestionnaires', path: '/dashboard/gestionnaires' });
  }

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const badgeForItem = (id) => {
    if (id === 'commandes') return pendingOrders;
    if (id === 'messages') return unreadMessages;
    return 0;
  };

  const iconForItem = (id) => {
    const icons = {
      structure: FaStore,
      medias: FaImages,
      vitrine: FaBullhorn,
      'categories-domaine': FaLayerGroup,
      categories: FaTags,
      plats: FaBoxOpen,
      commandes: FaClipboardList,
      messages: FaComments,
      avis: FaStar,
      bannieres: FaImages,
      gestionnaires: FaUsers,
    };
    return icons[id] || FaStore;
  };

  const handleNav = (path) => {
    setNavigating(true);
    setMenuOpen(false);
    navigate(path);
    setTimeout(() => setNavigating(false), 400);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    onLogout();
  };

  return (
    <>
      <button
        type="button"
        className="dashboard-sidebar-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
        aria-expanded={menuOpen}
      >
        <span className={menuOpen ? 'open' : ''} />
        <span className={menuOpen ? 'open' : ''} />
        <span className={menuOpen ? 'open' : ''} />
      </button>
      <div className={`dashboard-sidebar-overlay ${menuOpen ? 'visible' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside className={`dashboard-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="dashboard-sidebar-inner">
          <header className="dashboard-sidebar-header">
            <div className="dashboard-sidebar-logo" onClick={() => handleNav('/dashboard')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleNav('/dashboard')}>
              <img src="/images/logo.png" alt="Rapido Flash" className="dashboard-sidebar-logo-img" />
              <span className="dashboard-sidebar-logo-text">Rapido Flash</span>
            </div>
            <p className="dashboard-sidebar-role">
              {isAdmin ? 'Administration' : isGestionnaire ? 'Gestion' : 'Dashboard'}
            </p>
          </header>
          <nav className="dashboard-sidebar-nav">
            {menuItems.map((item) => {
              const badge = badgeForItem(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dashboard-sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => handleNav(item.path)}
                >
                  <span className="dashboard-sidebar-item-label">{item.label}</span>
                  {badge > 0 ? (
                    <span className="dashboard-sidebar-badge" aria-label={`${badge} notification(s)`}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  ) : (
                    isActive(item.path) && <span className="dashboard-sidebar-item-dot" />
                  )}
                </button>
              );
            })}
          </nav>
          <footer className="dashboard-sidebar-footer">
            <button type="button" className="dashboard-sidebar-logout" onClick={handleLogout}>
              Déconnexion
            </button>
          </footer>
        </div>
      </aside>
      <nav className="dashboard-mobile-bottom-nav" aria-label="Navigation dashboard mobile">
        <div className="dashboard-mobile-bottom-track">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const badge = badgeForItem(item.id);
            const Icon = iconForItem(item.id);
            return (
              <button
                key={`mobile-${item.id}`}
                type="button"
                className={`dashboard-mobile-bottom-item ${active ? 'active' : ''}`}
                onClick={() => handleNav(item.path)}
                aria-label={item.label}
              >
                <span className="dashboard-mobile-bottom-icon-wrap">
                  <Icon className="dashboard-mobile-bottom-icon" aria-hidden />
                  {badge > 0 && (
                    <span className="dashboard-mobile-bottom-badge" aria-hidden>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span className="dashboard-mobile-bottom-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {navigating && <div className="dashboard-nav-loading" aria-hidden="true"><span className="spinner" /></div>}
    </>
  );
};

export default DashboardSidebar;
