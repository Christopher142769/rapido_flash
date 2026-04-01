const mongoose = require('mongoose');

const banniereSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ['web', 'mobile'],
    default: 'web',
    index: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  ordre: {
    type: Number,
    default: 0
  },
  actif: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Banniere', banniereSchema);
