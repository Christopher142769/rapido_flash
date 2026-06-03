/**
 * Met à jour les URLs MongoDB pour les fichiers présents dans exports/recovered-custom-forms/
 * (utilise rapido-flash-back.onrender.com tant que ces fichiers y sont encore servis).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const CustomFormSubmission = require('../models/CustomFormSubmission');

const RECOVER_DIR = path.join(__dirname, '../../exports/recovered-custom-forms');
const WORKING_BASE =
  process.env.CUSTOM_FORMS_LEGACY_BASE ||
  'https://rapido-flash-back.onrender.com/uploads/custom-forms';

const mongoUri =
  process.env.MONGODB_URI_PROD ||
  process.argv[2] ||
  process.env.MONGODB_URI;

async function main() {
  if (!mongoUri) {
    console.error('MONGODB_URI ou URI en argument requis');
    process.exit(1);
  }

  const files = fs
    .readdirSync(RECOVER_DIR)
    .filter((f) => f.startsWith('cf-') && !f.endsWith('.json'));
  const urlByFilename = new Map(
    files.map((fn) => [fn, `${WORKING_BASE.replace(/\/$/, '')}/${fn}`])
  );

  await mongoose.connect(mongoUri);
  const submissions = await CustomFormSubmission.find({});
  let updates = 0;

  for (const sub of submissions) {
    let changed = false;
    for (const a of sub.answers) {
      const patch = (oldUrl) => {
        const fn = String(oldUrl || '')
          .split('/uploads/custom-forms/')
          .pop()
          ?.split('?')[0];
        if (!fn || !urlByFilename.has(fn)) return false;
        return urlByFilename.get(fn);
      };

      if (a.fileUrl) {
        const nu = patch(a.fileUrl);
        if (nu && nu !== a.fileUrl) {
          a.fileUrl = nu;
          changed = true;
        }
      }
      for (const f of a.fileAttachments || []) {
        const nu = patch(f.fileUrl);
        if (nu && nu !== f.fileUrl) {
          f.fileUrl = nu;
          changed = true;
        }
      }
      if (a.fileAttachments?.length) {
        a.fileUrl = a.fileAttachments[0].fileUrl;
      }
    }
    if (changed) {
      await sub.save();
      updates++;
    }
  }

  console.log(`Fichiers locaux: ${files.length}`);
  console.log(`Soumissions mises à jour: ${updates}`);
  console.log(`Base URL: ${WORKING_BASE}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
