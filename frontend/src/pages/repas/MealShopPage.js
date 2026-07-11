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
  FaFire,
} from 'react-icons/fa';
import PageLoader from '../../components/PageLoader';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopCountdown from '../../components/shop/ShopCountdown';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { formatPriceXof } from '../../utils/shopPromo';
import { getShopWhatsAppDigits } from '../../utils/shopOrder';
import { getMealCatalogueUrgency } from '../../utils/mealShopUrgency';
import { loadMealCart, mealCartCount } from '../../utils/mealCart';
import '../shop/shopTypography.css';
import './MealShopPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');
const RAPIDO_LOGO = '/images/logo.png';

const DEFAULT_TRUST_ICONS = [FaShippingFast, FaMoneyBillWave, FaStar, FaHeadset];

function scrollToMealSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const topBar =
    document.querySelector('.meal-shop-urgency') ||
    document.querySelector('.shop-brand-header');
  const offset = (topBar?.offsetHeight || 0) + 14;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function slideImageList(slide) {
  if (!slide) return [];
  const urls = [];
  if (slide.imageUrl) urls.push(slide.imageUrl);
  for (const u of slide.imageUrls || []) {
    if (u && !urls.includes(u)) urls.push(u);
  }
  return urls;
}

export default function MealShopPage() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [heroIdx, setHeroIdx] = useState(0);
  const [slideImgIdx, setSlideImgIdx] = useState(0);
  const [cartCount, setCartCount] = useState(() => mealCartCount());
  const [urgencyClock, setUrgencyClock] = useState(() => Date.now());

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

  const slides = useMemo(
    () => (settings?.heroSlides || []).filter((s) => slideImageList(s).length > 0),
    [settings]
  );

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const id = setInterval(() => {
      setHeroIdx((i) => (i + 1) % slides.length);
      setSlideImgIdx(0);
    }, 5500);
    return () => clearInterval(id);
  }, [slides.length]);

  const activeSlide = slides[heroIdx] || slides[0];
  const activeImages = useMemo(() => slideImageList(activeSlide), [activeSlide]);

  useEffect(() => {
    if (activeImages.length < 2) return undefined;
    const id = setInterval(() => setSlideImgIdx((i) => (i + 1) % activeImages.length), 3200);
    return () => clearInterval(id);
  }, [activeImages.length, heroIdx]);

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

  const heroImage = activeImages[slideImgIdx] || activeImages[0];

  if (loading) return <PageLoader />;

  return (
    <div className="meal-shop">
      {urgency.isLive ? (
        <div className="meal-shop-urgency" role="region" aria-live="polite">
          <div className="meal-shop-urgency-inner">
            <p className="meal-shop-urgency-label">
              <FaFire aria-hidden /> {urgency.label}
            </p>
            {urgency.endsAtIso ? (
              <ShopCountdown
                endsAt={urgency.endsAtIso}
                variant="urgent"
                autoRestart={urgency.runUntilStopped}
                onComplete={() => setUrgencyClock(Date.now())}
              />
            ) : null}
            {urgency.expectedOrders > 0 ? (
              <p className="meal-shop-urgency-quota">
                {urgency.remainingOrders > 0 ? (
                  <>
                    Plus que <strong>{urgency.remainingOrders}</strong> commande
                    {urgency.remainingOrders > 1 ? 's' : ''} attendue
                    {urgency.remainingOrders > 1 ? 's' : ''} aujourd&apos;hui
                  </>
                ) : (
                  <>Quota du jour presque atteint — commandez maintenant</>
                )}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <ShopBrandHeader sections={navSections} />

      <header className="meal-shop-toolbar">
        <img src={RAPIDO_LOGO} alt="Rapido Flash" className="meal-shop-toolbar-logo" />
        <Link to="/repas/panier" className="meal-shop-cart-link" aria-label="Panier">
          <FaShoppingBag />
          {cartCount > 0 ? <span>{cartCount}</span> : null}
        </Link>
      </header>

      {error ? <p className="meal-shop-error">{error}</p> : null}

      <section className="meal-shop-hero">
        <div className="meal-shop-hero-copy">
          <p className="meal-shop-eyebrow">Rapido Repas</p>
          <h1>Des plats prêts à commander</h1>
          <p className="meal-shop-hero-lead">
            {activeSlide?.subtitle ||
              'Choisissez votre plat, ajoutez les accompagnements, et commandez en quelques secondes.'}
          </p>
        </div>

        <div className="meal-shop-hero-visual">
          {heroImage ? (
            <img src={getImageUrl(heroImage, null, BASE_URL)} alt="" key={`${heroIdx}-${slideImgIdx}`} />
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
                  onClick={() => {
                    setHeroIdx(i);
                    setSlideImgIdx(0);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="meal-shop-hero-ctas">
          <button
            type="button"
            className="meal-shop-btn meal-shop-btn--primary meal-shop-btn--xl"
            onClick={() => scrollToMealSection('meal-products')}
          >
            Voir nos plats <FaArrowRight aria-hidden />
          </button>
          <button
            type="button"
            className="meal-shop-btn meal-shop-btn--ghost meal-shop-btn--xl"
            onClick={() =>
              scrollToMealSection(settings?.promoBanner?.active ? 'meal-promo' : 'meal-products')
            }
          >
            Offres du moment
          </button>
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
                  {img ? <img src={getImageUrl(img, null, BASE_URL)} alt={p.name} /> : <div className="meal-shop-card-ph" />}
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
            <button
              type="button"
              className="meal-shop-btn meal-shop-btn--primary"
              onClick={() => scrollToMealSection('meal-products')}
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
    </div>
  );
}
