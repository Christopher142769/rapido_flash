const multer = require('multer');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

const upload = multer({
  storage: createCloudinaryStorage({ folder: 'shop-products', publicIdPrefix: 'shop' }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'), false);
  },
});

const uploadShopFields = [
  { name: 'mainImage', maxCount: 1 },
  { name: 'images', maxCount: 8 },
];

module.exports = upload;
module.exports.uploadShopFields = uploadShopFields;
