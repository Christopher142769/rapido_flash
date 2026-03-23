const path = require('path');
const crypto = require('crypto');
const { cloudinary } = require('../utils/cloudinaryClient');

/**
 * Storage multer qui upload directement vers Cloudinary et renvoie :
 * - file.path = secure_url
 * - file.filename = public_id
 */
function createCloudinaryStorage({ folder, publicIdPrefix = 'img', folderResolver } = {}) {
  const resolveFolder = typeof folderResolver === 'function' ? folderResolver : () => folder;

  return {
    _handleFile(req, file, cb) {
      try {
        const resolvedFolder = resolveFolder(req, file);
        const ext = path.extname(file.originalname || '') || '';
        const random = crypto.randomBytes(8).toString('hex');
        const timestamp = Date.now();
        // public_id ne doit pas inclure l'extension.
        const public_id = `${publicIdPrefix}-${timestamp}-${random}`;

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: resolvedFolder || undefined,
            public_id,
            resource_type: 'image',
          },
          (err, result) => {
            if (err) return cb(err);
            if (!result?.secure_url) {
              return cb(new Error('Cloudinary: secure_url manquant'));
            }
            return cb(null, {
              path: result.secure_url,
              filename: result.public_id,
              size: result.bytes,
              originalname: file.originalname,
              mimetype: file.mimetype,
            });
          }
        );

        // multer fournit un stream : on le pipe vers Cloudinary
        file.stream.pipe(uploadStream);
      } catch (e) {
        cb(e);
      }
    },

    _removeFile(_req, _file, cb) {
      cb(null);
    },
  };
}

module.exports = { createCloudinaryStorage };

