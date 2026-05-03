const mongoose = require('mongoose');

/** Jeton Expo Push (app React Native) — distinct du Web Push (VAPID). */
const mobilePushTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    platform: { type: String, enum: ['android', 'ios', 'unknown'], default: 'unknown' },
  },
  { timestamps: true }
);

mobilePushTokenSchema.index({ user: 1, token: 1 });

module.exports = mongoose.model('MobilePushToken', mobilePushTokenSchema);
