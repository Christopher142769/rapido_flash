/**
 * Crée / met à jour le formulaire bassins-devis et le produit shop bassin.
 * Usage : node backend/scripts/seedBassinsFunnel.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
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
  const notifyRaw = process.env.BASSINS_NOTIFY_EMAIL || process.env.SMTP_USER || 'admin@rapido.com';
  const notifyEmails = notifyRaw
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return {
    title: 'Demande bassin Rapido — Qualification projet',
    slug: FORM_SLUG,
    description:
      'Vous êtes à 2 minutes de recevoir votre devis personnalisé. Un technicien Rapido vous rappelle sous 24 h.',
    notifyEmails,
    redirectUrl: `/shop/${SHOP_SLUG}`,
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
          'Ces informations nous permettent de dimensionner le bon bassin et de vous proposer la meilleure offre.',
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
              opt("Oui — j'ai déjà une activité (commerce, entreprise…)"),
              opt('Non — je démarre un nouveau projet'),
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
              opt('Oui — cour, parcelle ou terrain disponible'),
              opt("Oui — mais je dois encore aménager l'espace"),
              opt('Non — je cherche encore un emplacement'),
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
              opt('Oui — ce budget me convient'),
              opt('Oui — avec un apport familial ou partenaire'),
              opt("J'ai besoin d'échéancier ou de conseil financement"),
              opt('Non — mon budget est inférieur pour l’instant'),
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
              opt('Oui — j’ai déjà des clients (marché, quartier, restaurant…)'),
              opt('Oui — des pistes mais pas encore confirmées'),
              opt('Non — j’aimerais des conseils Rapido'),
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

function bassinsShopDoc() {
  return {
    name: 'Bassin hors-sol Rapido — Montage & livraison 72 h',
    slug: SHOP_SLUG,
    shortDescription:
      'Bassin professionnel clé en main : montage, remplissage et livraison prêt à empoissonner. Offre limitée −50 %.',
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
        body: 'Montage, tuyauterie, remplissage et mise en route — partout au Bénin.',
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
<li><strong>Production maîtrisée</strong> — eau contrôlée, densité optimale</li>
<li><strong>Gain de place</strong> — 12 m² pour une production sérieuse</li>
<li><strong>ROI rapide</strong> — premier cycle rentable en quelques mois</li>
<li><strong>Accompagnement Rapido</strong> — dimensionnement et écoulement</li>
</ul>`,
      },
      {
        type: 'image',
        title: 'Bassin professionnel — liner bleu, structure galvanisée',
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
            answer: '72 heures après validation — selon stock disponible.',
          },
        ],
      },
    ],
  };
}

async function upsertForm() {
  const data = bassinsFormDoc();
  let form = await CustomForm.findOne({ slug: FORM_SLUG });
  if (form) {
    Object.assign(form, data);
    await form.save();
    console.log(`✅ Formulaire mis à jour : /form/${FORM_SLUG}`);
  } else {
    form = await CustomForm.create(data);
    console.log(`✅ Formulaire créé : /form/${FORM_SLUG}`);
  }
  console.log(`   Notifications : ${data.notifyEmails.join(', ') || '(aucune)'}`);
  console.log(`   Redirection   : ${data.redirectUrl}`);
  return form;
}

async function upsertShop() {
  const data = bassinsShopDoc();
  let product = await ShopProduct.findOne({ slug: SHOP_SLUG });
  if (product) {
    Object.assign(product, data);
    await product.save();
    console.log(`✅ Produit shop mis à jour : /shop/${SHOP_SLUG}`);
  } else {
    product = await ShopProduct.create(data);
    console.log(`✅ Produit shop créé : /shop/${SHOP_SLUG}`);
  }
  console.log(`   Prix : ${BASE_PRICE.toLocaleString('fr-FR')} FCFA → −${PROMO_PERCENT} % = 670 000 FCFA`);
  return product;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapido_flash';
  await mongoose.connect(mongoUri);
  console.log('📊 MongoDB connecté\n');
  await upsertForm();
  console.log('');
  await upsertShop();
  await mongoose.disconnect();
  console.log('\n🎣 Funnel bassins prêt.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
