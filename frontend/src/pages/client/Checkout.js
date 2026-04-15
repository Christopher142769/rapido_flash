import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChevronLeft, FaMapMarkerAlt, FaCheckCircle, FaWhatsapp } from 'react-icons/fa';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { useModal } from '../../context/ModalContext';
import TopNavbar from '../../components/TopNavbar';
import { cartQualifiesFreeDeliveryPromo } from '../../utils/cartPromo';
import { openOrderTrackingWhatsApp } from '../../utils/orderTrackingWhatsApp';
import './Checkout.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const KKIAPAY_PUBLIC_KEY =
  process.env.REACT_APP_KKIAPAY_PUBLIC_KEY || 'cf27e12e7d7320dac0b807845855b06e5f231798';
const KKIAPAY_SANDBOX = false;

const Checkout = () => {
  const navigate = useNavigate();
  const { user, updatePosition } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const { showSuccess, showError, showWarning } = useModal();

  const [checkoutStep, setCheckoutStep] = useState('payment');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const [fraisLivraison, setFraisLivraison] = useState(0);
  const [paymentMode, setPaymentMode] = useState('momo_avant');

  const [mapPosition, setMapPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [instruction, setInstruction] = useState('');
  const [telephoneContact, setTelephoneContact] = useState('');

  const MIN_INSTRUCTION_LEN = 3;

  const phoneOk = useMemo(
    () => String(telephoneContact || '').replace(/\D/g, '').length >= 8,
    [telephoneContact]
  );

  const instructionOk = useMemo(
    () => String(instruction || '').trim().length >= MIN_INSTRUCTION_LEN,
    [instruction]
  );

  const addressOk = useMemo(() => String(address || '').trim().length >= 3, [address]);

  const coordsOk = useMemo(
    () =>
      mapPosition &&
      mapPosition.length === 2 &&
      typeof mapPosition[0] === 'number' &&
      typeof mapPosition[1] === 'number',
    [mapPosition]
  );

  useEffect(() => {
    if (checkoutStep === 'success') return;

    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (savedCart.length === 0) {
      navigate('/home');
      return;
    }
    setCart(savedCart);
    const rid = savedCart[0]?.restaurantId;
    setRestaurantId(rid);

    if (rid) {
      axios
        .get(`${API_URL}/restaurants/${rid}`)
        .then((res) => {
          setFraisLivraison(res.data.fraisLivraison || 0);
        })
        .catch((err) => console.error(err));
    }

    const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
    if (userLocation.latitude) {
      setMapPosition([userLocation.latitude, userLocation.longitude]);
      setAddress(userLocation.adresse || '');
      setInstruction(userLocation.instruction || '');
      setTelephoneContact(userLocation.telephoneContact || '');
      setSearchQuery(userLocation.adresse || '');
    } else if (user?.position?.latitude) {
      setMapPosition([user.position.latitude, user.position.longitude]);
      setAddress(user.position.adresse || '');
      setSearchQuery(user.position.adresse || '');
    } else {
      setMapPosition([6.3725, 2.4253]);
    }
  }, [navigate, user, checkoutStep]);

  useEffect(() => {
    if (!showAddressModal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowAddressModal(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [showAddressModal]);

  const getSubTotal = () => cart.reduce((sum, item) => sum + item.prix * item.quantite, 0);

  const getFraisLivraisonEffectif = () => {
    if (cartQualifiesFreeDeliveryPromo(cart)) return 0;
    return fraisLivraison;
  };

  const getTotal = () => getSubTotal() + getFraisLivraisonEffectif();

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
        .catch((err) => console.error(err));
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
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapPosition([lat, lng]);
        fetch(`${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
          headers: { 'User-Agent': 'RapidoFlash/1.0' },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.display_name) {
              setAddress(data.display_name);
              setSearchQuery(data.display_name);
            }
          })
          .catch(() => {});
      },
      () => showError(t('locationEditor', 'geolocError'), t('locationEditor', 'geolocErrorTitle'))
    );
  };

  const loadKkiapayScript = () => {
    return new Promise((resolve) => {
      const isReady = () => window.openKkiapayWidget || window.Kkiapay;
      if (isReady()) {
        resolve();
        return;
      }
      const existingScript = document.querySelector('script[src*="kkiapay"]');
      const url = 'https://cdn.kkiapay.me/k.js';

      const waitForReady = (maxMs = 5000) =>
        new Promise((res) => {
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
              res();
            }
          }, 200);
        });

      if (existingScript) {
        waitForReady(3000).then(resolve);
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = () => waitForReady(5000).then(resolve);
      script.onerror = () => resolve();
      document.body.appendChild(script);
    });
  };

  const goToSuccess = useCallback((commande) => {
    setCompletedOrder(commande);
    setShowAddressModal(false);
    setCheckoutStep('success');
    localStorage.removeItem('cart');
    setCart([]);
  }, []);

  const handlePlaceOrder = async () => {
    if (!coordsOk) {
      showWarning(t('checkout', 'selectAddress'), t('checkout', 'addressRequired'));
      return;
    }
    if (!addressOk) {
      showWarning(t('checkout', 'selectAddress'), t('checkout', 'addressRequired'));
      return;
    }
    if (!phoneOk) {
      showWarning(t('checkout', 'telephoneRequired'), t('common', 'error'));
      return;
    }
    if (!instructionOk) {
      showWarning(t('checkout', 'instructionRequired'), t('common', 'error'));
      return;
    }

    setLoading(true);

    try {
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

      const plats = cart.filter((item) => item.platId != null).map((item) => ({ platId: item.platId, quantite: item.quantite }));
      const produits = cart
        .filter((item) => item.productId != null)
        .map((item) => ({
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
          telephoneContact: (telephoneContact || '').trim(),
        },
        modePaiement: paymentMode,
      };

      const res = await axios.post(`${API_URL}/commandes`, commandeData);
      let commande = res.data;

      if (paymentMode === 'especes' || paymentMode === 'momo_apres') {
        showSuccess(t('checkout', 'orderCreated'), 'Rapido');
        goToSuccess(commande);
        setLoading(false);
        return;
      }

      const total = getTotal();
      await loadKkiapayScript();
      const callbackUrl = `${window.location.origin}/orders?payment=success&commandeId=${commande._id}`;

      const onPaymentSuccess = async () => {
        try {
          await axios.put(`${API_URL}/commandes/${commande._id}/statut`, { statut: 'confirmee' });
          commande = {
            ...commande,
            statut: 'confirmee',
            paiementEnLigneEffectue: true,
          };
          showSuccess(t('checkout', 'paymentSuccess'), t('checkout', 'paymentSuccessTitle'));
          goToSuccess(commande);
        } catch (err) {
          console.error(err);
          showWarning('Paiement effectué mais erreur lors de la mise à jour de la commande', 'Attention');
        }
        setLoading(false);
      };

      const onPaymentFailure = () => {
        showWarning(t('checkout', 'paymentCancelled'), t('checkout', 'paymentSuccessTitle'));
        setLoading(false);
      };

      if (typeof window.openKkiapayWidget === 'function') {
        window.openKkiapayWidget({
          amount: String(total),
          key: KKIAPAY_PUBLIC_KEY,
          callback: callbackUrl,
          position: 'center',
          theme: '#8B4513',
          sandbox: KKIAPAY_SANDBOX,
        });
        if (typeof window.addKkiapayListener === 'function') {
          window.addKkiapayListener('success', onPaymentSuccess);
          window.addKkiapayListener('failed', onPaymentFailure);
        }
        setLoading(false);
        return;
      }

      if (window.Kkiapay && typeof window.Kkiapay.init === 'function') {
        window.Kkiapay.init({
          public_key: KKIAPAY_PUBLIC_KEY,
          key: KKIAPAY_PUBLIC_KEY,
          amount: total,
          position: 'center',
          theme: '#8B4513',
          sandbox: KKIAPAY_SANDBOX,
          data: { commandeId: commande._id, restaurantId, clientId: user?._id || user?.id },
          callback: (response) => {
            if (response && response.status === 'success') onPaymentSuccess();
            else onPaymentFailure();
          },
          error: () => {
            showError(t('checkout', 'paymentError'), t('checkout', 'paymentSuccessTitle'));
            setLoading(false);
          },
        });
        window.Kkiapay.open();
        return;
      }

      const widgetKey = 'kkiapay-widget';
      if (typeof customElements !== 'undefined' && customElements.get(widgetKey)) {
        const container = document.createElement('div');
        container.id = 'kkiapay-widget-container';
        container.style.cssText =
          'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';
        const widget = document.createElement(widgetKey);
        widget.setAttribute('amount', String(total));
        widget.setAttribute('key', KKIAPAY_PUBLIC_KEY);
        widget.setAttribute('callback', callbackUrl);
        widget.setAttribute('position', 'center');
        widget.setAttribute('sandbox', KKIAPAY_SANDBOX ? 'true' : 'false');
        container.appendChild(widget);
        document.body.appendChild(container);
        container.onclick = (e) => {
          if (e.target === container) container.remove();
        };
        setLoading(false);
        return;
      }

      showError(t('checkout', 'serviceError'), t('checkout', 'paymentSuccessTitle'));
      setLoading(false);
    } catch (error) {
      console.error(error);
      showError(t('checkout', 'orderError'), t('common', 'error'));
      setLoading(false);
    }
  };

  const openWhatsApp = useCallback(() => {
    if (completedOrder) openOrderTrackingWhatsApp(completedOrder, { language, t, user });
  }, [completedOrder, language, t, user]);

  const modalCanSubmit = coordsOk && addressOk && phoneOk && instructionOk;

  if (checkoutStep === 'success' && completedOrder) {
    const addr = completedOrder.adresseLivraison || {};
    return (
      <div className="checkout-page checkout-page--success">
        <TopNavbar />
        <div className="checkout-success-wrap">
          <div className="checkout-success-card">
            <button type="button" className="checkout-success-back-corner" onClick={() => navigate('/home')}>
              <FaChevronLeft aria-hidden />
              Retour
            </button>
            <div className="checkout-success-icon" aria-hidden>
              <FaCheckCircle size={56} />
            </div>
            <h1 className="checkout-success-title">{t('checkout', 'successTitle')}</h1>
            <p className="checkout-success-sub">{t('checkout', 'successSubtitle')}</p>

            <div className="checkout-success-recap">
              <h2>{t('checkout', 'recapTitle')}</h2>
              <p className="checkout-success-shop">{completedOrder.restaurant?.nom}</p>
              <ul className="checkout-success-lines">
                {(completedOrder.plats || []).map((item, i) => (
                  <li key={`pl-${i}`}>
                    <span>
                      {item.plat?.nom} × {item.quantite}
                    </span>
                    <span>{(Number(item.prix) * Number(item.quantite)).toFixed(0)} FCFA</span>
                  </li>
                ))}
                {(completedOrder.produits || []).map((item, i) => (
                  <li key={`pr-${i}`}>
                    <span>
                      {item.produit?.nom} × {item.quantite}
                    </span>
                    <span>{(Number(item.prix) * Number(item.quantite)).toFixed(0)} FCFA</span>
                  </li>
                ))}
              </ul>
              <div className="checkout-success-addr">
                <strong>{t('checkout', 'selectedAddressLabel')}</strong>
                <p>{addr.adresse || '—'}</p>
                {addr.instruction ? (
                  <p className="checkout-success-instr">
                    <strong>{t('locationEditor', 'instructionLabel')}</strong> {addr.instruction}
                  </p>
                ) : null}
              </div>
              <div className="checkout-success-total">
                <span>{t('cart', 'total')}</span>
                <span>{Number(completedOrder.total || 0).toFixed(0)} FCFA</span>
              </div>
            </div>

            <div className="checkout-success-actions">
              <button type="button" className="checkout-btn-whatsapp" onClick={openWhatsApp}>
                <FaWhatsapp size={22} aria-hidden />
                {t('orders', 'followOrder')}
              </button>
              {completedOrder.paiementEnLigneEffectue && completedOrder.modePaiement === 'momo_avant' ? (
                <button
                  type="button"
                  className="btn btn-outline checkout-success-secondary"
                  onClick={() => navigate(`/facture/${completedOrder._id}`)}
                >
                  {t('orders', 'viewReceipt')}
                </button>
              ) : null}
              <button type="button" className="btn btn-primary checkout-success-secondary" onClick={() => navigate('/orders')}>
                {t('checkout', 'viewOrders')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page checkout-page--tunnel">
      <TopNavbar />
      <div className="checkout-header-mobile">
        <button type="button" className="back-btn-mobile" onClick={() => navigate('/cart')}>
          {t('checkout', 'backToCart')}
        </button>
        <h1>{t('checkout', 'paymentStepTitle')}</h1>
      </div>

      <div className="checkout-tunnel-inner">
        <button type="button" className="checkout-back-desktop" onClick={() => navigate('/cart')}>
          <FaChevronLeft aria-hidden />
          {t('checkout', 'backToCart')}
        </button>
        <p className="checkout-tunnel-eyebrow">{t('checkout', 'finalizeTitle')}</p>
        <h2 className="checkout-tunnel-title-desktop">{t('checkout', 'paymentStepTitle')}</h2>
        <p className="checkout-tunnel-lead">{t('checkout', 'paymentStepSubtitle')}</p>

        <div className="checkout-pay-cards">
          <label className={`checkout-pay-card ${paymentMode === 'especes' ? 'active' : ''}`}>
            <input type="radio" name="paymentModeTunnel" checked={paymentMode === 'especes'} onChange={() => setPaymentMode('especes')} />
            <span className="checkout-pay-card-inner">
              <img src="/images/payment/cash.svg" alt="" className="checkout-pay-card-icon" />
              <span className="checkout-pay-card-text">
                <strong>{t('checkout', 'cashOnDelivery')}</strong>
                <small>{t('checkout', 'cashOnDeliveryHint')}</small>
              </span>
            </span>
          </label>
          <label className={`checkout-pay-card ${paymentMode === 'momo_avant' ? 'active' : ''}`}>
            <input type="radio" name="paymentModeTunnel" checked={paymentMode === 'momo_avant'} onChange={() => setPaymentMode('momo_avant')} />
            <span className="checkout-pay-card-inner">
              <img src="/images/payment/momo.webp" alt="" className="checkout-pay-card-icon" />
              <span className="checkout-pay-card-text">
                <strong>{t('checkout', 'momoBefore')}</strong>
                <small>{t('checkout', 'momoBeforeHint')}</small>
              </span>
            </span>
          </label>
          <label className={`checkout-pay-card ${paymentMode === 'momo_apres' ? 'active' : ''}`}>
            <input type="radio" name="paymentModeTunnel" checked={paymentMode === 'momo_apres'} onChange={() => setPaymentMode('momo_apres')} />
            <span className="checkout-pay-card-inner">
              <img src="/images/payment/momo.webp" alt="" className="checkout-pay-card-icon" />
              <span className="checkout-pay-card-text">
                <strong>{t('checkout', 'momoAfter')}</strong>
                <small>{t('checkout', 'momoAfterHint')}</small>
              </span>
            </span>
          </label>
        </div>

        <div className="checkout-tunnel-total-pill" aria-live="polite">
          <span>{t('cart', 'total')}</span>
          <strong>{getTotal().toFixed(0)} FCFA</strong>
        </div>

        <button type="button" className="checkout-tunnel-cta" onClick={() => setShowAddressModal(true)}>
          {t('checkout', 'continueToDelivery')}
        </button>
      </div>

      {showAddressModal ? (
        <div className="checkout-modal-overlay" role="presentation" onClick={() => setShowAddressModal(false)}>
          <div
            className="checkout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="checkout-modal-header">
              <h2 id="checkout-modal-title">{t('checkout', 'addressModalTitle')}</h2>
              <button type="button" className="checkout-modal-close" onClick={() => setShowAddressModal(false)} aria-label={t('common', 'cancel')}>
                ×
              </button>
            </div>
            <p className="checkout-modal-lead">{t('checkout', 'addressModalSubtitle')}</p>

            <div className="checkout-modal-body">
              <div className="checkout-address-search-wrap checkout-modal-search">
                <label className="checkout-field-label" htmlFor="checkout-modal-search">
                  {t('locationEditor', 'searchPlaceholder')}
                </label>
                <input
                  id="checkout-modal-search"
                  type="text"
                  className="checkout-address-search-input"
                  placeholder={t('locationEditor', 'searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => handleAddressSearch(e.target.value)}
                  onFocus={() => searchQuery.length >= 3 && searchResults.length > 0 && setShowSearchResults(true)}
                />
                {showSearchResults && searchResults.length > 0 ? (
                  <div className="checkout-search-dropdown">
                    {searchResults.map((r, idx) => (
                      <button type="button" key={idx} className="checkout-search-item" onClick={() => handleSelectSearchResult(r)}>
                        {r.place_name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <button type="button" className="checkout-modal-geoloc" onClick={getCurrentLocation}>
                <FaMapMarkerAlt aria-hidden />
                {t('checkout', 'useCurrentLocation')}
              </button>

              {address ? (
                <div className="checkout-modal-address-pill">
                  <strong>{t('checkout', 'selectedAddressLabel')}</strong>
                  <p>{address}</p>
                </div>
              ) : null}

              <label className="checkout-field-label" htmlFor="checkout-modal-instr">
                {t('locationEditor', 'instructionLabel')}
              </label>
              <textarea
                id="checkout-modal-instr"
                className="checkout-textarea"
                rows={3}
                placeholder={t('locationEditor', 'instructionPlaceholder')}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />

              <label className="checkout-field-label" htmlFor="checkout-modal-tel">
                {t('locationEditor', 'telephoneLabel')}
              </label>
              <input
                id="checkout-modal-tel"
                type="tel"
                className="checkout-input"
                placeholder={t('locationEditor', 'telephonePlaceholder')}
                value={telephoneContact}
                onChange={(e) => setTelephoneContact(e.target.value)}
              />
            </div>

            <div className="checkout-modal-footer">
              <button type="button" className="btn btn-outline checkout-modal-btn-secondary" onClick={() => setShowAddressModal(false)}>
                {t('common', 'cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary checkout-modal-btn-primary"
                onClick={handlePlaceOrder}
                disabled={loading || !modalCanSubmit}
              >
                {loading
                  ? t('checkout', 'processing')
                  : paymentMode === 'momo_avant'
                    ? t('checkout', 'pay')
                    : t('checkout', 'confirmAndOrder')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Checkout;
