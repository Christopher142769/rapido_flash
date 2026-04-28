const mongoose = require('mongoose');

const loginCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  code: { type: String, required: true },
  purpose: {
    type: String,
    enum: ['password_reset', 'login_2fa'],
    default: 'password_reset',
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// TTL pour supprimer les codes expirés automatiquement (optionnel)
loginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LoginCode', loginCodeSchema);
