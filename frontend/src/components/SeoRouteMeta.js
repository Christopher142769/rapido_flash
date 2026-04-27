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

  const xLink = document.createElement('link');
  xLink.setAttribute('rel', 'alternate');
  xLink.setAttribute('hreflang', 'x-default');
  // x-default should point to the currently active origin.
  xLink.setAttribute('href', `${trimOrigin(currentOrigin)}${pathSuffix}`);
  xLink.setAttribute('data-seo-xdefault', '1');
  document.head.appendChild(xLink);
}

const DEFAULT_TITLE = 'Livraison rapide Cotonou — Rapido Flash';
const DEFAULT_DESC =
  'Livraison rapide Cotonou avec Rapido Flash. Commandez en ligne auprès de boutiques et structures locales au Bénin.';

const ROUTES = {
  '/': { title: DEFAULT_TITLE, description: DEFAULT_DESC },
  '/home': {
    title: 'Livraison rapide Cotonou | Rapido.bj',
    description:
      'Livraison rapide Cotonou : Rapido Flash livre repas, courses et colis à domicile au Bénin.',
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
  '/livraison-rapide-cotonou': {
    title: 'Livraison rapide à Cotonou | Rapido Flash',
    description:
      'Besoin d’une livraison rapide à Cotonou ? Rapido Flash livre vos repas, colis et courses en toute fiabilité.',
  },
  '/service-livraison-cotonou': {
    title: 'Service de livraison à Cotonou | Rapido.bj',
    description:
      'Service de livraison professionnel à Cotonou pour particuliers et entreprises. Suivi simple et livraison efficace.',
  },
  '/livraison-domicile-cotonou': {
    title: 'Livraison à domicile à Cotonou | Rapido Flash',
    description:
      'Faites-vous livrer à domicile à Cotonou : repas, courses, colis et documents en quelques clics.',
  },
  '/livraison-express-cotonou': {
    title: 'Livraison express Cotonou | Rapido.bj',
    description:
      'Livraison express à Cotonou pour vos envois urgents. Rapidité, sécurité et assistance WhatsApp.',
  },
  '/livraison-colis-cotonou': {
    title: 'Livraison de colis à Cotonou | Rapido Flash',
    description: 'Confiez vos colis à Rapido Flash pour une livraison rapide et fiable à Cotonou et environs.',
  },
  '/livraison-repas-cotonou': {
    title: 'Livraison de repas à Cotonou | Rapido.bj',
    description:
      'Commandez vos repas en ligne et faites-vous livrer rapidement à Cotonou par Rapido Flash.',
  },
  '/livraison-courses-cotonou': {
    title: 'Livraison de courses à Cotonou | Rapido Flash',
    description:
      'Service de livraison de courses à Cotonou : gagnez du temps avec une livraison à domicile rapide.',
  },
  '/tarifs-livraison-cotonou': {
    title: 'Tarifs de livraison à Cotonou | Rapido.bj',
    description:
      'Consultez les tarifs de livraison à Cotonou selon vos besoins : express, domicile, colis ou courses.',
  },
  '/zones/livraison-akpakpa': {
    title: 'Livraison à Akpakpa | Rapido Flash',
    description:
      'Rapido Flash livre vos commandes à Akpakpa rapidement : repas, courses, colis et documents.',
  },
  '/zones/livraison-fidjrosse': {
    title: 'Livraison à Fidjrossè | Rapido.bj',
    description:
      'Besoin d’une livraison à Fidjrossè ? Rapido Flash assure une livraison rapide et fiable.',
  },
  '/zones/livraison-calavi': {
    title: 'Livraison à Calavi | Rapido Flash',
    description:
      'Rapido Flash propose la livraison à Calavi pour colis, courses et repas avec un service rapide.',
  },
  '/zones/livraison-porto-novo': {
    title: 'Livraison à Porto-Novo | Rapido.bj',
    description:
      'Service de livraison à Porto-Novo : envoi de colis, courses et repas avec suivi simple.',
  },
  '/livraison-benin': {
    title: 'Service de livraison au Bénin | Rapido Flash',
    description:
      'Rapido Flash, plateforme de livraison au Bénin : Cotonou, Calavi, Porto-Novo et autres zones.',
  },
  '/contact-livraison-cotonou': {
    title: 'Contact livraison Cotonou | Rapido.bj',
    description:
      'Contactez Rapido Flash pour vos besoins de livraison à Cotonou : appel direct et WhatsApp.',
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
    pathname.startsWith('/ordered') ||
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
