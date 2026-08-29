/**
 * Assure formulaire bassins-devis + produit shop/bassin (création si absents).
 * N’écrase pas les modifications dashboard existantes.
 */
const CustomForm = require('../models/CustomForm');
const ShopProduct = require('../models/ShopProduct');

const FORM_SLUG = 'bassins-devis';
const SHOP_SLUG = 'bassin';
const BASE_PRICE = 1340000;
const PROMO_PERCENT = 50;

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function opt(label) {
  return { id: uid(), label };
}

function bassinsFormDoc() {
  const notifyEmails = [
    'cricriguidibi@gmail.com',
    'fritzellstndj@gmail.com',
  ];
  const extra = String(process.env.BASSINS_NOTIFY_EMAIL || '')
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  extra.forEach((e) => {
    if (!notifyEmails.includes(e)) notifyEmails.push(e);
  });

  return {
    title: 'Demande bassin Rapido',
    slug: FORM_SLUG,
    description: '',
    notifyEmails,
    redirectUrl: '/bassins-remerciements',
    isPublished: true,
    settings: {
      showProgressBar: true,
      collectContact: true,
      requireName: true,
      requireEmail: false,
      skipWelcome: true,
      skipSectionIntros: true,
      confirmationMessage:
        'Un technicien Rapido vous rappelle sous 24 h pour valider votre commande.',
    },
    sections: [
      {
        id: uid(),
        title: '',
        description: '',
        imageUrl: '',
        blocks: [
          {
            id: uid(),
            kind: 'field',
            fieldType: 'text',
            label: 'Numéro WhatsApp / téléphone (obligatoire pour vous rappeler)',
            required: true,
          },
          {
            id: uid(),
            kind: 'field',
            fieldType: 'number',
            label: 'Combien de bassins souhaitez-vous ?',
            required: true,
          },
          {
            id: uid(),
            kind: 'field',
            fieldType: 'textarea',
            label:
              'Adresse de livraison / installation (quartier, ville, indications pour nous trouver)',
            required: true,
          },
          {
            id: uid(),
            kind: 'field',
            fieldType: 'choice',
            label:
              "Avez-vous déjà une activité économique en cours (commerce, entreprise, autre) aujourd'hui ?",
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
              "Disposez-vous d'un espace chez vous (cour, parcelle, terrain) où le bassin pourrait être installé ?",
            required: true,
            options: [
              opt('Oui : cour, parcelle ou terrain disponible'),
              opt("Oui : mais je dois encore aménager l'espace"),
              opt('Non : je cherche encore un emplacement'),
              opt('Je loue ou j’achète un terrain prochainement'),
            ],
          },
          {
            id: uid(),
            kind: 'field',
            fieldType: 'choice',
            label:
              'Avez-vous déjà une idée du budget nécessaire pour ce type de projet (670 000 FCFA) ?',
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
            label: 'Dans quel délai souhaiteriez-vous démarrer, si le projet vous convient ?',
            required: true,
            options: [
              opt('Immédiatement (sous 15 jours)'),
              opt('Ce mois-ci'),
              opt('Dans 1 à 3 mois'),
              opt('Je me renseigne d’abord'),
            ],
          },
        ],
      },
    ],
  };
}

function bassinsShopDoc() {
  return {
    name: 'Bassin hors-sol Rapido : montage et livraison 72 h',
    slug: SHOP_SLUG,
    shortDescription:
      'Bassin professionnel clé en main : montage, remplissage et livraison prêt à empoissonner. Offre limitée moins 50 %.',
    basePrice: BASE_PRICE,
    deliveryFee: 0,
    quantityUnit: 'unit',
    currency: 'XOF',
    published: true,
    mainImage: '/bassins/bassin-produit.png',
    images: ['/bassins/bassin-installation.png', '/bassins/snap-a.jpg', '/bassins/snap-b.jpg'],
    ctaLabel: 'Réserver mon bassin à 670 000 FCFA',
    showDeliveryNotice: false,
    eviscerationEnabled: false,
    dailyOrderLimit: {
      enabled: true,
      maxOrders: 20,
    },
    promo: {
      active: true,
      priceMode: 'percent',
      discountPercent: PROMO_PERCENT,
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
<p>Rapido vous monte, remplit et livre un <strong>bassin hors-sol professionnel</strong> prêt à empoissonner en <strong>72 heures</strong>.</p>`,
      },
      {
        type: 'image',
        title: 'Installation clé en main sur votre site',
        body: 'Montage, tuyauterie, remplissage et mise en route, partout au Bénin.',
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
<li><strong>Production maîtrisée</strong> : eau contrôlée, densité optimale</li>
<li><strong>Gain de place</strong> : 12 m² pour une production sérieuse</li>
<li><strong>ROI rapide</strong> : premier cycle rentable en quelques mois</li>
<li><strong>Accompagnement Rapido</strong> : dimensionnement et écoulement</li>
</ul>`,
      },
      {
        type: 'image',
        title: 'Bassin professionnel : liner bleu, structure galvanisée',
        body: 'Matériaux durables pour le climat tropical.',
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
              'Bassin dimensionné, montage, remplissage et mise en route. Validation de l’emplacement par un technicien Rapido.',
          },
          {
            question: 'Quel poisson puis-je élever ?',
            answer: 'Tilapia, Clarias, alevinage et grossissement.',
          },
          {
            question: 'Délai de mise en service ?',
            answer: '72 heures après validation, selon stock disponible.',
          },
        ],
      },
    ],
  };
}


async function ensureBassinsFunnel({ force = false } = {}) {
  const formData = bassinsFormDoc();
  let form = await CustomForm.findOne({ slug: FORM_SLUG });
  if (!form) {
    form = await CustomForm.create(formData);
    console.log(`✅ Funnel bassins — formulaire créé : /form/${FORM_SLUG}`);
  } else {
    // Funnel géré en code : toujours resynchroniser (quantité, adresse, merci, sans sections)
    Object.assign(form, formData);
    await form.save();
    console.log(`✅ Funnel bassins — formulaire synchronisé : /form/${FORM_SLUG}`);
  }

  const shopData = bassinsShopDoc();
  let product = await ShopProduct.findOne({ slug: SHOP_SLUG });
  if (!product) {
    product = await ShopProduct.create(shopData);
    console.log(`✅ Funnel bassins — produit créé : /shop/${SHOP_SLUG}`);
  } else if (force) {
    Object.assign(product, shopData);
    await product.save();
    console.log(`✅ Funnel bassins — produit forcé : /shop/${SHOP_SLUG}`);
  } else {
    let patched = false;
    if (!product.published) {
      product.published = true;
      patched = true;
    }
    // Stock mensuel 20 (quota commande)
    if (
      !product.dailyOrderLimit?.enabled ||
      Number(product.dailyOrderLimit?.maxOrders) !== 20
    ) {
      product.dailyOrderLimit = { enabled: true, maxOrders: 20 };
      patched = true;
    }
    if (patched) {
      await product.save();
      console.log(`✅ Funnel bassins — produit synchronisé (stock 20) : /shop/${SHOP_SLUG}`);
    } else {
      console.log(`ℹ️ Funnel bassins — produit déjà présent : /shop/${SHOP_SLUG}`);
    }
  }

  return { form, product };
}

module.exports = ensureBassinsFunnel;
module.exports.FORM_SLUG = FORM_SLUG;
module.exports.SHOP_SLUG = SHOP_SLUG;
module.exports.bassinsFormDoc = bassinsFormDoc;
module.exports.bassinsShopDoc = bassinsShopDoc;
