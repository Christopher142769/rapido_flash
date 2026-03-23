const multer = require('multer');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    const error = new Error('Seules les images sont autorisées!');
    error.code = 'LIMIT_FILE_TYPE';
    req.fileValidationError = error.message;
    cb(error, false);
  }
};

const uploadUser = multer({
  storage: createCloudinaryStorage({
    folder: 'users/photos',
    publicIdPrefix: 'user-photo',
  }),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: fileFilter
});

module.exports = uploadUser;
