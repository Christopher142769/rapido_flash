const express = require('express');
const crypto = require('crypto');
const path = require('path');
const CustomForm = require('../models/CustomForm');
const CustomFormSubmission = require('../models/CustomFormSubmission');
const { auth, isRestaurant } = require('../middleware/auth');
const uploadCustomForm = require('../middleware/uploadCustomForm');
const { notifyFormSubmission } = require('../services/customFormMailer');
const { collectBlockFiles, validateBlockUploads } = require('../utils/customFormFiles');

const router = express.Router();

function uid() {
  return crypto.randomBytes(6).toString('hex');
}

function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `form-${uid()}`;
}

function filePublicUrl(req, filename) {
  const base = process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/uploads/custom-forms/${filename}`;
}

const FIELD_TYPES = ['text', 'textarea', 'email', 'number', 'date', 'image', 'pdf', 'choice', 'checkbox'];

function normalizeOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => ({
      id: o.id || uid(),
      label: String(o.label || '')
        .replace(/\r\n/g, '\n')
        .trim()
        .slice(0, 500),
    }))
    .filter((o) => o.label);
}

function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    showProgressBar: s.showProgressBar !== false,
    collectContact: s.collectContact !== false,
    requireName: !!s.requireName,
    requireEmail: !!s.requireEmail,
    confirmationMessage: String(s.confirmationMessage || '').slice(0, 2000),
  };
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.map((sec) => ({
    id: sec.id || uid(),
    title: String(sec.title || '').trim().slice(0, 300),
    description: String(sec.description || '').slice(0, 8000),
    imageUrl: String(sec.imageUrl || '').slice(0, 2000),
    blocks: (sec.blocks || []).map((b) => {
      if (b.kind === 'table') {
        return {
          id: b.id || uid(),
          kind: 'table',
          label: String(b.label || '').trim().slice(0, 300),
          required: !!b.required,
          columns: (b.columns || []).map((c) => ({
            id: c.id || uid(),
            label: String(c.label || '').trim().slice(0, 120),
          })),
          rowCount: Math.min(30, Math.max(1, parseInt(b.rowCount, 10) || 3)),
        };
      }
      const fieldType = FIELD_TYPES.includes(b.fieldType) ? b.fieldType : 'text';
      const block = {
        id: b.id || uid(),
        kind: 'field',
        fieldType,
        label: String(b.label || '').trim().slice(0, 300),
        required: !!b.required,
      };
      if (fieldType === 'choice' || fieldType === 'checkbox') {
        const options = normalizeOptions(b.options);
        block.options = options.length ? options : [{ id: uid(), label: 'Option 1' }];
      }
      if (fieldType === 'pdf') {
        block.pdfMaxCount = Math.min(10, Math.max(1, parseInt(b.pdfMaxCount, 10) || 1));
        block.pdfMaxSizeMb = Math.min(50, Math.max(1, parseInt(b.pdfMaxSizeMb, 10) || 15));
      }
      return block;
    }),
  }));
}

function validateSubmission(form, payload, fileMap) {
  const settings = normalizeSettings(form.settings);
  const respondentName = String(payload.respondentName || '').trim();
  const respondentEmail = String(payload.respondentEmail || '').trim().toLowerCase();

  if (settings.collectContact && settings.requireName && !respondentName) {
    return 'Le nom est obligatoire';
  }
  if (settings.collectContact && settings.requireEmail) {
    if (!respondentEmail) return 'L’e-mail est obligatoire';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respondentEmail)) return 'E-mail invalide';
  }

  const answerMap = new Map();
  (Array.isArray(payload.answers) ? payload.answers : []).forEach((a) => {
    answerMap.set(`${a.sectionId}_${a.blockId}`, a);
  });

  for (const sec of form.sections || []) {
    for (const block of sec.blocks || []) {
      const key = `${sec.id}_${block.id}`;
      const a = answerMap.get(key) || {};

      if (block.kind === 'table') {
        const rows = a.tableRows || [];
        const hasData = rows.some((row) => row.some((c) => String(c).trim()));
        if (block.required && !hasData) {
          return `Le tableau « ${block.label || sec.title} » est obligatoire`;
        }
        continue;
      }

      if (block.fieldType === 'image' || block.fieldType === 'pdf') {
        const uploadErr = validateBlockUploads(block, sec.id, block.id, fileMap, block.required);
        if (uploadErr) return uploadErr;
        continue;
      }

      if (!block.required) continue;

      if (block.fieldType === 'choice') {
        const sel = (a.selectedValues || []).filter(Boolean);
        if (!sel.length) return `Le champ « ${block.label} » est obligatoire`;
      } else if (block.fieldType === 'checkbox') {
        const sel = (a.selectedValues || []).filter(Boolean);
        if (!sel.length) return `Sélectionnez au moins une réponse pour « ${block.label} »`;
      } else if (block.fieldType === 'number') {
        const tv = String(a.textValue || '').trim();
        if (!tv) return `Le champ « ${block.label} » est obligatoire`;
        if (!/^-?\d+([.,]\d+)?$/.test(tv.replace(/\s/g, ''))) {
          return `« ${block.label} » doit être un nombre`;
        }
      } else if (block.fieldType === 'date') {
        const tv = String(a.textValue || '').trim();
        if (!tv) return `Le champ « ${block.label} » est obligatoire`;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tv)) return `« ${block.label} » : date invalide`;
      } else {
        const tv = String(a.textValue || '').trim();
        if (!tv) return `Le champ « ${block.label} » est obligatoire`;
      }
    }
  }

  return null;
}

function normalizeRedirectUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 500);
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.href.slice(0, 500);
  } catch {
    /* ignore */
  }
  return '';
}

function parseNotifyEmails(raw) {
  if (Array.isArray(raw)) return raw.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  return String(raw || '')
    .split(/[,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// ——— Dashboard (auth restaurant) ———

router.get('/', auth, isRestaurant, async (req, res) => {
  try {
    const forms = await CustomForm.find().sort({ updatedAt: -1 }).lean();
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

router.get('/submissions/list', auth, isRestaurant, async (req, res) => {
  try {
    const filter = {};
    if (req.query.formId) filter.form = req.query.formId;
    const items = await CustomFormSubmission.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

router.get('/submissions/:id', auth, isRestaurant, async (req, res) => {
  try {
    const item = await CustomFormSubmission.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: 'Réponse introuvable' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

router.post('/upload', auth, isRestaurant, uploadCustomForm.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Fichier requis' });
    const url = filePublicUrl(req, req.file.filename);
    res.json({ url, fileName: req.file.originalname });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur upload' });
  }
});

router.get('/public/:slug', async (req, res) => {
  try {
    const form = await CustomForm.findOne({ slug: req.params.slug.toLowerCase(), isPublished: true }).lean();
    if (!form) return res.status(404).json({ message: 'Formulaire introuvable ou non publié' });
    res.json(form);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

router.post('/public/:slug/submit', uploadCustomForm.any(), async (req, res) => {
  try {
    const form = await CustomForm.findOne({ slug: req.params.slug.toLowerCase(), isPublished: true });
    if (!form) return res.status(404).json({ message: 'Formulaire introuvable ou non publié' });

    let payload;
    try {
      payload = JSON.parse(req.body.payload || '{}');
    } catch {
      return res.status(400).json({ message: 'Données invalides' });
    }

    const respondentName = String(payload.respondentName || '').trim().slice(0, 200);
    const respondentEmail = String(payload.respondentEmail || '').trim().toLowerCase().slice(0, 200);
    const rawAnswers = Array.isArray(payload.answers) ? payload.answers : [];

    const fileMap = {};
    (req.files || []).forEach((f) => {
      fileMap[f.fieldname] = {
        url: filePublicUrl(req, f.filename),
        fileName: f.originalname,
        size: f.size,
      };
    });

    const validationError = validateSubmission(form, payload, fileMap);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const answers = rawAnswers.map((a) => {
      const selectedValues = Array.isArray(a.selectedValues)
        ? a.selectedValues.map((v) => String(v).trim()).filter(Boolean)
        : [];
      const base = {
        sectionId: a.sectionId,
        blockId: a.blockId,
        label: String(a.label || ''),
        fieldType: a.fieldType || 'text',
        textValue: String(a.textValue || ''),
        selectedValues,
        fileUrl: '',
        fileName: '',
        tableRows: a.tableRows || undefined,
      };
      if (selectedValues.length) {
        base.textValue = selectedValues.join(', ');
      }
      const attachments = collectBlockFiles(fileMap, a.sectionId, a.blockId).map((f) => ({
        fileUrl: f.url,
        fileName: f.fileName,
      }));
      if (attachments.length) {
        base.fileAttachments = attachments;
        base.fileUrl = attachments[0].fileUrl;
        base.fileName = attachments[0].fileName;
      }
      return base;
    });

    const submission = await CustomFormSubmission.create({
      form: form._id,
      formTitle: form.title,
      formSlug: form.slug,
      respondentName,
      respondentEmail,
      answers,
    });

    const mailResult = await notifyFormSubmission({ form, submission });
    submission.emailSent = !!mailResult.sent;
    submission.emailError = mailResult.error || '';
    await submission.save();

    res.status(201).json({
      ok: true,
      message: 'Réponse enregistrée. Merci !',
      emailSent: submission.emailSent,
      redirectUrl: form.redirectUrl || '',
    });
  } catch (err) {
    console.error('[customForms submit]', err);
    res.status(500).json({ message: err.message || 'Erreur lors de l’envoi' });
  }
});

router.get('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const form = await CustomForm.findById(req.params.id).lean();
    if (!form) return res.status(404).json({ message: 'Formulaire introuvable' });
    res.json(form);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

router.post('/', auth, isRestaurant, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Titre requis' });

    let slug = slugify(req.body.slug || title);
    const exists = await CustomForm.findOne({ slug });
    if (exists) slug = `${slug}-${uid().slice(0, 4)}`;

    const form = await CustomForm.create({
      title,
      slug,
      description: String(req.body.description || '').slice(0, 12000),
      notifyEmails: parseNotifyEmails(req.body.notifyEmails),
      redirectUrl: normalizeRedirectUrl(req.body.redirectUrl),
      isPublished: !!req.body.isPublished,
      settings: normalizeSettings(req.body.settings),
      sections: normalizeSections(req.body.sections),
      createdBy: req.user._id,
    });
    res.status(201).json(form);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

router.put('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const form = await CustomForm.findById(req.params.id);
    if (!form) return res.status(404).json({ message: 'Formulaire introuvable' });

    if (req.body.title != null) form.title = String(req.body.title).trim().slice(0, 300);
    if (req.body.description != null) form.description = String(req.body.description).slice(0, 12000);
    if (req.body.notifyEmails != null) form.notifyEmails = parseNotifyEmails(req.body.notifyEmails);
    if (req.body.redirectUrl != null) form.redirectUrl = normalizeRedirectUrl(req.body.redirectUrl);
    if (req.body.isPublished != null) form.isPublished = !!req.body.isPublished;
    if (req.body.settings != null) form.settings = normalizeSettings(req.body.settings);
    if (req.body.sections != null) form.sections = normalizeSections(req.body.sections);
    if (req.body.slug != null) {
      const next = slugify(req.body.slug);
      const clash = await CustomForm.findOne({ slug: next, _id: { $ne: form._id } });
      if (!clash) form.slug = next;
    }

    await form.save();
    res.json(form);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const form = await CustomForm.findByIdAndDelete(req.params.id);
    if (!form) return res.status(404).json({ message: 'Formulaire introuvable' });
    await CustomFormSubmission.deleteMany({ form: form._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
