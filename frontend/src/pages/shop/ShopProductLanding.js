import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopProductGallery from '../../components/shop/ShopProductGallery';
import ShopContentBlocks from '../../components/shop/ShopContentBlocks';
import ShopOrderForm from '../../components/shop/ShopOrderForm';
import { getProductGallery } from '../../utils/shopProductMedia';
import {
  buildShopOrderPayload,
  emptyCustomerForm,
  saveShopOrder,
  SHOP_DELIVERY_NOTE,
  submitShopOrderToApi,
  validateCustomerForm,
} from '../../utils/shopOrder';
import { getShopPromoState, formatPriceXof } from '../../utils/shopPromo';
import {
  formatQuantityWithUnit,
  getPriceUnitSuffix,
  getQuantityPickerLabel,
  normalizeShopQuantityUnit,
} from '../../utils/shopQuantityUnit';
import ShopCountdown from '../../components/shop/ShopCountdown';
import ShopTrustCards from '../../components/shop/ShopTrustCards';
import { FaClock } from 'react-icons/fa';
import './shopTypography.css';
import './ShopProductLanding.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');
const CHECKOUT_FORM_ID = 'shop-checkout-form';

export default function ShopProductLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState(emptyCustomerForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
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
    fetchProduct().finally(() => {
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

  const promoState = useMemo(() => (product ? getShopPromoState(product) : null), [product]);
  const gallery = useMemo(() => (product ? getProductGallery(product) : []), [product]);
  const canOrder = !!product?.whatsappNumber;
  const countdownEndsAt = promoState?.promoEndsAt || product?.promo?.endsAt || null;
  const showCountdown = promoState?.isPromoLive && countdownEndsAt;
  const unitPrice = promoState?.isPromoLive ? promoState.promoPrice : product?.basePrice;
  const unitBasePrice = product?.basePrice ?? 0;
  const quantityUnit = normalizeShopQuantityUnit(product?.quantityUnit);
  const quantityLabel = getQuantityPickerLabel(quantityUnit);
  const quantityDisplay = formatQuantityWithUnit(quantity, quantityUnit);
  const priceUnitSuffix = getPriceUnitSuffix(quantityUnit);
  const totalPrice = (unitPrice || 0) * quantity;
  const totalBasePrice = unitBasePrice * quantity;
  const totalLabel = formatPriceXof(totalPrice);

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
    if (!showCountdown || !topBarRef.current) return undefined;
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
  }, [showCountdown, countdownEndsAt]);

  const handleFieldChange = (field, value) => {
    setCustomer((c) => ({ ...c, [field]: value }));
    setFormErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canOrder || !product || submitting) return;

    const nextErrors = validateCustomerForm(customer);
    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      document.getElementById('shop-order-fields')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const order = buildShopOrderPayload(product, promoState, quantity, customer);
    setSubmitting(true);
    try {
      const saved = await submitShopOrderToApi(order);
      const orderForSession = { ...order, orderId: saved._id };
      if (!saveShopOrder(orderForSession)) {
        alert('Commande enregistrée, mais le récapitulatif local a échoué. Contactez Rapido sur WhatsApp.');
      }
      navigate(`/shop/${slug}/commande`);
    } catch (err) {
      alert(err.message || 'Impossible d’enregistrer la commande. Réessayez.');
    } finally {
      setSubmitting(false);
    }
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
      </div>
    );
  }

  return (
    <div className={`shop-pdp${showCountdown ? ' shop-pdp--promo' : ''}`}>
      {showCountdown ? (
        <>
          <div ref={topBarRef} className="shop-pdp-top-fixed">
            <div
              className="shop-pdp-countdown-strip"
              role="region"
              aria-live="polite"
              aria-label="Compte à rebours de l'offre"
            >
              <p className="shop-pdp-countdown-headline">
                Cette offre est limitée et{' '}
                <span className="shop-pdp-countdown-headline-accent">se termine dans</span>
              </p>
              <ShopCountdown endsAt={countdownEndsAt} variant="urgent" />
            </div>
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
          <form id={CHECKOUT_FORM_ID} className="shop-pdp-checkout" onSubmit={handleSubmit} noValidate>
            <p className="shop-pdp-buybox-brand">Rapido</p>
            <h1 className="shop-pdp-buybox-title">{product.name}</h1>
            {product.shortDescription ? <p className="shop-pdp-buybox-sub">{product.shortDescription}</p> : null}

            <aside className="shop-pdp-delivery-note" role="note">
              <FaClock className="shop-pdp-delivery-note-icon" aria-hidden />
              <span>{SHOP_DELIVERY_NOTE}</span>
            </aside>

            <div className="shop-pdp-buybox-price">
              <span className="shop-pdp-buybox-price-current">
                {totalLabel}
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
            </div>

            <div className="shop-pdp-buybox-tags">
              {promoState?.isPromoLive && promoState.discountPercent ? (
                <span className="shop-pdp-tag shop-pdp-tag--sale">-{promoState.discountPercent}%</span>
              ) : null}
              {promoState?.freeDelivery ? (
                <span className="shop-pdp-tag shop-pdp-tag--ship">Livraison gratuite</span>
              ) : null}
            </div>

            <div className="shop-pdp-buybox-qty">
              <span>{quantityLabel}</span>
              <div className="shop-pdp-qty-controls">
                <button type="button" aria-label="Moins" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <span className="shop-pdp-qty-value">{quantityDisplay}</span>
                <button type="button" aria-label="Plus" onClick={() => setQuantity((q) => q + 1)}>
                  +
                </button>
              </div>
            </div>

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

      <ShopTrustCards whatsappNumber={product.whatsappNumber} />

      <div className="shop-pdp-sticky">
        <div className="shop-pdp-sticky-inner">
          <span className="shop-pdp-sticky-price">{totalLabel}</span>
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
