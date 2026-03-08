import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import './RestaurantCommandes.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RestaurantCommandes = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [commandes, setCommandes] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const restaurantsRes = await axios.get(`${API_URL}/restaurants/my/restaurants`);
      setRestaurants(restaurantsRes.data);
      
      if (restaurantsRes.data.length > 0) {
        const restaurantId = restaurantsRes.data[0]._id;
        setSelectedRestaurant(restaurantId);
        const commandesRes = await axios.get(`${API_URL}/commandes/restaurant/${restaurantId}`);
        setCommandes(commandesRes.data);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (commandeId, nouveauStatut) => {
    try {
      await axios.put(`${API_URL}/commandes/${commandeId}/statut`, {
        statut: nouveauStatut
      });
      await fetchData();
      alert('Statut mis à jour');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
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
    return <div className="loading-state">Chargement...</div>;
  }

  return (
    <div className="dashboard-page">
      <DashboardSidebar onLogout={logout} />
      <div className="dashboard-main">
        <div className="commandes-page">
          <div className="commandes-content">
        <div className="commandes-header">
          <h1>Commandes</h1>
          {restaurants.length > 0 && (
            <select
              className="restaurant-select"
              value={selectedRestaurant || ''}
              onChange={async (e) => {
                setSelectedRestaurant(e.target.value);
                const res = await axios.get(`${API_URL}/commandes/restaurant/${e.target.value}`);
                setCommandes(res.data);
              }}
            >
              {restaurants.map(resto => (
                <option key={resto._id} value={resto._id}>{resto.nom}</option>
              ))}
            </select>
          )}
        </div>

        {commandes.length === 0 ? (
          <div className="no-commandes">
            <p>Aucune commande pour le moment</p>
          </div>
        ) : (
          <div className="commandes-list">
            {commandes.map((commande) => (
              <div key={commande._id} className="commande-card">
                <div className="commande-header">
                  <div className="commande-info">
                    <h3>Commande #{commande._id.slice(-6)}</h3>
                    <p className="commande-date">
                      {new Date(commande.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div
                    className="commande-statut"
                    style={{ backgroundColor: getStatutColor(commande.statut) }}
                  >
                    {getStatutLabel(commande.statut)}
                  </div>
                </div>

                <div className="commande-client">
                  <h4>Client:</h4>
                  <p><strong>{commande.client?.nom}</strong></p>
                  {commande.client?.email && <p>✉️ {commande.client.email}</p>}
                  {commande.client?.telephone && <p>📞 {commande.client.telephone}</p>}
                </div>

                <div className="commande-plats">
                  <h4>Plats:</h4>
                  {commande.plats.map((item, index) => (
                    <div key={index} className="plat-item">
                      <span>{item.plat?.nom} x {item.quantite}</span>
                      <span>{(item.prix * item.quantite).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>

                <div className="commande-livraison">
                  <h4>Adresse de livraison:</h4>
                  {commande.adresseLivraison?.adresse ? (
                    <p>{commande.adresseLivraison.adresse}</p>
                  ) : (
                    <p>
                      Lat: {commande.adresseLivraison?.latitude?.toFixed(6)}, 
                      Lng: {commande.adresseLivraison?.longitude?.toFixed(6)}
                    </p>
                  )}
                </div>

                <div className="commande-total">
                  <strong>Total: {commande.total.toFixed(2)} €</strong>
                </div>

                <div className="commande-actions">
                  {commande.statut === 'en_attente' && (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={() => updateStatut(commande._id, 'confirmee')}
                      >
                        Confirmer
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => updateStatut(commande._id, 'annulee')}
                      >
                        Annuler
                      </button>
                    </>
                  )}
                  {commande.statut === 'confirmee' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => updateStatut(commande._id, 'en_preparation')}
                    >
                      En préparation
                    </button>
                  )}
                  {commande.statut === 'en_preparation' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => updateStatut(commande._id, 'en_livraison')}
                    >
                      En livraison
                    </button>
                  )}
                  {commande.statut === 'en_livraison' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => updateStatut(commande._id, 'livree')}
                    >
                      Marquer comme livrée
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCommandes;
