import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import RepasRefonteIcons, { Ico } from './RepasRefonteIcons';
import {
  REFONTE_CATS,
  REFONTE_IMG,
  HERO_LARGE,
  HERO_SCRIPTS,
  fmtXof,
  cutSrc,
} from './repasRefonteConstants';
import { adaptProducts, buildHeroSlides, freshShopSlides, mealCardImage } from './repasRefonteAdapter';
import { mealProductPath } from '../../utils/mealPaths';
import {
  loadMealCart,
  mealCartCount,
  clearMealCart,
  lineMealSubtotal,
  updateMealCartLine,
  removeMealCartLine,
} from '../../utils/mealCart';
import RepasDeliveryHours, { RepasDeliveryStrip } from './RepasDeliveryHours';
import { mealDeliveryFeeForCity, mealShopContact } from '../../utils/mealShopSettings';
import { getMealRealDeadline } from '../../utils/mealShopUrgency';
import { loadMealCity, saveMealCity } from '../../utils/mealDeliveryEta';
import MealCheckoutModal from '../../components/shop/MealCheckoutModal';
import { trackProductClick } from '../../utils/analyticsBeacon';
import ShopCountdown from '../../components/shop/ShopCountdown';
import { useRepasRefonteMotion, bounceCartBadges, animateGridCards } from './useRepasRefonteMotion';
import './RepasRefonte.css';

const ING_SPOTS = [
  [
    [6, 6, 64, false],
    [-2, 60, 54, false],
    [88, 70, 46, true],
    [30, 88, 40, true],
    [86, 8, 36, true],
  ],
  [
    [78, 4, 64, false],
    [88, 62, 54, false],
    [-4, 70, 46, true],
    [62, 86, 40, true],
    [4, 8, 36, true],
  ],
];
const ING_KINDS = ['tomato', 'chili', 'leaf', 'lemon', 'onion'];

const LOGO = `${REFONTE_IMG}logo-rapido.png`;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const FRESH_SLUGS = ['machoiron', 'tilapia'];

function twoToneTitle(name) {
  const words = String(name || '').split(/\s+/).filter(Boolean);
  const k = Math.max(1, Math.ceil(words.length / 2));
  return words.map((w, i) => (
    <span key={`${w}-${i}`} className={`w${i >= k ? ' y' : ''}`}>
      <span>{w}</span>
    </span>
  ));
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function catThumb(c) {
  if (c.id === 'frais') return `${REFONTE_IMG}machoiron-frais-photo.webp`;
  return cutSrc(c.icon);
}

export default function RepasRefontePage({
  products: apiProducts,
  settings,
  mediaBase,
  onAddProduct,
  onOpenProduct,
}) {
  const items = useMemo(
    () => adaptProducts(apiProducts, mediaBase).filter((p) => p.available),
    [apiProducts, mediaBase]
  );
  const [freshRaw, setFreshRaw] = useState([]);
  const freshSlides = useMemo(() => freshShopSlides(freshRaw), [freshRaw]);
  const catalogue = useMemo(() => [...items, ...freshSlides], [items, freshSlides]);

  const [activeCat, setActiveCat] = useState('all');
  const [query, setQuery] = useState('');
  const [sizeSel, setSizeSel] = useState({});
  const [favs, setFavs] = useState(() => {
    try {
      const raw = localStorage.getItem('rapido_meal_favs');
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      return new Set();
    }
  });
  const [heroIdx, setHeroIdx] = useState(0);
  const [leavingIdx, setLeavingIdx] = useState(null);
  const [mIdx, setMIdx] = useState(0);
  const [headStuck, setHeadStuck] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [city, setCityState] = useState(() => loadMealCity() || 'Cotonou');
  const setCity = useCallback((next) => {
    setCityState(next);
    saveMealCity(next);
  }, []);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(() => mealCartCount());
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [urgencyClock, setUrgencyClock] = useState(() => Date.now());
  const [toast, setToast] = useState('');
  const [heroPaused, setHeroPaused] = useState(false);
  /** Après une interaction (flèche, vignette, toucher), la bannière ne défile plus toute seule. */
  const [heroStopped, setHeroStopped] = useState(false);
  const rootRef = useRef(null);
  const topRef = useRef(null);
  const pausedRef = useRef(false);
  const heroIdxRef = useRef(0);

  const mealSlides = useMemo(
    () => buildHeroSlides(items, { ...settings, heroSlides: [] }),
    [items, settings]
  );
  const slideList = useMemo(
    () => [...mealSlides, ...freshSlides],
    [freshSlides, mealSlides]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      FRESH_SLUGS.map((slug) =>
        axios
          .get(`${API_URL}/shop-products/public/${slug}`, { params: { _t: Date.now() } })
          .then((res) => res.data)
          .catch(() => null)
      )
    ).then((rows) => {
      if (!cancelled) setFreshRaw(rows.filter(Boolean));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  pausedRef.current = heroPaused || heroStopped;
  heroIdxRef.current = heroIdx;

  const goHero = useCallback(
    (next) => {
      const n = slideList.length;
      if (!n) return;
      const cur = heroIdxRef.current;
      const i = ((typeof next === 'function' ? next(cur) : next) + n) % n;
      if (i === cur) return;
      setLeavingIdx(cur);
      setHeroIdx(i);
    },
    [slideList.length]
  );

  useRepasRefonteMotion({
    rootRef,
    heroIdx,
    leavingIdx,
    onLeaveDone: () => setLeavingIdx(null),
    mIdx,
    slideCount: slideList.length,
    pausedRef,
    autoplayMs: 6500,
  });

  const { digits: waDigits, display: phoneDisplay } = mealShopContact(settings);
  /** Une seule échéance, réelle : fin de promo fixe du back-office (sinon aucun compte à rebours). */
  const realDeadline = useMemo(
    () => getMealRealDeadline(settings, apiProducts, new Date(urgencyClock)),
    [settings, apiProducts, urgencyClock]
  );
  /** Limite de commandes réelle (back-office) — jamais un objectif fictif. */
  const orderLimitMax = settings?.dailyOrderLimit?.enabled
    ? Math.max(0, Math.round(Number(settings?.dailyOrderLimit?.maxOrders) || 0))
    : 0;
  const ordersToday = Math.max(0, Math.round(Number(settings?.ordersToday) || 0));
  const ordersRemaining = Math.max(0, orderLimitMax - ordersToday);
  /** Affiché seulement quand la limite approche vraiment (jamais « 80 sur 80 »). */
  const showQuota =
    orderLimitMax > 0 &&
    ordersToday > 0 &&
    ordersRemaining <= Math.max(5, Math.round(orderLimitMax * 0.25));
  const promoItems = items.filter((p) => p.promo);
  const bestDiscount = promoItems.reduce((m, p) => Math.max(m, p.discountPercent || 0), 0);

  const refreshCart = useCallback(() => setCartCount(mealCartCount()), []);

  const handleClearCart = useCallback(() => {
    if (!loadMealCart().length) return;
    clearMealCart();
    refreshCart();
    setToast('Panier vidé');
  }, [refreshCart]);

  useEffect(() => {
    document.documentElement.classList.add('js');
    document.body.classList.add('repas-refonte-active');
    return () => document.body.classList.remove('repas-refonte-active');
  }, []);

  useEffect(() => {
    const el = topRef.current;
    const root = rootRef.current;
    if (!el || !root) return undefined;
    const apply = () => {
      root.style.setProperty('--rf-top-h', `${el.offsetHeight}px`);
    };
    apply();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    window.addEventListener('resize', apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', apply);
    };
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

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (!q.has('panier')) return;
    setDrawerOpen(true);
    navigate('/repas', { replace: true });
  }, [location.search, navigate]);

  useEffect(() => {
    if (!realDeadline) return undefined;
    const end = new Date(realDeadline);
    const tick = () => {
      let s = Math.max(0, Math.floor((end - new Date()) / 1000));
      const d = Math.floor(s / 86400);
      s -= d * 86400;
      const h = Math.floor(s / 3600);
      s -= h * 3600;
      const m = Math.floor(s / 60);
      s -= m * 60;
      setCountdown({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [realDeadline]);

  useEffect(() => {
    const id = setInterval(() => setUrgencyClock(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (slideList.length < 2 || heroPaused || heroStopped) return undefined;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const id = setInterval(() => {
      goHero((i) => i + 1);
      setMIdx((i) => (i + 1) % slideList.length);
    }, 6500);
    return () => clearInterval(id);
  }, [slideList.length, heroPaused, heroStopped, heroIdx, goHero]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      setHeadStuck(window.scrollY > 20);
      ticking = false;
    };
    const handler = () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    bounceCartBadges(rootRef.current);
  }, [cartCount]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogue.filter((p) => {
      if (activeCat !== 'all' && p.cat !== activeCat) return false;
      if (!q) return true;
      return `${p.name} ${p.desc} ${p.catLabel}`.toLowerCase().includes(q);
    });
  }, [catalogue, activeCat, query]);

  useEffect(() => {
    const id = requestAnimationFrame(() => animateGridCards(rootRef.current));
    return () => cancelAnimationFrame(id);
  }, [activeCat, query, filtered.length]);

  const dealProduct = useMemo(() => items.find((p) => p.promo) || null, [items]);

  const trioIds = ['monyo-machoiron-fume', 'brochette-de-poisson', 'shawarma'];
  const trio = useMemo(() => {
    const picked = trioIds
      .map((id) => items.find((p) => p.id === id || (id === 'shawarma' && p.id === 'chawarma')))
      .filter(Boolean);
    return picked.length ? picked : items.slice(0, 3);
  }, [items]);

  const mPicks = useMemo(() => {
    const ids = ['shawarma', 'brochette-de-poisson', 'tilapia-braise', 'poisson-pane', 'monyo-machoiron-fume', 'salade-king-fish'];
    const picked = ids
      .map((id) => items.find((p) => p.id === id || (id === 'shawarma' && p.id === 'chawarma')))
      .filter(Boolean);
    const meals = picked.length ? picked : items.slice(0, 6);
    return meals;
  }, [items]);

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const priceAt = (p, si = 0) => p.prices[si] ?? p.unit;
  /** Prix barré uniquement si une promo est active dans le back-office (la remise porte sur le plat). */
  const compareAtFor = (p, si = 0) => {
    if (!p?.compareAt) return null;
    return p.compareAt + (priceAt(p, si) - p.unit);
  };
  const discountLabel = (p) => (p?.compareAt && p.discountPercent ? `−${p.discountPercent} %` : '');

  const handleAdd = (p, si = 0, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (settings?.isShopClosed) {
      setToast('Boutique temporairement fermée');
      return;
    }
    if (!p?.product) {
      go('menu');
      return;
    }
    onAddProduct?.(p.product);
    trackProductClick({ _id: p.product._id, name: p.name, slug: p.id }, { channel: 'repas' });
  };

  const toggleFav = (id) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('rapido_meal_favs', JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const cartLines = loadMealCart();
  const cartSubtotal = cartLines.reduce((sum, l) => sum + lineMealSubtotal(l), 0);

  const cartDeliveryFee = cartLines.length ? mealDeliveryFeeForCity(settings, city) : 0;
  const cartGrandTotal = cartSubtotal + cartDeliveryFee;

  const waCartHref = useMemo(() => {
    if (!waDigits || !cartLines.length) return '#';
    const msg =
      'Bonjour Rapido, je souhaite commander :\n' +
      cartLines
        .map((l) => `- ${l.quantity} x ${l.productName} : ${fmtXof(lineMealSubtotal(l))} F`)
        .join('\n') +
      `\nLivraison (${city}) : ${fmtXof(cartDeliveryFee)} F` +
      `\nTotal : ${fmtXof(cartGrandTotal)} F\nVille : ${city}`;
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`;
  }, [waDigits, cartLines, cartDeliveryFee, cartGrandTotal, city]);

  /** Contact WhatsApp : premier message pré-rempli pour que le client n'ait qu'à l'envoyer. */
  const waContactHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    'Bonjour Rapido Repas, je souhaite passer une commande.'
  )}`;

  const current = slideList[heroIdx] || slideList[0];
  const mCurrent = slideList[mIdx] || slideList[0];

  const renderHeroSlide = (p, i) => {
    const on = i === heroIdx;
    const leaving = i === leavingIdx;
    const alt = i % 2 === 1;
    const si = sizeSel[p.id] || 0;
    const spots = ING_SPOTS[alt ? 1 : 0];
    return (
      <article
        key={p.id}
        className={`hb-slide${alt ? ' alt' : ''}${on ? ' on' : ''}${leaving ? ' leaving' : ''}`}
        aria-hidden={!on}
        aria-label={p.name}
      >
        <span className="hb-stripes s1" />
        <span className="hb-stripes s2" />
        <div className="hb-copy">
          <p className="hb-script">{p.script || HERO_SCRIPTS[p.id] || 'Fait maison'}</p>
          <h2 className="hb-title">{twoToneTitle(p.name)}</h2>
          <p className="hb-sub">{p.desc}</p>
          <div className="hb-price">
            <span className="lbl">{p.shopPath ? 'Le kilo' : p.sizes ? 'Dès' : p.compareAt ? 'Prix promo' : 'Prix'}</span>
            <strong>
              {fmtXof(priceAt(p, si))} F
              {p.shopPath ? <small className="hb-per"> / kg</small> : null}
            </strong>
            {compareAtFor(p, si) ? <s>{fmtXof(compareAtFor(p, si))} F</s> : null}
            {discountLabel(p) ? <em className="hb-save">{discountLabel(p)}</em> : null}
          </div>
          <div className="hb-cta">
            {p.shopPath ? (
              <Link to={p.shopPath} className="hb-btn">
                <i>
                  <Ico id="i-arrow" />
                </i>
                Commander
              </Link>
            ) : (
              <button type="button" className="hb-btn" onClick={(e) => handleAdd(p, si, e)}>
                <i>
                  <Ico id="i-arrow" />
                </i>
                Commander
              </button>
            )}
            <button type="button" className="hb-ghost" onClick={() => go('menu')}>
              Voir le menu
            </button>
          </div>
        </div>
        <div className="hb-visual">
          <div className="hb-par" style={{ '--d': -14 }}>
            <img
              className="hb-brush"
              src={`${REFONTE_IMG}${alt ? 'brush-ring.png' : 'brush-band.png'}`}
              alt=""
            />
          </div>
          <div className="hb-par" style={{ '--d': 10 }}>
            <div className="hb-glow" />
          </div>
          <div className="hb-par" style={{ '--d': 22 }}>
            <img className={`hb-dish${HERO_LARGE.has(p.id) || p.shopPath ? ' is-lg' : ''}${p.shopPath ? ' is-fresh' : ''}`} src={p.cutImg} alt={p.name} />
          </div>
          <div className="hb-par" style={{ '--d': 40 }}>
            {spots.map(([x, y, w, far], k) => (
              <span
                key={k}
                className={`hb-ing hb-ing--${ING_KINDS[k % ING_KINDS.length]}${far ? ' far' : ''}`}
                style={{ '--x': `${x}%`, '--y': `${y}%`, '--w': `${w}px` }}
              />
            ))}
          </div>
          <div className="hb-par" style={{ '--d': 16 }}>
            {discountLabel(p) ? (
              <div className="hb-bubble">
                <svg viewBox="0 0 200 140" aria-hidden="true">
                  <path d="M18 72c8-34 46-58 82-58s74 24 82 58c8 34-18 62-82 62S10 106 18 72z" />
                </svg>
                <span>{discountLabel(p)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  const renderCard = (p, feat = false) => {
    const si = sizeSel[p.id] || 0;
    const catName = REFONTE_CATS.find((c) => c.id === p.cat)?.name || p.catLabel;
    const href = p.shopPath || mealProductPath(p.id);
    const save = discountLabel(p);
    const struck = compareAtFor(p, si);
    return (
      <article
        key={p.id}
        className={`card reveal${feat ? ' feat' : ''}${favs.has(p.id) ? ' is-fav' : ''}${p.shopPath ? ' is-fresh' : ''}`}
        data-id={p.id}
      >
        <div className="card-media">
          {save ? <span className="badge promo">{save}</span> : null}
          <button
            type="button"
            className={`fav${favs.has(p.id) ? ' on' : ''}`}
            aria-label={`Favori ${p.name}`}
            onClick={() => toggleFav(p.id)}
          >
            <Ico id="i-heart" />
          </button>
          <Link to={href} onClick={() => onOpenProduct?.(p.product)}>
            <img src={p.cardImg} alt={p.name} width={1080} height={1080} loading="lazy" />
          </Link>
        </div>
        <div className="card-body">
          <p className="card-cat">{catName}</p>
          <Link to={href}>
            <h3>{p.name}</h3>
          </Link>
          <p className="card-desc">{p.desc}</p>
          {p.sizes ? (
            <div className="sizes" role="group" aria-label="Taille du poisson">
              <span className="sizes-lbl">Taille du poisson</span>
              {p.sizes.map((s, k) => (
                <button
                  key={s}
                  type="button"
                  className={k === si ? 'on' : ''}
                  onClick={() => setSizeSel((prev) => ({ ...prev, [p.id]: k }))}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
          <div className="card-foot">
            <div className="card-price">
              <strong>
                {fmtXof(priceAt(p, si))} F{p.shopPath ? <small> / kg</small> : null}
              </strong>
              {struck ? <s>{fmtXof(struck)} F</s> : null}
            </div>
            {p.shopPath ? (
              <Link to={href} className="add" aria-label={`Commander ${p.name}`}>
                <Ico id="i-arrow" />
              </Link>
            ) : (
              <button type="button" className="add" aria-label={`Ajouter ${p.name}`} onClick={(e) => handleAdd(p, si, e)}>
                <Ico id="i-plus" />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="repas-refonte" ref={rootRef}>
      <RepasRefonteIcons />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Yellowtail&family=Montserrat:wght@500;600;700;800;900&display=swap"
      />

      <div className="rf-top" ref={topRef}>
      <RepasDeliveryStrip settings={settings} onOrder={() => go('menu')} />
      {promoItems.length || realDeadline || showQuota ? (
        <div className="rf-urgency" role="region" aria-label="Offre en cours">
          <div className="rf-urgency-inner">
            <div className="rf-urgency-copy">
              {bestDiscount ? (
                <span className="rf-urgency-pill">
                  <Ico id="i-flame" /> Jusqu&apos;à −{bestDiscount} %
                </span>
              ) : null}
              <p className="rf-urgency-label">
                {promoItems.length
                  ? `${promoItems.length} plat${promoItems.length > 1 ? 's' : ''} en promo : ${promoItems
                      .slice(0, 2)
                      .map((p) => p.name)
                      .join(', ')}${promoItems.length > 2 ? '…' : ''}`
                  : 'Offre en cours sur le menu'}
              </p>
              <p className="rf-urgency-sub">Cotonou &amp; Calavi · Paiement à la livraison</p>
            </div>
            {realDeadline ? (
              <div className="rf-urgency-timer">
                <span className="rf-urgency-timer-lbl">Fin de l&apos;offre</span>
                <ShopCountdown
                  endsAt={realDeadline}
                  variant="urgent"
                  autoRestart={false}
                  onComplete={() => setUrgencyClock(Date.now())}
                />
              </div>
            ) : null}
            {showQuota ? (
              <div className="rf-urgency-quota">
                <p className="rf-urgency-quota-text">
                  {ordersRemaining > 0 ? (
                    <>
                      Plus que <strong>{ordersRemaining}</strong> commande{ordersRemaining > 1 ? 's' : ''}{' '}
                      possible{ordersRemaining > 1 ? 's' : ''} aujourd&apos;hui
                    </>
                  ) : (
                    <>Commandes complètes pour aujourd&apos;hui</>
                  )}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <header className={`head${headStuck ? ' is-stuck' : ''}${menuOpen ? ' menu-open' : ''}`} id="head">
        <div className="wrap">
          <Link to="/repas" className="logo" aria-label="Rapido Repas">
            <img src={LOGO} alt="Rapido Repas" width={451} height={480} />
            <span className="logo-tag">Livré chaud chez vous</span>
          </Link>
          <nav className="nav" aria-label="Navigation principale">
            <button type="button" className="is-current" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false); }}>
              Accueil
            </button>
            <button type="button" onClick={() => { go('menu'); setMenuOpen(false); }}>
              Menu
            </button>
            {dealProduct ? (
              <button type="button" onClick={() => { go('deal'); setMenuOpen(false); }}>
                Promos
              </button>
            ) : null}
            <button type="button" onClick={() => { go('contact'); setMenuOpen(false); }}>
              Contact
            </button>
          </nav>
          <div className="head-right">
            <button type="button" className="pill-order" aria-label="Voir le panier" onClick={() => setDrawerOpen(true)}>
              <span>Commander</span>
              <i>
                <Ico id="i-bag" />
                <em>{cartCount}</em>
              </i>
            </button>
            {waDigits ? (
              <a
                className="phone"
                href={waContactHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
              >
                <Ico id="i-wa" />
                <span>{phoneDisplay}</span>
              </a>
            ) : (
              <span className="phone">
                <Ico id="i-wa" />
                <span>{phoneDisplay}</span>
              </span>
            )}
            <label className="city">
              <span className="sr" hidden>
                Ville
              </span>
              <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Ville de livraison">
                <option>Cotonou</option>
                <option>Calavi</option>
              </select>
            </label>
            <button
              type="button"
              className="round-btn m-only"
              aria-label="Voir le menu"
              onClick={() => go('menu')}
            >
              <Ico id="i-bell" />
              <em aria-hidden="true" />
            </button>
            {waDigits ? (
              <a
                className="round-btn m-only"
                href={waContactHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contact WhatsApp"
              >
                <Ico id="i-wa" />
              </a>
            ) : (
              <button type="button" className="round-btn m-only" aria-label="Contact WhatsApp" onClick={() => go('contact')}>
                <Ico id="i-wa" />
              </button>
            )}
            <button type="button" className="burger" aria-label="Ouvrir le menu" onClick={() => setMenuOpen((o) => !o)}>
              ☰
            </button>
          </div>
        </div>
      </header>
      </div>

      <div className="m-app" id="mApp">
        <div className="m-deliver">
          <Ico id="i-pin" />
          <label className="loc">
            <small>Livrer à</small>
            <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Ville de livraison">
              <option>Cotonou</option>
              <option>Calavi</option>
            </select>
          </label>
          <button type="button" className="sbtn" aria-label="Rechercher" onClick={() => setSearchOpen((o) => !o)}>
            <Ico id="i-search" />
          </button>
        </div>
        <div className={`m-search${searchOpen ? ' open' : ''}`}>
          <input
            type="search"
            placeholder="Rechercher un plat, ex. tilapia"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveCat('all');
            }}
            aria-label="Rechercher un plat"
          />
        </div>
        {mCurrent ? (
          <section
            className="m-hero"
            aria-label="Plats à la une"
            onTouchStart={() => setHeroStopped(true)}
            onPointerDown={() => setHeroStopped(true)}
          >
            <img className="m-brush" src={`${REFONTE_IMG}brush-band.png`} alt="" />
            <span className="m-stripes" aria-hidden="true" />
            <div className="m-hero-copy">
              <p className="m-script">{mCurrent.script || HERO_SCRIPTS[mCurrent.id] || 'Fait maison'}</p>
              <h2>{twoToneTitle(mCurrent.name)}</h2>
              <p className="m-price">
                <b>
                  {fmtXof(mCurrent.unit)} F{mCurrent.shopPath ? <small> / kg</small> : null}
                </b>
                {compareAtFor(mCurrent) ? <s>{fmtXof(compareAtFor(mCurrent))} F</s> : null}
              </p>
              {mCurrent.shopPath ? (
                <Link to={mCurrent.shopPath} className="m-hero-cta">
                  <i>
                    <Ico id="i-arrow" />
                  </i>
                  Commander
                </Link>
              ) : (
                <button type="button" className="m-hero-cta" onClick={(e) => handleAdd(mCurrent, 0, e)}>
                  <i>
                    <Ico id="i-arrow" />
                  </i>
                  Commander
                </button>
              )}
            </div>
            <div className={`m-hero-img${HERO_LARGE.has(mCurrent.id) || mCurrent.shopPath ? ' is-lg' : ''}${mCurrent.shopPath ? ' is-fresh' : ''}`}>
              <img src={mCurrent.cutImg} alt={mCurrent.name} />
            </div>
            <div className="m-bubble">
              {discountLabel(mCurrent) ? (
                <>
                  <svg viewBox="0 0 200 140" aria-hidden="true">
                    <path d="M18 72c8-34 46-58 82-58s74 24 82 58c8 34-18 62-82 62S10 106 18 72z" />
                  </svg>
                  <span>{discountLabel(mCurrent)}</span>
                </>
              ) : null}
            </div>
            <div className="m-dots">
              {slideList.map((_, k) => (
                <i key={k} className={k === mIdx ? 'on' : ''} />
              ))}
            </div>
          </section>
        ) : null}
        <div className="m-cats" role="tablist" aria-label="Catégories">
          {REFONTE_CATS.map((c) => {
            const n = c.id === 'all' ? catalogue.length : catalogue.filter((p) => p.cat === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                className={`m-cat${activeCat === c.id ? ' on' : ''}`}
                onClick={() => {
                  setActiveCat(c.id);
                  go('menu');
                }}
              >
                <span className="m-cat-img">
                  <img src={catThumb(c)} alt="" loading="lazy" />
                </span>
                <strong>{c.name}</strong>
                <small>
                  {n} produit{n > 1 ? 's' : ''}
                </small>
              </button>
            );
          })}
        </div>
        <section aria-label="Populaires">
          <div className="m-sec-head">
            <h2>Populaires</h2>
            <button type="button" onClick={() => go('menu')}>
              Voir tout <Ico id="i-arrow" />
            </button>
          </div>
          <div className="m-picks-row">
            {mPicks.map((p) => {
              const href = p.shopPath || mealProductPath(p.id);
              const struck = compareAtFor(p);
              return (
              <article key={p.id} className={`m-pick${p.shopPath ? ' is-fresh' : ''}`}>
                <Link to={href} className="m-pick-media">
                  <img src={p.cardImg} alt={p.name} loading="lazy" />
                </Link>
                <h3>{p.name}</h3>
                <div className="m-pick-foot">
                  <div>
                    <strong>
                      {fmtXof(p.unit)} F{p.shopPath ? <small> / kg</small> : null}
                    </strong>
                    {struck ? <s>{fmtXof(struck)} F</s> : null}
                  </div>
                  {p.shopPath ? (
                    <Link to={href} className="m-plus" aria-label={`Commander ${p.name}`}>
                      <Ico id="i-arrow" />
                    </Link>
                  ) : (
                    <button type="button" className="m-plus" aria-label={`Ajouter ${p.name}`} onClick={(e) => handleAdd(p, 0, e)}>
                      <Ico id="i-plus" />
                    </button>
                  )}
                </div>
              </article>
              );
            })}
          </div>
        </section>
      </div>

      <section
        className="hero"
        id="accueil"
        aria-label="Plats en promotion"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        onFocusCapture={() => setHeroPaused(true)}
        onBlurCapture={() => setHeroPaused(false)}
        onTouchStart={() => setHeroStopped(true)}
        onPointerDown={() => setHeroStopped(true)}
      >
        <h1 className="sr-only">Rapido Repas : plats de poisson livrés chauds à Cotonou et Calavi</h1>
        <div className="hb-stage">{slideList.map((p, i) => renderHeroSlide(p, i))}</div>
        <div className="hb-bar">
          <div className="wrap">
            <div className="hb-trust">
              <div>
                <i>
                  <Ico id="i-truck" />
                </i>
                <span>
                  <b>Livraison rapide</b>
                  <small>Cotonou &amp; Calavi</small>
                </span>
              </div>
              <div>
                <i>
                  <Ico id="i-fish" />
                </i>
                <span>
                  <b>Poisson frais</b>
                  <small>Cuisiné le jour même</small>
                </span>
              </div>
              <div>
                <i>
                  <Ico id="i-cash" />
                </i>
                <span>
                  <b>Paiement à la livraison</b>
                  <small>Espèces ou Mobile Money</small>
                </span>
              </div>
            </div>
            <div className="hb-nav">
              <div className="hb-thumbs" role="tablist">
                {slideList.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`hb-thumb${i === heroIdx ? ' on' : ''}`}
                    aria-label={p.name}
                    onClick={() => goHero(i)}
                  >
                    <img src={p.cutImg} alt="" />
                  </button>
                ))}
              </div>
              <div className="hb-count">
                <span>
                  <b>{pad2(heroIdx + 1)}</b> / {pad2(slideList.length)}
                </span>
                <span className="hb-prog">
                  <i />
                </span>
              </div>
              <div className="hb-arrows">
                <button type="button" aria-label="Précédent" onClick={() => goHero((i) => i - 1)}>
                  <Ico id="i-left" />
                </button>
                <button type="button" aria-label="Suivant" onClick={() => goHero((i) => i + 1)}>
                  <Ico id="i-right" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cats" aria-label="Catégories">
        <div className="cats-row">
          {REFONTE_CATS.map((c) => {
            const n = c.id === 'all' ? catalogue.length : catalogue.filter((p) => p.cat === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                data-cat={c.id}
                className={`cat${activeCat === c.id ? ' on' : ''}`}
                onClick={() => {
                  setActiveCat(c.id);
                  go('menu');
                }}
              >
                <span className="cat-img">
                  <img src={catThumb(c)} alt="" loading="lazy" />
                </span>
                <strong>{c.name}</strong>
                <small>
                  {n} produit{n > 1 ? 's' : ''}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="about">
        <div className="wrap">
          <div className="about-visual reveal">
            <span className="about-ghost" aria-hidden="true">
              KING FISH
            </span>
            <img src={cutSrc('tilapia-frite')} alt="Tilapia et légumes" data-par="0.08" />
            <span className="seal">
              <strong>100%</strong>
              <small>Frais</small>
            </span>
            <p className="sign">Fait avec amour</p>
          </div>
          <div className="about-copy reveal">
            <p className="kicker">À propos de nous</p>
            <h2 className="h2">Nous servons le meilleur poisson de votre ville.</h2>
            <p className="lead">
              Tilapia et mâchoiron d&apos;élevage local, braisés, fumés ou frits à la commande dans les cuisines King Fish,
              puis livrés chauds par Rapido à Cotonou comme à Calavi.
            </p>
            <ul className="feats">
              <li>
                <Ico id="i-fish" />
                <strong>Poisson frais</strong>
                <span>Préparé le jour même</span>
              </li>
              <li>
                <Ico id="i-flame" />
                <strong>Cuit à la commande</strong>
                <span>Braisé, fumé ou frit</span>
              </li>
              <li>
                <Ico id="i-truck" />
                <strong>Livré chaud</strong>
                <span>Cotonou &amp; Calavi</span>
              </li>
            </ul>
            <button type="button" className="link-u" onClick={() => go('menu')}>
              Voir la carte <Ico id="i-arrow" />
            </button>
          </div>
        </div>
      </section>

      <section className="trio" id="trio" aria-label="À la une">
        {trio.map((p) => (
          <article key={p.id} className="trio-card reveal">
            <div className="trio-copy">
              <p>
                {p.promo ? 'Promo · ' : ''}
                {REFONTE_CATS.find((c) => c.id === p.cat)?.name}
              </p>
              <h3>{p.name}</h3>
              <div className="tp">
                <strong>{fmtXof(p.unit)} F</strong>
                {compareAtFor(p) ? <s>{fmtXof(compareAtFor(p))} F</s> : null}
              </div>
              <button type="button" className="btn-white" onClick={(e) => handleAdd(p, 0, e)}>
                Commander <Ico id="i-arrow" />
              </button>
            </div>
            <img src={p.cutImg} alt={p.name} loading="lazy" />
          </article>
        ))}
      </section>

      <section className="best" id="menu">
        <div className="marquee" aria-hidden="true">
          <div>PLATS POPULAIRES · PLATS POPULAIRES · PLATS POPULAIRES · </div>
          <div>PLATS POPULAIRES · PLATS POPULAIRES · PLATS POPULAIRES · </div>
        </div>
        <div className="wrap">
          <div className="best-head">
            <p className="kicker">Vos envies, livrées</p>
            <h2 className="h2">Nos plats les plus demandés</h2>
            <p className="lead">Cuisinés par King Fish, livrés chauds chez vous — paiement à la livraison.</p>
          </div>
          <div className="filters" role="tablist">
            {REFONTE_CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                className={activeCat === c.id ? 'on' : ''}
                onClick={() => setActiveCat(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="grid">
            {filtered.length ? (
              filtered.map((p, idx) => renderCard(p, idx === 0 && activeCat === 'all'))
            ) : (
              <p className="empty" style={{ gridColumn: '1/-1' }}>
                Aucun plat ne correspond à votre recherche.
              </p>
            )}
          </div>
        </div>
      </section>

      {dealProduct ? (
        <section className="deal" id="deal">
          <div className="wrap">
            <div className="reveal">
              <p className="kicker">En promo en ce moment</p>
              <h2>
                {dealProduct.name} <em>en promo</em>
              </h2>
              <p className="sub">{dealProduct.desc}</p>
              {realDeadline ? (
              <div className="count" aria-label="Fin de l'offre">
                <div>
                  <strong>{pad2(countdown.d)}</strong>
                  <span>Jours</span>
                </div>
                <div>
                  <strong>{pad2(countdown.h)}</strong>
                  <span>Heures</span>
                </div>
                <div>
                  <strong>{pad2(countdown.m)}</strong>
                  <span>Min</span>
                </div>
                <div>
                  <strong>{pad2(countdown.s)}</strong>
                  <span>Sec</span>
                </div>
              </div>
              ) : null}
              <button type="button" className="btn-yellow" onClick={(e) => handleAdd(dealProduct, 0, e)}>
                Je commande <Ico id="i-arrow" />
              </button>
            </div>
            <div className="deal-visual reveal">
              <img src={dealProduct.cutImg} alt={dealProduct.name} data-par="-0.06" />
              <span className="deal-tag">
                <small>Prix promo</small>
                <strong>{fmtXof(dealProduct.unit)} F</strong>
                <small>au lieu de {fmtXof(compareAtFor(dealProduct))} F</small>
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="trust" aria-label="Nos engagements">
        <div className="wrap">
          <div className="trust-item">
            <Ico id="i-truck" />
            <div>
              <strong>Livraison rapide</strong>
              <span>Cotonou &amp; Calavi</span>
            </div>
          </div>
          <div className="trust-item">
            <Ico id="i-cash" />
            <div>
              <strong>Paiement à la livraison</strong>
              <span>Espèces ou Mobile Money</span>
            </div>
          </div>
          <div className="trust-item">
            <Ico id="i-flame" />
            <div>
              <strong>Fait maison</strong>
              <span>Cuisiné à la commande</span>
            </div>
          </div>
          <div className="trust-item">
            <Ico id="i-wa" />
            <div>
              <strong>Suivi WhatsApp</strong>
              <span>Confirmation de commande</span>
            </div>
          </div>
        </div>
      </section>

      <RepasDeliveryHours settings={settings} />

      <footer className="foot" id="contact">
        <div className="wrap">
          <div>
            <img src={LOGO} alt="Rapido Repas" width={451} height={480} loading="lazy" />
            <p style={{ marginTop: 14, maxWidth: '36ch' }}>
              Rapido Repas livre chauds les plats de poisson cuisinés par King Fish à Cotonou et
              Calavi. Commande en ligne, paiement à la livraison.
            </p>
          </div>
          <div>
            <h4>Commander</h4>
            <ul>
              <li>WhatsApp : {phoneDisplay}</li>
              <li>
                <button type="button" className="link-u" onClick={() => setDrawerOpen(true)}>
                  Panier &amp; commande
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4>Zones</h4>
            <ul>
              <li>Cotonou</li>
              <li>Abomey-Calavi</li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <div className="wrap">
            <span>© Rapido Repas</span>
            <span>Plats cuisinés par King Fish</span>
          </div>
        </div>
      </footer>

      <nav className="mnav" aria-label="Navigation mobile">
        <button type="button" className="on" onClick={() => go('mApp')}>
          <span className="tab-ico">
            <Ico id="i-home" />
          </span>
          Accueil
        </button>
        <button type="button" onClick={() => go('menu')}>
          <span className="tab-ico">
            <Ico id="i-grid" />
          </span>
          Menu
        </button>
        <button type="button" className="m-cartbtn" aria-label="Panier" onClick={() => setDrawerOpen(true)}>
          <span className="tab-ico">
            <Ico id="i-bag" />
          </span>
          <em>{cartCount}</em>
        </button>
        <button type="button" onClick={() => go(dealProduct ? 'deal' : 'menu')}>
          <span className="tab-ico">
            <Ico id="i-tag" />
          </span>
          Promos
        </button>
        <button
          type="button"
          onClick={() => {
            if (waDigits) window.open(waContactHref, '_blank', 'noopener,noreferrer');
            else go('menu');
          }}
        >
          <span className="tab-ico">
            <Ico id="i-wa" />
          </span>
          Contact
        </button>
      </nav>

      <div className={`drawer${drawerOpen ? ' open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="veil" role="presentation" onClick={() => setDrawerOpen(false)} />
        <aside role="dialog" aria-label="Panier">
          <h3>
            Votre panier{' '}
            <button type="button" aria-label="Fermer" onClick={() => setDrawerOpen(false)}>
              ✕
            </button>
          </h3>
          <div className="lines">
            {cartLines.length ? (
              cartLines.map((l) => {
                const extras = [
                  ...(l.options || []).map((o) => o.choiceLabel),
                  ...(l.accompagnements || []).map((a) =>
                    a.role === 'extra' ? `+ ${a.name}${a.quantity > 1 ? ` ×${a.quantity}` : ''}` : a.name
                  ),
                ].filter(Boolean);
                return (
                  <div key={l.lineKey || l._id} className="line">
                    <img
                      src={mealCardImage({ slug: l.slug, mainImage: l.image }, mediaBase)}
                      alt=""
                      width={56}
                      height={56}
                      loading="lazy"
                    />
                    <div>
                      <b>{l.productName}</b>
                      {extras.length ? <small>{extras.join(' · ')}</small> : null}
                      <div className="line-ctrl">
                        <button
                          type="button"
                          aria-label={`Diminuer ${l.productName}`}
                          onClick={() => {
                            if (l.quantity <= 1) removeMealCartLine(l.lineKey);
                            else updateMealCartLine(l.lineKey, { quantity: l.quantity - 1 });
                          }}
                        >
                          −
                        </button>
                        <span>{l.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Augmenter ${l.productName}`}
                          onClick={() => updateMealCartLine(l.lineKey, { quantity: l.quantity + 1 })}
                        >
                          +
                        </button>
                        <strong>{fmtXof(lineMealSubtotal(l))} F</strong>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty">Votre panier est vide. Ajoutez un plat avec le bouton +.</p>
            )}
          </div>
          <div className="total">
            <div className="sub">
              <span>Sous-total</span>
              <span>{fmtXof(cartSubtotal)} F</span>
            </div>
            <div className="sub">
              <span>Livraison</span>
              <span>{cartLines.length ? `${fmtXof(cartDeliveryFee)} F (${city})` : 'Selon la ville'}</span>
            </div>
            <div className="grand">
              <span>Total</span>
              <span>{fmtXof(cartGrandTotal)} F</span>
            </div>
            {cartLines.length ? (
              <button type="button" className="btn-clear-cart" onClick={handleClearCart}>
                Vider le panier
              </button>
            ) : null}
            <button
              type="button"
              className="btn-yellow"
              style={{ justifyContent: 'center', width: '100%' }}
              disabled={!cartLines.length}
              onClick={() => {
                if (settings?.isShopClosed) {
                  setToast('Boutique temporairement fermée');
                  return;
                }
                setDrawerOpen(false);
                setCheckoutOpen(true);
              }}
            >
              Commander — {fmtXof(cartGrandTotal)} F
            </button>
            {waDigits && cartLines.length ? (
              <a className="btn-yellow" href={waCartHref} target="_blank" rel="noopener noreferrer" style={{ justifyContent: 'center', marginTop: 8 }}>
                <Ico id="i-wa" /> WhatsApp
              </a>
            ) : null}
          </div>
        </aside>
      </div>

      <MealCheckoutModal
        open={checkoutOpen}
        items={cartLines}
        settings={settings}
        city={city}
        onClose={() => setCheckoutOpen(false)}
      />

      <div className={`toast${toast ? ' show' : ''}`} role="status">
        {toast}
      </div>
    </div>
  );
}
