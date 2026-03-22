const mongoose = require('mongoose');

const commandeSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  plats: [{
    plat: { type: mongoose.Schema.Types.ObjectId, ref: 'Plat' },
    quantite: { type: Number, required: true },
    prix: { type: Number, required: true }
  }],
  produits: [{
    produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit' },
    quantite: { type: Number, required: true },
    prix: { type: Number, required: true }
  }],
  adresseLivraison: {
    latitude: Number,
    longitude: Number,
    adresse: String,
    /** Indications pour le livreur (optionnel) */
    instruction: { type: String, default: '' },
    /** Numéro à appeler pour la livraison (optionnel, ex. si paiement en ligne) */
    telephoneContact: { type: String, default: '' }
  },
  /** Reçu paiement en ligne (Kkiapay) — jeton unique pour vérification / QR */
  receiptToken: {
    type: String,
    sparse: true
  },
  /** Après cette date le reçu n’est plus valide / téléchargeable */
  receiptExpiresAt: {
    type: Date
  },
  sousTotal: {
    type: Number,
    required: true
  },
  fraisLivraison: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  statut: {
    type: String,
    enum: ['en_attente', 'confirmee', 'en_preparation', 'en_livraison', 'livree', 'annulee'],
    default: 'en_attente'
  },
  /** especes : paiement en espèces à la livraison ; momo_avant : Mobile Money avant livraison ; momo_apres : Mobile Money après livraison */
  modePaiement: {
    type: String,
    enum: ['especes', 'momo_avant', 'momo_apres'],
    default: 'momo_avant'
  },
  /** Indique si le paiement en ligne (MoMo) a été encaissé (pour momo_avant / suivi momo_apres) */
  paiementEnLigneEffectue: {
    type: Boolean,
    default: false
  },
  livreur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Commande', commandeSchema);
