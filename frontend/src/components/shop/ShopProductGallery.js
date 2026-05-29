import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getImageUrl } from '../../utils/imagePlaceholder';
import './ShopProductGallery.css';

export default function ShopProductGallery({ urls, baseUrl, productName, promoPercent }) {
  const gallery = urls?.length ? urls : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);

  const safeIndex = Math.min(activeIndex, Math.max(0, gallery.length - 1));

  const scrollToIndex = useCallback((index) => {
    const track = trackRef.current;
    if (!track || !gallery.length) return;
    const slide = track.children[index];
    if (!slide) return;
    const left = slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [gallery.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || gallery.length <= 1) return undefined;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const center = track.scrollLeft + track.clientWidth / 2;
        let closest = 0;
        let minDist = Infinity;
        [...track.children].forEach((child, i) => {
          const childCenter = child.offsetLeft + child.offsetWidth / 2;
          const dist = Math.abs(childCenter - center);
          if (dist < minDist) {
            minDist = dist;
            closest = i;
          }
        });
        setActiveIndex(closest);
      });
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener('scroll', onScroll);
    };
  }, [gallery.length]);

  if (!gallery.length) {
    return (
      <div className="shop-pdp-gallery shop-pdp-gallery--empty">
        <span>Aucune image</span>
      </div>
    );
  }

  return (
    <div className="shop-pdp-gallery">
      <div className="shop-pdp-gallery-viewport">
        <div ref={trackRef} className="shop-pdp-gallery-track" role="region" aria-label="Photos du produit">
          {gallery.map((url, i) => (
            <div key={`${url}-${i}`} className="shop-pdp-gallery-slide">
              <img
                src={getImageUrl(url, null, baseUrl)}
                alt={gallery.length > 1 ? `${productName} — photo ${i + 1}` : productName}
                className="shop-pdp-gallery-slide-img"
                draggable={false}
              />
              {i === 0 && promoPercent ? (
                <span className="shop-pdp-gallery-badge">-{promoPercent}%</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {gallery.length > 1 ? (
        <div className="shop-pdp-gallery-dots" role="tablist" aria-label="Indicateur de photo">
          {gallery.map((url, i) => (
            <button
              key={`dot-${url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Photo ${i + 1}`}
              className={`shop-pdp-gallery-dot${i === safeIndex ? ' is-active' : ''}`}
              onClick={() => {
                setActiveIndex(i);
                scrollToIndex(i);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
