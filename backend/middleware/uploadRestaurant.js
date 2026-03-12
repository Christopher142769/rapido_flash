const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer les dossiers uploads/restaurants s'ils n'existent pas
const restaurantsDir = path.join(__dirname, '../uploads/restaurants');
const logosDir = path.join(restaurantsDir, 'logos');
const bannersDir = path.join(restaurantsDir, 'banners');

[restaurantsDir, logosDir, bannersDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'logo') {
      cb(null, logosDir);
    } else if (file.fieldname === 'banniere') {
      cb(null, bannersDir);
    } else {
      cb(null, restaurantsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fieldName = file.fieldname || 'restaurant';
    cb(null, `${fieldName}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

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
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: fileFilter
});

module.exports = uploadRestaurant;
