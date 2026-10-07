import { getImageUrl } from '../../utils/imagePlaceholder';
import {
  REFONTE_SLUG_ASSETS,
  REFONTE_IMG,
  cutSrc,
  cardImgSrc,
} from './repasRefonteConstants';

export function refonteCategoryId(product) {
  const c = String(product?.category || '').toLowerCase();
  const n = String(product?.name || '').toLowerCase();
  if (c.includes('street')) return 'street';
  if (c.includes('salade')) return 'salade';
  if (c.includes('épicerie') || c.includes('epicerie') || n.includes('chips') || n.includes('rillettes')) {
    return 'epicerie';
  }
  if (n.includes('brais') || n.includes('fum') || n.includes('brochette')) return 'braise';
  return 'frit';
}

function resolveFallbackAssets(slug) {
  const mapped = REFONTE_SLUG_ASSETS[slug];
  if (mapped) {
    return {
      cardImg: cardImgSrc(mapped.img),
      cutImg: mapped.cut ? cutSrc(mapped.cut) : cardImgSrc(mapped.img),
    };
  }
  const guess = slug.replace(/-de-/g, '-').split('-').slice(0, 2).join('-');
  const g2 = REFONTE_SLUG_ASSETS[guess];
  if (g2) {
    return {
      cardImg: cardImgSrc(g2.img),
      cutImg: g2.cut ? cutSrc(g2.cut) : cardImgSrc(g2.img),
    };
  }
  return {
    cardImg: `${REFONTE_IMG}tilapia-braise.jpg`,
    cutImg: cutSrc('tilapia-braise'),
  };
}

/**
 * Visuels refonte (cut / JPG) en priorité — comme au départ.
 * L’image API ne sert que de secours si aucun asset refonte n’existe.
 */
function resolveProductImages(product, mediaBase, slug) {
  const fallback = resolveFallbackAssets(slug);
  const apiRaw = product.mainImage || product.images?.[0] || null;
  const apiUrl = apiRaw ? getImageUrl(apiRaw, null, mediaBase) : null;
  return {
    cardImg: fallback.cardImg || apiUrl,
    heroImg: fallback.cutImg || apiUrl || fallback.cardImg,
  };
}

/**
 * Prix catalogue : le prix affiché est le prix promo (−50 %).
 * Si la promo API est live avec un vrai basePrice > promoPrice → on l’utilise.
 * Sinon le basePrice stocké est déjà le prix promo → prix barré = ×2.
 */
export function priceBundle(product) {
  const base = Math.max(0, Math.round(Number(product?.basePrice) || 0));
  const live = !!product?.isPromoLive;
  const livePromo = Math.max(0, Math.round(Number(product?.promoPrice) || 0));

  let unit;
  let compareAt;
  let discountPercent = 50;

  if (live && livePromo > 0 && base > livePromo) {
    unit = livePromo;
    compareAt = base;
    discountPercent = Math.max(
      1,
      Math.round(Number(product?.discountPercent) || (1 - livePromo / base) * 100)
    );
  } else {
    unit = live && livePromo > 0 ? livePromo : base;
    compareAt = Math.round(unit * 2);
    discountPercent = 50;
  }

  const promo = true;

  const sizeGroup = (product?.optionGroups || []).find((g) =>
    /taille|size|format|portion/i.test(String(g.name || ''))
  );
  if (sizeGroup?.choices?.length) {
    const prices = sizeGroup.choices.map((ch) => {
      const add = Number(ch.priceDelta ?? ch.price ?? 0);
      return Math.round(unit + add);
    });
    const sizes = sizeGroup.choices.map((ch) => {
      const raw = String(ch.label || ch.name || 'Option');
      return raw.split(/\s*[—–-]\s*/)[0].trim() || raw;
    });
    return { prices, sizes, unit: prices[0], compareAt, promo, discountPercent };
  }
  return { prices: [unit], sizes: null, unit, compareAt, promo, discountPercent };
}

export function adaptProduct(product, mediaBase) {
  const slug = product.slug;
  const imgs = resolveProductImages(product, mediaBase, slug);
  const pb = priceBundle(product);

  return {
    id: slug,
    product,
    name: product.name,
    cat: refonteCategoryId(product),
    catLabel: product.category || '',
    desc: product.shortDescription || product.description || '',
    cardImg: imgs.cardImg,
    cutImg: imgs.heroImg,
    ...pb,
    available: product.available !== false,
  };
}

export function adaptProducts(products, mediaBase) {
  return (products || [])
    .filter((p) => p.published !== false)
    .map((p) => adaptProduct(p, mediaBase));
}

/**
 * Construit les slides hero depuis les réglages dashboard (bannières actives),
 * sinon tous les plats avec image cut.
 */
export function buildHeroSlides(adaptedItems, settings, mediaBase) {
  const configured = Array.isArray(settings?.heroSlides) ? settings.heroSlides : [];
  const activeConfigured = configured.filter((s) => s && s.active !== false);

  if (activeConfigured.length) {
    return activeConfigured
      .map((slide, i) => {
        const slug = String(slide.productSlug || '').trim();
        const base = slug
          ? adaptedItems.find((p) => p.id === slug)
          : adaptedItems.find((p) => p.name === slide.title) || null;
        const overrideRaw = slide.imageUrl || slide.imageUrls?.[0] || '';
        const override = overrideRaw ? getImageUrl(overrideRaw, null, mediaBase) : null;

        if (!base && !override) return null;

        const unit = base?.unit ?? 0;
        return {
          id: base?.id || `banner-${i}`,
          product: base?.product || null,
          name: slide.title || base?.name || 'Bannière',
          desc: slide.subtitle || base?.desc || '',
          cat: base?.cat || 'all',
          catLabel: base?.catLabel || '',
          cardImg: override || base?.cardImg,
          cutImg: override || base?.cutImg,
          prices: base?.prices || [unit],
          sizes: base?.sizes || null,
          unit,
          compareAt: base?.compareAt ?? (base?.unit ? Math.round(base.unit * 2) : null),
          promo: true,
          discountPercent: base?.discountPercent ?? 50,
          available: true,
          ctaLabel: slide.ctaLabel || 'Commander',
          bannerOnly: !base?.product,
        };
      })
      .filter(Boolean);
  }

  return adaptedItems.filter((p) => p.cutImg && p.available).slice(0, 12);
}
