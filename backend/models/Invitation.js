const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    /**
     * Clé d’event (pour futures variantes). Aujourd’hui on utilise 'default'.
     * Permet d’éviter les collisions si vous créez plusieurs listes.
     */
    eventKey: { type: String, default: 'default', index: true },

    fullName: { type: String, required: true, trim: true, maxlength: 120 },

    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 200 },

    /** Domaine métier affiché à la place de «DOMAINE» dans la lettre. */
    domain: { type: String, default: '', trim: true, maxlength: 120 },

    /**
     * Normalisé pour déduplication (insensible à la casse/espaces).
     */
    normalizedName: { type: String, required: true, trim: true, maxlength: 160 },

    /**
     * Code unique (c’est ce que contient le QR).
     */
    code: { type: String, required: true, unique: true, index: true, trim: true, maxlength: 64 },

    present: { type: Boolean, default: false, index: true },
    checkedAt: { type: Date, default: null },
    checkedIp: { type: String, default: '' },

    emailSentAt: { type: Date, default: null },

    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// Dédup par event + nom (pour éviter des doubles quand on re-colle la liste)
invitationSchema.index({ eventKey: 1, normalizedName: 1 }, { unique: true });

module.exports = mongoose.model('Invitation', invitationSchema);

