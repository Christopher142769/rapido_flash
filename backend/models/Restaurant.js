const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true
  },
  nomEn: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String
  },
  descriptionEn: {
    type: String,
    default: '',
    trim: true
  },
  logo: {
    type: String
  },
  banniere: {
    type: String
  },
  /** Grande image des cartes « structures » sur l’accueil (liste) ; prioritaire sur bannière / aperçu produit */
  visuelCarteAccueil: {
    type: String
  },
  position: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    adresse: String
  },
  telephone: {
    type: String
  },
  /** Identifiant « ligne Rapido » (messagerie / appels passant par la plateforme) — unique */
  platformLineCode: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
  },
  whatsapp: {
    type: String
  },
  email: {
    type: String
  },
  proprietaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gestionnaires: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  /** @deprecated conservé pour rétrocompatibilité ; doit rester aligné avec le 1er élément de categoriesDomaine */
  categorie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategorieDomaine'
  },
  /** Une ou plusieurs catégories de domaine (ex. Restauration + Épicerie) */
  categoriesDomaine: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategorieDomaine'
  }],
  actif: {
    type: Boolean,
    default: true
  },
  /** Fiche technique non listée sur l’accueil — conversations « Service Rapido » */
  isPlatformSupport: {
    type: Boolean,
    default: false,
    index: true,
  },
  fraisLivraison: {
    type: Number,
    default: 0
  },
  /** Jours d’ouverture / vente : 0 = dimanche … 6 = samedi */
  joursVente: [{
    type: Number,
    min: 0,
    max: 6
  }],
  /** Si true : le client doit commander la veille pour la livraison le jour J */
  commanderVeille: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const { generateUniqueRestaurantLineCode } = require('../utils/platformLineCode');

restaurantSchema.pre('save', async function assignPlatformLine(next) {
  if (this.platformLineCode && String(this.platformLineCode).trim()) return next();
  try {
    this.platformLineCode = await generateUniqueRestaurantLineCode(this.constructor);
  } catch (e) {
    return next(e);
  }
  return next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
