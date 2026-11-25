/**
 * Stockage durable des fichiers de formulaires (CV, photos…) dans MongoDB (GridFS).
 *
 * Pourquoi : Cloudinary (compte dhux4dczk) renvoie 401 et le disque du serveur est
 * effacé à chaque redéploiement ; des dizaines de CV ont été perdus. Les fichiers
 * vivent désormais dans la même base que les candidatures (bucket « formFiles »),
 * donc ils survivent à tout redéploiement de l'API.
 *
 * URL publique : /api/custom-forms/files/<id>/<jeton> — le jeton aléatoire (24 octets)
 * empêche de deviner l'adresse d'un CV à partir d'un autre.
 */
const crypto = require('crypto');
const path = require('path');
const mongoose = require('mongoose');

const BUCKET = 'formFiles';

function bucket() {
  const db = mongoose.connection?.db;
  if (!db) throw new Error('Base de données indisponible pour le stockage des fichiers');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET });
}

function apiBase(req) {
  const fromEnv = String(process.env.API_PUBLIC_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol;
  return `${proto}://${req.get('host')}`;
}

function fileUrl(req, id, token) {
  return `${apiBase(req)}/api/custom-forms/files/${id}/${token}`;
}

function safeName(name) {
  const base = path.basename(String(name || 'fichier')).replace(/[\r\n"]/g, '').slice(0, 180);
  return base || 'fichier';
}

/** Enregistre un fichier multer (memoryStorage) ; renvoie { id, token, url }. */
function saveUpload(req, file, meta = {}) {
  return new Promise((resolve, reject) => {
    const token = crypto.randomBytes(24).toString('hex');
    const upload = bucket().openUploadStream(safeName(file.originalname), {
      contentType: file.mimetype || 'application/octet-stream',
      metadata: { token, size: file.size, field: file.fieldname, ...meta },
    });
    upload.once('error', reject);
    upload.once('finish', () => {
      const id = String(upload.id);
      resolve({ id, token, url: fileUrl(req, id, token) });
    });
    upload.end(file.buffer);
  });
}

/** Lit un fichier par id + jeton ; null si introuvable ou jeton faux. */
async function findFile(id, token) {
  if (!mongoose.isValidObjectId(id)) return null;
  const docs = await bucket()
    .find({ _id: new mongoose.Types.ObjectId(id) })
    .limit(1)
    .toArray();
  const doc = docs[0];
  if (!doc || !token || doc.metadata?.token !== String(token)) return null;
  return doc;
}

function openDownload(id) {
  return bucket().openDownloadStream(new mongoose.Types.ObjectId(id));
}

module.exports = { saveUpload, findFile, openDownload, safeName, BUCKET };
