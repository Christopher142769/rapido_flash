const mongoose = require('mongoose');

const championReviewSchema = new mongoose.Schema(
  {
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryMission',
      required: true,
      unique: true,
      index: true,
    },
    championId: { type: mongoose.Schema.Types.ObjectId, ref: 'Champion', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true, maxlength: 500 },
    clientName: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChampionReview', championReviewSchema);
