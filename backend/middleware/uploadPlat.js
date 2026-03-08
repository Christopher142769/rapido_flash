const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier uploads/plats s'il n'existe pas
const platsDir = path.join(__dirname, '../uploads/plats');
if (!fs.existsSync(platsDir)) {
  fs.mkdirSync(platsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, platsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `plat-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées!'), false);
  }
};

const uploadPlat = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  },
  fileFilter: fileFilter
});

module.exports = uploadPlat;
