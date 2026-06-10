/**
 * Exporte les candidatures dont les fichiers ne sont plus accessibles
 * (nom, e-mail, réponses texte, noms de fichiers) pour recherche Gmail / LinkedIn.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const CustomFormSubmission = require('../models/CustomFormSubmission');

const OUT = path.join(__dirname, '../../exports/recovered-custom-forms');
const uri =
  process.env.MONGODB_URI_PROD ||
  'mongodb+srv://christophergdbi_db_user:uCAeX2hFaib8Vrx2@rapido-services.fwsmgkt.mongodb.net/test?retryWrites=true&w=majority';

function isBrokenUrl(url) {
  const u = String(url || '');
  if (!u) return false;
  if (u.includes('cloudinary.com')) return false;
  return u.includes('/uploads/custom-forms/');
}

async function main() {
  await mongoose.connect(uri);
  const subs = await CustomFormSubmission.find({}).sort({ createdAt: 1 }).lean();

  const affected = [];
  for (const s of subs) {
    const brokenFiles = [];
    for (const a of s.answers || []) {
      const files = a.fileAttachments?.length
        ? a.fileAttachments
        : a.fileUrl
          ? [{ fileUrl: a.fileUrl, fileName: a.fileName }]
          : [];
      for (const f of files) {
        if (isBrokenUrl(f.fileUrl)) {
          brokenFiles.push({
            label: a.label,
            fileName: f.fileName,
            fileUrl: f.fileUrl,
            fieldType: a.fieldType,
          });
        }
      }
    }
    if (!brokenFiles.length) continue;

    const textAnswers = (s.answers || [])
      .filter((a) => a.textValue && !isBrokenUrl(a.fileUrl))
      .map((a) => ({ label: a.label, value: String(a.textValue).slice(0, 500) }));

    affected.push({
      id: String(s._id),
      date: s.createdAt,
      form: s.formTitle,
      name: s.respondentName,
      email: s.respondentEmail,
      brokenFiles,
      textAnswers,
    });
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'candidatures-fichiers-perdus.json'), JSON.stringify(affected, null, 2));

  const md = [
    '# Candidatures avec fichiers perdus (37 fichiers / ~28 dossiers)',
    '',
    'Les CV/PDF ne sont plus sur le serveur. Utilise ce fichier pour :',
    '- Recherche Gmail : `from:rapido` ou noms de fichiers ci-dessous',
    '- Recherche LinkedIn / e-mail direct au candidat',
    '',
    '---',
    '',
    ...affected.map((c) => {
      const files = c.brokenFiles.map((f) => `- **${f.fileName}** (${f.label})`).join('\n');
      const texts = c.textAnswers.map((t) => `- ${t.label}: ${t.value}`).join('\n');
      return [
        `## ${c.name || 'Sans nom'} — ${new Date(c.date).toLocaleString('fr-FR')}`,
        `**Formulaire:** ${c.form}`,
        `**E-mail:** ${c.email || '—'}`,
        `**ID:** ${c.id}`,
        '',
        '### Fichiers manquants',
        files,
        texts ? '\n### Autres réponses (pistes)\n' + texts : '',
        '',
      ].join('\n');
    }),
  ].join('\n');

  fs.writeFileSync(path.join(OUT, 'CANDIDATURES-FICHIERS-PERDUS.md'), md);

  console.log(`Candidatures touchées: ${affected.length}`);
  console.log(`Fichiers cassés: ${affected.reduce((n, c) => n + c.brokenFiles.length, 0)}`);
  console.log(`JSON: ${path.join(OUT, 'candidatures-fichiers-perdus.json')}`);
  console.log(`Markdown: ${path.join(OUT, 'CANDIDATURES-FICHIERS-PERDUS.md')}`);

  const withEmail = affected.filter((c) => c.email);
  console.log(`\nAvec e-mail candidat: ${withEmail.length} (tu peux les recontacter)`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
