import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DashboardSidebar.css';

const DashboardSidebar = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'restaurants',
      label: 'Restaurants',
      icon: '🍽️',
      path: '/dashboard'
    },
    {
      id: 'plats',
      label: 'Plats',
      icon: '🍕',
      path: '/dashboard/plats'
    },
    {
      id: 'categories',
      label: 'Catégories',
      icon: '📂',
      path: '/dashboard/categories'
    },
    {
      id: 'commandes',
      label: 'Commandes',
      icon: '📦',
      path: '/dashboard/commandes'
    },
    {
      id: 'bannieres',
      label: 'Bannières',
      icon: '🖼️',
      path: '/dashboard/bannieres'
    }
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
