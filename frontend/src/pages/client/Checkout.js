import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import TopNavbar from '../../components/TopNavbar';
import './Checkout.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { user, updatePosition } = useContext(AuthContext);
  const { showSuccess, showError, showWarning } = useModal();
  const [cart, setCart] = useState([]);
  const [deliveryOption, setDeliveryOption] = useState('current'); // 'current' or 'map'
  const [mapPosition, setMapPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [fraisLivraison, setFraisLivraison] = useState(0);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (savedCart.length === 0) {
      navigate('/home');
      return;
    }
    setCart(savedCart);
    const rid = savedCart[0].restaurantId;
    setRestaurantId(rid);

    // Récupérer les informations du restaurant pour obtenir les frais de livraison
    if (rid) {
      axios.get(`${API_URL}/restaurants/${rid}`)
        .then(res => {
          setRestaurant(res.data);
          setFraisLivraison(res.data.fraisLivraison || 0);
        })
        .catch(err => console.error('Erreur récupération restaurant:', err));
    }

    // Position par défaut depuis localStorage ou position utilisateur
    const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
    if (userLocation.latitude) {
      setMapPosition([userLocation.latitude, userLocation.longitude]);
      setAddress(userLocation.adresse || '');
    } else if (user?.position?.latitude) {
      setMapPosition([user.position.latitude, user.position.longitude]);
      setAddress(user.position.adresse || '');
    } else {
      setMapPosition([48.8566, 2.3522]);
    }

    // Vérifier si Kkiapay est chargé
    const checkKkiapay = () => {
      if (window.Kkiapay) {
        console.log('✅ Kkiapay détecté au chargement de la page');
        return;
      }
      console.log('⚠️ Kkiapay non détecté, sera chargé dynamiquement si nécessaire');
    };
    
    // Vérifier immédiatement
    checkKkiapay();
    
    // Vérifier périodiquement pendant 3 secondes
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.Kkiapay) {
        console.log('✅ Kkiapay détecté après', attempts * 100, 'ms');
        clearInterval(interval);
      } else if (attempts > 30) { // 3 secondes max
        clearInterval(interval);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [navigate, user]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMapPosition([lat, lng]);
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
              if (data.display_name) {
                setAddress(data.display_name);
              }
            });
        },
        () => showError('Impossible de récupérer votre position', 'Erreur de géolocalisation')
      );
    }
  };

  // Fonction pour charger dynamiquement le script Kkiapay si nécessaire
  const loadKkiapayScript = () => {
    return new Promise((resolve, reject) => {
      // Si Kkiapay est déjà disponible
      if (window.Kkiapay) {
        console.log('✅ Kkiapay déjà disponible');
        resolve();
        return;
      }

      // Vérifier si le script est déjà en cours de chargement
      const existingScript = document.querySelector('script[src*="kkiapay"]');
      if (existingScript) {
        console.log('📜 Script Kkiapay déjà présent dans le DOM:', existingScript.src);
        console.log('🔍 État du script:', existingScript.readyState || 'N/A');
        
        // Si Kkiapay est déjà disponible, résoudre immédiatement
        if (window.Kkiapay) {
          console.log('✅ Kkiapay déjà disponible');
          resolve();
          return;
        }
        
        // Le script est présent mais Kkiapay n'est pas disponible
        // Cela signifie que le script ne s'est pas exécuté correctement
        // Supprimer l'ancien script et recharger
        console.warn('⚠️ Script présent mais Kkiapay non disponible - suppression et rechargement...');
        if (existingScript.parentNode) {
          existingScript.parentNode.removeChild(existingScript);
          console.log('🗑️ Ancien script supprimé');
        }
        // Continuer avec le chargement dynamique ci-dessous
      }

      // Charger le script dynamiquement avec plusieurs URLs de fallback
      console.log('📥 Chargement dynamique du script Kkiapay...');
      
      const kkiapayUrls = [
        'https://cdn.kkiapay.me/k.js',
        'https://cdn.kkiapay.com/k.js'
      ];
      
      let currentUrlIndex = 0;
      
      const tryLoadScript = (urlIndex) => {
        if (urlIndex >= kkiapayUrls.length) {
          console.error('❌ Toutes les URLs Kkiapay ont échoué');
          reject(new Error('Impossible de charger Kkiapay depuis toutes les URLs. Vérifiez votre connexion internet.'));
          return;
        }
        
        const url = kkiapayUrls[urlIndex];
        console.log(`🔄 Tentative ${urlIndex + 1}/${kkiapayUrls.length} avec URL: ${url}`);
        
        // Supprimer l'ancien script s'il existe
        const oldScript = document.querySelector(`script[src="${url}"]`);
        if (oldScript && oldScript.parentNode) {
          oldScript.parentNode.removeChild(oldScript);
        }
        
        const script = document.createElement('script');
        script.src = url;
        script.async = false;
        
        script.onload = () => {
          console.log('📜 Script Kkiapay chargé depuis:', url);
          console.log('🔍 Vérification de window.Kkiapay dans 1 seconde...');
          
          // Attendre un peu avant de vérifier (le script peut avoir besoin de temps pour s'initialiser)
          setTimeout(() => {
            console.log('🔍 Vérification de window.Kkiapay maintenant...');
            console.log('window.Kkiapay:', window.Kkiapay);
            console.log('typeof window.Kkiapay:', typeof window.Kkiapay);
            
            // Attendre que Kkiapay soit disponible - timeout à 15 secondes
            let attempts = 0;
            let resolved = false;
            const checkKkiapay = setInterval(() => {
              attempts++;
              if (window.Kkiapay) {
                if (!resolved) {
                  resolved = true;
                  clearInterval(checkKkiapay);
                  console.log('✅ Kkiapay initialisé après chargement dynamique (', attempts * 100, 'ms)');
                  console.log('🔍 Type de Kkiapay:', typeof window.Kkiapay);
                  resolve();
                }
              } else if (attempts > 150 && !resolved) { // 15 secondes max
                resolved = true;
                clearInterval(checkKkiapay);
                console.warn('⚠️ Kkiapay non disponible après chargement depuis', url, 'après', attempts * 100, 'ms');
                console.warn('🔍 window.Kkiapay est toujours:', window.Kkiapay);
                // Essayer l'URL suivante
                if (urlIndex < kkiapayUrls.length - 1) {
                  console.log('🔄 Essai avec URL alternative...');
                  tryLoadScript(urlIndex + 1);
                } else {
                  reject(new Error('Kkiapay script chargé mais non disponible après 15 secondes depuis toutes les URLs. Le script peut être bloqué, l\'URL peut être incorrecte, ou il y a une erreur dans le script.'));
                }
              }
            }, 100);
          }, 1000); // Attendre 1 seconde après le onload avant de commencer à vérifier
        };
        
        script.onerror = (error) => {
          console.error(`❌ Erreur chargement depuis ${url}:`, error);
          // Essayer l'URL suivante
          if (urlIndex < kkiapayUrls.length - 1) {
            console.log('🔄 Essai avec URL alternative...');
            tryLoadScript(urlIndex + 1);
          } else {
            reject(new Error(`Erreur lors du chargement du script Kkiapay depuis toutes les URLs. Vérifiez votre connexion internet.`));
          }
        };
        
        document.head.appendChild(script);
        console.log('📤 Script Kkiapay ajouté au DOM');
      };
      
      tryLoadScript(0);
    });
  };

  const handlePayment = async () => {
    if (!mapPosition) {
      showWarning('Veuillez sélectionner une adresse de livraison', 'Adresse requise');
      return;
    }

    setLoading(true);

    try {
      // Mettre à jour la position de l'utilisateur
      await updatePosition(mapPosition[0], mapPosition[1], address);

      // Créer la commande
      const plats = cart.map(item => ({
        platId: item.platId,
        quantite: item.quantite
      }));

      const commandeData = {
        restaurantId,
        plats,
        adresseLivraison: {
          latitude: mapPosition[0],
          longitude: mapPosition[1],
          adresse: address
        }
      };

      const res = await axios.post(`${API_URL}/commandes`, commandeData);
      const commande = res.data;
      
      // Calculer le total avec frais de livraison
      const sousTotal = getTotal();
      const total = sousTotal + fraisLivraison;

      // Charger Kkiapay si nécessaire
      try {
        console.log('🔄 Tentative de chargement de Kkiapay...');
        console.log('window.Kkiapay avant chargement:', typeof window.Kkiapay, window.Kkiapay);
        await loadKkiapayScript();
        console.log('✅ Kkiapay chargé avec succès');
        console.log('window.Kkiapay après chargement:', typeof window.Kkiapay, window.Kkiapay);
      } catch (error) {
        console.error('❌ Erreur chargement Kkiapay:', error);
        console.error('Message d\'erreur:', error.message);
        console.error('Stack:', error.stack);
        showError(`Erreur lors du chargement du service de paiement: ${error.message}. Veuillez rafraîchir la page et réessayer.`, 'Erreur de chargement');
        setLoading(false);
        return;
      }

      // Intégration Kkiapay
      if (window.Kkiapay) {
        console.log('Initialisation Kkiapay avec montant:', total);
        window.Kkiapay.init({
          public_key: process.env.REACT_APP_KKIAPAY_PUBLIC_KEY || '261f38e09ef211f0989243766f89f726',
          amount: total,
          position: 'center',
          theme: '#8B4513',
          sandbox: process.env.REACT_APP_KKIAPAY_SANDBOX === 'true' || false,
          data: {
            commandeId: commande._id,
            restaurantId: restaurantId,
            clientId: user?._id
          },
          callback: async (response) => {
            console.log('Réponse Kkiapay:', response);
            if (response.status === 'success') {
              // Mettre à jour le statut de la commande
              try {
                await axios.put(`${API_URL}/commandes/${commande._id}/statut`, {
                  statut: 'confirmee'
                });
                
                // Vider le panier
                localStorage.removeItem('cart');
                
                showSuccess('Paiement effectué avec succès !', 'Paiement réussi');
                setTimeout(() => navigate('/orders'), 1500);
              } catch (error) {
                console.error('Erreur mise à jour commande:', error);
                showWarning('Paiement effectué mais erreur lors de la mise à jour de la commande', 'Attention');
              }
            } else {
              showWarning('Paiement annulé ou échoué', 'Paiement annulé');
            }
            setLoading(false);
          },
          error: (error) => {
            console.error('Erreur Kkiapay:', error);
            showError('Erreur lors du paiement. Veuillez réessayer.', 'Erreur de paiement');
            setLoading(false);
          }
        });
        
        window.Kkiapay.open();
      } else {
        // Fallback si Kkiapay n'est toujours pas disponible
        console.error('Kkiapay n\'est pas disponible après chargement');
        showError('Service de paiement non disponible. Veuillez rafraîchir la page et réessayer.', 'Service indisponible');
        setLoading(false);
      }
    } catch (error) {
      console.error('Erreur:', error);
      showError('Erreur lors de la commande. Veuillez réessayer.', 'Erreur');
      setLoading(false);
    }
  };

  const getSubTotal = () => {
    return cart.reduce((sum, item) => sum + (item.prix * item.quantite), 0);
  };

  const getTotal = () => {
    return getSubTotal() + fraisLivraison;
  };

  return (
    <div className="checkout-page">
      <TopNavbar />
      <div className="checkout-header-mobile">
        <button className="back-btn-mobile" onClick={() => navigate('/cart')}>
          ← Retour
        </button>
        <h1>Finaliser la commande</h1>
      </div>

      <div className="checkout-content">
        <div className="checkout-main">
          <div className="delivery-section">
            <h2>Adresse de livraison</h2>
            
            <div className="delivery-options">
              <button
                className={`option-btn ${deliveryOption === 'current' ? 'active' : ''}`}
                onClick={() => {
                  setDeliveryOption('current');
                  getCurrentLocation();
                }}
              >
                📍 Utiliser ma position actuelle
              </button>
              <button
                className={`option-btn ${deliveryOption === 'map' ? 'active' : ''}`}
                onClick={() => setDeliveryOption('map')}
              >
                🗺️ Choisir sur la carte
              </button>
            </div>

            {mapPosition && (
              <div className="map-container">
                <MapContainer
                  center={mapPosition}
                  zoom={15}
                  style={{ height: '300px', width: '100%', borderRadius: '12px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                </MapContainer>
              </div>
            )}

            {address && (
              <div className="address-display">
                <strong>Adresse:</strong> {address}
              </div>
            )}
          </div>

          <div className="order-summary-section">
            <h2>Récapitulatif</h2>
            <div className="order-items">
              {cart.map((item) => (
                <div key={item.platId} className="order-item">
                  <span>{item.nom} x {item.quantite}</span>
                  <span>{(item.prix * item.quantite).toFixed(2)} FCFA</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="checkout-sidebar">
          <div className="payment-summary">
            <h2>Total</h2>
            <div className="summary-row">
              <span>Sous-total</span>
              <span>{getSubTotal().toFixed(2)} FCFA</span>
            </div>
            <div className="summary-row">
              <span>Frais de livraison</span>
              <span>{fraisLivraison.toFixed(2)} FCFA</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{getTotal().toFixed(2)} FCFA</span>
            </div>
            <button
              className="btn btn-primary btn-large"
              onClick={handlePayment}
              disabled={loading || !mapPosition}
            >
              {loading ? 'Traitement...' : 'Payer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
