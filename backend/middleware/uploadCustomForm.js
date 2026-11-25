const multer = require('multer');
const path = require('path');

/**
 * Fichiers des formulaires : gardés en mémoire le temps de la requête, puis écrits
 * dans MongoDB (GridFS, voir utils/formFileStore.js). Plus de Cloudinary ni de disque
 * local : ni l'un ni l'autre ne conservait les CV (401 Cloudinary, disque effacé au
 * redéploiement).
 */
const fileFilter = (_req, file, cb) => {
  const mime = String(file.mimetype || '');
  const ext = path.extname(file.originalname || '').toLowerCase();
  const imageOk =
    mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'].includes(ext);
  const pdfOk = mime === 'application/pdf' || ext === '.pdf';
  if (imageOk || pdfOk) return cb(null, true);
  return cb(new Error('Fichiers autorisés : images (jpg, png, webp) ou PDF'), false);
};

const uploadCustomForm = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 12 },
  fileFilter,
});

module.exports = uploadCustomForm;
