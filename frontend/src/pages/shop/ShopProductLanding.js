import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopProductGallery from '../../components/shop/ShopProductGallery';
import ShopContentBlocks from '../../components/shop/ShopContentBlocks';
import { getProductGallery } from '../../utils/shopProductMedia';
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
    return <p className="shop-pdp-countdown-ended">Offre terminée</p>;
  }

  return (
    <div className="shop-pdp-countdown-digits">
      {days > 0 ? (
        <div className="shop-pdp-countdown-unit">
          <strong>{days}</strong>
          <span>j</span>
        </div>
      ) : null}
      <div className="shop-pdp-countdown-unit">
        <strong>{String(hours).padStart(2, '0')}</strong>
        <span>h</span>
      </div>
      <div className="shop-pdp-countdown-unit">
        <strong>{String(minutes).padStart(2, '0')}</strong>
        <span>m</span>
      </div>
      <div className="shop-pdp-countdown-unit">
        <strong>{String(seconds).padStart(2, '0')}</strong>
        <span>s</span>
      </div>
    </div>
  );
}

function ProductBuyBox({ product, promoState, quantity, setQuantity, waUrl }) {
  const displayPrice = promoState?.isPromoLive ? promoState.promoPrice : product.basePrice;

  return (
    <div className="shop-pdp-buybox">
      <p className="shop-pdp-buybox-brand">Rapido Shop</p>
      <h1 className="shop-pdp-buybox-title">{product.name}</h1>
      {product.shortDescription ? <p className="shop-pdp-buybox-sub">{product.shortDescription}</p> : null}

      <div className="shop-pdp-buybox-price">
        <span className="shop-pdp-buybox-price-current">{formatPriceXof(displayPrice)}</span>
        {promoState?.isPromoLive ? (
          <span className="shop-pdp-buybox-price-old">{formatPriceXof(product.basePrice)}</span>
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
        <span>Quantité</span>
        <div className="shop-pdp-qty-controls">
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
        <a className="shop-pdp-cta shop-pdp-cta--primary" href={waUrl} target="_blank" rel="noopener noreferrer">
          {product.ctaLabel || 'Commander'}
        </a>
      ) : (
        <button type="button" className="shop-pdp-cta shop-pdp-cta--primary" disabled>
          Commande bientôt disponible
        </button>
      )}

      <ul className="shop-pdp-buybox-perks">
        <li>Paiement à la livraison</li>
        <li>Livraison Rapido au Bénin</li>
        <li>Service client WhatsApp</li>
      </ul>
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
  const gallery = useMemo(() => (product ? getProductGallery(product) : []), [product]);
  const waUrl = product && promoState ? buildWhatsAppOrderUrl(product, promoState, quantity) : null;
  const showCountdown = promoState?.isPromoLive && product?.promo?.endsAt;
  const displayPrice = promoState?.isPromoLive ? promoState.promoPrice : product?.basePrice;

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
    <div className="shop-pdp">
      <ShopBrandHeader />

      {showCountdown ? (
        <div className="shop-pdp-countdown-bar" role="timer" aria-live="polite">
          <p>Offre limitée — se termine dans</p>
          <Countdown endsAt={product.promo.endsAt} />
        </div>
      ) : null}

      <div className="shop-pdp-hero">
        <div className="shop-pdp-hero-gallery">
          <ShopProductGallery
            urls={gallery}
            baseUrl={BASE_URL}
            productName={product.name}
            promoPercent={promoState?.isPromoLive ? promoState.discountPercent : 0}
          />
        </div>
        <div className="shop-pdp-hero-buy">
          <ProductBuyBox
            product={product}
            promoState={promoState}
            quantity={quantity}
            setQuantity={setQuantity}
            waUrl={waUrl}
          />
        </div>
      </div>

      <div className="shop-pdp-container">
        <ShopContentBlocks sections={product.copySections} baseUrl={BASE_URL} />
      </div>

      <div className="shop-pdp-sticky">
        <div className="shop-pdp-sticky-inner">
          <span className="shop-pdp-sticky-price">{formatPriceXof((displayPrice || 0) * quantity)}</span>
          {waUrl ? (
            <a className="shop-pdp-cta shop-pdp-cta--compact" href={waUrl} target="_blank" rel="noopener noreferrer">
              {product.ctaLabel || 'Commander'}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
