import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import { getImageUrl } from '../../utils/imagePlaceholder';
import {
  getShopPromoState,
  formatPriceXof,
  formatCountdown,
  buildWhatsAppOrderUrl,
} from '../../utils/shopPromo';
import './ShopProductLanding.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

function Countdown({ endsAt }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const end = new Date(endsAt).getTime();
      setRemaining(Math.max(0, end - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const { days, hours, minutes, seconds } = formatCountdown(remaining);
  if (remaining <= 0) {
    return <p className="shop-landing-countdown-ended">Offre terminée</p>;
  }

  return (
    <div className="shop-landing-countdown-digits">
      {days > 0 ? (
        <div className="shop-landing-countdown-unit">
          <strong>{days}</strong>
          <span>jours</span>
        </div>
      ) : null}
      <div className="shop-landing-countdown-unit">
        <strong>{String(hours).padStart(2, '0')}</strong>
        <span>heures</span>
      </div>
      <div className="shop-landing-countdown-unit">
        <strong>{String(minutes).padStart(2, '0')}</strong>
        <span>min</span>
      </div>
      <div className="shop-landing-countdown-unit">
        <strong>{String(seconds).padStart(2, '0')}</strong>
        <span>sec</span>
      </div>
    </div>
  );
}

export default function ShopProductLanding() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get(`${API_URL}/shop-products/public/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!cancelled) setProduct(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Produit introuvable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

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
  const displayPrice = promoState?.isPromoLive ? promoState.promoPrice : product?.basePrice;
  const waUrl = product && promoState ? buildWhatsAppOrderUrl(product, promoState, quantity) : null;
  const showCountdown = promoState?.isPromoLive && product?.promo?.endsAt;

  if (loading) return <PageLoader />;
  if (error || !product) {
    return (
      <div className="shop-landing">
        <ShopBrandHeader />
        <div className="shop-landing-error">
          <h1>Produit indisponible</h1>
          <p>{error || 'Ce lien n’est plus actif.'}</p>
        </div>
      </div>
    );
  }

  const img = getImageUrl(product.mainImage || product.images?.[0], BASE_URL);

  return (
    <div className="shop-landing">
      <ShopBrandHeader />

      {showCountdown ? (
        <div className="shop-landing-countdown-top" role="timer" aria-live="polite">
          <p className="shop-landing-countdown-top-label">Offre flash — se termine dans</p>
          <Countdown endsAt={product.promo.endsAt} />
        </div>
      ) : null}

      <main className="shop-landing-main">
        <div className="shop-landing-hero-card">
          <img src={img} alt={product.name} className="shop-landing-hero-img" />
          {promoState?.isPromoLive && promoState.discountPercent ? (
            <span className="shop-landing-hero-badge">-{promoState.discountPercent}%</span>
          ) : null}
        </div>

        <div className="shop-landing-info-card">
          <h1 className="shop-landing-title">{product.name}</h1>
          {product.shortDescription ? (
            <p className="shop-landing-sub">{product.shortDescription}</p>
          ) : null}

          <div className="shop-landing-price-block">
            <div className="shop-landing-price-row">
              <span className="shop-landing-price">{formatPriceXof(displayPrice)}</span>
              {promoState?.isPromoLive ? (
                <span className="shop-landing-price-old">{formatPriceXof(product.basePrice)}</span>
              ) : null}
            </div>
            <div className="shop-landing-badges">
              {promoState?.freeDelivery ? (
                <span className="shop-landing-badge shop-landing-badge--green">Livraison gratuite</span>
              ) : null}
              {promoState?.isPromoLive ? (
                <span className="shop-landing-badge">Promo en cours</span>
              ) : null}
            </div>
          </div>

          <div className="shop-landing-qty">
            <span className="shop-landing-qty-label">Quantité</span>
            <div className="shop-landing-qty-controls">
              <button type="button" aria-label="Moins" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span>{quantity}</span>
              <button type="button" aria-label="Plus" onClick={() => setQuantity((q) => q + 1)}>
                +
              </button>
            </div>
          </div>

          {waUrl ? (
            <a className="shop-landing-cta" href={waUrl} target="_blank" rel="noopener noreferrer">
              {product.ctaLabel || 'Commander maintenant'}
            </a>
          ) : (
            <button type="button" className="shop-landing-cta" disabled>
              Commande bientôt disponible
            </button>
          )}
        </div>

        {(product.copySections || []).filter((s) => s.title || s.body).map((sec, i) => (
          <article key={sec._id || i} className="shop-landing-section">
            {sec.icon ? <span className="shop-landing-section-icon">{sec.icon}</span> : null}
            <div>
              {sec.title ? <h2>{sec.title}</h2> : null}
              {sec.body ? <p>{sec.body}</p> : null}
            </div>
          </article>
        ))}

        <div className="shop-landing-trust">
          <div className="shop-landing-trust-item">
            <span className="shop-landing-trust-icon" aria-hidden>
              🔒
            </span>
            <strong>Sécurité</strong>
            <span>Paiement à la livraison</span>
          </div>
          <div className="shop-landing-trust-item">
            <span className="shop-landing-trust-icon" aria-hidden>
              ✓
            </span>
            <strong>Satisfaction</strong>
            <span>Rapido, service de confiance</span>
          </div>
          <div className="shop-landing-trust-item">
            <span className="shop-landing-trust-icon" aria-hidden>
              🚚
            </span>
            <strong>Livraison</strong>
            <span>
              {promoState?.freeDelivery ? 'Gratuite pendant la promo' : 'Rapide à domicile'}
            </span>
          </div>
        </div>
      </main>

      <div className="shop-landing-sticky">
        <div className="shop-landing-sticky-inner">
          <div className="shop-landing-sticky-price">
            <span className="shop-landing-sticky-total">{formatPriceXof(displayPrice * quantity)}</span>
            {quantity > 1 ? <span className="shop-landing-sticky-qty">× {quantity}</span> : null}
          </div>
          {waUrl ? (
            <a className="shop-landing-cta shop-landing-cta--compact" href={waUrl} target="_blank" rel="noopener noreferrer">
              {product.ctaLabel || 'Commander'}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
