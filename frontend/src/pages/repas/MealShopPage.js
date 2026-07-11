import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaShoppingBag, FaShippingFast, FaMoneyBillWave, FaWhatsapp, FaHeadset, FaStar } from 'react-icons/fa';
import PageLoader from '../../components/PageLoader';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { formatPriceXof } from '../../utils/shopPromo';
import { getShopWhatsAppDigits } from '../../utils/shopOrder';
import {
  addMealToCart,
  loadMealCart,
  mealCartCount,
} from '../../utils/mealCart';
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
  const [heroIdx, setHeroIdx] = useState(0);
  const [modalProduct, setModalProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [accQty, setAccQty] = useState({});
  const [cartCount, setCartCount] = useState(() => mealCartCount());
  const [toast, setToast] = useState('');

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/meal-products/public`),
      axios.get(`${API_URL}/meal-shop/public`),
    ])
      .then(([pRes, sRes]) => {
        if (cancelled) return;
        setProducts(Array.isArray(pRes.data) ? pRes.data : []);
        setSettings(sRes.data);
        setError('');
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.message || 'Impossible de charger la boutique');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.title = 'Shop Repas | Rapido Flash';
  }, []);

  const slides = settings?.heroSlides?.filter((s) => s.imageUrl) || [];

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

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

  const openModal = (p) => {
    setModalProduct(p);
    setQty(1);
    const init = {};
    (p.accompagnements || []).forEach((a) => {
      init[a._id || a.name] = a.required ? 1 : 0;
    });
    setAccQty(init);
  };

  const addToCart = () => {
    if (!modalProduct) return;
    const required = (modalProduct.accompagnements || []).filter((a) => a.required);
    for (const r of required) {
      const key = r._id || r.name;
      if ((accQty[key] || 0) < 1) {
        setToast(`Choisissez : ${r.name}`);
        return;
      }
    }
    const accompagnements = (modalProduct.accompagnements || []).map((a) => ({
      id: a._id,
      name: a.name,
      price: a.price,
      quantity: Number(accQty[a._id || a.name] || 0),
    }));
    addMealToCart(modalProduct, qty, accompagnements);
    setToast('Ajouté au panier');
    setModalProduct(null);
    refreshCart();
    setTimeout(() => setToast(''), 2200);
  };

  const waDigits = getShopWhatsAppDigits();
  const trustItems = settings?.trustItems?.length
    ? settings.trustItems
    : [
        { title: 'Livraison rapide', subtitle: 'Cotonou & Calavi' },
        { title: 'Paiement à la livraison', subtitle: 'Payez à réception' },
        { title: 'Plats frais', subtitle: 'Préparation soignée' },
        { title: 'Support WhatsApp', subtitle: 'Suivi facile' },
      ];

  if (loading) return <PageLoader />;

  const slide = slides[heroIdx] || slides[0];

  return (
    <div className="meal-shop">
      <header className="meal-shop-top">
        <Link to="/repas" className="meal-shop-brand">
          <img src="/images/logo.png" alt="" />
          <span>Rapido Repas</span>
        </Link>
        <Link to="/repas/panier" className="meal-shop-cart-btn" aria-label="Panier">
          <FaShoppingBag />
          {cartCount > 0 ? <span className="meal-shop-cart-badge">{cartCount}</span> : null}
        </Link>
      </header>

      {error ? <p className="meal-shop-error">{error}</p> : null}

      <section className="meal-shop-hero">
        <div className="meal-shop-hero-copy">
          <h1>{slide?.title || 'Découvrez nos meilleurs plats'}</h1>
          <p>
            {slide?.subtitle ||
              'Commandez plusieurs plats, choisissez vos accompagnements, et faites-vous livrer rapidement.'}
          </p>
          <div className="meal-shop-hero-ctas">
            <a className="meal-shop-btn meal-shop-btn--primary" href="#meal-products">
              Commander →
            </a>
            {settings?.promoBanner?.active ? (
              <a className="meal-shop-btn meal-shop-btn--ghost" href="#meal-promo">
                Voir les offres
              </a>
            ) : null}
          </div>
        </div>
        <div className="meal-shop-hero-visual">
          {slide?.imageUrl ? (
            <img src={getImageUrl(slide.imageUrl, BASE_URL)} alt="" />
          ) : (
            <div className="meal-shop-hero-ph" />
          )}
          {slides.length > 1 ? (
            <div className="meal-shop-hero-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === heroIdx ? 'is-active' : ''}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setHeroIdx(i)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {categories.length > 1 ? (
        <section className="meal-shop-cats">
          <div className="meal-shop-section-head">
            <h2>Catégories</h2>
          </div>
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
          <span>{filtered.length} disponible{filtered.length > 1 ? 's' : ''}</span>
        </div>
        <div className="meal-shop-grid">
          {filtered.map((p) => {
            const price = p.isPromoLive ? p.promoPrice : p.basePrice;
            const img = p.mainImage || p.images?.[0];
            return (
              <article key={p._id} className="meal-shop-card">
                <div className="meal-shop-card-media">
                  {img ? <img src={getImageUrl(img, BASE_URL)} alt={p.name} /> : <div className="meal-shop-card-ph" />}
                  {p.isPromoLive && p.discountPercent ? (
                    <span className="meal-shop-badge">-{p.discountPercent}%</span>
                  ) : null}
                </div>
                <div className="meal-shop-card-body">
                  <h3>{p.name}</h3>
                  {p.shortDescription ? <p className="meal-shop-card-desc">{p.shortDescription}</p> : null}
                  <div className="meal-shop-card-price">
                    <strong>{formatPriceXof(price)}</strong>
                    {p.isPromoLive && p.basePrice > price ? (
                      <s>{formatPriceXof(p.basePrice)}</s>
                    ) : null}
                  </div>
                  <button type="button" className="meal-shop-btn meal-shop-btn--primary meal-shop-btn--block" onClick={() => openModal(p)}>
                    Ajouter
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {!filtered.length ? <p className="meal-shop-empty">Aucun plat pour le moment.</p> : null}
      </section>

      <section className="meal-shop-trust" aria-label="Avantages">
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
            <a className="meal-shop-btn meal-shop-btn--primary" href="#meal-products">
              {settings.promoBanner.ctaLabel || 'Voir les plats'} →
            </a>
          </div>
        </section>
      ) : null}

      <footer className="meal-shop-footer">
        <div>
          <strong>Rapido Repas</strong>
          <p>Livraison de repas à Cotonou et Calavi.</p>
        </div>
        {waDigits ? (
          <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" className="meal-shop-footer-wa">
            <FaWhatsapp /> WhatsApp
          </a>
        ) : null}
      </footer>

      <Link to="/repas/panier" className="meal-shop-fab">
        <FaShoppingBag />
        <span>Panier{cartCount ? ` (${cartCount})` : ''}</span>
      </Link>

      {modalProduct ? (
        <div className="meal-shop-modal" role="dialog" aria-modal="true">
          <button type="button" className="meal-shop-modal-backdrop" aria-label="Fermer" onClick={() => setModalProduct(null)} />
          <div className="meal-shop-modal-panel">
            <h3>{modalProduct.name}</h3>
            <p className="meal-shop-modal-price">
              {formatPriceXof(modalProduct.isPromoLive ? modalProduct.promoPrice : modalProduct.basePrice)}
            </p>
            <label className="meal-shop-qty">
              Quantité
              <div className="meal-shop-qty-ctrl">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)}>
                  +
                </button>
              </div>
            </label>
            {(modalProduct.accompagnements || []).length ? (
              <div className="meal-shop-acc">
                <h4>Accompagnements</h4>
                {modalProduct.accompagnements.map((a) => {
                  const key = a._id || a.name;
                  return (
                    <div key={key} className="meal-shop-acc-row">
                      <div>
                        <strong>
                          {a.name}
                          {a.required ? ' *' : ''}
                        </strong>
                        <span>{formatPriceXof(a.price)}</span>
                      </div>
                      <div className="meal-shop-qty-ctrl">
                        <button
                          type="button"
                          onClick={() =>
                            setAccQty((s) => ({ ...s, [key]: Math.max(0, (s[key] || 0) - 1) }))
                          }
                        >
                          −
                        </button>
                        <span>{accQty[key] || 0}</span>
                        <button
                          type="button"
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
            <button type="button" className="meal-shop-btn meal-shop-btn--primary meal-shop-btn--block" onClick={addToCart}>
              Ajouter au panier
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <div className="meal-shop-toast">{toast}</div> : null}
    </div>
  );
}
