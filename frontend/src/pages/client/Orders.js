import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import BottomNavbar from '../../components/BottomNavbar';
import TopNavbar from '../../components/TopNavbar';
import PageLoader from '../../components/PageLoader';
import './Orders.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const Orders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Retour après paiement KkiaPay (callback URL)
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
  }, [location.search]);

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
      'en_attente': '#FFA500',
      'confirmee': '#2196F3',
      'en_preparation': '#9C27B0',
      'en_livraison': '#00BCD4',
      'livree': '#4CAF50',
      'annulee': '#F44336'
    };
    return colors[statut] || '#666';
  };

  const getStatutLabel = (statut) => {
    const labels = {
      'en_attente': 'En attente',
      'confirmee': 'Confirmée',
      'en_preparation': 'En préparation',
      'en_livraison': 'En livraison',
      'livree': 'Livrée',
      'annulee': 'Annulée'
    };
    return labels[statut] || statut;
  };

  if (loading) {
    return <PageLoader message="Chargement de vos commandes..." />;
  }

  return (
    <div className="orders-page">
      <TopNavbar />
      <div className="orders-header-mobile">
        <button className="back-btn-icon" onClick={() => navigate('/home')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1>Mes commandes</h1>
      </div>

      <div className="orders-content">
        {commandes.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📦</div>
            <h2>Aucune commande</h2>
            <p>Vous n'avez pas encore passé de commande</p>
            <button className="btn btn-primary" onClick={() => navigate('/home')}>
              Découvrir les plats
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
                        src={String(commande.restaurant.logo).startsWith('http') ? commande.restaurant.logo : `${BASE_URL}${commande.restaurant.logo}`}
                        alt={commande.restaurant.nom}
                      />
                    )}
                    <div>
                      <h3>{commande.restaurant?.nom}</h3>
                      <p className="order-date">
                        {new Date(commande.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div
                    className="order-statut"
                    style={{ backgroundColor: getStatutColor(commande.statut) }}
                  >
                    {getStatutLabel(commande.statut)}
                  </div>
                </div>

                <div className="order-plats">
                  {(commande.plats || []).map((item, index) => (
                    <div key={index} className="order-plat-item">
                      <span>{item.plat?.nom} x {item.quantite}</span>
                      <span>{(item.prix * item.quantite).toFixed(2)} FCFA</span>
                    </div>
                  ))}
                  {(commande.produits || []).map((item, index) => (
                    <div key={`p-${index}`} className="order-plat-item">
                      <span>{item.produit?.nom} x {item.quantite}</span>
                      <span>{(item.prix * item.quantite).toFixed(2)} FCFA</span>
                    </div>
                  ))}
                </div>

                <div className="order-total">
                  <strong>Total: {commande.total.toFixed(2)} FCFA</strong>
                </div>
                {commande.paiementEnLigneEffectue && commande.modePaiement === 'momo_avant' && (
                  <button
                    type="button"
                    className="btn btn-secondary order-receipt-btn"
                    onClick={() => navigate(`/facture/${commande._id}`)}
                  >
                    Voir le reçu / facture
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNavbar />
    </div>
  );
};

export default Orders;
