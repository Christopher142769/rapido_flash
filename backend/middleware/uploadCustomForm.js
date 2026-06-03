const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

const uploadDir = path.join(__dirname, '../uploads/custom-forms');
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (!useCloudinary) {
  fs.mkdirSync(uploadDir, { recursive: true });
  // eslint-disable-next-line no-console
  console.warn(
    '[uploadCustomForm] CLOUDINARY_* non configuré — fichiers en local (perdus au redéploiement Render).'
  );
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'].includes(ext) ? ext : '';
    const name = `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safeExt}`;
    cb(null, name);
  },
});

const storage = useCloudinary
  ? createCloudinaryStorage({
      folder: 'rapido/custom-forms',
      publicIdPrefix: 'cf',
      resourceType: 'auto',
    })
  : diskStorage;

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

uploadCustomForm.useCloudinary = useCloudinary;

module.exports = uploadCustomForm;
