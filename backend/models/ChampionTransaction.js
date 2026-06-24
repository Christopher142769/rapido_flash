const mongoose = require('mongoose');

const championTransactionSchema = new mongoose.Schema(
  {
    championId: { type: mongoose.Schema.Types.ObjectId, ref: 'Champion', required: true, index: true },
    type: { type: String, enum: ['earning', 'withdrawal'], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    missionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryMission', default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChampionTransaction', championTransactionSchema);
