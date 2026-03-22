const mongoose = require('mongoose');

const categorieDomaineSchema = new mongoose.Schema({
  /** Identifiant stable pour les catégories système (seed) — permet renommage sans perdre la référence */
  code: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  /** Libellé anglais (optionnel) — affiché si la langue du site est EN */
  nomEn: {
    type: String,
    default: '',
    trim: true
  },
  icone: {
    type: String
  },
  ordre: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CategorieDomaine', categorieDomaineSchema);
