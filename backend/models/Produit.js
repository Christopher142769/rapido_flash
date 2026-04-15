const mongoose = require('mongoose');

const accompagnementSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    nomEn: { type: String, default: '', trim: true },
    prixSupp: { type: Number, default: 0, min: 0 },
    actif: { type: Boolean, default: true },
  },
  { _id: true }
);

const produitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  /** Nom affiché sur l’accueil (cartes) ; si vide, le nom du produit est utilisé */
  nomAfficheAccueil: {
    type: String,
    default: null,
    trim: true
  },
  nomEn: {
    type: String,
    default: '',
    trim: true
  },
  nomAfficheAccueilEn: {
    type: String,
    default: null,
    trim: true
  },
  descriptionEn: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String
  },
  /** Points affichés dans « Détails du produit » (fiche boutique), une entrée = une puce */
  caracteristiques: {
    type: [String],
    default: []
  },
  caracteristiquesEn: {
    type: [String],
    default: []
  },
  /** Options d'accompagnement sélectionnables au panier */
  accompagnements: {
    type: [accompagnementSchema],
    default: [],
  },
  accompagnementsMode: {
    type: String,
    enum: ['multiple', 'unique'],
    default: 'multiple',
  },
  prix: {
    type: Number,
    required: true,
    min: 0
  },
  uniteVente: {
    type: String,
    enum: ['piece', 'm3'],
    default: 'piece',
  },
  images: [{
    type: String
  }],
  /** Visuel dédié aux cartes produit sur la page d’accueil (aperçu) */
  imageCarteHome: {
    type: String,
    default: null
  },
  /** Grande bannière affichée à l’ouverture / zoom du produit */
  banniereProduit: {
    type: String,
    default: null
  },
  categorieProduit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategorieProduit'
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  disponible: {
    type: Boolean,
    default: true
  },
  /** Promo : livraison gratuite pour la commande si au moins un article avec ce flag */
  promoLivraisonGratuite: {
    type: Boolean,
    default: false
  },
  /** Réduction prix affichée / payée (1–90 %), null = pas de promo prix */
  promoPourcentage: {
    type: Number,
    default: null
  },
  /** Mis en avant manuellement depuis le dashboard (badge « recommandé ») */
  recommande: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Produit', produitSchema);
