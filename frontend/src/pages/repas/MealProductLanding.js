import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopProductGallery from '../../components/shop/ShopProductGallery';
import ShopOrderForm from '../../components/shop/ShopOrderForm';
import ShopDeliveryNotice from '../../components/shop/ShopDeliveryNotice';
import ShopCountdown from '../../components/shop/ShopCountdown';
import ShopQuantityPicker from '../../components/shop/ShopQuantityPicker';
import ShopQuantityModal from '../../components/shop/ShopQuantityModal';
import ShopTrustCards from '../../components/shop/ShopTrustCards';
import { getProductGallery } from '../../utils/shopProductMedia';
import {
  emptyCustomerForm,
  validateCustomerForm,
  getShopWhatsAppDigits,
} from '../../utils/shopOrder';
import {
  formatPriceXof,
} from '../../utils/shopPromo';
import {
  getMealProductPromoState,
} from '../../utils/mealShopUrgency';
import {
  saveMealOrder,
  submitMealOrderToApi,
} from '../../utils/mealOrder';
import ShopContentBlocks from '../../components/shop/ShopContentBlocks';
import '../shop/shopTypography.css';
import '../shop/ShopProductLanding.css';
import './MealProductLanding.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');
const CHECKOUT_FORM_ID = 'meal-checkout-form';

export default function MealProductLanding() {
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
  const [accQty, setAccQty] = useState({});
  const [promoClock, setPromoClock] = useState(() => Date.now());
  const topBarRef = useRef(null);

  const fetchProduct = React.useCallback(() => {
    return axios
      .get(`${API_URL}/meal-products/public/${encodeURIComponent(slug)}`, {
        params: { _t: Date.now() },
      })
      .then((res) => {
        setProduct(res.data);
        setError('');
        const init = {};
        (res.data.accompagnements || []).forEach((a) => {
          init[a._id || a.name] = a.required ? 1 : 0;
        });
        setAccQty(init);
        return res.data;
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Plat introuvable');
        setProduct(null);
        return null;
      });
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchProduct(),
      axios.get(`${API_URL}/meal-shop/public`).then((r) => r.data).catch(() => null),
    ]).then(([, settings]) => {
      if (!cancelled && settings) setShopSettings(settings);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchProduct]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchProduct();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchProduct]);

  useEffect(() => {
    if (!product?.name) return;
    document.title = `${product.name} | Rapido Repas`;
  }, [product]);

  const promoState = useMemo(
    () => (product ? getMealProductPromoState(product, new Date(promoClock)) : null),
    [product, promoClock]
  );

  const countdownEndsAt = promoState?.promoEndsAt || product?.promo?.endsAt || null;
  const countdownAutoRestart = !!(
    promoState?.isPromoLive &&
    (promoState?.runUntilStopped || product?.published)
  );
  const showCountdown = promoState?.isPromoLive && countdownEndsAt;
  const hasTopFixedBar = showCountdown;

  useEffect(() => {
    if (!showCountdown || !countdownAutoRestart || !countdownEndsAt) return undefined;
    const endMs = new Date(countdownEndsAt).getTime();
    if (!Number.isFinite(endMs)) return undefined;
    const delay = Math.max(0, endMs - Date.now() + 80);
    const id = setTimeout(() => setPromoClock(Date.now()), delay);
    return () => clearTimeout(id);
  }, [showCountdown, countdownAutoRestart, countdownEndsAt]);

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
  }, [hasTopFixedBar, showCountdown, countdownEndsAt]);

  const gallery = useMemo(() => (product ? getProductGallery(product) : []), [product]);
  const canOrder = !!getShopWhatsAppDigits();
  const unitPrice = promoState?.isPromoLive ? promoState.promoPrice : product?.basePrice;
  const unitBasePrice = product?.basePrice ?? 0;
  const hasQuantity = quantity >= 1;
  const shopDeliveryFee = Math.max(0, Number(shopSettings?.deliveryFee) || 0);
  const deliveryFee = promoState?.freeDelivery ? 0 : shopDeliveryFee;

  const selectedAcc = useMemo(() => {
    return (product?.accompagnements || [])
      .map((a) => {
        const key = a._id || a.name;
        const q = Number(accQty[key] || 0);
        if (q < 1) return null;
        return { id: a._id, name: a.name, price: Number(a.price) || 0, quantity: q };
      })
      .filter(Boolean);
  }, [product, accQty]);

  const accTotal = selectedAcc.reduce((s, a) => s + a.price * a.quantity, 0);
  const subtotalPrice = hasQuantity ? (unitPrice || 0) * quantity + accTotal : 0;
  const totalBasePrice = hasQuantity ? unitBasePrice * quantity + accTotal : 0;
  const grandTotal = hasQuantity ? subtotalPrice + deliveryFee : 0;

  const navSections = useMemo(
    () => [
      { id: 'shop-section-product', label: 'Plat' },
      { id: 'shop-section-order', label: 'Commander' },
      ...(product?.copySections?.length ? [{ id: 'meal-section-content', label: 'Détails' }] : []),
      { id: 'shop-section-trust', label: 'Avantages' },
    ],
    [product?.copySections?.length]
  );

  const handleFieldChange = (field, value) => {
    setCustomer((c) => ({ ...c, [field]: value }));
    setFormErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const validateAccompagnements = () => {
    const required = (product?.accompagnements || []).filter((a) => a.required);
    for (const r of required) {
      const key = r._id || r.name;
      if ((accQty[key] || 0) < 1) {
        return `Choisissez l’accompagnement : ${r.name}`;
      }
    }
    return null;
  };

  const completeOrder = async (orderQuantity) => {
    const nextErrors = validateCustomerForm(customer);
    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      setQtyModalOpen(false);
      document.getElementById('shop-order-fields')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const accErr = validateAccompagnements();
    if (accErr) {
      alert(accErr);
      return;
    }

    setSubmitting(true);
    try {
      const saved = await submitMealOrderToApi(
        [
          {
            mealProductId: product._id,
            quantity: orderQuantity,
            accompagnements: selectedAcc,
          },
        ],
        customer
      );
      saveMealOrder({
        ...saved,
        orderId: saved._id,
        slug: product.slug,
      });
      setQtyModalOpen(false);
      navigate(`/repas/${slug}/commande`);
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

  if (loading) return <PageLoader />;
  if (error || !product) {
    return (
      <div className="shop-pdp meal-pdp">
        <ShopBrandHeader />
        <div className="shop-pdp-error">
          <h1>Plat indisponible</h1>
          <p>{error || 'Ce lien n’est plus actif.'}</p>
          <Link to="/repas" className="meal-pdp-back">
            ← Retour à la boutique repas
          </Link>
        </div>
      </div>
    );
  }

  if (shopSettings?.isShopClosed) {
    return (
      <div className="shop-pdp meal-pdp">
        <ShopBrandHeader />
        <div className="shop-pdp-error">
          <h1>Boutique temporairement fermée</h1>
          <p>{shopSettings.shopClosure?.message || 'Revenez un peu plus tard.'}</p>
          <Link to="/repas" className="meal-pdp-back">
            ← Retour à la boutique repas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`shop-pdp meal-pdp${hasTopFixedBar ? ' shop-pdp--top-bar' : ''}${showCountdown ? ' shop-pdp--promo' : ''}`}>
      {hasTopFixedBar ? (
        <>
          <div ref={topBarRef} className="shop-pdp-top-fixed">
            {showCountdown ? (
              <div className="shop-pdp-countdown-strip" role="region" aria-live="polite">
                <ShopCountdown
                  endsAt={countdownEndsAt}
                  variant="urgent"
                  autoRestart={countdownAutoRestart}
                  onComplete={() => setPromoClock(Date.now())}
                />
              </div>
            ) : null}
            <ShopBrandHeader sections={navSections} inTopBar />
          </div>
          <div className="shop-pdp-top-spacer" aria-hidden />
        </>
      ) : (
        <ShopBrandHeader sections={navSections} />
      )}

      <div className="meal-pdp-crumb">
        <Link to="/repas">Shop repas</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>

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
            <p className="shop-pdp-buybox-brand">Rapido Repas</p>
            <h1 className="shop-pdp-buybox-title">{product.name}</h1>
            {product.shortDescription ? <p className="shop-pdp-buybox-sub">{product.shortDescription}</p> : null}

            <ShopDeliveryNotice />

            <div className={`shop-pdp-buybox-price${!hasQuantity ? ' shop-pdp-buybox-price--empty' : ''}`}>
              {hasQuantity ? (
                <>
                  <span className="shop-pdp-buybox-price-current">{formatPriceXof(subtotalPrice)}</span>
                  {promoState?.isPromoLive ? (
                    <span className="shop-pdp-buybox-price-old">{formatPriceXof(totalBasePrice)}</span>
                  ) : null}
                  {quantity > 1 ? (
                    <span className="shop-pdp-buybox-price-unit-line">
                      {formatPriceXof(unitPrice)} × {quantity}
                    </span>
                  ) : null}
                  {accTotal > 0 ? (
                    <span className="shop-pdp-buybox-delivery-info">
                      Accompagnements : {formatPriceXof(accTotal)}
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
                  {(deliveryFee > 0 || accTotal > 0 || promoState?.freeDelivery) && hasQuantity ? (
                    <span className="shop-pdp-buybox-total-line">
                      Total : <strong>{formatPriceXof(grandTotal)}</strong>
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="shop-pdp-buybox-price-current">{formatPriceXof(unitPrice)}</span>
                  {promoState?.isPromoLive ? (
                    <span className="shop-pdp-buybox-price-old">{formatPriceXof(unitBasePrice)}</span>
                  ) : null}
                  <span className="shop-pdp-buybox-price-placeholder">Choisissez votre quantité</span>
                </>
              )}
            </div>

            <div className="shop-pdp-buybox-tags">
              {product.category ? <span className="shop-pdp-tag">{product.category}</span> : null}
              {promoState?.isPromoLive && promoState.discountPercent ? (
                <span className="shop-pdp-tag shop-pdp-tag--sale">-{promoState.discountPercent}%</span>
              ) : null}
              {promoState?.freeDelivery ? (
                <span className="shop-pdp-tag shop-pdp-tag--ship">Livraison gratuite</span>
              ) : deliveryFee > 0 ? (
                <span className="shop-pdp-tag shop-pdp-tag--ship">Livraison {formatPriceXof(deliveryFee)}</span>
              ) : null}
            </div>

            {!hasQuantity ? (
              <p className="shop-pdp-buybox-qty-hint">Sélectionnez une quantité avant de commander.</p>
            ) : null}

            <ShopQuantityPicker
              id="meal-quantity-section"
              quantity={quantity}
              onChange={(nextQty) => {
                setQuantity(nextQty);
                if (nextQty >= 1) setHighlightQty(false);
              }}
              quantityUnit="unit"
              quantityLabel="Quantité"
              min={0}
              highlight={highlightQty && !hasQuantity}
            />

            {(product.accompagnements || []).length ? (
              <div className="meal-pdp-acc">
                <h3 className="meal-pdp-acc-title">Accompagnements</h3>
                <p className="meal-pdp-acc-lead">Ajoutez ce qui accompagne votre plat.</p>
                {product.accompagnements.map((a) => {
                  const key = a._id || a.name;
                  const q = accQty[key] || 0;
                  return (
                    <div key={key} className="meal-pdp-acc-row">
                      <div className="meal-pdp-acc-info">
                        <strong>
                          {a.name}
                          {a.required ? <span className="meal-pdp-acc-req"> *</span> : null}
                        </strong>
                        <span>{formatPriceXof(a.price)}</span>
                      </div>
                      <div className="meal-pdp-acc-ctrl">
                        <button
                          type="button"
                          aria-label={`Retirer ${a.name}`}
                          onClick={() =>
                            setAccQty((s) => ({ ...s, [key]: Math.max(0, (s[key] || 0) - 1) }))
                          }
                        >
                          −
                        </button>
                        <span>{q}</span>
                        <button
                          type="button"
                          aria-label={`Ajouter ${a.name}`}
                          onClick={() =>
                            setAccQty((s) => ({
                              ...s,
                              [key]: Math.min(a.maxQuantity || 10, (s[key] || 0) + 1),
                            }))
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div id="shop-order-fields">
              <ShopOrderForm customer={customer} errors={formErrors} onFieldChange={handleFieldChange} idPrefix="meal" />
            </div>

            {canOrder ? (
              <button type="submit" className="shop-pdp-cta shop-pdp-cta--primary" disabled={submitting}>
                {submitting ? 'Enregistrement…' : 'Commander maintenant'}
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
        <div id="meal-section-content" className="shop-pdp-story-wrap">
          <ShopContentBlocks sections={product.copySections} baseUrl={BASE_URL} />
        </div>
      ) : null}

      <ShopTrustCards whatsappNumber={getShopWhatsAppDigits()} />

      <ShopQuantityModal
        open={qtyModalOpen}
        onClose={() => setQtyModalOpen(false)}
        productName={product.name}
        quantityUnit="unit"
        quantityLabel="Quantité"
        unitPrice={unitPrice}
        unitBasePrice={unitBasePrice}
        deliveryFee={deliveryFee}
        freeDelivery={!!promoState?.freeDelivery}
        isPromoLive={!!promoState?.isPromoLive}
        initialQuantity={quantity}
        ctaLabel="Commander maintenant"
        onConfirm={(pickedQty) => {
          setQuantity(pickedQty);
          setHighlightQty(false);
          void completeOrder(pickedQty);
        }}
        submitting={submitting}
      />

      <div className="shop-pdp-sticky">
        <div className="shop-pdp-sticky-inner">
          <span className="shop-pdp-sticky-price">
            {hasQuantity ? formatPriceXof(grandTotal) : formatPriceXof(unitPrice)}
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
