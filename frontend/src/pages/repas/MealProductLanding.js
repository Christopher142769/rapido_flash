import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import MealShopChrome from '../../components/shop/MealShopChrome';
import ShopProductGallery from '../../components/shop/ShopProductGallery';
import ShopOrderForm from '../../components/shop/ShopOrderForm';
import ShopDeliveryNotice from '../../components/shop/ShopDeliveryNotice';
import ShopQuantityPicker from '../../components/shop/ShopQuantityPicker';
import ShopQuantityModal from '../../components/shop/ShopQuantityModal';
import MealAccompagnementModal from '../../components/shop/MealAccompagnementModal';
import MealOptionGroups from '../../components/shop/MealOptionGroups';
import ShopTrustCards from '../../components/shop/ShopTrustCards';
import ShopPrivacyFooter from '../../components/shop/ShopPrivacyFooter';
import ShopContentBlocks from '../../components/shop/ShopContentBlocks';
import { getProductGallery } from '../../utils/shopProductMedia';
import {
  emptyCustomerForm,
  validateCustomerForm,
  getShopWhatsAppDigits,
} from '../../utils/shopOrder';
import { formatPriceXof } from '../../utils/shopPromo';
import {
  getMealProductPromoState,
  getMealCatalogueUrgency,
} from '../../utils/mealShopUrgency';
import {
  saveMealOrder,
  submitMealOrderToApi,
} from '../../utils/mealOrder';
import { mealConfirmationPath } from '../../utils/mealPaths';
import { loadMealCart, mealCartCount } from '../../utils/mealCart';
import {
  buildOptionSelection,
  toggleOptionChoice,
  selectedOptionsList,
  optionsPerUnitTotal,
  validateOptionSelection,
} from '../../utils/mealOptions';
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
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [pendingOrderQty, setPendingOrderQty] = useState(null);
  const [highlightQty, setHighlightQty] = useState(false);
  const [highlightAcc, setHighlightAcc] = useState(false);
  const [accQty, setAccQty] = useState({});
  const [optSelection, setOptSelection] = useState({});
  const [specifications, setSpecifications] = useState('');
  const [optError, setOptError] = useState('');
  const [promoClock, setPromoClock] = useState(() => Date.now());
  const [urgencyClock, setUrgencyClock] = useState(() => Date.now());
  const [cartCount, setCartCount] = useState(() => mealCartCount());

  const refreshCart = useCallback(() => setCartCount(mealCartCount(loadMealCart())), []);

  useEffect(() => {
    const onCart = () => refreshCart();
    window.addEventListener('rapido-meal-cart', onCart);
    window.addEventListener('storage', onCart);
    return () => {
      window.removeEventListener('rapido-meal-cart', onCart);
      window.removeEventListener('storage', onCart);
    };
  }, [refreshCart]);

  const fetchProduct = useCallback(() => {
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
        setOptSelection(buildOptionSelection(res.data.optionGroups || []));
        setSpecifications('');
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
      axios
        .get(`${API_URL}/meal-shop/public`)
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

  const catalogueUrgency = useMemo(
    () => getMealCatalogueUrgency(shopSettings, new Date(urgencyClock)),
    [shopSettings, urgencyClock]
  );

  const productCountdownEndsAt = promoState?.promoEndsAt || product?.promo?.endsAt || null;
  const productCountdownLive = !!(promoState?.isPromoLive && productCountdownEndsAt);

  const headerUrgency = useMemo(() => {
    if (catalogueUrgency.isLive) return catalogueUrgency;
    if (productCountdownLive) {
      return {
        isLive: true,
        endsAtIso: productCountdownEndsAt,
        runUntilStopped: !!(promoState?.runUntilStopped || product?.published),
        label: 'Offre limitée — commandez vite',
        expectedOrders: catalogueUrgency.expectedOrders || 0,
        remainingOrders: catalogueUrgency.remainingOrders || 0,
        ordersToday: catalogueUrgency.ordersToday || 0,
      };
    }
    return catalogueUrgency;
  }, [catalogueUrgency, productCountdownLive, productCountdownEndsAt, promoState, product]);

  useEffect(() => {
    if (!catalogueUrgency.isLive || !catalogueUrgency.endsAt || !catalogueUrgency.runUntilStopped) {
      return undefined;
    }
    const endMs = new Date(catalogueUrgency.endsAt).getTime();
    if (!Number.isFinite(endMs)) return undefined;
    const delay = Math.max(0, endMs - Date.now() + 80);
    const id = setTimeout(() => setUrgencyClock(Date.now()), delay);
    return () => clearTimeout(id);
  }, [catalogueUrgency.isLive, catalogueUrgency.endsAt, catalogueUrgency.runUntilStopped]);

  useEffect(() => {
    if (catalogueUrgency.isLive || !productCountdownLive || !productCountdownEndsAt) return undefined;
    const endMs = new Date(productCountdownEndsAt).getTime();
    if (!Number.isFinite(endMs)) return undefined;
    const delay = Math.max(0, endMs - Date.now() + 80);
    const id = setTimeout(() => setPromoClock(Date.now()), delay);
    return () => clearTimeout(id);
  }, [catalogueUrgency.isLive, productCountdownLive, productCountdownEndsAt]);

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

  const optionGroups = product?.optionGroups || [];
  const selectedOptions = useMemo(
    () => selectedOptionsList(optionGroups, optSelection),
    [optionGroups, optSelection]
  );
  const optPerUnit = optionsPerUnitTotal(selectedOptions);

  const subtotalPrice = hasQuantity ? ((unitPrice || 0) + optPerUnit) * quantity + accTotal : 0;
  const totalBasePrice = hasQuantity ? (unitBasePrice + optPerUnit) * quantity + accTotal : 0;
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

  const hasAccompagnements = (product?.accompagnements || []).length > 0;
  const hasSelectedAcc = selectedAcc.length > 0;

  const openAccModal = (orderQuantity) => {
    setPendingOrderQty(orderQuantity);
    setQtyModalOpen(false);
    setHighlightAcc(true);
    setAccModalOpen(true);
    document.getElementById('meal-acc-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const completeOrder = async (orderQuantity, accOverride) => {
    const nextErrors = validateCustomerForm(customer);
    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      setQtyModalOpen(false);
      setAccModalOpen(false);
      document.getElementById('shop-order-fields')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const accList =
      accOverride ||
      (product?.accompagnements || [])
        .map((a) => {
          const key = a._id || a.name;
          const q = Number(accQty[key] || 0);
          if (q < 1) return null;
          return { id: a._id, name: a.name, price: Number(a.price) || 0, quantity: q };
        })
        .filter(Boolean);

    if ((product?.accompagnements || []).length > 0 && accList.length === 0) {
      openAccModal(orderQuantity);
      return;
    }

    const required = (product?.accompagnements || []).filter((a) => a.required);
    for (const r of required) {
      const found = accList.find(
        (a) =>
          (a.id && String(a.id) === String(r._id)) ||
          String(a.name).toLowerCase() === String(r.name).toLowerCase()
      );
      if (!found || found.quantity < 1) {
        openAccModal(orderQuantity);
        return;
      }
    }

    const optError = validateOptionSelection(product?.optionGroups || [], optSelection);
    if (optError) {
      setOptError(optError);
      document
        .getElementById('meal-options-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const saved = await submitMealOrderToApi(
        [
          {
            mealProductId: product._id,
            quantity: orderQuantity,
            accompagnements: accList,
            options: selectedOptions,
            specifications: specifications.trim(),
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
      setAccModalOpen(false);
      setPendingOrderQty(null);
      navigate(mealConfirmationPath(slug));
    } catch (err) {
      alert(err.message || 'Impossible d’enregistrer la commande. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const requestOrder = (e) => {
    e.preventDefault();
    if (!hasQuantity) {
      setHighlightQty(true);
      setQtyModalOpen(true);
      document
        .getElementById('meal-quantity-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (hasAccompagnements && !hasSelectedAcc) {
      openAccModal(quantity);
      return;
    }
    void completeOrder(quantity);
  };

  if (loading) return <PageLoader />;

  if (error || !product) {
    return (
      <div className="shop-pdp meal-pdp">
        <MealShopChrome cartCount={cartCount} showBack />
        <div className="shop-pdp-error">
          <h1>Plat indisponible</h1>
          <p>{error || 'Ce lien n’est plus actif.'}</p>
          <Link to="/repas" className="meal-pdp-back">
            ← Retour à la boutique repas
          </Link>
        </div>
        <ShopPrivacyFooter />
      </div>
    );
  }

  if (shopSettings?.isShopClosed) {
    return (
      <div className="shop-pdp meal-pdp">
        <MealShopChrome cartCount={cartCount} showBack urgency={catalogueUrgency} />
        <div className="shop-pdp-error">
          <h1>Boutique temporairement fermée</h1>
          <p>{shopSettings.shopClosure?.message || 'Revenez un peu plus tard.'}</p>
          <Link to="/repas" className="meal-pdp-back">
            ← Retour à la boutique repas
          </Link>
        </div>
        <ShopPrivacyFooter />
      </div>
    );
  }

  return (
    <div className={`shop-pdp meal-pdp${headerUrgency?.isLive ? ' shop-pdp--promo' : ''}`}>
      <MealShopChrome
        sections={navSections}
        cartCount={cartCount}
        urgency={headerUrgency}
        showBack
        onCountdownComplete={() => {
          setUrgencyClock(Date.now());
          setPromoClock(Date.now());
        }}
      />

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

            {product.showDeliveryNotice !== false ? (
              <ShopDeliveryNotice message={shopSettings?.deliveryNoticeMessage} />
            ) : null}

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
                  {selectedAcc.length ? (
                    <ul className="meal-pdp-buybox-acc-list">
                      {selectedAcc.map((a) => (
                        <li key={a.id || a.name}>
                          <span>
                            {a.name} ×{a.quantity}
                          </span>
                          <strong>{formatPriceXof(a.price * a.quantity)}</strong>
                        </li>
                      ))}
                    </ul>
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
              <div
                id="meal-acc-section"
                className={`meal-pdp-acc${highlightAcc && !hasSelectedAcc ? ' meal-pdp-acc--highlight' : ''}`}
              >
                <h3 className="meal-pdp-acc-title">Accompagnements</h3>
                <p className="meal-pdp-acc-lead">
                  Obligatoire — choisissez au moins un accompagnement pour votre plat.
                </p>
                {product.accompagnements.map((a) => {
                  const key = a._id || a.name;
                  const q = accQty[key] || 0;
                  return (
                    <div key={key} className={`meal-pdp-acc-row${q > 0 ? ' is-selected' : ''}`}>
                      <div className="meal-pdp-acc-info">
                        <strong>
                          {a.name}
                          <span className="meal-pdp-acc-req"> *</span>
                        </strong>
                        <span>{formatPriceXof(a.price)}</span>
                      </div>
                      <div className="meal-pdp-acc-ctrl">
                        <button
                          type="button"
                          aria-label={`Retirer ${a.name}`}
                          onClick={() => {
                            setAccQty((s) => ({ ...s, [key]: Math.max(0, (s[key] || 0) - 1) }));
                            setHighlightAcc(false);
                          }}
                        >
                          −
                        </button>
                        <span>{q}</span>
                        <button
                          type="button"
                          aria-label={`Ajouter ${a.name}`}
                          onClick={() => {
                            setAccQty((s) => ({
                              ...s,
                              [key]: Math.min(a.maxQuantity || 10, (s[key] || 0) + 1),
                            }));
                            setHighlightAcc(false);
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {optionGroups.length ? (
              <div id="meal-options-section" className="meal-pdp-options">
                <h3 className="meal-pdp-acc-title">Options</h3>
                <p className="meal-pdp-acc-lead">
                  Personnalisez votre plat selon vos envies.
                </p>
                <MealOptionGroups
                  groups={optionGroups}
                  selection={optSelection}
                  onToggle={(group, choice) => {
                    setOptSelection((s) => toggleOptionChoice(s, group, choice));
                    setOptError('');
                  }}
                />
                {optError ? <p className="meal-pdp-opt-error">{optError}</p> : null}
              </div>
            ) : null}

            {product.allowSpecifications !== false ? (
              <div className="meal-pdp-spec meal-spec-field">
                <label htmlFor="meal-pdp-spec-input">Spécifications du plat (facultatif)</label>
                <textarea
                  id="meal-pdp-spec-input"
                  value={specifications}
                  maxLength={500}
                  placeholder="Ex : bien cuit, sans oignon, peu épicé…"
                  onChange={(e) => setSpecifications(e.target.value)}
                />
                <p className="meal-spec-hint">Précisez vos préférences pour ce plat.</p>
              </div>
            ) : null}

            <div id="shop-order-fields">
              <ShopOrderForm
                customer={customer}
                errors={formErrors}
                onFieldChange={handleFieldChange}
                idPrefix="meal"
              />
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

      <div id="shop-section-trust">
        <ShopTrustCards whatsappNumber={getShopWhatsAppDigits()} />
      </div>

      <ShopPrivacyFooter className="shop-privacy-footer--sticky-pad" />

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
          if (hasAccompagnements && !hasSelectedAcc) {
            openAccModal(pickedQty);
            return;
          }
          void completeOrder(pickedQty);
        }}
        submitting={submitting}
      />

      <MealAccompagnementModal
        open={accModalOpen}
        onClose={() => {
          setAccModalOpen(false);
          setPendingOrderQty(null);
        }}
        productName={product.name}
        options={product.accompagnements || []}
        initialQty={accQty}
        ctaLabel="Valider et commander"
        onConfirm={(draft) => {
          setAccQty(draft);
          setHighlightAcc(false);
          setAccModalOpen(false);
          const qty = pendingOrderQty ?? quantity;
          const accList = (product.accompagnements || [])
            .map((a) => {
              const key = a._id || a.name;
              const q = Number(draft[key] || 0);
              if (q < 1) return null;
              return { id: a._id, name: a.name, price: Number(a.price) || 0, quantity: q };
            })
            .filter(Boolean);
          setPendingOrderQty(null);
          if (qty < 1) {
            setQtyModalOpen(true);
            return;
          }
          void completeOrder(qty, accList);
        }}
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
