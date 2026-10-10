/** Assets & catégories — Rapido-Repas-refonte (6)/site/index.html */
export const REFONTE_IMG = '/images/repas/refonte/';

/** Noms catalogue officiels (hero + cartes) — source de vérité affichage. */
export const REFONTE_PRODUCT_NAMES = {
  shawarma: 'Chawarma',
  'poisson-pane': 'Poisson pané',
  'filet-poisson-pouiller': 'Filet de poisson poêlé',
  'filet-poele': 'Filet de poisson poêlé',
  'brochette-de-poisson': 'Brochette de poisson',
  brochette: 'Brochette de poisson',
  'monyo-machoiron-fume': 'Monyo de machoiron fumé',
  'machoiron-fume': 'Monyo de machoiron fumé',
  'monyo-tilapia-frite': 'Monyo de tilapia frit',
  'tilapia-frite': 'Monyo de tilapia frit',
  'monyo-machoiron-frit': 'Monyo de machoiron frit',
  'machoiron-frit': 'Monyo de machoiron frit',
  'tilapia-braise': 'Tilapia braisé',
  'machoiron-braise': 'Machoiron braisé',
  omelette: 'Omelette',
  'rillettes-de-poissons': 'Rillettes de poisson',
  rillettes: 'Rillettes de poisson',
  'salade-king-fish': 'Salade King Fish',
  salade: 'Salade King Fish',
  'chips-de-poisson-spicy': 'Chips de poisson Spicy',
  'chips-spicy': 'Chips de poisson Spicy',
  'chips-de-poisson-nature': 'Chips de poisson Nature',
  'chips-nature': 'Chips de poisson Nature',
};

export function displayProductName(slug, fallback = '') {
  const key = String(slug || '').trim().toLowerCase();
  return REFONTE_PRODUCT_NAMES[key] || String(fallback || '').trim() || key;
}

/** Descriptions affichées (prioritaires sur la base). */
export const REFONTE_PRODUCT_DESCS = {
  'brochette-de-poisson': 'Brochette de poisson marinée au feu, idéale avec frites ou attiéké.',
  brochette: 'Brochette de poisson marinée au feu, idéale avec frites ou attiéké.',
  'machoiron-braise': 'Machoiron braisé entier et légumes.',
  'salade-king-fish':
    'Salade fraîche, poisson fumé, tomate, carotte, œufs, concombre et sauce maison.',
  salade: 'Salade fraîche, poisson fumé, tomate, carotte, œufs, concombre et sauce maison.',
  shawarma: 'Wrap généreux au poisson, sauce crémeuse et légumes croquants.',
  'monyo-machoiron-fume': "Machoiron fumé à l'ancienne aux saveurs intenses.",
  'machoiron-fume': "Machoiron fumé à l'ancienne aux saveurs intenses.",
  'monyo-tilapia-frite': 'Tilapia frit croustillant, portion généreuse, servi avec son monyo.',
  'tilapia-frite': 'Tilapia frit croustillant, portion généreuse, servi avec son monyo.',
  'monyo-machoiron-frit': 'Machoiron frit, monyo tomate-oignon et sauce maison.',
  'machoiron-frit': 'Machoiron frit, monyo tomate-oignon et sauce maison.',
  rillettes: 'Pot de rillettes de poisson KING FISH, saveur authentique.',
  'rillettes-de-poissons': 'Pot de rillettes de poisson KING FISH, saveur authentique.',
};

/** WhatsApp et téléphone de la boutique Repas. */
export const MEAL_SHOP_PHONE_DIGITS = '2290143949494';
export const MEAL_SHOP_PHONE_DISPLAY = '+229 01 43 94 94 94';

export function displayProductDesc(slug, fallback = '') {
  const key = String(slug || '').trim().toLowerCase();
  return REFONTE_PRODUCT_DESCS[key] || String(fallback || '').trim();
}

/** Accompagnement : « Légumes sautés » (pluriel). */
export function displaySideName(name) {
  const raw = String(name || '').trim();
  if (/l[ée]gumes?\s+saut[ée]s?/i.test(raw)) return 'Légumes sautés';
  return raw;
}

/**
 * Prix affichés (déjà le prix promo) et écart de taille.
 * Moyen / Petit = basePrice, les autres choix sont un supplément.
 */
export const REFONTE_SIZE_PRICES = {
  'tilapia-braise': {
    basePrice: 3500,
    choices: [
      ['Moyen', 0],
      ['Grand', 1500],
    ],
  },
  'monyo-tilapia-frite': {
    basePrice: 1500,
    choices: [
      ['Petit', 0],
      ['Moyen', 500],
      ['Grand', 1000],
    ],
  },
  'tilapia-frite': {
    basePrice: 1500,
    choices: [
      ['Petit', 0],
      ['Moyen', 500],
      ['Grand', 1000],
    ],
  },
  'machoiron-braise': {
    basePrice: 2500,
    choices: [
      ['Moyen', 0],
      ['Grand', 500],
    ],
  },
  'monyo-machoiron-frit': {
    basePrice: 1500,
    choices: [
      ['Moyen', 0],
      ['Grand', 500],
    ],
  },
  'machoiron-frit': {
    basePrice: 1500,
    choices: [
      ['Moyen', 0],
      ['Grand', 500],
    ],
  },
};

export function sizeCatalogFor(slug) {
  const spec = REFONTE_SIZE_PRICES[String(slug || '').trim().toLowerCase()];
  if (!spec) return null;
  return {
    basePrice: spec.basePrice,
    optionGroups: [
      {
        name: 'Taille',
        selectionType: 'single',
        required: true,
        choices: spec.choices.map(([label, price]) => ({
          label,
          price,
          available: true,
        })),
      },
    ],
  };
}

/** Tailles de poisson au masculin : Petit, Moyen, Grand. */
export function masculineSizeLabel(label) {
  const raw = String(label || '').trim();
  const head = raw.split(/\s*[—–-]\s*/)[0].trim();
  const key = head
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const map = {
    petit: 'Petit',
    petite: 'Petit',
    moyen: 'Moyen',
    moyenne: 'Moyen',
    monyen: 'Moyen',
    grand: 'Grand',
    grande: 'Grand',
  };
  if (!map[key]) return raw;
  return raw.replace(head, map[key]);
}

export const REFONTE_SLUG_ASSETS = {
  'tilapia-braise': { img: 'tilapia-braise', cut: 'tilapia-braise' },
  shawarma: { img: 'shawarma-2', cut: 'shawarma-2' },
  'brochette-de-poisson': { img: 'brochette-photo.webp', cut: null },
  brochette: { img: 'brochette-photo.webp', cut: null },
  'poisson-pane': { img: 'poisson-pane', cut: 'poisson-pane' },
  'monyo-machoiron-fume': { img: 'machoiron-fume-photo.webp', cut: null },
  'machoiron-fume': { img: 'machoiron-fume-photo.webp', cut: null },
  'salade-king-fish': { img: 'salade-2', cut: 'salade' },
  salade: { img: 'salade-2', cut: 'salade' },
  'filet-poisson-pouiller': { img: 'filet-poele', cut: 'filet-poele' },
  'filet-poele': { img: 'filet-poele', cut: 'filet-poele' },
  'monyo-tilapia-frite': { img: 'tilapia-frite-photo.webp', cut: null },
  'tilapia-frite': { img: 'tilapia-frite-photo.webp', cut: null },
  'monyo-machoiron-frit': { img: 'machoiron-frit-photo.webp', cut: null },
  'machoiron-frit': { img: 'machoiron-frit-photo.webp', cut: null },
  'machoiron-braise': { img: 'machoiron-braise', cut: 'machoiron-braise' },
  rillettes: { img: 'rillettes', cut: 'rillettes' },
  'rillettes-de-poissons': { img: 'rillettes', cut: 'rillettes' },
  omelette: { img: 'omelette-cut.webp', cut: null },
  'chips-spicy': { img: 'chips-spicy', cut: 'chips-spicy' },
  'chips-nature': { img: 'chips-nature', cut: 'chips-nature' },
  'chips-de-poisson-spicy': { img: 'chips-spicy', cut: 'chips-spicy' },
  'chips-de-poisson-nature': { img: 'chips-nature', cut: 'chips-nature' },
};

/** Visuels détourés un peu plus grands dans la bannière. */
export const HERO_LARGE = new Set([
  'brochette-de-poisson',
  'brochette',
  'monyo-machoiron-fume',
  'machoiron-fume',
  'monyo-tilapia-frite',
  'tilapia-frite',
  'monyo-machoiron-frit',
  'machoiron-frit',
  'omelette',
]);

export const HERO_SCRIPTS = {
  'tilapia-braise': 'Braisé au feu de bois',
  shawarma: 'Le favori de la rue',
  'brochette-de-poisson': 'Grillées minute',
  brochette: 'Grillées minute',
  'poisson-pane': 'Doré & croustillant',
  'monyo-machoiron-fume': "Fumé à l'ancienne",
  'machoiron-fume': "Fumé à l'ancienne",
  'salade-king-fish': 'Fraîcheur King Fish',
  salade: 'Fraîcheur King Fish',
  'filet-poisson-pouiller': 'Poêlé à la commande',
  'filet-poele': 'Poêlé à la commande',
  'monyo-tilapia-frite': 'Croustillant à souhait',
  'tilapia-frite': 'Croustillant à souhait',
  'monyo-machoiron-frit': 'Frit à la commande',
  'machoiron-frit': 'Frit à la commande',
  'machoiron-braise': 'Braisé entier',
  omelette: 'Simple & rapide',
  rillettes: 'Gourmet King Fish',
  'rillettes-de-poissons': 'Gourmet King Fish',
  'chips-de-poisson-spicy': 'Épicé King Fish',
  'chips-de-poisson-nature': 'Nature King Fish',
};

export const REFONTE_CATS = [
  { id: 'all', name: 'Tout le menu', icon: 'brochette' },
  { id: 'braise', name: 'Braisés & fumés', icon: 'tilapia-braise' },
  { id: 'frit', name: 'Frits & panés', icon: 'poisson-pane' },
  { id: 'street', name: 'Street food', icon: 'shawarma-2' },
  { id: 'salade', name: 'Salades', icon: 'salade' },
  { id: 'epicerie', name: 'Épicerie King Fish', icon: 'rillettes' },
];

export const CAT_ICONS = {
  all: '<svg viewBox="0 0 40 40"><path d="M20 5l4.4 9.2 10 1.3-7.3 7 1.9 9.9L20 27.6l-9 4.8 1.9-9.9-7.3-7 10-1.3z" fill="#D8431F"/></svg>',
  braise:
    '<svg viewBox="0 0 40 40"><path d="M6 21c4-7 13-9 20-4l7-4v15l-7-4c-7 5-16 3-20-3z" fill="#C76D2E"/><path d="M13 16l4 9M18 14.5l4 10M23 15l3.5 8" stroke="#5C2E0B" stroke-width="1.6" stroke-linecap="round"/><circle cx="10.5" cy="20" r="1.4" fill="#2B1408"/><path d="M8 34c3-2 5 2 8 0s5 2 8 0 5 2 8 0" fill="none" stroke="#F6BE2C" stroke-width="2" stroke-linecap="round"/></svg>',
  frit:
    '<svg viewBox="0 0 40 40"><path d="M9 27c-2-7 3-15 11-17 7-2 13 2 12 8-1 7-10 12-17 12-3 0-5-1-6-3z" fill="#E8A13A"/><path d="M14 18l2 1M19 15l1.5 1.5M24 16l1 2M17 23l2 1M23 22l1.5 1M27 20l1.4.6" stroke="#A9581C" stroke-width="1.8" stroke-linecap="round"/><path d="M28 30c2-1 4-1 5 1" stroke="#2F8F4E" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>',
  street:
    '<svg viewBox="0 0 40 40"><path d="M10 33L25 7l7 4-15 26z" fill="#F1D9A8"/><path d="M25 7l7 4-3 5-7-4z" fill="#3E9A4E"/><path d="M22 12l7 4-1.6 2.8-7-4z" fill="#D8431F"/><path d="M13 28l7 4M16 23l7 4" stroke="#D8B47A" stroke-width="1.6" stroke-linecap="round"/></svg>',
  salade:
    '<svg viewBox="0 0 40 40"><path d="M5 20h30c0 8-7 14-15 14S5 28 5 20z" fill="#F6E6CF"/><path d="M8 20c1-5 5-7 8-6 1-4 6-6 9-3 3-2 8 0 8 5l1 4z" fill="#3E9A4E"/><circle cx="15" cy="17" r="2.6" fill="#D8431F"/><circle cx="25" cy="16" r="2.2" fill="#F6BE2C"/></svg>',
  epicerie:
    '<svg viewBox="0 0 40 40"><rect x="12" y="5" width="16" height="5" rx="1.5" fill="#8B4513"/><path d="M11 10h18v22a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z" fill="#F4D3C2"/><rect x="11" y="17" width="18" height="10" fill="#24324A"/><path d="M15 22h10" stroke="#F6BE2C" stroke-width="1.6"/></svg>',
};

export function fmtXof(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function cutSrc(id) {
  if (!id) return '';
  return `${REFONTE_IMG}${id}-cut.webp`;
}

export function cardImgSrc(base) {
  if (!base) return '';
  if (/\.(svg|png|jpe?g|webp)$/i.test(String(base))) return `${REFONTE_IMG}${base}`;
  return `${REFONTE_IMG}${base}.jpg`;
}

/** Photos supplémentaires, même série que les cartes /repas. */
const REFONTE_GALLERY_EXTRAS = {
  shawarma: ['shawarma'],
  'machoiron-braise': ['machoiron-braise-food'],
  'salade-king-fish': ['salade'],
  salade: ['salade'],
};

/** Galerie fiche produit = mêmes photos que les cartes /repas. */
export function refonteGalleryUrls(slug) {
  const key = String(slug || '').trim().toLowerCase();
  const mapped = REFONTE_SLUG_ASSETS[key];
  if (!mapped?.img) return [];
  const extras = REFONTE_GALLERY_EXTRAS[key] || [];
  const urls = [cardImgSrc(mapped.img), ...extras.map((id) => cardImgSrc(id))];
  return [...new Set(urls.filter(Boolean))];
}
