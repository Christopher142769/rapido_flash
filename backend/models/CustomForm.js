const mongoose = require('mongoose');

const customFormOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const customFormSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    /** Texte d’introduction de la section (HTML limité : gras, liens, etc.) */
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    blocks: [
      {
        id: { type: String, required: true },
        kind: { type: String, enum: ['field', 'table'], required: true },
        fieldType: {
          type: String,
          enum: ['text', 'textarea', 'email', 'image', 'pdf', 'choice', 'checkbox'],
          default: 'text',
        },
        label: { type: String, default: '' },
        required: { type: Boolean, default: false },
        options: [customFormOptionSchema],
        columns: [{ id: String, label: String }],
        rowCount: { type: Number, default: 3, min: 1, max: 30 },
      },
    ],
  },
  { _id: false }
);

const customFormSettingsSchema = new mongoose.Schema(
  {
    showProgressBar: { type: Boolean, default: true },
    collectContact: { type: Boolean, default: true },
    requireName: { type: Boolean, default: false },
    requireEmail: { type: Boolean, default: false },
    confirmationMessage: { type: String, default: '' },
  },
  { _id: false }
);

const customFormSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    notifyEmails: [{ type: String, trim: true, lowercase: true }],
    /** URL absolue ou chemin relatif (/recrutement/merci) après envoi réussi */
    redirectUrl: { type: String, default: '' },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    settings: { type: customFormSettingsSchema, default: () => ({}) },
    sections: [customFormSectionSchema],
  },
  { timestamps: true }
);

customFormSchema.index({ slug: 1 });
customFormSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CustomForm', customFormSchema);
