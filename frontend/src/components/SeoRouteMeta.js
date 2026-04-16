import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function trimOrigin(u) {
  return String(u || '')
    .trim()
    .replace(/\/$/, '');
}

/** Domaines publics (SEO, hreflang). Défaut : .bj + .online */
function getConfiguredPublicSites() {
  const main = trimOrigin(process.env.REACT_APP_SITE_URL) || 'https://www.rapido.bj';
  const alt = trimOrigin(process.env.REACT_APP_SITE_URL_ALT) || 'https://www.rapido.online';
  return [...new Set([main, alt].filter(Boolean))];
}

function getPrimarySite() {
  return trimOrigin(process.env.REACT_APP_SITE_URL) || 'https://www.rapido.bj';
}

function absoluteUrl(origin, pathname) {
  const path = pathname || '/';
  const suffix = path === '/' ? '' : path;
  return `${trimOrigin(origin)}${suffix}`;
}

function setMetaByName(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaByProperty(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function clearSeoAlternates() {
  document.querySelectorAll('link[data-seo-alternate], link[data-seo-xdefault]').forEach((n) => n.remove());
}

function applyHreflangAlternates(currentOrigin, pathname) {
  clearSeoAlternates();
  const sites = getConfiguredPublicSites();
  const cur = trimOrigin(currentOrigin);
  const path = pathname || '/';
  const pathSuffix = path === '/' ? '' : path;

  sites.forEach((base) => {
    if (trimOrigin(base) === cur) return;
    const link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    const hl = String(base).includes('rapido.bj') ? 'fr-BJ' : 'fr';
    link.setAttribute('hreflang', hl);
    link.setAttribute('href', `${trimOrigin(base)}${pathSuffix}`);
    link.setAttribute('data-seo-alternate', '1');
    document.head.appendChild(link);
  });

  const primary = getPrimarySite();
  const xLink = document.createElement('link');
  xLink.setAttribute('rel', 'alternate');
  xLink.setAttribute('hreflang', 'x-default');
  xLink.setAttribute('href', `${trimOrigin(primary)}${pathSuffix}`);
  xLink.setAttribute('data-seo-xdefault', '1');
  document.head.appendChild(xLink);
}

const DEFAULT_TITLE = 'Rapido Flash — Livraison à Cotonou et au Bénin';
const DEFAULT_DESC =
  'Commandez en ligne auprès de boutiques et structures locales : livraison rapide à Cotonou et au Bénin. Rapido Flash, votre plateforme de livraison.';

const ROUTES = {
  '/': { title: DEFAULT_TITLE, description: DEFAULT_DESC },
  '/home': {
    title: 'Accueil — Rapido Flash | Livraison Cotonou, Bénin',
    description:
      'Découvrez restaurants, commerces et services près de vous. Livraison à domicile à Cotonou et au Bénin avec Rapido Flash.',
  },
  '/welcome': {
    title: 'Bienvenue — Rapido Flash',
    description: 'Découvrez Rapido Flash et commencez à commander vos livraisons au Bénin.',
  },
  '/location': {
    title: 'Choisir une adresse — Rapido Flash',
    description: 'Indiquez votre adresse de livraison pour profiter des boutiques et livreurs Rapido Flash.',
  },
  '/login': {
    title: 'Connexion — Rapido Flash',
    description: 'Connectez-vous à votre compte Rapido Flash pour commander et suivre vos livraisons.',
  },
  '/register': {
    title: 'Créer un compte — Rapido Flash',
    description: 'Inscrivez-vous sur Rapido Flash pour commander en ligne et être livré à Cotonou et au Bénin.',
  },
};

function metaForPath(pathname) {
  if (pathname.startsWith('/dashboard')) {
    return {
      title: 'Espace pro — Rapido Flash',
      description: 'Tableau de bord professionnel Rapido Flash.',
      robots: 'noindex, nofollow',
    };
  }
  if (
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/factures') ||
    pathname.startsWith('/facture/') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/chats') ||
    pathname.startsWith('/chat/')
  ) {
    return {
      title: 'Mon espace — Rapido Flash',
      description: 'Espace personnel Rapido Flash.',
      robots: 'noindex, nofollow',
    };
  }
  if (pathname.startsWith('/restaurant/')) {
    return {
      title: 'Boutique — Rapido Flash',
      description: 'Découvrez les produits de cette structure et commandez en livraison avec Rapido Flash.',
      robots: 'noindex, nofollow',
    };
  }
  if (pathname === '/loading') {
    return { title: 'Chargement — Rapido Flash', description: DEFAULT_DESC, robots: 'noindex, nofollow' };
  }
  const base = ROUTES[pathname];
  if (base) {
    return { ...base, robots: 'index, follow' };
  }
  return { title: DEFAULT_TITLE, description: DEFAULT_DESC, robots: 'index, follow' };
}

/**
 * Met à jour titre, description, canonical, Open Graph, hreflang et robots selon la route (SPA).
 */
export default function SeoRouteMeta() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const origin = window.location.origin;
    const pathname = location.pathname || '/';
    const { title, description, robots } = metaForPath(pathname);
    const canonicalUrl = absoluteUrl(origin, pathname);

    document.title = title;
    setMetaByName('description', description);
    setMetaByName('robots', robots);

    setCanonical(canonicalUrl);

    setMetaByProperty('og:type', 'website');
    setMetaByProperty('og:site_name', 'Rapido Flash');
    setMetaByProperty('og:locale', 'fr_BJ');
    setMetaByProperty('og:title', title);
    setMetaByProperty('og:description', description);
    setMetaByProperty('og:url', canonicalUrl);
    setMetaByProperty('og:image', `${trimOrigin(origin)}/images/logo.png`);

    setMetaByName('twitter:card', 'summary_large_image');
    setMetaByName('twitter:title', title);
    setMetaByName('twitter:description', description);
    setMetaByName('twitter:image', `${trimOrigin(origin)}/images/logo.png`);

    applyHreflangAlternates(origin, pathname);
  }, [location.pathname, location.search]);

  return null;
}
