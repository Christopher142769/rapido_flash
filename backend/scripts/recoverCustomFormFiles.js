/**
 * Tente de récupérer les fichiers formulaires encore accessibles en HTTP,
 * puis optionnellement les ré-uploade sur Cloudinary et met à jour MongoDB.
 *
 * Usage:
 *   cd backend && node scripts/recoverCustomFormFiles.js
 *   cd backend && node scripts/recoverCustomFormFiles.js --upload
 *
 * Prérequis: MONGODB_URI + pour --upload: CLOUDINARY_*
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const mongoose = require('mongoose');
const CustomFormSubmission = require('../models/CustomFormSubmission');

const OUT_DIR = path.join(__dirname, '../../exports/recovered-custom-forms');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const uploadToCloudinary = process.argv.includes('--upload');

const BASES = [
  process.env.API_PUBLIC_URL,
  process.env.REACT_APP_BASE_URL,
  'https://rapido.bj',
  'https://www.rapido.bj',
  'https://rapido.online',
  'https://www.rapido.online',
]
  .filter(Boolean)
  .map((b) => String(b).replace(/\/$/, ''));

function uniqueBases() {
  return [...new Set(BASES)];
}

function collectLegacyFiles(submission) {
  const out = [];
  const push = (fileUrl, fileName, answerMeta) => {
    const url = String(fileUrl || '').trim();
    if (!url.includes('/uploads/custom-forms/')) return;
    const filename = url.split('/uploads/custom-forms/').pop()?.split('?')[0] || '';
    if (!filename) return;
    out.push({
      submissionId: String(submission._id),
      formTitle: submission.formTitle,
      createdAt: submission.createdAt,
      fileUrl: url,
      fileName: fileName || filename,
      filename,
      ...answerMeta,
    });
  };

  for (const a of submission.answers || []) {
    if (a.fileUrl) push(a.fileUrl, a.fileName, { label: a.label, blockId: a.blockId });
    for (const f of a.fileAttachments || []) {
      push(f.fileUrl, f.fileName, { label: a.label, blockId: a.blockId });
    }
  }
  return out;
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 20000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetchUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve({ ok: false, status: res.statusCode });
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ ok: true, buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] }));
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

async function tryDownload(entry) {
  const urlsToTry = new Set([entry.fileUrl]);
  for (const base of uniqueBases()) {
    urlsToTry.add(`${base}/uploads/custom-forms/${entry.filename}`);
  }

  for (const url of urlsToTry) {
    const res = await fetchUrl(url);
    if (res.ok && res.buffer?.length) {
      return { ...entry, recoveredFrom: url, buffer: res.buffer, contentType: res.contentType };
    }
  }
  return { ...entry, recovered: false };
}

async function uploadBufferToCloudinary(buffer, entry) {
  const { cloudinary } = require('../utils/cloudinaryClient');
  const ext = path.extname(entry.filename).toLowerCase();
  const isPdf = ext === '.pdf' || entry.fileName?.toLowerCase().endsWith('.pdf');
  const resource_type = isPdf ? 'raw' : 'image';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'rapido/custom-forms',
        public_id: `cf-recovered-${entry.submissionId}-${Date.now()}`,
        resource_type,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
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
    if (a.fileAttachments?.length && a.fileUrl === oldUrl) {
      a.fileUrl = a.fileAttachments[0].fileUrl;
    }
  }
  if (changed) await sub.save();
  return changed;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI manquant dans backend/.env');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  await mongoose.connect(uri);

  const submissions = await CustomFormSubmission.find({}).lean();
  const allEntries = [];
  for (const s of submissions) {
    allEntries.push(...collectLegacyFiles(s));
  }

  const byFilename = new Map();
  for (const e of allEntries) {
    if (!byFilename.has(e.filename)) byFilename.set(e.filename, e);
  }
  const unique = [...byFilename.values()];

  console.log(`Soumissions: ${submissions.length}`);
  console.log(`Fichiers legacy (/uploads/custom-forms/): ${unique.length} uniques (${allEntries.length} références)`);

  const results = [];
  for (let i = 0; i < unique.length; i++) {
    const entry = unique[i];
    process.stdout.write(`[${i + 1}/${unique.length}] ${entry.filename} ... `);
    const r = await tryDownload(entry);
    if (r.buffer) {
      const dest = path.join(OUT_DIR, entry.filename);
      fs.writeFileSync(dest, r.buffer);
      console.log(`OK (${r.buffer.length} o) ← ${r.recoveredFrom}`);
      results.push({ ...entry, recovered: true, localPath: dest, recoveredFrom: r.recoveredFrom });
    } else {
      console.log('INTROUVABLE (404 ou erreur réseau)');
      results.push({ ...entry, recovered: false });
    }
  }

  const recovered = results.filter((r) => r.recovered);
  const missing = results.filter((r) => !r.recovered);

  fs.writeFileSync(
    MANIFEST,
    JSON.stringify(
      {
        scannedAt: new Date().toISOString(),
        total: unique.length,
        recoveredCount: recovered.length,
        missingCount: missing.length,
        recovered,
        missingFiles: missing.map(({ buffer, ...m }) => m),
      },
      null,
      2
    )
  );

  console.log('\n--- Résumé ---');
  console.log(`Récupérés: ${recovered.length}`);
  console.log(`Manquants: ${missing.length}`);
  console.log(`Dossier: ${OUT_DIR}`);
  console.log(`Manifeste: ${MANIFEST}`);

  if (uploadToCloudinary && recovered.length) {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.error('\n--upload nécessite CLOUDINARY_* dans .env');
      process.exit(1);
    }
    console.log('\nUpload Cloudinary + mise à jour MongoDB...');
    for (const r of recovered) {
      const buf = fs.readFileSync(r.localPath);
      const newUrl = await uploadBufferToCloudinary(buf, r);
      await updateSubmissionUrls(r.submissionId, r.fileUrl, newUrl);
      console.log(`  ${r.filename} → ${newUrl}`);
    }
    console.log('URLs MongoDB mises à jour pour les fichiers récupérés.');
  } else if (recovered.length && !uploadToCloudinary) {
    console.log('\nPour envoyer sur Cloudinary et corriger les liens en base:');
    console.log('  node scripts/recoverCustomFormFiles.js --upload');
  }

  await mongoose.disconnect();
  process.exit(missing.length && !recovered.length ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
