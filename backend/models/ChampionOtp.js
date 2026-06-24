const mongoose = require('mongoose');

const championOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  championId: { type: mongoose.Schema.Types.ObjectId, ref: 'Champion', required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  lastSentAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

championOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ChampionOtp', championOtpSchema);
