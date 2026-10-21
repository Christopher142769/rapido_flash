const mongoose = require('mongoose');

/**
 * Journal d'audit append-only, chaîné par hash (chaque ligne contient le hash de la précédente).
 * Toute modification/suppression applicative est refusée ; une altération en base casse la chaîne
 * (GET /api/livreur/admin/audit/verify).
 */
const schema = new mongoose.Schema(
  {
    seq: { type: Number, required: true, unique: true },
    type: { type: String, required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, index: true },
    livreurName: { type: String, default: '' },
    deliveryId: { type: mongoose.Schema.Types.ObjectId, index: true },
    siteId: { type: String, default: '' },
    at: { type: Date, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    prevHash: { type: String, required: true },
    hash: { type: String, required: true },
  },
  { timestamps: false }
);

const blocked = function () {
  throw new Error('Journal d’audit en lecture seule');
};
['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'].forEach((op) => {
  schema.pre(op, blocked);
});
schema.pre('save', function (next) {
  if (!this.isNew) return next(new Error('Journal d’audit en lecture seule'));
  next();
});

module.exports = mongoose.model('LivreurAuditEvent', schema);
