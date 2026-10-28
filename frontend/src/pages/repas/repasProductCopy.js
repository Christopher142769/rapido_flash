/**
 * Copywriting des fiches plats /repas/commandes/:slug.
 *
 * Règles : chaque phrase s'appuie sur ce qui est visible sur la photo ou écrit dans le catalogue
 * (descriptions, tailles, accompagnements). Aucun prix en dur (les promos changent), aucun avis,
 * aucune garantie ni ingrédient inventés. Les textes du dashboard (copySections) priment s'ils existent.
 *
 * images    : photos supplémentaires { src, caption } (à défaut, la photo principale du plat est utilisée)
 * hook      : accroche affichée sous le titre
 * pitch     : description sensorielle (2-3 phrases)
 * benefits  : 3 bénéfices { title, text }
 * idealFor  : moment / occasion
 * faq       : question propre au plat (s'ajoute à la FAQ commune)
 */
export const REPAS_PRODUCT_COPY = {
  'tilapia-braise': {
    images: [{ src: '/images/repas/products/tilapia-braise-1.jpg', caption: 'Tilapia entier braisé, légumes et concombre.' }, { src: '/images/repas/refonte/tilapia-frite.jpg', caption: 'La peau grillée, de près.' }],
    hook: 'Le tilapia braisé entier, livré encore fumant.',
    pitch:
      'Un tilapia entier, la peau grillée par la braise, couché sur un lit de carottes, de haricots verts et de rondelles de concombre. Le repas du dimanche, sans allumer le feu ni faire la queue au maquis.',
    benefits: [
      { title: 'Un vrai poisson entier', text: 'Pas un morceau : un tilapia braisé que vous attaquez à la fourchette ou à la main.' },
      { title: 'Votre accompagnement est inclus', text: 'Riz, attiéké, alloco, akassa… vous choisissez, on ne facture pas l’accompagnement.' },
      { title: 'Deux tailles', text: 'Moyen pour un repas individuel, Grand quand l’appétit est grand ou qu’on partage.' },
    ],
    idealFor: 'Déjeuner à la maison ou au bureau, dîner en famille, repas du week-end.',
    faq: {
      q: 'Quelle taille choisir ?',
      a: 'Moyen est la taille de base, incluse dans le prix. Grand ajoute plus de poisson dans l’assiette, avec le supplément indiqué dans le choix de la taille.',
    },
  },

  chawarma: {
    images: [{ src: '/images/repas/refonte/shawarma.jpg', caption: 'Pain grillé, poisson fumé, sauce crémeuse.' }, { src: '/images/repas/products/shawarma-1.jpg', caption: 'Coupé en deux : tout est dans le pain.' }],
    hook: 'Le wrap qui se mange à deux mains.',
    pitch:
      'Un pain grillé bien roulé, garni de poisson fumé, de tomate et de feuilles vertes, le tout nappé d’une sauce crémeuse qui déborde à la première bouchée.',
    benefits: [
      { title: 'Un repas complet dans la main', text: 'Tout est dans le pain : pas d’assiette, pas de couverts, rien à préparer.' },
      { title: 'Du poisson fumé, pas le wrap habituel', text: 'Une saveur fumée que vous ne trouvez pas dans un chawarma classique.' },
      { title: 'Livré chaud', text: 'Le pain grillé et la sauce arrivent comme sortis de la cuisine.' },
    ],
    idealFor: 'Pause de midi, soirée devant un match, repas rapide quand on n’a pas le temps de cuisiner.',
    faq: {
      q: 'Faut-il choisir un accompagnement ?',
      a: 'Non, le chawarma se suffit à lui-même : vous le commandez, on vous le livre prêt à manger.',
    },
  },

  'poisson-pane': {
    hook: 'Le poisson pané qui croque vraiment.',
    pitch:
      'Des filets de poisson à la panure dorée, posés sur une feuille de laitue et relevés de rondelles de piment. Croustillant à la première bouchée, tendre ensuite.',
    benefits: [
      { title: 'Une panure bien dorée', text: 'Le contraste croquant dehors, tendre dedans qui donne envie d’en reprendre.' },
      { title: 'Facile à manger', text: 'Des filets à saisir et à croquer, sans se battre avec le poisson entier.' },
      { title: 'Votre accompagnement au choix', text: 'Frites, riz, attiéké, alloco… un accompagnement est inclus dans le prix.' },
    ],
    idealFor: 'Un repas simple et gourmand, y compris pour ceux qui hésitent à manger du poisson.',
    faq: {
      q: 'Avec quoi le commander ?',
      a: 'Les frites sont un classique du poisson pané (supplément indiqué dans la liste). Le riz, l’attiéké ou l’alloco sont inclus.',
    },
  },

  'brochette-de-poisson': {
    images: [{ src: '/images/repas/refonte/brochette-2.jpg', caption: 'La croûte dorée et épicée des brochettes.' }, { src: '/images/repas/products/brochette-3.jpg', caption: 'Grillées sur leur pique.' }],
    hook: 'Marinées, grillées, dorées : on s’arrête rarement à une.',
    pitch:
      'Des morceaux de poisson marinés puis grillés au feu, à la croûte dorée et épicée, enfilés sur leur pique. Le parfum du grill, livré chez vous.',
    benefits: [
      { title: 'Un goût de grill', text: 'Marinade et cuisson au feu : des saveurs relevées, pas un poisson nature.' },
      { title: 'Pensées pour accompagner', text: 'Idéales avec des frites ou de l’attiéké, un accompagnement est inclus.' },
      { title: 'Se partagent, ou pas', text: 'À grignoter à plusieurs ou à garder pour vous.' },
    ],
    idealFor: 'Soirée entre amis, match à la maison, envie de grillade sans allumer le barbecue.',
    faq: {
      q: 'Sont-elles épicées ?',
      a: 'Elles sont marinées et assaisonnées. Si vous les voulez moins relevées, précisez-le dans « Spécifications du plat ».',
    },
  },

  'monyo-machoiron-fume': {
    hook: 'Le mâchoiron fumé qui a du caractère.',
    pitch:
      'Du mâchoiron fumé à l’ancienne, nappé d’un monyo rouge au goût intense, avec des oignons frais, de la tomate et du piment par-dessus.',
    benefits: [
      { title: 'Des saveurs intenses', text: 'Le fumé du poisson rencontre le monyo, cette sauce tomate-oignon qui réveille tout.' },
      { title: 'Un plat qu’on trempe', text: 'Le monyo est fait pour être mangé avec votre accompagnement : riz, attiéké, akassa…' },
      { title: 'Votre accompagnement est inclus', text: 'Vous choisissez dans la liste, sans surcoût (sauf les frites).' },
    ],
    idealFor: 'Ceux qui aiment les plats corsés et la cuisine béninoise qui a du goût.',
    faq: {
      q: 'Qu’est-ce que le monyo ?',
      a: 'C’est la sauce rouge à base de tomate et d’oignon qui accompagne le poisson. Elle apporte le goût et le piquant du plat.',
    },
  },

  'monyo-tilapia-frite': {
    hook: 'Tilapia frit croustillant, servi avec son monyo.',
    pitch:
      'Un tilapia frit à la peau croustillante, servi avec son monyo : une sauce rouge aux oignons et aux poivrons qui donne du relief à chaque bouchée.',
    benefits: [
      { title: 'Croustillant et généreux', text: 'Une portion généreuse de tilapia frit, pensée pour qu’on se sente servi.' },
      { title: 'Trois tailles', text: 'Petit, Moyen ou Grand : vous ajustez à votre faim (et à votre budget).' },
      { title: 'Accompagnement inclus', text: 'Riz, attiéké, alloco… un accompagnement est compris dans le prix.' },
    ],
    idealFor: 'Le plat de poisson frit « comme on l’aime », à midi ou le soir.',
    faq: {
      q: 'Quelle taille prendre ?',
      a: 'Petit pour une petite faim, Moyen pour un repas normal, Grand pour un gros appétit. Le prix de chaque taille s’affiche dans le choix.',
    },
  },

  'monyo-machoiron-frit': {
    hook: 'Le mâchoiron frit au monyo, pour essayer sans se ruiner.',
    pitch:
      'Du mâchoiron frit, un monyo tomate-oignon et une sauce maison. Un vrai plat de poisson King Fish, à un prix d’entrée.',
    benefits: [
      { title: 'Un prix d’entrée', text: 'Idéal pour une première commande ou un repas à petit budget.' },
      { title: 'Du poisson frit, relevé au monyo', text: 'La sauce tomate-oignon donne au poisson frit tout son goût.' },
      { title: 'Deux tailles', text: 'Moyen ou Grand, selon votre faim.' },
    ],
    idealFor: 'Découvrir Rapido Repas, déjeuner économique, petit appétit.',
    faq: {
      q: 'Puis-je composer un repas plus complet ?',
      a: 'Oui : choisissez la taille Grand, un accompagnement inclus, et ajoutez un supplément (portion en plus) si vous voulez.',
    },
  },

  'machoiron-braise': {
    images: [{ src: '/images/repas/refonte/machoiron-braise-food.jpg', caption: 'Mâchoiron braisé, riz et sauce verte.' }],
    hook: 'Mâchoiron braisé entier, avec ses légumes.',
    pitch:
      'Un mâchoiron entier braisé à la peau grillée, servi avec ses légumes et une sauce verte pimentée à côté. Du poisson comme on le cuisine pour le plaisir.',
    benefits: [
      { title: 'Entier, avec ses légumes', text: 'Le poisson braisé arrive avec ses légumes, prêt à déguster.' },
      { title: 'Accompagnement inclus', text: 'Riz, attiéké, alloco… à vous de choisir, c’est compris dans le prix.' },
      { title: 'Deux tailles', text: 'Moyen ou Grand selon votre faim.' },
    ],
    idealFor: 'Un déjeuner généreux, un repas de week-end, les amateurs de poisson braisé.',
    faq: {
      q: 'La sauce verte est-elle forte ?',
      a: 'Elle est servie à côté : vous dosez vous-même. Si vous préférez sans piment, précisez-le dans « Spécifications du plat ».',
    },
  },

  'filet-poisson-pouiller': {
    hook: 'Un filet de poisson poêlé à la commande, fondant à cœur.',
    pitch:
      'Un filet de poisson poêlé, croustillant dehors et fondant dedans. Une cuisson simple qui met le poisson au centre de l’assiette.',
    benefits: [
      { title: 'Poêlé à la commande', text: 'Cuit pour vous, puis livré chaud : le croustillant n’a pas le temps de s’éteindre.' },
      { title: 'Un filet, pas d’arêtes à trier', text: 'Facile à manger, même pour les enfants ou les pressés.' },
      { title: 'Accompagnement inclus', text: 'Riz, attiéké, légumes sautés… vous choisissez, c’est dans le prix.' },
    ],
    idealFor: 'Un repas simple et savoureux, sans fioritures.',
    faq: {
      q: 'Peut-on le commander avec des légumes ?',
      a: 'Oui : « Légumes sautés » fait partie des accompagnements inclus.',
    },
  },

  omelette: {
    hook: 'Une omelette dorée, prête en un rien.',
    pitch:
      'Une omelette bien dorée, légère et moelleuse. Le petit plat qui règle un petit creux sans compliquer la journée.',
    benefits: [
      { title: 'Rapide', text: 'Le repas le plus simple du menu, livré chaud.' },
      { title: 'Un petit prix pour un petit creux', text: 'Le plat idéal quand on veut manger sans se ruiner.' },
      { title: 'Avec riz ou frites', text: 'Choisissez votre accompagnement pour la transformer en vrai repas.' },
    ],
    idealFor: 'Petit-déjeuner tardif, petit creux, repas léger du soir.',
    faq: {
      q: 'Puis-je la commander avec des frites ?',
      a: 'Oui : choisissez « Frites » dans les accompagnements (supplément indiqué), ou « Riz » inclus.',
    },
  },

  'rillettes-de-poissons': {
    images: [{ src: '/images/repas/refonte/rillettes.jpg', caption: 'Le pot de rillettes King Fish.' }],
    hook: 'Le pot de rillettes de poisson King Fish, à tartiner et à partager.',
    pitch:
      'Un pot de rillettes de poisson King Fish, « saveur authentique » comme l’annonce son étiquette. À étaler sur du pain, à poser sur la table de l’apéro, ou à garder pour les petites faims.',
    benefits: [
      { title: 'Prêt à servir', text: 'Vous ouvrez, vous tartinez : rien à cuire ni à préparer.' },
      { title: 'Signé King Fish', text: 'Le savoir-faire poisson de King Fish, dans un pot qu’on garde à portée de main.' },
      { title: 'À ajouter à votre commande', text: 'Mettez-le dans votre panier avec votre plat pour régaler vos invités.' },
    ],
    idealFor: 'Apéritif, goûter, tartines du petit-déjeuner, cadeau gourmand.',
    faq: {
      q: 'Comment les consommer ?',
      a: 'Directement sur du pain ou des crackers, à l’apéritif ou au petit-déjeuner.',
    },
  },

  'salade-king-fish': {
    images: [{ src: '/images/repas/products/salade-4.jpg', caption: 'Poisson fumé, œufs, concombre et oignon.' }, { src: '/images/repas/products/salade-1.jpg', caption: 'Servie avec sa sauce.' }],
    hook: 'La salade qui rassasie vraiment.',
    pitch:
      'Une salade fraîche et croquante : poisson fumé effiloché, œufs durs, tomate, carotte, concombre et oignon, relevée d’une sauce maison.',
    benefits: [
      { title: 'Du vrai poisson dedans', text: 'Du poisson fumé et des œufs pour que la salade tienne au corps.' },
      { title: 'Fraîche et croquante', text: 'Concombre, tomate, carotte : de la fraîcheur à chaque bouchée.' },
      { title: 'Sauce maison', text: 'Une sauce qui relie le tout et donne envie de finir l’assiette.' },
    ],
    idealFor: 'Repas léger à midi, déjeuner au bureau, quand on veut manger frais sans rester sur sa faim.',
    faq: {
      q: 'Puis-je y ajouter un accompagnement ?',
      a: 'Oui, dans la liste « Ajouter un supplément » (riz, attiéké, alloco…).',
    },
  },

  'chips-de-poisson-spicy': {
    hook: 'Les chips de poisson King Fish, version qui pique.',
    pitch:
      'Un sachet de 100 g de chips de poisson, version Spicy : pour grignoter autre chose que des chips de pommes de terre, avec du caractère.',
    benefits: [
      { title: 'Un snack différent', text: 'Du poisson croustillant à croquer, pas la chips habituelle.' },
      { title: 'Version épicée', text: 'Pour ceux qui aiment quand ça relève.' },
      { title: 'Sachet de 100 g', text: 'Facile à glisser dans un sac ou à poser sur la table.' },
    ],
    idealFor: 'Apéritif, soirée entre amis, pause grignotage.',
    faq: {
      q: 'Sont-elles très piquantes ?',
      a: 'C’est la version Spicy. Si vous préférez plus doux, choisissez la version Nature.',
    },
  },

  'chips-de-poisson-nature': {
    hook: 'Les chips de poisson King Fish, version nature.',
    pitch:
      'Un sachet de 100 g de chips de poisson, version Nature : la façon la plus simple de découvrir le croustillant du poisson.',
    benefits: [
      { title: 'Un snack différent', text: 'Du poisson croustillant à croquer, pas la chips habituelle.' },
      { title: 'Version nature', text: 'Sans piment : pour tous, y compris ceux qui n’aiment pas le fort.' },
      { title: 'Sachet de 100 g', text: 'Facile à partager ou à garder pour soi.' },
    ],
    idealFor: 'Apéritif, goûter, pause grignotage, à partager avec les enfants.',
    faq: {
      q: 'Nature ou Spicy ?',
      a: 'Nature pour un goût simple et sans piment ; Spicy si vous aimez que ça pique.',
    },
  },
};

export function getRepasProductCopy(slug) {
  const key = String(slug || '').trim().toLowerCase();
  const alias = { shawarma: 'chawarma', 'filet-poele': 'filet-poisson-pouiller', brochette: 'brochette-de-poisson' };
  return REPAS_PRODUCT_COPY[alias[key] || key] || null;
}
