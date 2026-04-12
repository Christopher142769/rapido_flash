const mongoose = require('mongoose');

const platformCallSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['ringing', 'accepted', 'rejected', 'ended', 'cancelled'],
      default: 'ringing',
      index: true,
    },
    answeredAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

platformCallSchema.index({ conversation: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('PlatformCall', platformCallSchema);
