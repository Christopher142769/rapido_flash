import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import ShopBrandHeader from '../../components/shop/ShopBrandHeader';
import ShopProductGallery from '../../components/shop/ShopProductGallery';
import ShopContentBlocks from '../../components/shop/ShopContentBlocks';
import ShopOrderModal from '../../components/shop/ShopOrderModal';
import { getProductGallery } from '../../utils/shopProductMedia';
import {
  buildShopOrderPayload,
  saveShopOrder,
  SHOP_DELIVERY_NOTE,
} from '../../utils/shopOrder';
import { getShopPromoState, formatPriceXof, formatCountdown } from '../../utils/shopPromo';
import { FaClock, FaTruck, FaWallet, FaWhatsapp } from 'react-icons/fa';
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

function ProductBuyBox({
  product,
  promoState,
  quantity,
  setQuantity,
  canOrder,
  onOrderClick,
}) {
  const displayPrice = promoState?.isPromoLive ? promoState.promoPrice : product.basePrice;

  return (
    <div className="shop-pdp-buybox">
      <p className="shop-pdp-buybox-brand">Rapido Shop</p>
      <h1 className="shop-pdp-buybox-title">{product.name}</h1>
      {product.shortDescription ? <p className="shop-pdp-buybox-sub">{product.shortDescription}</p> : null}

      <aside className="shop-pdp-delivery-note" role="note">
        <FaClock className="shop-pdp-delivery-note-icon" aria-hidden />
        <span>{SHOP_DELIVERY_NOTE}</span>
      </aside>

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

      {canOrder ? (
        <button type="button" className="shop-pdp-cta shop-pdp-cta--primary" onClick={onOrderClick}>
          {product.ctaLabel || 'Commander'}
        </button>
      ) : (
        <button type="button" className="shop-pdp-cta shop-pdp-cta--primary" disabled>
          Commande bientôt disponible
        </button>
      )}

      <ul className="shop-pdp-buybox-perks">
        <li>
          <FaWallet aria-hidden />
          <span>Paiement à la livraison</span>
        </li>
        <li>
          <FaTruck aria-hidden />
          <span>Livraison Rapido au Bénin</span>
        </li>
        <li>
          <FaWhatsapp aria-hidden />
          <span>Commande via WhatsApp</span>
        </li>
      </ul>
    </div>
  );
}

export default function ShopProductLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

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
  const canOrder = !!(product?.whatsappNumber && promoState);
  const showCountdown = promoState?.isPromoLive && product?.promo?.endsAt;
  const displayPrice = promoState?.isPromoLive ? promoState.promoPrice : product?.basePrice;
  const totalLabel = formatPriceXof((displayPrice || 0) * quantity);

  const openOrderModal = () => {
    if (!canOrder) return;
    setOrderModalOpen(true);
  };

  const handleOrderSubmit = (customer) => {
    const order = buildShopOrderPayload(product, promoState, quantity, customer);
    if (!saveShopOrder(order)) {
      alert('Impossible d’enregistrer la commande. Réessayez.');
      return;
    }
    setOrderModalOpen(false);
    navigate(`/shop/${slug}/commande`);
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
    <div className="shop-pdp">
      <ShopBrandHeader />

      {showCountdown ? (
        <div className="shop-pdp-countdown-bar" role="timer" aria-live="polite">
          <p>Offre limitée — se termine dans</p>
          <Countdown endsAt={product.promo.endsAt} />
        </div>
      ) : null}

      <div className="shop-pdp-trust-strip">
        <span>
          <FaTruck aria-hidden /> Livraison Rapido
        </span>
        <span>
          <FaWallet aria-hidden /> Paiement à la livraison
        </span>
        <span>
          <FaWhatsapp aria-hidden /> Support WhatsApp
        </span>
      </div>

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
            canOrder={canOrder}
            onOrderClick={openOrderModal}
          />
        </div>
      </div>

      <div className="shop-pdp-container">
        {product.copySections?.length ? (
          <header className="shop-pdp-story-head">
            <p className="shop-pdp-story-eyebrow">Rapido Shop</p>
            <h2 className="shop-pdp-story-title">En savoir plus</h2>
            <p className="shop-pdp-story-lead">Découvrez tous les détails de ce produit avant de commander.</p>
          </header>
        ) : null}
        <ShopContentBlocks sections={product.copySections} baseUrl={BASE_URL} />
      </div>

      <div className="shop-pdp-sticky">
        <div className="shop-pdp-sticky-inner">
          <span className="shop-pdp-sticky-price">{totalLabel}</span>
          {canOrder ? (
            <button type="button" className="shop-pdp-cta shop-pdp-cta--compact" onClick={openOrderModal}>
              {product.ctaLabel || 'Commander'}
            </button>
          ) : null}
        </div>
      </div>

      <ShopOrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        onSubmit={handleOrderSubmit}
        productName={product.name}
        quantity={quantity}
        totalLabel={totalLabel}
      />
    </div>
  );
}
