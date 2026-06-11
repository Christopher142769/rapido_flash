import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import LanguageContext from '../../context/LanguageContext';
import { useModal } from '../../context/ModalContext';
import PageLoader from '../../components/PageLoader';
import './RestaurantCommandes.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RestaurantCommandes = () => {
  const { t } = React.useContext(LanguageContext);
  const { showSuccess, showError } = useModal();
  const navigate = useNavigate();
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
    const appOrders = selectedRestaurant
      ? allCommandes.filter((c) => {
          const rid = c.restaurant?._id || c.restaurant;
          return rid && String(rid) === String(selectedRestaurant);
        })
      : allCommandes;

    return [...appOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allCommandes, selectedRestaurant]);

  const updateStatut = async (commande, nouveauStatut) => {
    try {
      const isShop = commande.source === 'shop';
      const url = isShop
        ? `${API_URL}/shop-orders/${commande._id}/statut`
        : `${API_URL}/commandes/${commande._id}/statut`;
      await axios.put(url, { statut: nouveauStatut });
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

  const renderPhoneLink = (phone) => {
    const trimmed = typeof phone === 'string' ? phone.trim() : '';
    if (!trimmed) return <span>{t('commandesPage', 'notProvided')}</span>;
    const telDigits = trimmed.replace(/[^\d+]/g, '');
    const href = telDigits ? `tel:${telDigits}` : null;
    return href ? (
      <a href={href} className="commande-livraison-phone-link">
        {trimmed}
      </a>
    ) : (
      <span>{trimmed}</span>
    );
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

        {!selectedRestaurant ? (
          <p className="commandes-shop-hint">
            Les commandes <strong>Shop express</strong> sont gérées dans{' '}
            <button
              type="button"
              className="commandes-shop-link"
              onClick={() => navigate('/dashboard/commercial-commandes')}
            >
              Commandes Shop
            </button>{' '}
            (même vue admin et commercial, statuts synchronisés).
          </p>
        ) : null}

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
            {filteredCommandes.map((commande) => {
              const isShop = commande.source === 'shop';
              return (
                <div
                  key={`${isShop ? 'shop' : 'app'}-${commande._id}`}
                  className={`commande-card${isShop ? ' commande-card--shop' : ''}`}
                >
                  <div className="commande-header">
                    <div className="commande-info">
                      <h3>
                        Commande #{commande._id.slice(-6)}
                        {isShop ? <span className="commande-shop-badge">Shop express</span> : null}
                      </h3>
                      {isShop ? (
                        <p className="commande-structure-name">
                          <span className="commande-structure-label">Canal:</span> Lien Shop Rapido
                          {commande.shopLine?.slug ? (
                            <>
                              {' '}
                              ·{' '}
                              <Link to={`/shop/${commande.shopLine.slug}`} target="_blank" rel="noopener noreferrer">
                                Voir la fiche
                              </Link>
                            </>
                          ) : null}
                        </p>
                      ) : (
                        commande.restaurant?.nom && (
                          <p className="commande-structure-name">
                            <span className="commande-structure-label">
                              {t('commandesPage', 'structureLabel')}:
                            </span>{' '}
                            {commande.restaurant.nom}
                          </p>
                        )
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
                    {!isShop && commande.client?.email && <p>✉️ {commande.client.email}</p>}
                    {(commande.client?.telephone || commande.adresseLivraison?.telephoneContact) && (
                      <p>📞 {commande.client?.telephone || commande.adresseLivraison?.telephoneContact}</p>
                    )}
                  </div>

                  {isShop ? (
                    <div className="commande-plats">
                      <h4>Produit Shop:</h4>
                      <div className="plat-item">
                        <span>
                          {commande.shopLine?.productName} · {commande.shopLine?.quantityLabel}
                        </span>
                        <span>{Number(commande.total || 0).toFixed(0)} FCFA</span>
                      </div>
                      {commande.shopLine?.freeDelivery ? (
                        <p className="commande-shop-free-delivery">Livraison gratuite (promo)</p>
                      ) : null}
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}

                  <div className="commande-livraison">
                    <h4>{t('commandesPage', 'deliveryAddressTitle')}</h4>
                    {commande.adresseLivraison?.adresse ? (
                      <p>{commande.adresseLivraison.adresse}</p>
                    ) : commande.adresseLivraison?.latitude != null &&
                      commande.adresseLivraison?.longitude != null ? (
                      <p>
                        Lat: {commande.adresseLivraison.latitude.toFixed(6)}, Lng:{' '}
                        {commande.adresseLivraison.longitude.toFixed(6)}
                      </p>
                    ) : (
                      <p>{t('commandesPage', 'notProvided')}</p>
                    )}
                    <div className="commande-livraison-extra">
                      <div className="commande-livraison-row">
                        <span className="commande-livraison-label">
                          {isShop ? 'WhatsApp / téléphone' : t('commandesPage', 'deliveryPhoneTitle')}
                        </span>
                        {renderPhoneLink(commande.adresseLivraison?.telephoneContact)}
                      </div>
                      {!isShop ? (
                        <div className="commande-livraison-row commande-livraison-instructions">
                          <span className="commande-livraison-label">
                            {t('commandesPage', 'driverInstructionsTitle')}
                          </span>
                          <span className="commande-livraison-instructions-text">
                            {commande.adresseLivraison?.instruction?.trim()
                              ? commande.adresseLivraison.instruction.trim()
                              : t('commandesPage', 'notProvided')}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="commande-total">
                    <strong>Total: {Number(commande.total || 0).toFixed(0)} FCFA</strong>
                    {isShop ? <span className="commande-shop-payment">Paiement à la livraison</span> : null}
                  </div>

                  <div className="commande-actions">
                    {commande.statut === 'en_attente' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => updateStatut(commande, 'confirmee')}
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => updateStatut(commande, 'annulee')}
                        >
                          Annuler
                        </button>
                      </>
                    )}
                    {commande.statut === 'confirmee' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => updateStatut(commande, 'en_preparation')}
                      >
                        En préparation
                      </button>
                    )}
                    {commande.statut === 'en_preparation' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => updateStatut(commande, 'en_livraison')}
                      >
                        En livraison
                      </button>
                    )}
                    {commande.statut === 'en_livraison' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => updateStatut(commande, 'livree')}
                      >
                        Marquer comme livrée
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantCommandes;
