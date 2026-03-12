const mongoose = require('mongoose');

const produitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
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
