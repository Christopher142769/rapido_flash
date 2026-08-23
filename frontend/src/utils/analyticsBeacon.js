import { trackMeta } from './metaPixel';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SESSION_KEY = 'rf_analytics_sid';
const VISITOR_KEY = 'rf_analytics_vid';

function randomId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `rf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStorage(store, key) {
  try {
    return store.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeStorage(store, key, value) {
  try {
    store.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function getAnalyticsSessionId() {
  if (typeof window === 'undefined') return '';
  let id = readStorage(window.sessionStorage, SESSION_KEY);
  if (!id) {
    id = randomId();
    writeStorage(window.sessionStorage, SESSION_KEY, id);
  }
  return id;
}

export function getAnalyticsVisitorId() {
  if (typeof window === 'undefined') return '';
  let id = readStorage(window.localStorage, VISITOR_KEY);
  if (!id) {
    id = randomId();
    writeStorage(window.localStorage, VISITOR_KEY, id);
  }
  return id;
}

function parseUtm(search) {
  try {
    const q = new URLSearchParams(search || window.location.search || '');
    return {
      utmSource: q.get('utm_source') || '',
      utmMedium: q.get('utm_medium') || '',
      utmCampaign: q.get('utm_campaign') || '',
      utmContent: q.get('utm_content') || '',
      utmTerm: q.get('utm_term') || '',
    };
  } catch {
    return {};
  }
}

function rememberUtm(utm) {
  if (typeof window === 'undefined') return;
  const has = Object.values(utm || {}).some(Boolean);
  if (!has) return;
  try {
    window.sessionStorage.setItem('rf_analytics_utm', JSON.stringify(utm));
  } catch {
    /* ignore */
  }
}

function loadRememberedUtm() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem('rf_analytics_utm');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function inferChannelFromPath(pathname) {
  const p = String(pathname || '').toLowerCase();
  if (p.startsWith('/shop')) return 'shop';
  if (p.startsWith('/repas')) return 'repas';
  if (p.startsWith('/recrutement') || p.startsWith('/form')) return 'recrutement';
  if (p.startsWith('/bassins')) return 'bassins';
  if (
    p.startsWith('/cart') ||
    p.startsWith('/checkout') ||
    p.startsWith('/ordered') ||
    p.startsWith('/restaurant') ||
    p.startsWith('/home') ||
    p === '/' ||
    p.startsWith('/orders') ||
    p.startsWith('/facture')
  ) {
    return 'platform';
  }
  return 'other';
}

/** Skip noisy / private dashboard surfaces. */
export function shouldTrackPath(pathname) {
  const p = String(pathname || '');
  if (!p) return false;
  if (p.startsWith('/dashboard')) return false;
  if (p.startsWith('/cuisine')) return false;
  if (p.startsWith('/champion')) return false;
  if (p.startsWith('/responsables')) return false;
  if (p.startsWith('/login') || p.startsWith('/register')) return false;
  if (p.startsWith('/présence') || p.startsWith('/presence')) return false;
  return true;
}

/**
 * First-party analytics beacon (+ optional Meta dual-write).
 * @param {string} event
 * @param {object} [payload]
 * @param {{ meta?: boolean|string, metaParams?: object }} [opts]
 */
export function trackRapido(event, payload = {}, opts = {}) {
  if (typeof window === 'undefined') return;

  const path = payload.path || window.location.pathname || '/';
  if (!shouldTrackPath(path) && !payload.force) return;

  const freshUtm = parseUtm(window.location.search);
  if (Object.values(freshUtm).some(Boolean)) rememberUtm(freshUtm);
  const utm = { ...loadRememberedUtm(), ...freshUtm };

  const body = {
    event,
    channel: payload.channel || inferChannelFromPath(path),
    path,
    url: payload.url || window.location.href,
    title: payload.title || document.title || '',
    referrer: payload.referrer || document.referrer || '',
    sessionId: getAnalyticsSessionId(),
    visitorId: getAnalyticsVisitorId(),
    productId: payload.productId || '',
    productName: payload.productName || '',
    productSlug: payload.productSlug || '',
    ctaId: payload.ctaId || '',
    ctaLabel: payload.ctaLabel || '',
    orderId: payload.orderId || '',
    orderModel: payload.orderModel || '',
    value: Number(payload.value) || 0,
    currency: payload.currency || 'XOF',
    ...utm,
    meta: payload.meta,
  };

  const endpoint = `${API_URL}/analytics/beacon`;
  const json = JSON.stringify(body);

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([json], { type: 'application/json' });
      const ok = navigator.sendBeacon(endpoint, blob);
      if (!ok) {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json,
          keepalive: true,
          credentials: 'omit',
        }).catch(() => {});
      }
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
        credentials: 'omit',
      }).catch(() => {});
    }
  } catch {
    /* ignore network errors */
  }

  if (opts.meta) {
    const metaEvent = typeof opts.meta === 'string' ? opts.meta : null;
    const map = {
      page_view: 'PageView',
      product_view: 'ViewContent',
      product_click: 'ViewContent',
      cta_click: 'Lead',
      add_to_cart: 'AddToCart',
      begin_checkout: 'InitiateCheckout',
      purchase: 'Purchase',
      lead: 'Lead',
      complete_registration: 'CompleteRegistration',
    };
    trackMeta(metaEvent || map[event] || event, opts.metaParams || {});
  }
}

export function trackPageView(extra = {}) {
  trackRapido('page_view', extra, { meta: false });
}

export function trackCtaClick(ctaLabel, extra = {}) {
  trackRapido(
    'cta_click',
    { ctaLabel, ctaId: extra.ctaId || '', ...extra },
    {
      meta: 'Lead',
      metaParams: {
        content_name: ctaLabel || 'CTA',
        content_category: extra.channel || inferChannelFromPath(extra.path || window.location.pathname),
      },
    }
  );
}

export function trackProductView(product, extra = {}) {
  trackRapido(
    'product_view',
    {
      productId: product?._id || product?.id || '',
      productName: product?.name || product?.nom || '',
      productSlug: product?.slug || '',
      value: Number(product?.price || product?.prix || 0) || 0,
      ...extra,
    },
    {
      meta: 'ViewContent',
      metaParams: {
        content_name: product?.name || product?.nom,
        content_ids: [String(product?._id || product?.slug || '')],
        content_type: 'product',
        value: Number(product?.price || product?.prix || 0) || 0,
        currency: 'XOF',
      },
    }
  );
}

export function trackProductClick(product, extra = {}) {
  trackRapido(
    'product_click',
    {
      productId: product?._id || product?.id || '',
      productName: product?.name || product?.nom || '',
      productSlug: product?.slug || '',
      ...extra,
    },
    { meta: false }
  );
}

export function trackPurchase(order, extra = {}) {
  trackRapido(
    'purchase',
    {
      orderId: order?._id || order?.id || '',
      orderModel: extra.orderModel || '',
      value: Number(order?.total || order?.montantTotal || extra.value || 0) || 0,
      ...extra,
    },
    {
      meta: 'Purchase',
      metaParams: {
        value: Number(order?.total || order?.montantTotal || extra.value || 0) || 0,
        currency: 'XOF',
        content_name: extra.channel || 'purchase',
      },
    }
  );
}
