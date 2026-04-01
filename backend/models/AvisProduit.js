const mongoose = require('mongoose');

const avisProduitSchema = new mongoose.Schema({
  produit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit',
    required: true,
    index: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  commentaire: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

avisProduitSchema.index({ produit: 1, client: 1 }, { unique: true });

module.exports = mongoose.model('AvisProduit', avisProduitSchema);
