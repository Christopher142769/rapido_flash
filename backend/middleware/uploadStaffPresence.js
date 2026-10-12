const multer = require('multer');

const fileFilter = (_req, file, cb) => {
  if (String(file.mimetype || '').startsWith('image/')) return cb(null, true);
  cb(new Error('Selfie requis (image jpg, png ou webp)'), false);
};

/** Mémoire : Cloudinary est tenté ensuite. S'il est désactivé, la photo reste en base. */
const uploadStaffPresence = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter,
});

module.exports = uploadStaffPresence;
