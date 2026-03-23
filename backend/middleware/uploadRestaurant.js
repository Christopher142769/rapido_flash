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

const uploadRestaurant = multer({
  storage: createCloudinaryStorage({
    publicIdPrefix: 'resto',
    folderResolver: (req, file) => {
      if (file.fieldname === 'logo') return 'restaurants/logos';
      if (file.fieldname === 'banniere') return 'restaurants/banners';
      return 'restaurants';
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: fileFilter
});

module.exports = uploadRestaurant;
