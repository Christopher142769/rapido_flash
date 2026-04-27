import React, { useState, useEffect, useContext, useId } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import LanguageContext from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import './BottomNavbar.css';

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const BottomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { unreadMessages } = useNotifications();
  const [cartCount, setCartCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [seenCartCount, setSeenCartCount] = useState(() => Number(localStorage.getItem('seenCartCount') || 0));
  const [seenOrdersCount, setSeenOrdersCount] = useState(() => Number(localStorage.getItem('seenOrdersCount') || 0));
  const [seenMessagesCount, setSeenMessagesCount] = useState(() => Number(localStorage.getItem('seenMessagesCount') || 0));
  const isClient = user?.role === 'client';

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

  useEffect(() => {
    if (location.pathname === '/cart') {
      localStorage.setItem('seenCartCount', String(cartCount));
      setSeenCartCount(cartCount);
    }
    if (location.pathname === '/orders') {
      localStorage.setItem('seenOrdersCount', String(activeOrdersCount));
      setSeenOrdersCount(activeOrdersCount);
    }
    if (location.pathname === '/chats' || location.pathname.startsWith('/chat/')) {
      localStorage.setItem('seenMessagesCount', String(unreadMessages));
      setSeenMessagesCount(unreadMessages);
    }
  }, [location.pathname, cartCount, activeOrdersCount, unreadMessages]);

  const cartBadge = Math.max(0, cartCount - seenCartCount);
  const ordersBadge = Math.max(0, activeOrdersCount - seenOrdersCount);
  const messagesBadge = Math.max(0, unreadMessages - seenMessagesCount);

  useEffect(() => {
    if (!isClient) return undefined;
    let mounted = true;

    const fetchActiveOrders = async () => {
      try {
        const res = await axios.get(`${API_URL}/commandes/my-commandes`);
        const list = Array.isArray(res.data) ? res.data : [];
        const activeCount = list.filter((c) => !['livree', 'annulee'].includes(String(c?.statut || ''))).length;
        if (mounted) setActiveOrdersCount(activeCount);
      } catch (_) {
        if (mounted) setActiveOrdersCount(0);
      }
    };

    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isClient, location.pathname]);

  const invoicesActive =
    location.pathname === '/factures' || location.pathname.startsWith('/facture/');

  const chatsActive =
    location.pathname === '/chats' || location.pathname.startsWith('/chat/');

  const dockId = useId().replace(/:/g, '');

  return (
    <div className="bottom-navbar-mobile-shell">
      <div className="bottom-navbar-mobile-inner">
        <nav className="bottom-navbar-mobile-bar" aria-label="Navigation principale">
          <svg
            className="bottom-navbar-mobile-bar__shape"
            viewBox="0 0 400 100"
            preserveAspectRatio="xMidYMax meet"
            aria-hidden
          >
            <defs>
              <linearGradient id={`bn-fill-${dockId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#fffdf6" />
                <stop offset="100%" stopColor="#fff3d4" />
              </linearGradient>
              <linearGradient id={`bn-stroke-${dockId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 215, 0, 0.45)" />
                <stop offset="40%" stopColor="rgba(139, 69, 19, 0.14)" />
                <stop offset="100%" stopColor="rgba(101, 67, 33, 0.12)" />
              </linearGradient>
              <linearGradient id={`bn-shine-${dockId}`} x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.85)" />
                <stop offset="22%" stopColor="rgba(255, 255, 255, 0.15)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
              </linearGradient>
            </defs>
            {/* Super-pilule : bas & haut très arrondis, encoche en U fluide au centre (FAB) */}
            <path
              fill={`url(#bn-fill-${dockId})`}
              stroke={`url(#bn-stroke-${dockId})`}
              strokeWidth="1.25"
              d="M 28 92 H 372 C 386 92 394 84 394 72 V 32 C 394 14 384 6 370 6 H 288 C 268 6 248 38 200 38 C 152 38 132 6 112 6 H 30 C 16 6 6 14 6 32 V 72 C 6 84 14 92 28 92 Z"
            />
            <path
              fill={`url(#bn-shine-${dockId})`}
              d="M 28 92 H 372 C 386 92 394 84 394 72 V 32 C 394 14 384 6 370 6 H 288 C 268 6 248 38 200 38 C 152 38 132 6 112 6 H 30 C 16 6 6 14 6 32 V 72 C 6 84 14 92 28 92 Z"
              opacity="0.4"
            />
          </svg>

          <div
            className={`bottom-navbar-mobile-bar__row${isClient ? ' bottom-navbar-mobile-bar__row--with-messages' : ''}`}
          >
            <button
              type="button"
              className={`nav-item nav-item--tab ${location.pathname === '/home' ? 'active' : ''}`}
              onClick={() => navigate('/home')}
            >
              <svg className="nav-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="nav-label">{t('nav', 'home')}</span>
            </button>

            <button
              type="button"
              className={`nav-item nav-item--tab ${location.pathname === '/orders' ? 'active' : ''}`}
              onClick={() => navigate('/orders')}
            >
              <svg className="nav-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L16 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="nav-label">{t('nav', 'orders')}</span>
              {isClient && ordersBadge > 0 && (
                <span className="nav-badge nav-badge--tab nav-badge--orders" aria-hidden>
                  {ordersBadge > 99 ? '99+' : ordersBadge}
                </span>
              )}
            </button>

            {isClient && (
              <button
                type="button"
                className={`nav-item nav-item--tab ${chatsActive ? 'active' : ''}`}
                onClick={() => navigate('/chats')}
              >
                <svg className="nav-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="nav-label">{t('nav', 'messages')}</span>
                {messagesBadge > 0 && (
                  <span className="nav-badge nav-badge--tab" aria-hidden>
                    {messagesBadge > 99 ? '99+' : messagesBadge}
                  </span>
                )}
              </button>
            )}

            <span className="nav-tab-spacer" aria-hidden />

            <button
              type="button"
              className={`nav-item nav-item--tab ${invoicesActive ? 'active' : ''}`}
              onClick={() => navigate('/factures')}
            >
              <svg className="nav-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="nav-label">{t('nav', 'invoices')}</span>
            </button>

            <button
              type="button"
              className={`nav-item nav-item--tab ${location.pathname === '/settings' ? 'active' : ''}`}
              onClick={() => navigate('/settings')}
            >
              {user?.photo ? (
                <div className="nav-icon-user-photo">
                  <img
                    src={user.photo.startsWith('http') ? user.photo : `${BASE_URL}${user.photo}`}
                    alt=""
                  />
                </div>
              ) : (
                <svg className="nav-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.01129 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              <span className="nav-label">{t('nav', 'settings')}</span>
            </button>
          </div>

          <div className="bottom-navbar-home-indicator" aria-hidden />
        </nav>

        <button
          type="button"
          className={`bottom-navbar-fab ${location.pathname === '/cart' ? 'bottom-navbar-fab--active' : ''}`}
          onClick={() => navigate('/cart')}
          aria-label={t('nav', 'cart')}
        >
          <span className="bottom-navbar-fab__inner">
            <svg className="bottom-navbar-fab__icon" width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V17C17 18.1 17.9 19 19 19C20.1 19 21 18.1 21 17V13M9 19.5C9.8 19.5 10.5 20.2 10.5 21C10.5 21.8 9.8 22.5 9 22.5C8.2 22.5 7.5 21.8 7.5 21C7.5 20.2 8.2 19.5 9 19.5ZM20 19.5C20.8 19.5 21.5 20.2 21.5 21C21.5 21.8 20.8 22.5 20 22.5C19.2 22.5 18.5 21.8 18.5 21C18.5 20.2 19.2 19.5 20 19.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          {cartBadge > 0 && <span className="nav-badge nav-badge--fab">{cartBadge > 99 ? '99+' : cartBadge}</span>}
        </button>
      </div>
    </div>
  );
};

export default BottomNavbar;
