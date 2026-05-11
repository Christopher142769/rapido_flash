const mongoose = require('mongoose');

/**
 * Demandes utilisateurs envoyées depuis la page publique /account-deletion :
 *  - type 'deletion' : demande de suppression de compte et données associées
 *  - type 'support'  : message libre adressé au service Rapido
 *
 * Les demandes apparaissent dans le dashboard admin pour traitement manuel
 * (suppression effective du compte ou réponse au support).
 */
const accountRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['deletion', 'support'],
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    nom: { type: String, default: '', trim: true, maxlength: 200 },
    telephone: { type: String, default: '', trim: true, maxlength: 50 },
    subject: { type: String, default: '', trim: true, maxlength: 200 },
    message: { type: String, default: '', trim: true, maxlength: 4000 },

    /** Compte associé si l'email correspond à un User existant au moment de la demande. */
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String, default: '', maxlength: 4000 },

    /** Quand l'admin a effectivement supprimé le compte ou répondu. */
    processedAt: { type: Date, default: null },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    /** Pour les demandes de suppression : vrai une fois le compte effectivement supprimé. */
    accountDeleted: { type: Boolean, default: false },

    /** Métadonnées utiles pour la modération. */
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AccountRequest', accountRequestSchema);
