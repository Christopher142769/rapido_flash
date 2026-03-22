const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  /** Compte qui possède l’image (galerie globale au compte, plus liée à une entreprise). */
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  /** Ancien modèle : média rattaché à une entreprise (compatibilité lecture / suppression). */
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: false,
    index: true
  },
  path: {
    type: String,
    required: true
  },
  filename: { type: String },
  originalName: { type: String },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Media', mediaSchema);
