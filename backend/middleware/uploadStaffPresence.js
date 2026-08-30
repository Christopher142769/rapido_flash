const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

const uploadDir = path.join(__dirname, '../uploads/staff-presence');
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (!useCloudinary) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `sp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safeExt}`);
  },
});

const storage = useCloudinary
  ? createCloudinaryStorage({
      folder: 'rapido/staff-presence',
      publicIdPrefix: 'sp',
    })
  : diskStorage;

const fileFilter = (_req, file, cb) => {
  if (String(file.mimetype || '').startsWith('image/')) return cb(null, true);
  cb(new Error('Selfie requis (image jpg, png ou webp)'), false);
};

const uploadStaffPresence = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter,
});

uploadStaffPresence.useCloudinary = useCloudinary;

module.exports = uploadStaffPresence;
