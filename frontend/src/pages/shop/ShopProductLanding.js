import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopProductGallery from '../../components/shop/ShopProductGallery';
import ShopContentBlocks from '../../components/shop/ShopContentBlocks';
import ShopOrderForm from '../../components/shop/ShopOrderForm';
import ShopEviscerationOption from '../../components/shop/ShopEviscerationOption';
import { getProductGallery } from '../../utils/shopProductMedia';
import {
  buildShopOrderPayload,
  emptyCustomerForm,
  saveShopOrder,
  submitShopOrderToApi,
  validateCustomerForm,
  getShopWhatsAppDigits,
  resolveTrackingWhatsAppDigits,
} from '../../utils/shopOrder';
import ShopDeliveryNotice from '../../components/shop/ShopDeliveryNotice';
import ShopPrivacyFooter from '../../components/shop/ShopPrivacyFooter';
import { getShopPromoState, formatPriceXof, getShopDeliveryFee, computeShopOrderTotals } from '../../utils/shopPromo';
import {
  formatQuantityWithUnit,
  getPriceUnitSuffix,
  getQuantityPickerLabel,
  normalizeShopQuantityUnit,
} from '../../utils/shopQuantityUnit';
import ShopClosedPage from '../../components/shop/ShopClosedPage';
import ShopQuantityModal from '../../components/shop/ShopQuantityModal';
import ShopQuantityPicker from '../../components/shop/ShopQuantityPicker';
import ShopTrustCards from '../../components/shop/ShopTrustCards';
import ShopUrgencyBar from '../../components/shop/ShopUrgencyBar';
import { getShopAvailabilityState } from '../../utils/shopOrderLimit';
import './shopTypography.css';
import './ShopProductLanding.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');
const CHECKOUT_FORM_ID = 'shop-checkout-form';

export default function ShopProductLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [customer, setCustomer] = useState(() => emptyCustomerForm());
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [qtyModalOpen, setQtyModalOpen] = useState(false);
  const [highlightQty, setHighlightQty] = useState(false);
  const [eviscerationCleaning, setEviscerationCleaning] = useState(false);
  const [closureTick, setClosureTick] = useState(() => Date.now());
  /** Recalcule la fenêtre promo (relance auto du minuteur à 00:00:00). */
  const [promoClock, setPromoClock] = useState(() => Date.now());
  const topBarRef = useRef(null);

  const fetchProduct = React.useCallback(() => {
    return axios
      .get(`${API_URL}/shop-products/public/${encodeURIComponent(slug)}`, {
        params: { _t: Date.now() },
      })
      .then((res) => {
        setProduct(res.data);
        setError('');
        return res.data;
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Produit introuvable');
        setProduct(null);
        return null;
      });
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchProduct(),
      axios
        .get(`${API_URL}/shop-settings/public`)
        .then((r) => r.data)
        .catch(() => null),
    ])
      .then(([, settings]) => {
        if (!cancelled && settings) setShopSettings(settings);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchProduct]);

  /** Après redeploiement / retour onglet : recharger la fiche (promo + minuteur à jour). */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchProduct();
    };
    document.addEventListener('visibilitychange', onVisible);
    const refreshId = setInterval(() => fetchProduct(), 5 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(refreshId);
    };
  }, [fetchProduct]);

  useEffect(() => {
    if (!product?.name) return;
    document.title = `${product.name} | Rapido Shop`;
    const desc = product.shortDescription || product.name;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
  }, [product]);

  const promoState = useMemo(
    () => (product ? getShopPromoState(product, new Date(promoClock)) : null),
    [product, promoClock]
  );
  const availabilityState = useMemo(
    () => (product ? getShopAvailabilityState(product, new Date(closureTick)) : null),
    [product, closureTick]
  );

  const countdownEndsAt = promoState?.promoEndsAt || product?.promo?.endsAt || null;
  const countdownAutoRestart = !!(
    promoState?.isPromoLive &&
    (promoState?.runUntilStopped || product?.published)
  );
  const showCountdown = promoState?.isPromoLive && countdownEndsAt;
  const showOrderLimitBanner =
    availabilityState?.dailyOrderLimitEnabled &&
    !availabilityState?.isShopClosed &&
    availabilityState.ordersRemaining > 0;
  const hasTopFixedBar = showCountdown || showOrderLimitBanner;

  /** À l’échéance : relancer le compte à rebours sur la durée fixée (fenêtre suivante). */
  useEffect(() => {
    if (!showCountdown || !countdownAutoRestart || !countdownEndsAt) return undefined;
    const endMs = new Date(countdownEndsAt).getTime();
    if (!Number.isFinite(endMs)) return undefined;
    const delay = Math.max(0, endMs - Date.now() + 80);
    const id = setTimeout(() => setPromoClock(Date.now()), delay);
    return () => clearTimeout(id);
  }, [showCountdown, countdownAutoRestart, countdownEndsAt]);

  /** Bascule auto fermeture / quota commandes. */
  useEffect(() => {
    const sc = product?.shopClosure;
    const limitOn = product?.dailyOrderLimitEnabled || product?.dailyOrderLimit?.enabled;
    if (!sc && !limitOn) return undefined;
    const hasDaily = sc?.dailyCloseTime && sc?.dailyOpenTime;
    const hasLegacy = sc?.enabled && sc?.closedFrom && sc?.closedUntil;
    const hasOverride = sc?.manualOverride === 'open' || sc?.manualOverride === 'closed';
    const needsTick =
      limitOn || hasDaily || hasLegacy || hasOverride || (sc?.enabled && hasDaily);
    if (!needsTick) return undefined;
    const id = setInterval(() => setClosureTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [product?.shopClosure, product?.dailyOrderLimit, product?.dailyOrderLimitEnabled]);

  /** Rafraîchir le quota commandes en temps réel. */
  useEffect(() => {
    if (!product?.dailyOrderLimitEnabled && !product?.dailyOrderLimit?.enabled) return undefined;
    const id = setInterval(() => void fetchProduct(), 20 * 1000);
    return () => clearInterval(id);
  }, [fetchProduct, product?.dailyOrderLimit, product?.dailyOrderLimitEnabled]);
  const gallery = useMemo(() => (product ? getProductGallery(product) : []), [product]);
  const canOrder = !!getShopWhatsAppDigits();
  const unitPrice = promoState?.isPromoLive ? promoState.promoPrice : product?.basePrice;
  const unitBasePrice = product?.basePrice ?? 0;
  const quantityUnit = normalizeShopQuantityUnit(product?.quantityUnit);
  const quantityLabel = getQuantityPickerLabel(quantityUnit);
  const quantityDisplay = formatQuantityWithUnit(quantity, quantityUnit);
  const priceUnitSuffix = getPriceUnitSuffix(quantityUnit);
  const hasQuantity = quantity >= 1;
  const deliveryFee = promoState ? getShopDeliveryFee(product, promoState) : 0;
  const subtotalPrice = hasQuantity ? (unitPrice || 0) * quantity : 0;
  const totalBasePrice = hasQuantity ? unitBasePrice * quantity : 0;
  const orderTotals = hasQuantity
    ? computeShopOrderTotals(unitPrice, quantity, deliveryFee, {
        eviscerationCleaning,
        quantityUnit,
      })
    : null;
  const eviscerationFee = orderTotals?.eviscerationFee || 0;
  const grandTotal = orderTotals?.totalPrice || 0;
  const subtotalLabel = hasQuantity ? formatPriceXof(subtotalPrice) : null;
  const grandTotalLabel = hasQuantity ? formatPriceXof(grandTotal) : null;

  const navSections = useMemo(() => {
    const items = [
      { id: 'shop-section-product', label: 'Produit' },
      { id: 'shop-section-order', label: 'Commander' },
    ];
    if (product?.copySections?.length) {
      items.push({ id: 'shop-section-story', label: 'En savoir plus' });
    }
    items.push({ id: 'shop-section-trust', label: 'Avantages' });
    return items;
  }, [product?.copySections?.length]);

  useEffect(() => {
    if (!hasTopFixedBar || !topBarRef.current) return undefined;
    const el = topBarRef.current;
    const syncHeight = () => {
      const root = el.closest('.shop-pdp');
      if (root) root.style.setProperty('--shop-top-fixed-h', `${el.offsetHeight}px`);
    };
    syncHeight();
    requestAnimationFrame(syncHeight);
    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    window.addEventListener('resize', syncHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [hasTopFixedBar, showCountdown, showOrderLimitBanner, countdownEndsAt]);

  const handleFieldChange = (field, value) => {
    setCustomer((c) => ({ ...c, [field]: value }));
    setFormErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const completeOrder = async (orderQuantity) => {
    const nextErrors = validateCustomerForm(customer);
    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      setQtyModalOpen(false);
      document.getElementById('shop-order-fields')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const order = buildShopOrderPayload(product, promoState, orderQuantity, customer, {
      eviscerationCleaning,
    });
    setSubmitting(true);
    try {
      const saved = await submitShopOrderToApi(order);
      const orderForSession = { ...order, orderId: saved._id, orderNumber: saved.orderNumber };
      if (!saveShopOrder(orderForSession)) {
        alert('Commande enregistrée, mais le récapitulatif local a échoué. Contactez Rapido sur WhatsApp.');
      }
      setQtyModalOpen(false);
      navigate(`/shop/${slug}/commande`);
    } catch (err) {
      alert(err.message || 'Impossible d’enregistrer la commande. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const requestOrder = (e) => {
    e?.preventDefault?.();
    if (!canOrder || !product || submitting) return;

    if (quantity < 1) {
      setHighlightQty(true);
      setQtyModalOpen(true);
      return;
    }

    void completeOrder(quantity);
  };

  const handleQtyModalConfirm = (pickedQty) => {
    setQuantity(pickedQty);
    setHighlightQty(false);
    void completeOrder(pickedQty);
  };

  const handleQuantityChange = (nextQty) => {
    setQuantity(nextQty);
    if (nextQty >= 1) setHighlightQty(false);
  };

  if (loading) return <PageLoader />;
  if (error || !product) {
    return (
      <div className="shop-pdp">
        <ShopBrandHeader />
        <div className="shop-pdp-error">
          <h1>Produit indisponible</h1>
          <p>{error || 'Ce lien n’est plus actif.'}</p>
        </div>
        <ShopPrivacyFooter />
      </div>
    );
  }

  if (availabilityState?.isShopClosed) {
    return (
      <ShopClosedPage
        product={product}
        closureState={availabilityState}
        onReopen={() => {
          setClosureTick(Date.now());
          void fetchProduct();
        }}
      />
    );
  }

  return (
    <div className={`shop-pdp${hasTopFixedBar ? ' shop-pdp--top-bar' : ''}${showCountdown ? ' shop-pdp--promo' : ''}`}>
      {hasTopFixedBar ? (
        <>
          <div ref={topBarRef} className="shop-pdp-top-fixed">
            <ShopUrgencyBar
              label={
                showCountdown
                  ? 'Offre limitée — commandez vite'
                  : 'Commandes du jour limitées'
              }
              endsAt={showCountdown ? countdownEndsAt : null}
              autoRestart={countdownAutoRestart}
              onCountdownComplete={() => setPromoClock(Date.now())}
              ordersRemaining={
                showOrderLimitBanner ? availabilityState.ordersRemaining : null
              }
              maxOrders={
                showOrderLimitBanner ? availabilityState.dailyOrderLimitMax : 0
              }
              ordersToday={showOrderLimitBanner ? availabilityState.ordersToday : 0}
              progressPct={
                showOrderLimitBanner ? availabilityState.orderLimitProgressPct : null
              }
              showCountdown={showCountdown}
              showQuota={showOrderLimitBanner}
            />
            <ShopBrandHeader sections={navSections} inTopBar />
          </div>
          <div className="shop-pdp-top-spacer" aria-hidden />
        </>
      ) : (
        <ShopBrandHeader sections={navSections} />
      )}

      <div id="shop-section-product" className="shop-pdp-layout">
        <div className="shop-pdp-gallery-col">
          <ShopProductGallery
            urls={gallery}
            baseUrl={BASE_URL}
            productName={product.name}
            promoPercent={promoState?.isPromoLive ? promoState.discountPercent : 0}
          />
        </div>

        <div id="shop-section-order" className="shop-pdp-buy-col">
          <form id={CHECKOUT_FORM_ID} className="shop-pdp-checkout" onSubmit={requestOrder} noValidate>
            <p className="shop-pdp-buybox-brand">Rapido</p>
            <h1 className="shop-pdp-buybox-title">{product.name}</h1>
            {product.shortDescription ? <p className="shop-pdp-buybox-sub">{product.shortDescription}</p> : null}

            {product.showDeliveryNotice !== false ? (
              <ShopDeliveryNotice message={shopSettings?.deliveryNoticeMessage} />
            ) : null}

            <div className={`shop-pdp-buybox-price${!hasQuantity ? ' shop-pdp-buybox-price--empty' : ''}`}>
              {hasQuantity ? (
                <>
                  <span className="shop-pdp-buybox-price-current">
                    {subtotalLabel}
                    {quantity === 1 && priceUnitSuffix ? (
                      <span className="shop-pdp-price-unit">{priceUnitSuffix}</span>
                    ) : null}
                  </span>
                  {promoState?.isPromoLive ? (
                    <span className="shop-pdp-buybox-price-old">{formatPriceXof(totalBasePrice)}</span>
                  ) : null}
                  {quantity > 1 ? (
                    <span className="shop-pdp-buybox-price-unit-line">
                      {formatPriceXof(unitPrice)}
                      {priceUnitSuffix}
                      {' × '}
                      {quantityDisplay}
                    </span>
                  ) : null}
                  {promoState?.freeDelivery ? (
                    <span className="shop-pdp-buybox-delivery-info shop-pdp-buybox-delivery-info--free">
                      Livraison gratuite
                    </span>
                  ) : deliveryFee > 0 ? (
                    <span className="shop-pdp-buybox-delivery-info">
                      Frais de livraison : {formatPriceXof(deliveryFee)}
                    </span>
                  ) : null}
                  {eviscerationFee > 0 ? (
                    <span className="shop-pdp-buybox-delivery-info shop-pdp-buybox-delivery-info--evic">
                      Éviscération et nettoyage : {formatPriceXof(eviscerationFee)}
                    </span>
                  ) : null}
                  {(deliveryFee > 0 || eviscerationFee > 0 || promoState?.freeDelivery) && hasQuantity ? (
                    <span className="shop-pdp-buybox-total-line">
                      Total : <strong>{grandTotalLabel}</strong>
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="shop-pdp-buybox-price-current">
                    {formatPriceXof(unitPrice)}
                    {priceUnitSuffix ? <span className="shop-pdp-price-unit">{priceUnitSuffix}</span> : null}
                  </span>
                  {promoState?.isPromoLive ? (
                    <span className="shop-pdp-buybox-price-old">
                      {formatPriceXof(unitBasePrice)}
                      {priceUnitSuffix}
                    </span>
                  ) : null}
                  <span className="shop-pdp-buybox-price-placeholder">Choisissez votre quantité</span>
                </>
              )}
            </div>

            <div className="shop-pdp-buybox-tags">
              {promoState?.isPromoLive && promoState.discountPercent ? (
                <span className="shop-pdp-tag shop-pdp-tag--sale">-{promoState.discountPercent}%</span>
              ) : null}
              {promoState?.freeDelivery ? (
                <span className="shop-pdp-tag shop-pdp-tag--ship">Livraison gratuite</span>
              ) : deliveryFee > 0 ? (
                <span className="shop-pdp-tag shop-pdp-tag--ship">
                  Livraison {formatPriceXof(deliveryFee)}
                </span>
              ) : null}
            </div>

            {!hasQuantity ? (
              <p className="shop-pdp-buybox-qty-hint">Sélectionnez une quantité avant de commander.</p>
            ) : null}

            <ShopQuantityPicker
              id="shop-quantity-section"
              quantity={quantity}
              onChange={handleQuantityChange}
              quantityUnit={quantityUnit}
              quantityLabel={quantityLabel}
              min={0}
              highlight={highlightQty && !hasQuantity}
            />

            <ShopEviscerationOption
              enabled={eviscerationCleaning}
              onChange={setEviscerationCleaning}
              quantity={quantity}
              quantityUnit={quantityUnit}
            />

            <div id="shop-order-fields">
              <ShopOrderForm
                customer={customer}
                errors={formErrors}
                onFieldChange={handleFieldChange}
              />
            </div>

            {canOrder ? (
              <button type="submit" className="shop-pdp-cta shop-pdp-cta--primary" disabled={submitting}>
                {submitting ? 'Enregistrement…' : product.ctaLabel || 'Commander maintenant'}
              </button>
            ) : (
              <button type="button" className="shop-pdp-cta shop-pdp-cta--primary" disabled>
                Commande bientôt disponible
              </button>
            )}
          </form>
        </div>
      </div>

      {product.copySections?.length ? (
        <div id="shop-section-story" className="shop-pdp-story-wrap">
          <ShopContentBlocks sections={product.copySections} baseUrl={BASE_URL} />
        </div>
      ) : null}

      <ShopTrustCards whatsappNumber={resolveTrackingWhatsAppDigits(product?.whatsappNumber)} />

      <ShopPrivacyFooter className="shop-privacy-footer--sticky-pad" />

      <ShopQuantityModal
        open={qtyModalOpen}
        onClose={() => setQtyModalOpen(false)}
        productName={product.name}
        quantityUnit={quantityUnit}
        quantityLabel={quantityLabel}
        unitPrice={unitPrice}
        unitBasePrice={unitBasePrice}
        deliveryFee={deliveryFee}
        freeDelivery={!!promoState?.freeDelivery}
        isPromoLive={!!promoState?.isPromoLive}
        initialQuantity={quantity}
        ctaLabel={product.ctaLabel || 'Commander maintenant'}
        onConfirm={handleQtyModalConfirm}
        submitting={submitting}
      />

      <div className="shop-pdp-sticky">
        <div className="shop-pdp-sticky-inner">
          <span className="shop-pdp-sticky-price">
            {hasQuantity ? grandTotalLabel : formatPriceXof(unitPrice) + (priceUnitSuffix || '')}
          </span>
          {canOrder ? (
            <button
              type="submit"
              form={CHECKOUT_FORM_ID}
              className="shop-pdp-cta shop-pdp-cta--primary shop-pdp-cta--sticky"
              disabled={submitting}
            >
              {submitting ? 'Enregistrement…' : 'Commander'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
