import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FaShippingFast,
  FaMoneyBillWave,
  FaWhatsapp,
  FaHeadset,
  FaStar,
  FaShoppingBag,
} from 'react-icons/fa';
import PageLoader from '../../components/PageLoader';
import MealShopChrome from '../../components/shop/MealShopChrome';
import MealAddToCartModal from '../../components/shop/MealAddToCartModal';
import ShopPrivacyFooter from '../../components/shop/ShopPrivacyFooter';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { formatPriceXof } from '../../utils/shopPromo';
import { getShopWhatsAppDigits } from '../../utils/shopOrder';
import { getMealCatalogueUrgency } from '../../utils/mealShopUrgency';
import { loadMealCart, mealCartCount, addMealToCart, estimateMealCartTotals } from '../../utils/mealCart';
import '../shop/shopTypography.css';
import './MealShopPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const DEFAULT_TRUST_ICONS = [FaShippingFast, FaMoneyBillWave, FaStar, FaHeadset];

export default function MealShopPage() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [cartCount, setCartCount] = useState(() => mealCartCount());
  const [cartItems, setCartItems] = useState(() => loadMealCart());
  const [urgencyClock, setUrgencyClock] = useState(() => Date.now());
  const [atcProduct, setAtcProduct] = useState(null);
  const [toast, setToast] = useState('');

  const refreshCart = useCallback(() => {
    const items = loadMealCart();
    setCartItems(items);
    setCartCount(mealCartCount(items));
  }, []);

  useEffect(() => {
    const onCart = () => refreshCart();
    window.addEventListener('rapido-meal-cart', onCart);
    window.addEventListener('storage', onCart);
    return () => {
      window.removeEventListener('rapido-meal-cart', onCart);
      window.removeEventListener('storage', onCart);
    };
  }, [refreshCart]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const loadPublic = useCallback(() => {
    return Promise.all([
      axios.get(`${API_URL}/meal-products/public`, { params: { _t: Date.now() } }),
      axios.get(`${API_URL}/meal-shop/public`, { params: { _t: Date.now() } }),
    ]).then(([pRes, sRes]) => {
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setSettings(sRes.data);
      setError('');
      return sRes.data;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadPublic()
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.message || 'Impossible de charger la boutique');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPublic]);

  useEffect(() => {
    document.title = 'Shop Repas | Rapido Flash';
  }, []);

  const categories = useMemo(() => {
    const fromSettings = settings?.categories || [];
    const fromProducts = [...new Set(products.map((p) => p.category).filter(Boolean))];
    const merged = fromSettings.length ? fromSettings : fromProducts;
    return ['all', ...merged];
  }, [settings, products]);

  const filtered = useMemo(() => {
    if (category === 'all') return products;
    return products.filter((p) => p.category === category);
  }, [products, category]);

  const urgency = useMemo(
    () => getMealCatalogueUrgency(settings, new Date(urgencyClock)),
    [settings, urgencyClock]
  );

  useEffect(() => {
    if (!urgency.isLive || !urgency.endsAt || !urgency.runUntilStopped) return undefined;
    const endMs = new Date(urgency.endsAt).getTime();
    if (!Number.isFinite(endMs)) return undefined;
    const delay = Math.max(0, endMs - Date.now() + 80);
    const id = setTimeout(() => setUrgencyClock(Date.now()), delay);
    return () => clearTimeout(id);
  }, [urgency.isLive, urgency.endsAt, urgency.runUntilStopped]);

  const cartTotals = useMemo(
    () => estimateMealCartTotals(cartItems, Number(settings?.deliveryFee) || 0, false),
    [cartItems, settings?.deliveryFee]
  );

  const waDigits = getShopWhatsAppDigits();
  const trustItems = settings?.trustItems?.length
    ? settings.trustItems
    : [
        { title: 'Livraison rapide', subtitle: 'Chez vous à Cotonou & Calavi' },
        { title: 'Paiement à la livraison', subtitle: 'Payez à la réception' },
        { title: 'Plats frais', subtitle: 'Préparation soignée' },
        { title: 'Support WhatsApp', subtitle: 'Suivi de commande facile' },
      ];

  const navSections = [
    { id: 'meal-products', label: 'Nos plats' },
    { id: 'meal-trust', label: 'Avantages' },
  ];

  const openAddToCart = (p, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (settings?.isShopClosed) {
      setToast('Boutique temporairement fermée');
      return;
    }
    setAtcProduct(p);
  };

  const confirmAddToCart = ({ quantity, accompagnements, options, specifications }) => {
    if (!atcProduct) return;
    addMealToCart(atcProduct, quantity, accompagnements, options, specifications);
    setAtcProduct(null);
    setToast(`${atcProduct.name} ajouté au panier`);
  };

  if (loading) return <PageLoader />;

  return (
    <div className={`meal-shop${cartCount > 0 ? ' meal-shop--cart-open' : ''}`}>
      <MealShopChrome
        sections={navSections}
        cartCount={cartCount}
        urgency={urgency}
        onCountdownComplete={() => setUrgencyClock(Date.now())}
      />

      {error ? <p className="meal-shop-error">{error}</p> : null}

      <div className="meal-shop-intro">
        <h1>Trouvez vos plats préférés</h1>
      </div>

      {categories.length > 1 ? (
        <section className="meal-shop-cats" aria-label="Catégories">
          <div className="meal-shop-cats-row">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`meal-shop-cat${category === c ? ' is-active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c === 'all' ? 'Tous' : c}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section id="meal-products" className="meal-shop-products">
        <div className="meal-shop-section-head">
          <h2>Nos plats</h2>
          <span>
            {filtered.length} disponible{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="meal-shop-grid">
          {filtered.map((p) => {
            const price = p.isPromoLive ? p.promoPrice : p.basePrice;
            const img = p.mainImage || p.images?.[0];
            const href = `/repas/${p.slug}`;
            const hasAcc = (p.accompagnements || []).length > 0;
            return (
              <article key={p._id} className="meal-shop-card">
                <Link to={href} className="meal-shop-card-media">
                  {img ? (
                    <img src={getImageUrl(img, null, BASE_URL)} alt={p.name} loading="lazy" />
                  ) : (
                    <div className="meal-shop-card-ph" />
                  )}
                  {p.isPromoLive && p.discountPercent ? (
                    <span className="meal-shop-badge">-{p.discountPercent}%</span>
                  ) : null}
                </Link>
                <div className="meal-shop-card-body">
                  {p.category ? <p className="meal-shop-card-cat">{p.category}</p> : null}
                  <h3>
                    <Link to={href}>{p.name}</Link>
                  </h3>
                  <div className="meal-shop-card-price">
                    <strong>{formatPriceXof(price)}</strong>
                    {p.isPromoLive && p.basePrice > price ? <s>{formatPriceXof(p.basePrice)}</s> : null}
                  </div>
                  {hasAcc ? <p className="meal-shop-card-acc-hint">Avec accompagnements</p> : null}
                  <div className="meal-shop-card-actions">
                    <button
                      type="button"
                      className="meal-shop-btn meal-shop-btn--primary"
                      onClick={(e) => openAddToCart(p, e)}
                    >
                      Ajouter au panier
                    </button>
                    <Link to={href} className="meal-shop-btn meal-shop-btn--ghost">
                      Voir
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!filtered.length ? <p className="meal-shop-empty">Aucun plat publié pour le moment.</p> : null}
      </section>

      <section id="meal-trust" className="meal-shop-trust" aria-label="Avantages">
        {trustItems.map((t, i) => {
          const Icon = DEFAULT_TRUST_ICONS[i % DEFAULT_TRUST_ICONS.length];
          return (
            <div key={i} className="meal-shop-trust-item">
              <Icon aria-hidden />
              <div>
                <strong>{t.title}</strong>
                <span>{t.subtitle}</span>
              </div>
            </div>
          );
        })}
      </section>

      {settings?.promoBanner?.active ? (
        <section id="meal-promo" className="meal-shop-banner">
          <div>
            <h2>{settings.promoBanner.title || 'Offre spéciale'}</h2>
            <p>{settings.promoBanner.subtitle}</p>
            <button
              type="button"
              className="meal-shop-btn meal-shop-btn--primary"
              onClick={() => {
                document.getElementById('meal-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {settings.promoBanner.ctaLabel || 'Voir les plats'}
            </button>
          </div>
        </section>
      ) : null}

      <footer className="meal-shop-footer">
        <div>
          <strong>Rapido Repas</strong>
          <p>Livraison de repas à Cotonou et Calavi.</p>
        </div>
        {waDigits ? (
          <a
            href={`https://wa.me/${waDigits}`}
            target="_blank"
            rel="noreferrer"
            className="meal-shop-footer-wa"
          >
            <FaWhatsapp /> WhatsApp
          </a>
        ) : null}
      </footer>
      <ShopPrivacyFooter className={cartCount > 0 ? 'shop-privacy-footer--sticky-pad' : ''} />

      {cartCount > 0 ? (
        <div className="meal-shop-float-cart">
          <Link to="/repas/panier" className="meal-shop-float-cart-inner">
            <span className="meal-shop-float-cart-icon">
              <FaShoppingBag aria-hidden />
              <em>{cartCount}</em>
            </span>
            <span className="meal-shop-float-cart-text">
              <strong>Voir le panier</strong>
              <small>{formatPriceXof(cartTotals.totalPrice)}</small>
            </span>
          </Link>
        </div>
      ) : null}

      {toast ? (
        <div className="meal-shop-toast" role="status">
          {toast}
        </div>
      ) : null}

      <MealAddToCartModal
        open={!!atcProduct}
        product={atcProduct}
        onClose={() => setAtcProduct(null)}
        onConfirm={confirmAddToCart}
        ctaLabel="Ajouter au panier"
      />
    </div>
  );
}
