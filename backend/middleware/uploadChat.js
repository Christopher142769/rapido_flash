const multer = require('multer');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

/** Images dans les messages de chat (Cloudinary, dossier dédié). */
const upload = multer({
  storage: createCloudinaryStorage({
    folder: 'chat-messages',
    publicIdPrefix: 'chat',
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'), false);
  },
});

module.exports = upload;
