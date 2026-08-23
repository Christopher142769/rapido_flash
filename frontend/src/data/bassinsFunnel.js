/** Slugs & URLs du funnel bassins */
export const BASSINS_FORM_SLUG = 'bassins-devis';
export const BASSINS_SHOP_SLUG = 'bassin';
export const BASSINS_FORM_PATH = `/form/${BASSINS_FORM_SLUG}`;
export const BASSINS_SHOP_PATH = `/shop/${BASSINS_SHOP_SLUG}`;

export const BASSINS_BASE_PRICE = 1340000;
export const BASSINS_PROMO_PERCENT = 50;
export const BASSINS_PROMO_PRICE = 670000;
/** Stock mensuel affiché sur /bassins (barres allumées). */
export const BASSINS_STOCK_MAX = 20;

const uid = () => Math.random().toString(36).slice(2, 11);

const opt = (label) => ({ id: uid(), label });

/** Formulaire qualification bassin : 7 questions + contact */
export function buildBassinsFormDraft() {
  return {
    title: 'Demande bassin Rapido : qualification projet',
    slug: BASSINS_FORM_SLUG,
    description:
      '<p>Vous êtes à <strong>2 minutes</strong> de recevoir votre devis personnalisé. Répondez honnêtement : un technicien Rapido vous rappelle sous <strong>24 h</strong> avec dimensionnement, prix ferme et date de montage.</p>',
    notifyEmails: '',
    redirectUrl: BASSINS_SHOP_PATH,
    isPublished: true,
    settings: {
      showProgressBar: true,
      collectContact: true,
      requireName: true,
      requireEmail: false,
      confirmationMessage:
        'Merci ! Votre demande est enregistrée. Découvrez maintenant votre offre bassin à prix promotionnel.',
    },
    sections: [
      {
        id: uid(),
        title: 'Votre profil',
        description:
          '<p>Ces informations nous permettent de dimensionner le bon bassin et de vous proposer la meilleure offre.</p>',
        imageUrl: '/bassins/bassin-produit.png',
        blocks: [
          {
            id: uid(),
            kind: 'field',
            fieldType: 'text',
            label: 'Numéro WhatsApp / téléphone (obligatoire pour vous rappeler)',
            required: true,
          },
        ],
      },
      {
        id: uid(),
        title: 'Votre situation',
        description: '',
        imageUrl: '',
        blocks: [
          {
            id: uid(),
            kind: 'field',
            fieldType: 'choice',
            label:
              "1. Avez-vous déjà une activité économique en cours (commerce, entreprise, autre) aujourd'hui ?",
            required: true,
            options: [
              opt("Oui : j'ai déjà une activité (commerce, entreprise…)"),
              opt('Non : je démarre un nouveau projet'),
              opt("J'ai une activité informelle / en cours de formalisation"),
            ],
          },
          {
            id: uid(),
            kind: 'field',
            fieldType: 'choice',
            label:
              "2. Disposez-vous d'un espace chez vous (cour, parcelle, terrain) où le bassin pourrait être installé ?",
            required: true,
            options: [
              opt('Oui : cour, parcelle ou terrain disponible'),
              opt("Oui : mais je dois encore aménager l'espace"),
              opt('Non : je cherche encore un emplacement'),
              opt('Je loue ou j’achète un terrain prochainement'),
            ],
          },
        ],
      },
      {
        id: uid(),
        title: 'Budget & calendrier',
        description: '',
        imageUrl: '',
        blocks: [
          {
            id: uid(),
            kind: 'field',
            fieldType: 'choice',
            label:
              '3. Avez-vous déjà une idée du budget nécessaire pour ce type de projet (670 000 FCFA) ?',
            required: true,
            options: [
              opt('Oui : ce budget me convient'),
              opt('Oui : avec un apport familial ou partenaire'),
              opt("J'ai besoin d'échéancier ou de conseil financement"),
              opt('Non : mon budget est inférieur pour l’instant'),
            ],
          },
          {
            id: uid(),
            kind: 'field',
            fieldType: 'choice',
            label: '4. Dans quel délai souhaiteriez-vous démarrer, si le projet vous convient ?',
            required: true,
            options: [
              opt('Immédiatement (sous 15 jours)'),
              opt('Ce mois-ci'),
              opt('Dans 1 à 3 mois'),
              opt('Je me renseigne d’abord'),
            ],
          },
          {
            id: uid(),
            kind: 'field',
            fieldType: 'choice',
            label:
              "5. Est-ce un projet que vous financez vous-même, ou avec l'appui de votre famille / d'un partenaire ?",
            required: true,
            options: [
              opt('Je finance seul(e)'),
              opt('Avec ma famille'),
              opt('Avec un partenaire / associé'),
              opt('Je cherche encore un financement'),
            ],
          },
        ],
      },
      {
        id: uid(),
        title: 'Commercialisation',
        description: '',
        imageUrl: '',
        blocks: [
          {
            id: uid(),
            kind: 'field',
            fieldType: 'choice',
            label:
              '6. Avez-vous déjà une piste pour écouler vos poissons (marché, quartier, restaurant, revendeurs) ou souhaitez-vous des conseils sur ce point ?',
            required: true,
            options: [
              opt('Oui : j’ai déjà des clients (marché, quartier, restaurant…)'),
              opt('Oui : des pistes mais pas encore confirmées'),
              opt('Non : j’aimerais des conseils Rapido'),
              opt('Je vends via revendeurs / grossistes'),
            ],
          },
          {
            id: uid(),
            kind: 'field',
            fieldType: 'choice',
            label:
              "7. Qu'est-ce qui vous freine le plus aujourd'hui pour vous lancer : le prix, le manque d'expérience, ou autre chose ?",
            required: true,
            options: [
              opt('Le prix / le budget'),
              opt('Le manque d’expérience en pisciculture'),
              opt('Trouver un emplacement'),
              opt('L’écoulement / la vente du poisson'),
              opt('Autre chose'),
            ],
          },
          {
            id: uid(),
            kind: 'field',
            fieldType: 'textarea',
            label: 'Si « Autre », précisez en quelques mots (facultatif)',
            required: false,
          },
        ],
      },
    ],
  };
}

/** Produit shop bassin : copy conversion */
export function buildBassinsShopProduct() {
  return {
    name: 'Bassin hors-sol Rapido : montage et livraison 72 h',
    slug: BASSINS_SHOP_SLUG,
    shortDescription:
      'Bassin professionnel clé en main : montage, remplissage et livraison prêt à empoissonner. Offre limitée moins 50 %.',
    basePrice: BASSINS_BASE_PRICE,
    deliveryFee: 0,
    quantityUnit: 'unit',
    published: true,
    mainImage: '/bassins/bassin-produit.png',
    images: ['/bassins/bassin-installation.png', '/bassins/snap-a.jpg', '/bassins/snap-b.jpg'],
    ctaLabel: 'Réserver mon bassin à 670 000 FCFA',
    showDeliveryNotice: false,
    eviscerationEnabled: false,
    whatsappNumber: '',
    contactPhone: '',
    dailyOrderLimit: {
      enabled: true,
      maxOrders: BASSINS_STOCK_MAX,
    },
    promo: {
      active: true,
      priceMode: 'percent',
      discountPercent: BASSINS_PROMO_PERCENT,
      manualPrice: null,
      freeDelivery: true,
      runUntilStopped: true,
    },
    copySections: [
      {
        type: 'title',
        title: 'Ce bassin de 12 m² sort plus de poisson que votre étang de 500 m²',
        body: '',
      },
      {
        type: 'text',
        title: '',
        body: `<p><strong>Sans creuser.</strong> Sans acheter de parcelle. Sans regarder vos alevins mourir dans une eau que vous ne contrôlez pas.</p>
<p>Rapido vous monte, remplit et livre un <strong>bassin hors-sol professionnel</strong> prêt à empoissonner en <strong>72 heures</strong>. Tilapia, Clarias, alevinage ou grossissement : vous produisez plus, plus vite, avec moins de risque.</p>`,
      },
      {
        type: 'image',
        title: 'Installation clé en main sur votre site',
        body: 'Nos équipes interviennent partout au Bénin : montage, tuyauterie, remplissage et mise en route.',
        mediaUrl: '/bassins/bassin-installation.png',
      },
      {
        type: 'title',
        title: 'Pourquoi les pisciculteurs choisissent Rapido',
        body: '',
      },
      {
        type: 'text',
        title: '',
        body: `<ul>
<li><strong>Production maîtrisée</strong> : eau contrôlée, densité optimale, moins de mortalité</li>
<li><strong>Gain de place</strong> : 12 m² suffisent pour une production sérieuse</li>
<li><strong>ROI rapide</strong> : premier cycle rentable en quelques mois avec le bon accompagnement</li>
<li><strong>Accompagnement Rapido</strong> : dimensionnement, alimentation, écoulement</li>
</ul>`,
      },
      {
        type: 'image',
        title: 'Bassin professionnel : liner bleu, structure galvanisée',
        body: 'Matériaux durables, conçus pour le climat tropical. Garantie de montage Rapido.',
        mediaUrl: '/bassins/bassin-produit.png',
      },
      {
        type: 'faq',
        title: 'Questions fréquentes',
        body: '',
        faqItems: [
          {
            question: 'Que comprend l’offre à 670 000 FCFA ?',
            answer:
              'Le bassin hors-sol dimensionné, le montage sur site, le remplissage et la mise en route. Un technicien Rapido valide avec vous l’emplacement avant intervention.',
          },
          {
            question: 'Quel poisson puis-je élever ?',
            answer:
              'Tilapia, Clarias, alevinage et grossissement. Nous vous orientons selon votre marché et votre expérience.',
          },
          {
            question: 'Combien de temps pour être opérationnel ?',
            answer:
              '72 heures après validation de votre commande et de l’emplacement, selon disponibilité des équipes (stock limité chaque mois).',
          },
          {
            question: 'Puis-je payer en plusieurs fois ?',
            answer:
              'Contactez-nous après réservation : des solutions de financement peuvent être étudiées selon votre profil.',
          },
        ],
      },
    ],
  };
}
