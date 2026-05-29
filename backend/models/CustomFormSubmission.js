const mongoose = require('mongoose');

const customFormAnswerSchema = new mongoose.Schema(
  {
    sectionId: { type: String, required: true },
    blockId: { type: String, required: true },
    label: { type: String, default: '' },
    fieldType: { type: String, default: 'text' },
    textValue: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    tableRows: [[String]],
  },
  { _id: false }
);

const customFormSubmissionSchema = new mongoose.Schema(
  {
    form: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomForm', required: true, index: true },
    formTitle: { type: String, default: '' },
    formSlug: { type: String, default: '' },
    respondentName: { type: String, default: '' },
    respondentEmail: { type: String, default: '' },
    answers: [customFormAnswerSchema],
    emailSent: { type: Boolean, default: false },
    emailError: { type: String, default: '' },
  },
  { timestamps: true }
);

customFormSubmissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CustomFormSubmission', customFormSubmissionSchema);
