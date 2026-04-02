const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target: { type: String, enum: ['client', 'restaurant'], required: true },
    reason: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastMessageAt: { type: Date, default: Date.now },
    lastPreview: { type: String, default: '' },
    unreadClient: { type: Number, default: 0 },
    unreadRestaurant: { type: Number, default: 0 },
    reports: [reportSchema],
  },
  { timestamps: true }
);

conversationSchema.index({ restaurant: 1, client: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
