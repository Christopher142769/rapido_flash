const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  logo: {
    type: String
  },
  banniere: {
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
  actif: {
    type: Boolean,
    default: true
  },
  fraisLivraison: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
