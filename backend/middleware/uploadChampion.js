const multer = require('multer');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    const error = new Error('Seules les images sont autorisées');
    error.code = 'LIMIT_FILE_TYPE';
    cb(error, false);
  }
};

const uploadChampion = multer({
  storage: createCloudinaryStorage({
    folder: 'champions',
    publicIdPrefix: 'champion',
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

module.exports = uploadChampion;
