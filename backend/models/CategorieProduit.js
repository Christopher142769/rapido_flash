const mongoose = require('mongoose');

const categorieProduitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  nomEn: {
    type: String,
    default: '',
    trim: true
  },
  image: {
    type: String
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
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

module.exports = mongoose.model('CategorieProduit', categorieProduitSchema);
