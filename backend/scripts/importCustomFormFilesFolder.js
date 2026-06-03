/**
 * Importe des fichiers déjà récupérés (nom cf-xxx.ext) vers Cloudinary
 * et met à jour les URLs dans MongoDB.
 *
 * Usage:
 *   cd backend
 *   node scripts/importCustomFormFilesFolder.js /chemin/vers/dossier/fichiers
 *
 * Les noms de fichier doivent correspondre aux URLs en base
 * (ex. cf-1780357354436-la0c7zl.jpg).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const CustomFormSubmission = require('../models/CustomFormSubmission');
const { cloudinary } = require('../utils/cloudinaryClient');

const sourceDir = process.argv[2];
if (!sourceDir || !fs.existsSync(sourceDir)) {
  console.error('Usage: node scripts/importCustomFormFilesFolder.js <dossier>');
  process.exit(1);
}

async function updateSubmissionUrls(submissionId, oldUrl, newUrl) {
  const sub = await CustomFormSubmission.findById(submissionId);
  if (!sub) return false;
  let changed = false;
  for (const a of sub.answers) {
    if (a.fileUrl === oldUrl) {
      a.fileUrl = newUrl;
      changed = true;
    }
    for (const f of a.fileAttachments || []) {
      if (f.fileUrl === oldUrl) {
        f.fileUrl = newUrl;
        changed = true;
      }
    }
    if (a.fileAttachments?.length) {
      const first = a.fileAttachments.find((f) => f.fileUrl === newUrl);
      if (first) a.fileUrl = first.fileUrl;
    }
  }
  if (changed) await sub.save();
  return changed;
}

function uploadFile(filePath, filename) {
  const ext = path.extname(filename).toLowerCase();
  const isPdf = ext === '.pdf';
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'rapido/custom-forms',
        public_id: `cf-import-${path.basename(filename, ext)}-${Date.now()}`,
        resource_type: isPdf ? 'raw' : 'image',
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    fs.createReadStream(filePath).pipe(stream);
  });
}

async function main() {
  if (!process.env.MONGODB_URI || !process.env.CLOUDINARY_CLOUD_NAME) {
    console.error('MONGODB_URI et CLOUDINARY_* requis dans backend/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const submissions = await CustomFormSubmission.find({}).lean();
  const urlByFilename = new Map();

  for (const s of submissions) {
    for (const a of s.answers || []) {
      const urls = [
        ...(a.fileAttachments || []).map((f) => ({ url: f.fileUrl, id: s._id })),
        ...(a.fileUrl ? [{ url: a.fileUrl, id: s._id }] : []),
      ];
      for (const { url } of urls) {
        if (!String(url).includes('/uploads/custom-forms/')) continue;
        const fn = url.split('/uploads/custom-forms/').pop()?.split('?')[0];
        if (fn) urlByFilename.set(fn, url);
      }
    }
  }

  const files = fs.readdirSync(sourceDir).filter((f) => f.startsWith('cf-'));
  console.log(`${files.length} fichier(s) dans le dossier, ${urlByFilename.size} référence(s) en base.`);

  let ok = 0;
  for (const filename of files) {
    const oldUrl = urlByFilename.get(filename);
    if (!oldUrl) {
      console.log(`  [skip] ${filename} — pas de référence MongoDB`);
      continue;
    }
    const filePath = path.join(sourceDir, filename);
    const newUrl = await uploadFile(filePath, filename);
    const subs = await CustomFormSubmission.find({}).lean();
    for (const s of subs) {
      for (const a of s.answers || []) {
        const hits =
          a.fileUrl === oldUrl ||
          (a.fileAttachments || []).some((f) => f.fileUrl === oldUrl);
        if (hits) await updateSubmissionUrls(s._id, oldUrl, newUrl);
      }
    }
    console.log(`  [ok] ${filename} → ${newUrl}`);
    ok++;
  }

  console.log(`\n${ok} fichier(s) importé(s) sur Cloudinary.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
