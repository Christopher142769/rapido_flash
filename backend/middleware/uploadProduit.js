const multer = require('multer');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

const upload = multer({
  storage: createCloudinaryStorage({ folder: 'produits', publicIdPrefix: 'prod' }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'), false);
  }
});

/** Champs fichier pour création / édition produit (galerie + carte accueil + bannière détail) */
const uploadProductFields = [
  { name: 'image', maxCount: 1 },
  { name: 'imageCarteHome', maxCount: 1 },
  { name: 'banniereProduit', maxCount: 1 }
];

module.exports = upload;
module.exports.uploadProductFields = uploadProductFields;
