import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaChevronRight, FaRoute } from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import BottomNavbar from '../../components/BottomNavbar';
import TopNavbar from '../../components/TopNavbar';
import PageLoader from '../../components/PageLoader';
import { openOrderTrackingWhatsApp } from '../../utils/orderTrackingWhatsApp';
import './Orders.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const Orders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Retour après redirection paiement (URL de callback éventuelle)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentSuccess = params.get('payment') === 'success';
    const commandeId = params.get('commandeId');
    if (paymentSuccess && commandeId) {
      axios
        .put(`${API_URL}/commandes/${commandeId}/statut`, { statut: 'confirmee' })
        .then(() => {
          localStorage.removeItem('cart');
          window.history.replaceState({}, '', '/orders');
          navigate(`/facture/${commandeId}`);
        })
        .catch(() => {});
    }
  }, [location.search, navigate]);

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    try {
      const res = await axios.get(`${API_URL}/commandes/my-commandes`);
      setCommandes(res.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatutColor = (statut) => {
    const colors = {
      en_attente: '#FFA500',
      confirmee: '#2196F3',
      en_preparation: '#9C27B0',
      en_livraison: '#00BCD4',
      livree: '#4CAF50',
      annulee: '#F44336',
    };
    return colors[statut] || '#666';
  };

  const statutLabel = useCallback(
    (statut) => {
      const map = {
        en_attente: 'statusPending',
        confirmee: 'statusConfirmed',
        en_preparation: 'statusPreparing',
        en_livraison: 'statusDelivery',
        livree: 'statusDelivered',
        annulee: 'statusCancelled',
      };
      const k = map[statut];
      return k ? t('orders', k) : statut;
    },
    [t]
  );

  const openTrackingWhatsApp = useCallback(
    (commande) => {
      openOrderTrackingWhatsApp(commande, { language, t, user });
    },
    [language, t, user]
  );

  if (loading) {
    return <PageLoader message={t('orders', 'loading')} />;
  }

  return (
    <div className="orders-page">
      <TopNavbar />
      <div className="orders-header-mobile">
        <button type="button" className="back-btn-icon" onClick={() => navigate('/home')} aria-label={t('store', 'back')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15 18L9 12L15 6"
              stroke="#8B4513"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1>{t('orders', 'pageTitle')}</h1>
      </div>

      <div className="orders-content">
        <div className="orders-shell">
          <header className="orders-desktop-head">
            <h1>{t('orders', 'pageTitle')}</h1>
          </header>
        {commandes.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon" aria-hidden>
              📦
            </div>
            <h2>{t('orders', 'noOrders')}</h2>
            <p>{t('orders', 'noOrdersBody')}</p>
            <button type="button" className="btn btn-primary orders-empty-cta" onClick={() => navigate('/home')}>
              {t('orders', 'browseProducts')}
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {commandes.map((commande) => (
              <div key={commande._id} className="order-card">
                <div className="order-header">
                  <div className="order-restaurant">
                    {commande.restaurant?.logo && (
                      <img
                        src={
                          String(commande.restaurant.logo).startsWith('http')
                            ? commande.restaurant.logo
                            : `${BASE_URL}${commande.restaurant.logo}`
                        }
                        alt=""
                      />
                    )}
                    <div>
                      <h3>{commande.restaurant?.nom}</h3>
                      <p className="order-date">
                        {new Date(commande.createdAt).toLocaleDateString(
                          String(language || '').toLowerCase().startsWith('en') ? 'en-GB' : 'fr-FR',
                          {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="order-statut" style={{ backgroundColor: getStatutColor(commande.statut) }}>
                    {statutLabel(commande.statut)}
                  </div>
                </div>

                <div className="order-plats">
                  {(commande.plats || []).map((item, index) => (
                    <div key={index} className="order-plat-item">
                      <span>
                        {item.plat?.nom} × {item.quantite}
                      </span>
                      <span>{(item.prix * item.quantite).toFixed(2)} FCFA</span>
                    </div>
                  ))}
                  {(commande.produits || []).map((item, index) => (
                    <div key={`p-${index}`} className="order-plat-item">
                      <span>
                        {item.produit?.nom} × {item.quantite}
                      </span>
                      <span>{(item.prix * item.quantite).toFixed(2)} FCFA</span>
                    </div>
                  ))}
                </div>

                <div className="order-total">
                  <strong>
                    {t('orders', 'totalLabel')}: {commande.total.toFixed(2)} FCFA
                  </strong>
                </div>

                <div className="order-actions-stack">
                  <button
                    type="button"
                    className="order-follow-cta"
                    onClick={() => openTrackingWhatsApp(commande)}
                    aria-label={t('orders', 'followOrderAria')}
                  >
                    <span className="order-follow-cta-left">
                      <span className="order-follow-cta-icon" aria-hidden>
                        <FaRoute size={20} />
                      </span>
                      <span className="order-follow-cta-label">{t('orders', 'followOrder')}</span>
                    </span>
                    <FaChevronRight className="order-follow-cta-chevron" aria-hidden />
                  </button>
                  {commande.paiementEnLigneEffectue && commande.modePaiement === 'momo_avant' && (
                    <button
                      type="button"
                      className="btn btn-secondary order-receipt-btn"
                      onClick={() => navigate(`/facture/${commande._id}`)}
                    >
                      {t('orders', 'viewReceipt')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default Orders;
