const mongoose = require('mongoose');

/** Catalogue global des accompagnements Shop Repas (activables par plat ou pour tous). */
const mealSideSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Prix en accompagnement (0 = offert). */
    price: { type: Number, default: 0, min: 0 },
    /** Prix quand le client l'ajoute en supplément. */
    extraPrice: { type: Number, default: 500, min: 0 },
    /** Proposer aussi cet élément dans les suppléments. */
    extraEnabled: { type: Boolean, default: true },
    /** false = masqué partout. */
    available: { type: Boolean, default: true },
    /** true = proposé sur tous les plats (y compris les futurs). */
    allProducts: { type: Boolean, default: false },
    /** Plats pour lesquels il est proposé quand allProducts est false. */
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MealProduct' }],
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MealSide', mealSideSchema);
