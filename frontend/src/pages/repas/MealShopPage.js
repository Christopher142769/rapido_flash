import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FaShoppingBag,
  FaShippingFast,
  FaMoneyBillWave,
  FaWhatsapp,
  FaHeadset,
  FaStar,
  FaArrowRight,
} from 'react-icons/fa';
import PageLoader from '../../components/PageLoader';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { formatPriceXof } from '../../utils/shopPromo';
import { getShopWhatsAppDigits } from '../../utils/shopOrder';
import { loadMealCart, mealCartCount } from '../../utils/mealCart';
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
  const [heroIdx, setHeroIdx] = useState(0);
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

  const slides = useMemo(
    () => (settings?.heroSlides || []).filter((s) => s.imageUrl),
    [settings]
  );

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % slides.length), 5500);
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

  const waDigits = getShopWhatsAppDigits();
  const trustItems = settings?.trustItems?.length
    ? settings.trustItems
    : [
        { title: 'Livraison rapide', subtitle: 'Chez vous à Cotonou & Calavi' },
        { title: 'Paiement à la livraison', subtitle: 'Payez à la réception' },
        { title: 'Plats frais', subtitle: 'Préparation soignée' },
        { title: 'Support WhatsApp', subtitle: 'Suivi de commande facile' },
      ];

  const slide = slides[heroIdx] || slides[0];
  const navSections = [
    { id: 'meal-products', label: 'Plats' },
    { id: 'meal-trust', label: 'Avantages' },
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="meal-shop">
      <ShopBrandHeader sections={navSections} />

      <header className="meal-shop-toolbar">
        <p className="meal-shop-toolbar-label">Boutique multi-plats</p>
        <Link to="/repas/panier" className="meal-shop-cart-link" aria-label="Panier">
          <FaShoppingBag />
          {cartCount > 0 ? <span>{cartCount}</span> : null}
        </Link>
      </header>

      {error ? <p className="meal-shop-error">{error}</p> : null}

      <section className="meal-shop-hero">
        <div className="meal-shop-hero-copy">
          <p className="meal-shop-eyebrow">Rapido Repas</p>
          <h1>{slide?.title || 'Des plats prêts à commander'}</h1>
          <p>
            {slide?.subtitle ||
              'Choisissez votre plat, ajoutez les accompagnements, et commandez en quelques secondes.'}
          </p>
          <div className="meal-shop-hero-ctas">
            <a className="meal-shop-btn meal-shop-btn--primary" href="#meal-products">
              Voir les plats <FaArrowRight aria-hidden />
            </a>
            {settings?.promoBanner?.active ? (
              <a className="meal-shop-btn meal-shop-btn--ghost" href="#meal-promo">
                Offres du moment
              </a>
            ) : null}
          </div>
        </div>
        <div className="meal-shop-hero-visual">
          {slide?.imageUrl ? (
            <img src={getImageUrl(slide.imageUrl, BASE_URL)} alt="" />
          ) : (
            <div className="meal-shop-hero-ph" aria-hidden />
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
            return (
              <article key={p._id} className="meal-shop-card">
                <Link to={href} className="meal-shop-card-media">
                  {img ? <img src={getImageUrl(img, BASE_URL)} alt={p.name} /> : <div className="meal-shop-card-ph" />}
                  {p.isPromoLive && p.discountPercent ? (
                    <span className="meal-shop-badge">-{p.discountPercent}%</span>
                  ) : null}
                </Link>
                <div className="meal-shop-card-body">
                  {p.category ? <p className="meal-shop-card-cat">{p.category}</p> : null}
                  <h3>
                    <Link to={href}>{p.name}</Link>
                  </h3>
                  {p.shortDescription ? <p className="meal-shop-card-desc">{p.shortDescription}</p> : null}
                  <div className="meal-shop-card-price">
                    <strong>{formatPriceXof(price)}</strong>
                    {p.isPromoLive && p.basePrice > price ? <s>{formatPriceXof(p.basePrice)}</s> : null}
                  </div>
                  {(p.accompagnements || []).length ? (
                    <p className="meal-shop-card-acc">
                      {p.accompagnements.length} accompagnement
                      {p.accompagnements.length > 1 ? 's' : ''}
                    </p>
                  ) : null}
                  <Link to={href} className="meal-shop-btn meal-shop-btn--primary meal-shop-btn--block">
                    Commander
                  </Link>
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
            <a className="meal-shop-btn meal-shop-btn--primary" href="#meal-products">
              {settings.promoBanner.ctaLabel || 'Voir les plats'}
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
    </div>
  );
}
