const mongoose = require('mongoose');

/** QR à usage unique : le nonce consommé est mémorisé (purge auto après 1 h). */
const schema = new mongoose.Schema({
  nonce: { type: String, required: true, unique: true },
  consumedAt: { type: Date, default: Date.now, expires: 3600 },
});

module.exports = mongoose.model('LivreurScanNonce', schema);
