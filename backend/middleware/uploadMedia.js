const multer = require('multer');
const path = require('path');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

const upload = multer({
  storage: createCloudinaryStorage({
    folder: 'medias',
    publicIdPrefix: 'media',
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const mimeOk = typeof file.mimetype === 'string' && file.mimetype.startsWith('image/');
    const ext = String(path.extname(file.originalname || '') || '').toLowerCase();
    const extOk = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext);
    if (mimeOk || extOk) cb(null, true);
    else cb(new Error('Seules les images (jpg, png, webp, gif, avif) sont autorisées'), false);
  }
});

module.exports = upload;
