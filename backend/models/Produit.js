const mongoose = require('mongoose');

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
  prix: {
    type: Number,
    required: true,
    min: 0
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Produit', produitSchema);
