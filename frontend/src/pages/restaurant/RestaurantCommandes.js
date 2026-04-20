import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import LanguageContext from '../../context/LanguageContext';
import { useModal } from '../../context/ModalContext';
import PageLoader from '../../components/PageLoader';
import './RestaurantCommandes.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RestaurantCommandes = () => {
  const { t } = React.useContext(LanguageContext);
  const { showSuccess, showError } = useModal();
  const [allCommandes, setAllCommandes] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  /** '' = toutes les entreprises */
  const [selectedRestaurant, setSelectedRestaurant] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [restaurantsRes, commandesRes] = await Promise.all([
        axios.get(`${API_URL}/restaurants/my/restaurants`),
        axios.get(`${API_URL}/commandes/for-my-restaurants`),
      ]);
      setRestaurants(restaurantsRes.data || []);
      setAllCommandes(commandesRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCommandes = useMemo(() => {
    if (!selectedRestaurant) return allCommandes;
    return allCommandes.filter((c) => {
      const rid = c.restaurant?._id || c.restaurant;
      return rid && String(rid) === String(selectedRestaurant);
    });
  }, [allCommandes, selectedRestaurant]);

  const updateStatut = async (commandeId, nouveauStatut) => {
    try {
      await axios.put(`${API_URL}/commandes/${commandeId}/statut`, {
        statut: nouveauStatut,
      });
      await fetchData();
      showSuccess(t('commandesPage', 'statusUpdated'));
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('commandesPage', 'statusUpdateError'));
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

  const getStatutLabel = (statut) => {
    const labels = {
      en_attente: 'En attente',
      confirmee: 'Confirmée',
      en_preparation: 'En préparation',
      en_livraison: 'En livraison',
      livree: 'Livrée',
      annulee: 'Annulée',
    };
    return labels[statut] || statut;
  };

  if (loading) {
    return <PageLoader message="Chargement des commandes..." />;
  }

  return (
        <div className="commandes-page">
          <div className="commandes-content">
            <div className="commandes-header">
              <h1>Commandes</h1>
              {restaurants.length > 0 && (
                <select
                  className="restaurant-select"
                  value={selectedRestaurant}
                  onChange={(e) => setSelectedRestaurant(e.target.value)}
                >
                  <option value="">{t('commandesPage', 'allStructures')}</option>
                  {restaurants.map((resto) => (
                    <option key={resto._id} value={resto._id}>
                      {resto.nom}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {filteredCommandes.length === 0 ? (
              <div className="no-commandes">
                <p>
                  {selectedRestaurant
                    ? t('commandesPage', 'noOrdersFiltered')
                    : t('commandesPage', 'noOrders')}
                </p>
              </div>
            ) : (
              <div className="commandes-list">
                {filteredCommandes.map((commande) => (
                  <div key={commande._id} className="commande-card">
                    <div className="commande-header">
                      <div className="commande-info">
                        <h3>Commande #{commande._id.slice(-6)}</h3>
                        {commande.restaurant?.nom && (
                          <p className="commande-structure-name">
                            <span className="commande-structure-label">
                              {t('commandesPage', 'structureLabel')}:
                            </span>{' '}
                            {commande.restaurant.nom}
                          </p>
                        )}
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
                      <p>
                        <strong>{commande.client?.nom}</strong>
                      </p>
                      {commande.client?.email && <p>✉️ {commande.client.email}</p>}
                      {commande.client?.telephone && <p>📞 {commande.client.telephone}</p>}
                    </div>

                    <div className="commande-plats">
                      <h4>{t('commandesPage', 'dishLine')}:</h4>
                      {(commande.plats || []).map((item, index) => (
                        <div key={index} className="plat-item">
                          <span>
                            {item.plat?.nom} x {item.quantite}
                          </span>
                          <span>{(item.prix * item.quantite).toFixed(0)} FCFA</span>
                        </div>
                      ))}
                    </div>

                    {Array.isArray(commande.produits) && commande.produits.length > 0 && (
                      <div className="commande-plats">
                        <h4>Produits:</h4>
                        {commande.produits.map((item, index) => (
                          <div
                            key={index}
                            className="plat-item"
                            style={{ flexDirection: 'column', alignItems: 'stretch' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                              <span>
                                {item.produit?.nom} x {item.quantite}
                              </span>
                              <span>{(item.prix * item.quantite).toFixed(0)} FCFA</span>
                            </div>
                            {Array.isArray(item.accompagnements) && item.accompagnements.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {item.accompagnements.map((acc, i2) => (
                                  <span
                                    key={`${index}-${i2}`}
                                    style={{
                                      fontSize: 12,
                                      padding: '2px 8px',
                                      borderRadius: 999,
                                      background: 'rgba(139,69,19,0.08)',
                                      color: '#8B4513',
                                    }}
                                  >
                                    {acc.nom} (+{Number(acc.prixSupp || 0).toFixed(0)} FCFA)
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="commande-livraison">
                      <h4>Adresse de livraison:</h4>
                      {commande.adresseLivraison?.adresse ? (
                        <p>{commande.adresseLivraison.adresse}</p>
                      ) : (
                        <p>
                          Lat: {commande.adresseLivraison?.latitude?.toFixed(6)}, Lng:{' '}
                          {commande.adresseLivraison?.longitude?.toFixed(6)}
                        </p>
                      )}
                    </div>

                    <div className="commande-total">
                      <strong>Total: {commande.total.toFixed(0)} FCFA</strong>
                    </div>

                    <div className="commande-actions">
                      {commande.statut === 'en_attente' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => updateStatut(commande._id, 'confirmee')}
                          >
                            Confirmer
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => updateStatut(commande._id, 'annulee')}
                          >
                            Annuler
                          </button>
                        </>
                      )}
                      {commande.statut === 'confirmee' && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => updateStatut(commande._id, 'en_preparation')}
                        >
                          En préparation
                        </button>
                      )}
                      {commande.statut === 'en_preparation' && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => updateStatut(commande._id, 'en_livraison')}
                        >
                          En livraison
                        </button>
                      )}
                      {commande.statut === 'en_livraison' && (
                        <button
                          type="button"
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
  );
};

export default RestaurantCommandes;
