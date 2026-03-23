const cloudinary = require('cloudinary').v2;

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  // Permet que le backend démarre en dev si tu n'as pas encore configuré Cloudinary.
  // Les endpoints d'upload échoueront ensuite de façon claire.
  // eslint-disable-next-line no-console
  console.warn('[cloudinary] Variables d’environnement manquantes (CLOUDINARY_*).');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

module.exports = { cloudinary };

