const mongoose = require('mongoose');

const CHANNELS = ['presence', 'livreur', 'repas', 'commandes'];

/** Destinataires e-mail ajoutés depuis le dashboard (s'ajoutent aux adresses par défaut). */
const schema = new mongoose.Schema(
  {
    channel: { type: String, enum: CHANNELS, required: true },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    addedBy: { type: String, default: '' },
  },
  { timestamps: true }
);
schema.index({ channel: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('NotificationRecipient', schema);
module.exports.CHANNELS = CHANNELS;
