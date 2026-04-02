const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  telephone: {
    type: String
  },
  role: {
    type: String,
    enum: ['client', 'restaurant', 'gestionnaire'],
    default: 'client'
  },
  position: {
    latitude: Number,
    longitude: Number,
    adresse: String
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  photo: {
    type: String
  },
  /** Modération plateforme */
  banned: {
    type: Boolean,
    default: false,
  },
  banReason: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
