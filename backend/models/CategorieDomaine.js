const mongoose = require('mongoose');

const categorieDomaineSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
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
