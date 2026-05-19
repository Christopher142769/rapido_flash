import React, { useState, useCallback } from 'react';
import { getImageUrl } from '../../utils/imagePlaceholder';
import './ShopProductGallery.css';

export default function ShopProductGallery({ urls, baseUrl, productName, promoPercent }) {
  const gallery = urls?.length ? urls : [];
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex = Math.min(activeIndex, Math.max(0, gallery.length - 1));
  const activeUrl = gallery[safeIndex];

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i <= 0 ? gallery.length - 1 : i - 1));
  }, [gallery.length]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i >= gallery.length - 1 ? 0 : i + 1));
  }, [gallery.length]);

  if (!activeUrl) {
    return (
      <div className="shop-pdp-gallery shop-pdp-gallery--empty">
        <span>Aucune image</span>
      </div>
    );
  }

  return (
    <div className="shop-pdp-gallery">
      <div className="shop-pdp-gallery-main">
        <img
          src={getImageUrl(activeUrl, baseUrl)}
          alt={productName}
          className="shop-pdp-gallery-main-img"
        />
        {promoPercent ? <span className="shop-pdp-gallery-badge">-{promoPercent}%</span> : null}
        {gallery.length > 1 ? (
          <>
            <button type="button" className="shop-pdp-gallery-nav shop-pdp-gallery-nav--prev" onClick={goPrev} aria-label="Image précédente">
              ‹
            </button>
            <button type="button" className="shop-pdp-gallery-nav shop-pdp-gallery-nav--next" onClick={goNext} aria-label="Image suivante">
              ›
            </button>
          </>
        ) : null}
      </div>

      {gallery.length > 1 ? (
        <div className="shop-pdp-gallery-thumbs" role="tablist" aria-label="Vues du produit">
          {gallery.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              className={`shop-pdp-gallery-thumb${i === safeIndex ? ' is-active' : ''}`}
              onClick={() => setActiveIndex(i)}
            >
              <img src={getImageUrl(url, baseUrl)} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
