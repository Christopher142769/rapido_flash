import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { useModal } from '../../context/ModalContext';
import TopNavbar from '../../components/TopNavbar';
import { cartQualifiesFreeDeliveryPromo } from '../../utils/cartPromo';
import './Checkout.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// Clé publique KkiaPay (Public Api Key)
const KKIAPAY_PUBLIC_KEY = process.env.REACT_APP_KKIAPAY_PUBLIC_KEY || '261f38e09ef211f0989243766f89f726';
// Sandbox par défaut (clé sandbox). Mettre REACT_APP_KKIAPAY_SANDBOX=false en production avec clé live.
const KKIAPAY_SANDBOX = process.env.REACT_APP_KKIAPAY_SANDBOX !== 'false';

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

function MapPanToCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { user, updatePosition } = useContext(AuthContext);
  const { t, productDisplayName } = useContext(LanguageContext);
  const { showSuccess, showError, showWarning } = useModal();
  const [cart, setCart] = useState([]);
  const [deliveryOption, setDeliveryOption] = useState('current'); // 'current' or 'map'
  const [mapPosition, setMapPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [fraisLivraison, setFraisLivraison] = useState(0);
  /** especes | momo_avant | momo_apres */
  const [paymentMode, setPaymentMode] = useState('momo_avant');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [instruction, setInstruction] = useState('');
  const [telephoneContact, setTelephoneContact] = useState('');

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
      setInstruction(userLocation.instruction || '');
      setTelephoneContact(userLocation.telephoneContact || '');
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

  const handleAddressSearch = (query) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetch(`${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`, {
        headers: { 'User-Agent': 'RapidoFlash/1.0' },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const formatted = data.map((item) => ({
              place_name: item.display_name,
              geometry: { coordinates: [parseFloat(item.lon), parseFloat(item.lat)] },
            }));
            setSearchResults(formatted);
            setShowSearchResults(true);
          }
        })
        .catch(err => console.error('Recherche adresse:', err));
    }, 300);
  };

  const handleSelectSearchResult = (result) => {
    const [lng, lat] = result.geometry.coordinates;
    setMapPosition([lat, lng]);
    setAddress(result.place_name);
    setSearchQuery(result.place_name);
    setShowSearchResults(false);
    fetch(`${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: { 'User-Agent': 'RapidoFlash/1.0' },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.display_name) setAddress(d.display_name);
      })
      .catch(() => {});
  };

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
      // Le SDK KkiaPay peut exposer openKkiapayWidget OU window.Kkiapay
      const isReady = () => window.openKkiapayWidget || window.Kkiapay;
      if (isReady()) {
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="kkiapay"]');
      const url = 'https://cdn.kkiapay.me/k.js';

      const waitForReady = (maxMs = 5000) => {
        return new Promise((res) => {
          if (isReady()) {
            res();
            return;
          }
          let elapsed = 0;
          const iv = setInterval(() => {
            elapsed += 200;
            if (isReady()) {
              clearInterval(iv);
              res();
            } else if (elapsed >= maxMs) {
              clearInterval(iv);
              res(); // résoudre quand même pour tenter le paiement
            }
          }, 200);
        });
      };

      // Script déjà dans le DOM (index.html) : attendre un peu que le SDK s’initialise
      if (existingScript) {
        waitForReady(3000).then(resolve);
        return;
      }

      // Charger le script une seule fois (pas de fallback .com qui échoue)
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = () => waitForReady(5000).then(resolve);
      script.onerror = () => {
        // Ne pas bloquer : on résout pour afficher un message clair dans handlePayment
        resolve();
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!mapPosition) {
      showWarning(t('checkout', 'selectAddress'), t('checkout', 'addressRequired'));
      return;
    }

    setLoading(true);

    try {
      // Mettre à jour la position de l'utilisateur
      await updatePosition(mapPosition[0], mapPosition[1], address);
      try {
        const prev = JSON.parse(localStorage.getItem('userLocation') || '{}');
        localStorage.setItem(
          'userLocation',
          JSON.stringify({
            ...prev,
            latitude: mapPosition[0],
            longitude: mapPosition[1],
            adresse: address,
            instruction: (instruction || '').trim(),
            telephoneContact: (telephoneContact || '').trim(),
          })
        );
      } catch (_) {
        /* ignore */
      }

      const plats = cart.filter(item => item.platId != null).map(item => ({ platId: item.platId, quantite: item.quantite }));
      const produits = cart
        .filter(item => item.productId != null)
        .map(item => ({
          produitId: item.productId,
          quantite: item.quantite,
          accompagnements: Array.isArray(item.accompagnementsSelected)
            ? item.accompagnementsSelected.map((a) => ({ optionId: a.optionId }))
            : [],
        }));

      const commandeData = {
        restaurantId,
        plats: plats.length ? plats : undefined,
        produits: produits.length ? produits : undefined,
        adresseLivraison: {
          latitude: mapPosition[0],
          longitude: mapPosition[1],
          adresse: address,
          instruction: (instruction || '').trim(),
          telephoneContact: (telephoneContact || '').trim()
        },
        modePaiement: paymentMode
      };

      const res = await axios.post(`${API_URL}/commandes`, commandeData);
      const commande = res.data;

      // Espèces ou MoMo après livraison : pas de widget KkiaPay
      if (paymentMode === 'especes' || paymentMode === 'momo_apres') {
        localStorage.removeItem('cart');
        showSuccess(t('checkout', 'orderCreated'), 'Rapido');
        setTimeout(() => navigate('/orders'), 1200);
        setLoading(false);
        return;
      }
      
      const total = getTotal();

      await loadKkiapayScript();

      // URL de retour après paiement (pour redirection KkiaPay)
      const callbackUrl = `${window.location.origin}/orders?payment=success&commandeId=${commande._id}`;

      const onPaymentSuccess = async () => {
        try {
          await axios.put(`${API_URL}/commandes/${commande._id}/statut`, { statut: 'confirmee' });
          localStorage.removeItem('cart');
          showSuccess('Paiement effectué avec succès !', 'Paiement réussi');
          setTimeout(() => navigate(`/facture/${commande._id}`), 1200);
        } catch (err) {
          console.error('Erreur mise à jour commande:', err);
          showWarning('Paiement effectué mais erreur lors de la mise à jour de la commande', 'Attention');
        }
        setLoading(false);
      };

      const onPaymentFailure = () => {
        showWarning('Paiement annulé ou échoué', 'Paiement annulé');
        setLoading(false);
      };

      // Méthode 1 : openKkiapayWidget (API documentée KkiaPay)
      if (typeof window.openKkiapayWidget === 'function') {
        console.log('Ouverture KkiaPay via openKkiapayWidget, montant:', total);
        window.openKkiapayWidget({
          amount: String(total),
          key: KKIAPAY_PUBLIC_KEY,
          callback: callbackUrl,
          position: 'center',
          theme: '#8B4513',
          sandbox: KKIAPAY_SANDBOX
        });
        // Écouter le succès (si le SDK émet un événement en restant sur la page)
        if (typeof window.addKkiapayListener === 'function') {
          window.addKkiapayListener('success', onPaymentSuccess);
          window.addKkiapayListener('failed', onPaymentFailure);
        }
        setLoading(false);
        return;
      }

      // Méthode 2 : Kkiapay.init() + open()
      if (window.Kkiapay && typeof window.Kkiapay.init === 'function') {
        console.log('Initialisation KkiaPay avec montant:', total);
        window.Kkiapay.init({
          public_key: KKIAPAY_PUBLIC_KEY,
          key: KKIAPAY_PUBLIC_KEY,
          amount: total,
          position: 'center',
          theme: '#8B4513',
          sandbox: KKIAPAY_SANDBOX,
          data: { commandeId: commande._id, restaurantId, clientId: user?._id },
          callback: (response) => {
            if (response && response.status === 'success') onPaymentSuccess();
            else onPaymentFailure();
          },
          error: (err) => {
            console.error('Erreur Kkiapay:', err);
            showError('Erreur lors du paiement. Veuillez réessayer.', 'Erreur de paiement');
            setLoading(false);
          }
        });
        window.Kkiapay.open();
        return;
      }

      // Méthode 3 : widget HTML <kkiapay-widget> (script peut n’exposer que le custom element)
      const widgetKey = 'kkiapay-widget';
      if (typeof customElements !== 'undefined' && customElements.get(widgetKey)) {
        const container = document.createElement('div');
        container.id = 'kkiapay-widget-container';
        container.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';
        const widget = document.createElement(widgetKey);
        widget.setAttribute('amount', String(total));
        widget.setAttribute('key', KKIAPAY_PUBLIC_KEY);
        widget.setAttribute('callback', callbackUrl);
        widget.setAttribute('position', 'center');
        widget.setAttribute('sandbox', KKIAPAY_SANDBOX ? 'true' : 'false');
        container.appendChild(widget);
        document.body.appendChild(container);
        container.onclick = (e) => { if (e.target === container) container.remove(); };
        setLoading(false);
        return;
      }

      showError('Service de paiement KkiaPay non disponible. Vérifiez que le script est chargé (rafraîchissez la page) ou réessayez plus tard.', 'Paiement indisponible');
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      showError('Erreur lors de la commande. Veuillez réessayer.', 'Erreur');
      setLoading(false);
    }
  };

  const getSubTotal = () => {
    return cart.reduce((sum, item) => sum + (item.prix * item.quantite), 0);
  };

  const getFraisLivraisonEffectif = () => {
    if (cartQualifiesFreeDeliveryPromo(cart)) return 0;
    return fraisLivraison;
  };

  const getTotal = () => {
    return getSubTotal() + getFraisLivraisonEffectif();
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

            <div className="checkout-address-search-wrap">
              <label className="checkout-field-label" htmlFor="checkout-search-addr">
                {t('locationEditor', 'searchPlaceholder')}
              </label>
              <input
                id="checkout-search-addr"
                type="text"
                className="checkout-address-search-input"
                placeholder={t('locationEditor', 'searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleAddressSearch(e.target.value)}
                onFocus={() => searchQuery.length >= 3 && searchResults.length > 0 && setShowSearchResults(true)}
              />
              {showSearchResults && searchResults.length > 0 && (
                <div className="checkout-search-dropdown">
                  {searchResults.map((r, idx) => (
                    <button
                      type="button"
                      key={idx}
                      className="checkout-search-item"
                      onClick={() => handleSelectSearchResult(r)}
                    >
                      {r.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                  <MapPanToCenter center={mapPosition} />
                  <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                </MapContainer>
              </div>
            )}

            {address && (
              <div className="address-display">
                <strong>Adresse:</strong> {address}
              </div>
            )}

            <div className="checkout-extra-fields">
              <label className="checkout-field-label" htmlFor="checkout-instr">{t('locationEditor', 'instructionLabel')}</label>
              <textarea
                id="checkout-instr"
                className="checkout-textarea"
                rows={2}
                placeholder={t('locationEditor', 'instructionPlaceholder')}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
              <label className="checkout-field-label" htmlFor="checkout-tel">{t('locationEditor', 'telephoneLabel')}</label>
              <input
                id="checkout-tel"
                type="tel"
                className="checkout-input"
                placeholder={t('locationEditor', 'telephonePlaceholder')}
                value={telephoneContact}
                onChange={(e) => setTelephoneContact(e.target.value)}
              />
            </div>
          </div>

          <div className="order-summary-section">
            <h2>Récapitulatif</h2>
            <div className="order-items">
              {cart.map((item) => (
                <div key={item.productId || item.platId} className="order-item">
                  <span>{productDisplayName(item)} x {item.quantite}</span>
                  <span>{(item.prix * item.quantite).toFixed(0)} FCFA</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="checkout-sidebar">
          <div className="payment-summary">
            <h2 className="checkout-payment-title">{t('checkout', 'paymentMethod')}</h2>
            <div className="checkout-payment-options">
              <label className={`checkout-pay-option ${paymentMode === 'especes' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === 'especes'}
                  onChange={() => setPaymentMode('especes')}
                />
                <span className="checkout-pay-label">
                  <strong>{t('checkout', 'cashOnDelivery')}</strong>
                  <small>{t('checkout', 'cashOnDeliveryHint')}</small>
                </span>
              </label>
              <label className={`checkout-pay-option ${paymentMode === 'momo_avant' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === 'momo_avant'}
                  onChange={() => setPaymentMode('momo_avant')}
                />
                <span className="checkout-pay-label">
                  <strong>{t('checkout', 'momoBefore')}</strong>
                  <small>{t('checkout', 'momoBeforeHint')}</small>
                </span>
              </label>
              <label className={`checkout-pay-option ${paymentMode === 'momo_apres' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === 'momo_apres'}
                  onChange={() => setPaymentMode('momo_apres')}
                />
                <span className="checkout-pay-label">
                  <strong>{t('checkout', 'momoAfter')}</strong>
                  <small>{t('checkout', 'momoAfterHint')}</small>
                </span>
              </label>
            </div>

            <h2>Total</h2>
            <div className="summary-row">
              <span>Sous-total</span>
              <span>{getSubTotal().toFixed(0)} FCFA</span>
            </div>
            <div className="summary-row">
              <span>Frais de livraison</span>
              <span>
                {cartQualifiesFreeDeliveryPromo(cart) ? (
                  <>
                    <span className="checkout-fee-struck">{fraisLivraison.toFixed(0)} FCFA</span>
                    <span className="checkout-fee-free">0 FCFA</span>
                  </>
                ) : (
                  <>{fraisLivraison.toFixed(0)} FCFA</>
                )}
              </span>
            </div>
            {cartQualifiesFreeDeliveryPromo(cart) && (
              <p className="checkout-promo-delivery-note">{t('cart', 'freeDeliveryPromoNote')}</p>
            )}
            <div className="summary-row total">
              <span>Total</span>
              <span>{getTotal().toFixed(0)} FCFA</span>
            </div>
            <button
              className="btn btn-primary btn-large"
              onClick={handlePayment}
              disabled={loading || !mapPosition}
            >
              {loading
                ? t('checkout', 'processing')
                : (paymentMode === 'momo_avant' ? t('checkout', 'pay') : t('checkout', 'confirmOrder'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
