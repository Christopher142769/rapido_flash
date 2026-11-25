/**
 * Formulaires de candidature des campagnes Meta : livreur et cuisinier.
 * Pages publiques : /recrutement/livreur et /recrutement/cuisinier (frontend).
 *
 * Créés au démarrage s'ils sont absents. Un formulaire déjà présent n'est pas écrasé
 * (les modifications faites dans le dashboard sont conservées).
 */
const CustomForm = require('../models/CustomForm');

const SECTION_ID = 'candidature';

const VILLES = [
  { id: 'cotonou', label: 'Cotonou' },
  { id: 'calavi', label: 'Abomey-Calavi' },
  { id: 'autre', label: 'Autre commune' },
];

function phoneBlock() {
  return {
    id: 'telephone',
    kind: 'field',
    fieldType: 'text',
    inputFormat: 'bj-phone',
    label: 'Téléphone / WhatsApp',
    required: true,
  };
}

function villeBlock() {
  return { id: 'ville', kind: 'field', fieldType: 'choice', label: 'Où habitez-vous ?', required: true, options: VILLES };
}

function cvBlock(required) {
  return {
    id: 'cv',
    kind: 'field',
    fieldType: 'pdf',
    label: 'Votre CV (PDF ou photo)',
    required,
    pdfMaxCount: 4,
    pdfMaxSizeMb: 20,
  };
}

const FORMS = [
  {
    title: 'Candidature Livreur',
    slug: 'candidature-livreur',
    description: 'Livreur à moto — Cotonou et Abomey-Calavi. À partir de 60 000 F CFA / mois.',
    sections: [
      {
        id: SECTION_ID,
        title: '',
        description: '',
        imageUrl: '',
        blocks: [
          phoneBlock(),
          villeBlock(),
          {
            id: 'moto_permis',
            kind: 'field',
            fieldType: 'checkbox',
            label: 'Moto et permis',
            required: true,
            options: [
              { id: 'moto', label: 'J’ai ma propre moto' },
              { id: 'permis', label: 'J’ai le permis moto' },
              { id: 'aucun', label: 'Ni moto ni permis pour l’instant' },
            ],
          },
          {
            id: 'experience',
            kind: 'field',
            fieldType: 'choice',
            label: 'Expérience en livraison ou zémidjan',
            required: true,
            options: [
              { id: 'aucune', label: 'Aucune, je débute' },
              { id: 'moins1', label: 'Moins d’un an' },
              { id: '1a3', label: '1 à 3 ans' },
              { id: 'plus3', label: 'Plus de 3 ans' },
            ],
          },
          // Beaucoup de livreurs n'ont pas de CV : facultatif pour ne pas freiner la candidature.
          cvBlock(false),
        ],
      },
    ],
  },
  {
    title: 'Candidature Cuisinier',
    slug: 'candidature-cuisinier',
    description: 'Cuisinier·ère — Cotonou. À partir de 70 000 F CFA / mois. Diplôme de cuisine exigé.',
    sections: [
      {
        id: SECTION_ID,
        title: '',
        description: '',
        imageUrl: '',
        blocks: [
          phoneBlock(),
          {
            id: 'diplome',
            kind: 'field',
            fieldType: 'choice',
            label: 'Votre diplôme ou qualification en cuisine',
            required: true,
            options: [
              { id: 'cap', label: 'CAP Cuisine' },
              { id: 'bt', label: 'BEP / BT Hôtellerie-Restauration' },
              { id: 'bts', label: 'BTS / Licence Hôtellerie-Restauration' },
              { id: 'ecole', label: 'Certificat d’une école de cuisine' },
              { id: 'autre', label: 'Autre diplôme de cuisine' },
            ],
          },
          {
            id: 'experience',
            kind: 'field',
            fieldType: 'choice',
            label: 'Expérience en cuisine professionnelle',
            required: true,
            options: [
              { id: 'moins1', label: 'Moins d’un an' },
              { id: '1a3', label: '1 à 3 ans' },
              { id: '3a5', label: '3 à 5 ans' },
              { id: 'plus5', label: 'Plus de 5 ans' },
            ],
          },
          villeBlock(),
          cvBlock(true),
        ],
      },
    ],
  },
];

async function ensureRecruitmentForms() {
  for (const def of FORMS) {
    const exists = await CustomForm.findOne({ slug: def.slug }).select('_id').lean();
    if (exists) continue;
    await CustomForm.create({
      ...def,
      notifyEmails: [],
      notifyChannel: 'recrutement',
      redirectUrl: '',
      isPublished: true,
      settings: {
        showProgressBar: false,
        collectContact: true,
        requireName: true,
        requireEmail: false,
        skipWelcome: true,
        skipSectionIntros: true,
        confirmationMessage: 'Candidature reçue ! Nous vous appelons sous 72 h si votre profil est retenu.',
      },
    });
    console.log(`✅ Formulaire ${def.slug} créé`);
  }
}

module.exports = ensureRecruitmentForms;
module.exports.FORMS = FORMS;
