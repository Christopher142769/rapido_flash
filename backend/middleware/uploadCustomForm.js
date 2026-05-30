const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/custom-forms');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'].includes(ext) ? ext : '';
    const name = `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safeExt}`;
    cb(null, name);
  },
});

const fileFilter = (_req, file, cb) => {
  const mime = String(file.mimetype || '');
  const ext = path.extname(file.originalname || '').toLowerCase();
  const imageOk = mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
  const pdfOk = mime === 'application/pdf' || ext === '.pdf';
  if (imageOk || pdfOk) return cb(null, true);
  return cb(new Error('Fichiers autorisés : images (jpg, png, webp) ou PDF'), false);
};

const uploadCustomForm = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 30 },
  fileFilter,
});

module.exports = uploadCustomForm;
