const multer = require('multer');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

const fileFilter = (req, file, cb) => {
  // Accepter seulement les images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées!'), false);
  }
};

const upload = multer({
  storage: createCloudinaryStorage({
    folder: 'banners',
    publicIdPrefix: 'banner',
  }),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: fileFilter
});

module.exports = upload;
