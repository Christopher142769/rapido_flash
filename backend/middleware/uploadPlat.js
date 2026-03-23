const multer = require('multer');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées!'), false);
  }
};

const uploadPlat = multer({
  storage: createCloudinaryStorage({
    folder: 'plats',
    publicIdPrefix: 'plat',
  }),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: fileFilter
});

module.exports = uploadPlat;
