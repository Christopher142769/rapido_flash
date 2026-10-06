import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FaShippingFast,
  FaMoneyBillWave,
  FaWhatsapp,
  FaHeadset,
  FaShoppingBag,
  FaSearch,
  FaPlus,
  FaRegHeart,
  FaHeart,
  FaLeaf,
  FaFire,
  FaArrowRight,
  FaTimes,
  FaBars,
  FaMapMarkerAlt,
  FaHome,
  FaThLarge,
  FaChevronDown,
} from 'react-icons/fa';
import PageLoader from '../../components/PageLoader';
import MealAddToCartModal from '../../components/shop/MealAddToCartModal';
import ShopPrivacyFooter from '../../components/shop/ShopPrivacyFooter';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { formatPriceXof } from '../../utils/shopPromo';
import { resolveTrackingWhatsAppDigits } from '../../utils/shopOrder';
import { getMealCatalogueUrgency } from '../../utils/mealShopUrgency';
import { loadMealCart, mealCartCount, addMealToCart, estimateMealCartTotals } from '../../utils/mealCart';
import { mealProductPath } from '../../utils/mealPaths';
import { trackProductClick } from '../../utils/analyticsBeacon';
import '../shop/shopTypography.css';
import './MealShopPage.css';
import { getMediaBaseUrl } from '../../utils/mediaUrl';
import heroBrick from '../../assets/repas/hero-brick.jpg';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = getMediaBaseUrl();

const DEFAULT_TRUST_ICONS = [FaShippingFast, FaMoneyBillWave, FaLeaf, FaHeadset];
const GRID_INITIAL = 8;
const RAPIDO_LOGO = '/images/logo.png';

const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');

function PImg({ src, alt = '' }) {
  return src ? <img src={src} alt={alt} loading="lazy" /> : <div className="mr-ph" />;
}

function Countdown({ endsAtIso, onComplete }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(endsAtIso).getTime() - Date.now()));
  useEffect(() => {
    const end = new Date(endsAtIso).getTime();
    if (!Number.isFinite(end)) return undefined;
    let done = false;
    const tick = () => {
      const ms = Math.max(0, end - Date.now());
      setLeft(ms);
      if (ms === 0 && !done) {
        done = true;
        onComplete?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAtIso, onComplete]);
  const s = Math.floor(left / 1000);
  const cells = [
    [Math.floor(s / 86400), 'Jours'],
    [Math.floor((s % 86400) / 3600), 'Heures'],
    [Math.floor((s % 3600) / 60), 'Min'],
    [s % 60, 'Sec'],
  ];
  return (
    <div className="mr-count" role="timer">
      {cells.map(([v, l]) => (
        <div key={l} className="mr-count-cell">
          <strong>{pad2(v)}</strong>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

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
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [favs, setFavs] = useState(() => {
    try {
      const raw = localStorage.getItem('rapido_meal_favs');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  });

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

  const waDigits = resolveTrackingWhatsAppDigits(settings?.trackingWhatsAppNumber);
  const trustItems = settings?.trustItems?.length
    ? settings.trustItems
    : [
        { title: 'Livraison rapide', subtitle: 'Chez vous à Cotonou & Calavi' },
        { title: 'Paiement à la livraison', subtitle: 'Payez à la réception' },
        { title: 'Plats frais', subtitle: 'Préparation soignée' },
        { title: 'Support WhatsApp', subtitle: 'Suivi de commande facile' },
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

  const imgOf = (p) => {
    const raw = p?.mainImage || p?.images?.[0];
    return raw ? getImageUrl(raw, null, BASE_URL) : null;
  };
  const priceOf = (p) => (p.isPromoLive ? p.promoPrice : p.basePrice);
  const withImg = products.filter((p) => imgOf(p) && p.available !== false);
  const pool = withImg.length ? withImg : products;

  const slide = settings?.heroSlides?.[0];
  const heroProduct = pool.find((p) => p.isPromoLive) || pool[0] || null;
  const heroImg = heroProduct ? imgOf(heroProduct) : null;
  const heroTitle = (slide?.title || heroProduct?.name || 'Nos plats').toUpperCase();
  const heroSub =
    slide?.subtitle ||
    heroProduct?.shortDescription ||
    'Des plats préparés avec soin, livrés chauds chez vous à Cotonou et Calavi.';

  const aboutProduct = pool[1] || pool[0] || null;
  const promoCards = (pool.length > 3 ? pool.slice(1, 4) : pool.slice(0, 3)).slice(0, 3);
  const bannerProduct =
    pool.find((p) => p.isPromoLive && p._id !== heroProduct?._id) || pool[pool.length - 1] || null;

  const catTiles = categories.slice(0, 12).map((c) => {
    const first = c === 'all' ? pool[0] : pool.find((p) => p.category === c);
    return { key: c, label: c === 'all' ? 'Tous les plats' : c, img: first ? imgOf(first) : null };
  });

  const q = search.trim().toLowerCase();
  const searched = q
    ? filtered.filter((p) => `${p.name} ${p.category || ''}`.toLowerCase().includes(q))
    : filtered;
  const shown = showAll || q ? searched : searched.slice(0, GRID_INITIAL);

  const goTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const urgencyText = urgency.isLive
    ? urgency.expectedOrders > 0 && urgency.remainingOrders != null
      ? `${urgency.label || 'Offre limitée'} · plus que ${urgency.remainingOrders} commande${urgency.remainingOrders > 1 ? 's' : ''}`
      : urgency.label || 'Offre limitée — commandez vite'
    : 'Livraison rapide à Cotonou & Calavi';

  const toggleFav = (id) =>
    setFavs((f) => {
      const key = String(id);
      const next = f.includes(key) ? f.filter((x) => x !== key) : [...f, key];
      try {
        localStorage.setItem('rapido_meal_favs', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const trackClick = (p) =>
    trackProductClick({ _id: p._id, name: p.name, slug: p.slug }, { channel: 'repas' });

  const popular = (pool.length ? pool : searched).slice(0, 8);

  return (
    <div className={`mr mr--app${cartCount > 0 ? ' mr--cart' : ''}`}>
      {/* Barre d'annonce — desktop */}
      <div className="mr-announce">
        <span><FaFire aria-hidden /> {urgencyText}</span>
        <span className="mr-announce-mid">Paiement à la livraison · Suivi WhatsApp</span>
        <span className="mr-announce-right">Cotonou & Calavi</span>
      </div>

      {/* Header */}
      <header className="mr-header" id="mr-top">
        <div className="mr-header-in">
          <Link to="/repas" className="mr-logo" aria-label="Rapido Repas">
            <img src={RAPIDO_LOGO} alt="Rapido Flash" />
            <span className="mr-logo-tag">Livré chaud chez vous</span>
          </Link>
          <nav className={`mr-nav${menuOpen ? ' is-open' : ''}`} aria-label="Navigation">
            <button type="button" className="is-current" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false); }}>Accueil</button>
            <button type="button" onClick={() => goTo('mr-cats')}>Catégories</button>
            <button type="button" onClick={() => goTo('meal-products')}>Menu</button>
            <button type="button" onClick={() => goTo('meal-trust')}>Avantages</button>
            <button type="button" onClick={() => goTo('mr-contact')}>Contact</button>
          </nav>
          <div className="mr-header-actions">
            <button type="button" className="mr-icon-btn mr-icon-btn--ring mr-search-toggle" aria-label="Rechercher" onClick={() => setSearchOpen((o) => !o)}>
              {searchOpen ? <FaTimes /> : <FaSearch />}
            </button>
            {waDigits ? (
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noreferrer"
                className="mr-icon-btn mr-icon-btn--ring mr-wa-header"
                aria-label="WhatsApp"
              >
                <FaWhatsapp />
              </a>
            ) : null}
            <Link to="/repas/panier" className="mr-icon-btn mr-cart-btn mr-cart-header" aria-label="Panier">
              <FaShoppingBag />
              {cartCount > 0 ? <em>{cartCount}</em> : null}
            </Link>
            <button type="button" className="mr-cta mr-cta--header" onClick={() => goTo('meal-products')}>
              Commander
            </button>
            <button type="button" className="mr-icon-btn mr-burger" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* Barre livraison + recherche (mobile app) */}
        <div className="mr-deliver">
          <div className="mr-deliver-bar">
            <button type="button" className="mr-deliver-loc" onClick={() => goTo('mr-contact')}>
              <FaMapMarkerAlt aria-hidden />
              <span>
                <small>Livrer à</small>
                <strong>Cotonou & Calavi</strong>
              </span>
              <FaChevronDown className="mr-deliver-chev" aria-hidden />
            </button>
            <span className="mr-deliver-sep" aria-hidden />
            <label className="mr-deliver-search">
              <FaSearch aria-hidden />
              <input
                type="search"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value) goTo('meal-products');
                }}
                aria-label="Rechercher un plat"
              />
            </label>
          </div>
        </div>

        {searchOpen ? (
          <div className="mr-search mr-search--desktop">
            <FaSearch aria-hidden />
            <input
              autoFocus
              type="search"
              placeholder="Rechercher un plat…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value) goTo('meal-products');
              }}
            />
          </div>
        ) : null}
      </header>

      {error ? <p className="mr-error">{error}</p> : null}

      {/* Hero */}
      <section className="mr-hero">
        <div className="mr-hero-bg" style={{ backgroundImage: `url(${heroBrick})` }} aria-hidden />
        <div className="mr-hero-card">
          <div className="mr-hero-in">
            <div className="mr-hero-copy">
              <p className="mr-eyebrow">Fraîchement préparé · Directement chez vous</p>
              <p className="mr-script">Rapido Repas</p>
              <h1>{heroTitle}</h1>
              <p className="mr-hero-sub">{heroSub}</p>
              <div className="mr-hero-cta">
                {heroProduct ? (
                  <Link
                    to={mealProductPath(heroProduct.slug)}
                    className="mr-cta mr-cta--lg mr-cta--pill"
                    onClick={() => trackClick(heroProduct)}
                  >
                    {slide?.ctaLabel || 'Commander'} <FaArrowRight aria-hidden />
                  </Link>
                ) : (
                  <button type="button" className="mr-cta mr-cta--lg mr-cta--pill" onClick={() => goTo('meal-products')}>
                    {slide?.ctaLabel || 'Commander'} <FaArrowRight aria-hidden />
                  </button>
                )}
              </div>
              <p className="mr-hero-rating">
                <span className="mr-stars" aria-hidden>★★★★★</span> Fait maison · Livré chaud
              </p>
            </div>
            <div className="mr-hero-visual">
              {heroProduct && heroImg ? (
                <Link to={mealProductPath(heroProduct.slug)} onClick={() => trackClick(heroProduct)} className="mr-hero-plate">
                  <img src={heroImg} alt={heroProduct.name} />
                </Link>
              ) : (
                <div className="mr-hero-plate"><div className="mr-ph" /></div>
              )}
              {heroProduct ? <span className="mr-price-badge">{formatPriceXof(priceOf(heroProduct))}</span> : null}
            </div>
          </div>
          <div className="mr-hero-dots" aria-hidden>
            <i className="is-on" /><i /><i />
          </div>
        </div>
        <div className="mr-hero-ticker" aria-hidden>
          <span>Cuisine fraîche</span><i>•</i><span>Livraison rapide</span><i>•</i><span>Paiement à la livraison</span><i>•</i><span>Cotonou & Calavi</span>
        </div>
      </section>

      {/* Catégories */}
      {catTiles.length > 1 ? (
        <section id="mr-cats" className="mr-cats" aria-label="Catégories">
          <div className="mr-cats-row">
            {catTiles.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`mr-cat${category === t.key ? ' is-active' : ''}`}
                onClick={() => {
                  setCategory(t.key);
                  setShowAll(false);
                  goTo('meal-products');
                }}
              >
                <span className="mr-cat-img">{t.img ? <img src={t.img} alt="" loading="lazy" /> : <span className="mr-ph" />}</span>
                <strong>{t.key === 'all' ? 'À la une' : t.label}</strong>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Popular picks — mobile horizontal */}
      {popular.length ? (
        <section className="mr-picks" aria-label="Sélection populaire">
          <div className="mr-picks-head">
            <h2>Populaires</h2>
            <button type="button" className="mr-picks-all" onClick={() => goTo('meal-products')}>
              Voir tout <FaArrowRight aria-hidden />
            </button>
          </div>
          <div className="mr-picks-row">
            {popular.map((p) => {
              const unavailable = p.available === false;
              const href = mealProductPath(p.slug);
              return (
                <article key={`pick-${p._id}`} className={`mr-pick${unavailable ? ' is-off' : ''}`}>
                  <Link
                    to={href}
                    className="mr-pick-media"
                    onClick={() => trackClick(p)}
                    aria-label={p.name}
                    tabIndex={unavailable ? -1 : undefined}
                  >
                    <PImg src={imgOf(p)} alt={p.name} />
                  </Link>
                  <h3>{unavailable ? p.name : <Link to={href} onClick={() => trackClick(p)}>{p.name}</Link>}</h3>
                  <div className="mr-pick-foot">
                    <strong>{formatPriceXof(priceOf(p))}</strong>
                    <button
                      type="button"
                      className="mr-add mr-add--round"
                      aria-label={`Ajouter ${p.name}`}
                      disabled={unavailable}
                      onClick={(e) => openAddToCart(p, e)}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* À propos */}
      {aboutProduct ? (
        <section className="mr-about">
          <div className="mr-about-in">
            <div className="mr-about-visual">
              <span className="mr-about-ghost" aria-hidden>RAPIDO</span>
              <div className="mr-about-plate"><PImg src={imgOf(aboutProduct)} alt={aboutProduct.name} /></div>
              <span className="mr-seal"><strong>100%</strong><small>Frais</small></span>
              <span className="mr-script mr-about-sign">Fait avec amour</span>
            </div>
            <div className="mr-about-copy">
              <p className="mr-kicker">À propos de nous</p>
              <h2>NOUS FAISONS LE MEILLEUR REPAS DE VOTRE VILLE.</h2>
              <p className="mr-about-text">
                Des saveurs locales, des ingrédients frais et une préparation soignée : chaque plat est cuisiné à la commande
                et livré chaud, à Cotonou comme à Calavi.
              </p>
              <ul className="mr-about-feats">
                {trustItems.slice(0, 3).map((t, i) => {
                  const Icon = DEFAULT_TRUST_ICONS[i % DEFAULT_TRUST_ICONS.length];
                  return (
                    <li key={i}>
                      <Icon aria-hidden />
                      <strong>{t.title}</strong>
                      <span>{t.subtitle}</span>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="mr-link-btn" onClick={() => goTo('mr-contact')}>
                Un mot sur nous <FaArrowRight aria-hidden />
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* 3 cartes promo */}
      {promoCards.length ? (
        <section className="mr-trio" aria-label="À la une">
          {promoCards.map((p, i) => (
            <article key={p._id} className={`mr-trio-card mr-trio-card--${i + 1}`}>
              <div className="mr-trio-copy">
                <p className="mr-trio-eyebrow">{p.category || 'Notre sélection'}</p>
                <h3>{p.name}</h3>
                <p className="mr-trio-price">{formatPriceXof(priceOf(p))}</p>
                <button type="button" className="mr-btn-light" onClick={(e) => openAddToCart(p, e)} disabled={p.available === false}>
                  Commander <FaArrowRight aria-hidden />
                </button>
              </div>
              <Link to={mealProductPath(p.slug)} onClick={() => trackClick(p)} className="mr-trio-plate">
                <PImg src={imgOf(p)} alt={p.name} />
              </Link>
            </article>
          ))}
        </section>
      ) : null}

      {/* Meilleures ventes */}
      <section id="meal-products" className="mr-best">
        <span className="mr-ghost-title" aria-hidden>NOS PLATS · NOS PLATS</span>
        <p className="mr-kicker mr-kicker--center">Vos envies, livrées</p>
        <h2 className="mr-title">NOS PLATS LES PLUS DEMANDÉS</h2>
        <p className="mr-sub">
          Les favoris Rapido, avec de vraies saveurs. {searched.length} plat{searched.length > 1 ? 's' : ''} disponible{searched.length > 1 ? 's' : ''}
          {category !== 'all' ? ` · ${category}` : ''}.
        </p>

        <div className="mr-grid">
          {shown.map((p, i) => {
            const price = priceOf(p);
            const href = mealProductPath(p.slug);
            const unavailable = p.available === false;
            const badge = unavailable
              ? 'Indisponible'
              : p.isPromoLive && p.discountPercent
                ? `-${p.discountPercent}%`
                : i === 0
                  ? 'Best-seller'
                  : p.category || 'Nouveau';
            return (
              <article key={p._id} className={`mr-card${unavailable ? ' is-off' : ''}`}>
                <div className="mr-card-media">
                  <span className={`mr-badge${unavailable ? ' mr-badge--off' : ''}`}>{badge}</span>
                  <button type="button" className="mr-fav" aria-label="Favori" onClick={() => toggleFav(p._id)}>
                    {favs.includes(String(p._id)) ? <FaHeart /> : <FaRegHeart />}
                  </button>
                  {unavailable ? (
                    <PImg src={imgOf(p)} />
                  ) : (
                    <Link to={href} onClick={() => trackClick(p)} aria-label={p.name}>
                      <PImg src={imgOf(p)} alt={p.name} />
                    </Link>
                  )}
                </div>
                <div className="mr-card-body">
                  <p className="mr-card-cat">
                    <span className="mr-stars" aria-hidden>★★★★★</span> {p.category || 'Plat'}
                  </p>
                  <h3>{unavailable ? p.name : <Link to={href} onClick={() => trackClick(p)}>{p.name}</Link>}</h3>
                  <p className="mr-card-desc">
                    {p.shortDescription || ((p.accompagnements || []).length ? 'Avec accompagnements au choix.' : 'Préparé frais à la commande.')}
                  </p>
                  <div className="mr-card-foot">
                    <div className="mr-card-price">
                      <strong>{formatPriceXof(price)}</strong>
                      {p.isPromoLive && p.basePrice > price ? <s>{formatPriceXof(p.basePrice)}</s> : null}
                    </div>
                    <button
                      type="button"
                      className="mr-add"
                      aria-label={`Ajouter ${p.name} au panier`}
                      disabled={unavailable}
                      onClick={(e) => openAddToCart(p, e)}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!searched.length ? <p className="mr-empty">Aucun plat publié pour le moment.</p> : null}

        {!showAll && !q && searched.length > GRID_INITIAL ? (
          <div className="mr-more">
            <button type="button" className="mr-outline" onClick={() => setShowAll(true)}>
              Voir tout le menu <FaArrowRight aria-hidden />
            </button>
          </div>
        ) : null}
      </section>

      {/* Bandeau promo + compte à rebours */}
      {bannerProduct ? (
        <section className="mr-banner" id="meal-promo">
          <div className="mr-banner-in">
            <div className="mr-banner-copy">
              <p className="mr-banner-eyebrow">
                {settings?.promoBanner?.active ? 'Offre spéciale' : 'Le choix du chef'}
              </p>
              <h2>
                {settings?.promoBanner?.active && settings.promoBanner.title
                  ? settings.promoBanner.title
                  : bannerProduct.name}
              </h2>
              <p className="mr-banner-sub">
                {settings?.promoBanner?.active && settings.promoBanner.subtitle
                  ? settings.promoBanner.subtitle
                  : bannerProduct.shortDescription || 'Croustillant dehors, savoureux dedans. Ne le manquez pas.'}
              </p>
              {urgency.isLive && urgency.endsAtIso ? (
                <Countdown endsAtIso={urgency.endsAtIso} onComplete={() => setUrgencyClock(Date.now())} />
              ) : null}
              <button type="button" className="mr-cta mr-cta--gold" onClick={() => goTo('meal-products')}>
                {settings?.promoBanner?.active && settings.promoBanner.ctaLabel ? settings.promoBanner.ctaLabel : 'Commander maintenant'} <FaArrowRight aria-hidden />
              </button>
            </div>
            <div className="mr-banner-visual">
              <div className="mr-banner-plate"><PImg src={imgOf(bannerProduct)} alt={bannerProduct.name} /></div>
              <span className="mr-banner-tag"><small>Dès</small><strong>{formatPriceXof(priceOf(bannerProduct))}</strong></span>
            </div>
          </div>
        </section>
      ) : null}

      {/* Avantages */}
      <section id="meal-trust" className="mr-trust" aria-label="Avantages">
        {trustItems.map((t, i) => {
          const Icon = DEFAULT_TRUST_ICONS[i % DEFAULT_TRUST_ICONS.length];
          return (
            <div key={i} className="mr-trust-item">
              <Icon aria-hidden />
              <div>
                <strong>{t.title}</strong>
                <span>{t.subtitle}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Bandeau fidélité mobile */}
      <section className="mr-rewards" aria-label="Avantages Rapido">
        <span className="mr-rewards-ico" aria-hidden><FaLeaf /></span>
        <div className="mr-rewards-copy">
          <strong>Rapido Repas</strong>
          <span>Paiement à la livraison · Suivi WhatsApp</span>
        </div>
        {waDigits ? (
          <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" className="mr-rewards-cta">
            Écrire
          </a>
        ) : (
          <button type="button" className="mr-rewards-cta" onClick={() => goTo('meal-products')}>
            Commander
          </button>
        )}
      </section>

      <footer className="mr-footer" id="mr-contact">
        <div className="mr-footer-in">
          <div>
            <img src={RAPIDO_LOGO} alt="Rapido Flash" className="mr-footer-logo" />
            <p>Livraison de repas à Cotonou et Calavi.</p>
          </div>
          {waDigits ? (
            <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" className="mr-cta mr-cta--gold">
              <FaWhatsapp /> Nous écrire sur WhatsApp
            </a>
          ) : null}
        </div>
      </footer>
      <ShopPrivacyFooter className={cartCount > 0 ? 'shop-privacy-footer--sticky-pad' : ''} />

      {/* Tab bar mobile */}
      <nav className="mr-tabbar" aria-label="Navigation mobile">
        <button type="button" className="mr-tab is-active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <FaHome aria-hidden />
          <span>Accueil</span>
        </button>
        <button type="button" className="mr-tab" onClick={() => goTo('meal-products')}>
          <FaThLarge aria-hidden />
          <span>Menu</span>
        </button>
        <Link to="/repas/panier" className="mr-tab mr-tab--cart" aria-label={`Panier (${cartCount})`}>
          <span className="mr-tab-cart">
            <FaShoppingBag aria-hidden />
            {cartCount > 0 ? <em>{cartCount}</em> : null}
          </span>
          <span>Panier</span>
        </Link>
        {waDigits ? (
          <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" className="mr-tab">
            <FaWhatsapp aria-hidden />
            <span>WhatsApp</span>
          </a>
        ) : (
          <button type="button" className="mr-tab" onClick={() => goTo('meal-trust')}>
            <FaLeaf aria-hidden />
            <span>Avantages</span>
          </button>
        )}
        <button type="button" className="mr-tab" onClick={() => goTo('mr-contact')}>
          <FaHeadset aria-hidden />
          <span>Contact</span>
        </button>
      </nav>

      {cartCount > 0 ? (
        <div className="mr-float-cart">
          <Link to="/repas/panier" className="mr-float-cart-in">
            <span className="mr-float-ico"><FaShoppingBag aria-hidden /><em>{cartCount}</em></span>
            <span className="mr-float-txt"><strong>Voir le panier</strong><small>{formatPriceXof(cartTotals.totalPrice)}</small></span>
          </Link>
        </div>
      ) : null}

      {toast ? <div className="mr-toast" role="status">{toast}</div> : null}

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
