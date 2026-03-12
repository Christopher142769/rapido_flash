import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DashboardSidebar.css';

const DashboardSidebar = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'structure', label: 'Mon entreprise', icon: '🏪', path: '/dashboard' },
    { id: 'categories-domaine', label: 'Catégories domaine', icon: '📂', path: '/dashboard/categories-domaine' },
    { id: 'categories', label: 'Catégories produits', icon: '📁', path: '/dashboard/categories' },
    { id: 'plats', label: 'Produits', icon: '📦', path: '/dashboard/plats' },
    { id: 'commandes', label: 'Commandes', icon: '🛒', path: '/dashboard/commandes' },
    { id: 'bannieres', label: 'Bannières', icon: '🖼️', path: '/dashboard/bannieres' }
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="dashboard-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">🍔</span>
          <span className="logo-text">Rapido</span>
        </div>
        <div className="sidebar-subtitle">Dashboard Admin</div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {isActive(item.path) && <div className="active-indicator" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={onLogout}>
          <span className="sidebar-icon">🚪</span>
          <span className="sidebar-label">Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardSidebar;
