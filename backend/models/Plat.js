const mongoose = require('mongoose');

const platSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  prix: {
    type: Number,
    required: true
  },
  image: {
    type: String
  },
  categorie: {
    type: String
  },
  disponible: {
    type: Boolean,
    default: true
  },
  restaurants: [{
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant'
    },
    disponible: {
      type: Boolean,
      default: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Plat', platSchema);
