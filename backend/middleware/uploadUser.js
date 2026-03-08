const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier uploads/users/photos s'il n'existe pas
const usersDir = path.join(__dirname, '../uploads/users');
const photosDir = path.join(usersDir, 'photos');

[usersDir, photosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, photosDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `photo-${uniqueSuffix}${path.extname(file.originalname)}`);
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

const uploadUser = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  },
  fileFilter: fileFilter
});

module.exports = uploadUser;
