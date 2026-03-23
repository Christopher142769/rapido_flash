const multer = require('multer');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

const upload = multer({
  storage: createCloudinaryStorage({
    folder: 'medias',
    publicIdPrefix: 'media',
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'), false);
  }
});

module.exports = upload;
