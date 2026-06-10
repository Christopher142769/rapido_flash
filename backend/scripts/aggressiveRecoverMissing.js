/**
 * Dernière tentative : teste toutes les URLs possibles pour les fichiers manquants.
 * Génère aussi un CSV pour recherche dans Gmail / boîtes mail.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const MANIFEST = path.join(__dirname, '../../exports/recovered-custom-forms/manifest.json');
const OUT_DIR = path.join(__dirname, '../../exports/recovered-custom-forms');
const REPORT = path.join(OUT_DIR, 'aggressive-recovery-report.json');
const CSV = path.join(OUT_DIR, 'candidats-fichiers-manquants.csv');

const HOSTS = [
  'http://rapido-flash-back.onrender.com',
  'https://rapido-flash-back.onrender.com',
  'http://rapido-flash-backend.onrender.com',
  'https://rapido-flash-backend.onrender.com',
  'https://rapido.bj',
  'https://www.rapido.bj',
  'https://rapido.online',
  'https://www.rapido.online',
];

function fetchUrl(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 25000, headers: { 'User-Agent': 'RapidoRecovery/1.0' } }, (res) => {
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
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < 200) return resolve({ ok: false, status: 'too-small' });
        resolve({ ok: true, buffer, contentType: res.headers['content-type'] });
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const missing = manifest.missingFiles || [];
  const newlyRecovered = [];
  const stillMissing = [];

  console.log(`Test de ${missing.length} fichiers sur ${HOSTS.length} hôtes...\n`);

  for (let i = 0; i < missing.length; i++) {
    const entry = missing[i];
    let found = null;
    for (const host of HOSTS) {
      const url = `${host}/uploads/custom-forms/${entry.filename}`;
      const res = await fetchUrl(url);
      if (res.ok) {
        found = { url, ...res };
        break;
      }
    }
    if (found) {
      const dest = path.join(OUT_DIR, entry.filename);
      fs.writeFileSync(dest, found.buffer);
      console.log(`[OK] ${entry.filename} ← ${found.url}`);
      newlyRecovered.push({ ...entry, recoveredFrom: found.url });
    } else {
      console.log(`[--] ${entry.filename}`);
      stillMissing.push(entry);
    }
  }

  fs.writeFileSync(
    REPORT,
    JSON.stringify(
      {
        scannedAt: new Date().toISOString(),
        newlyRecovered: newlyRecovered.length,
        stillMissing: stillMissing.length,
        recovered: newlyRecovered,
        missing: stillMissing,
      },
      null,
      2
    )
  );

  const bySubmission = new Map();
  for (const m of stillMissing) {
    const key = m.submissionId;
    if (!bySubmission.has(key)) {
      bySubmission.set(key, {
        submissionId: key,
        formTitle: m.formTitle,
        createdAt: m.createdAt,
        files: [],
      });
    }
    bySubmission.get(key).files.push({ fileName: m.fileName, filename: m.filename, label: m.label });
  }

  const rows = [
    'date_iso,form_title,fichiers,submission_id',
    ...[...bySubmission.values()].map((s) => {
      const files = s.files.map((f) => `${f.fileName} (${f.filename})`).join(' | ');
      return `"${s.createdAt}","${String(s.formTitle).replace(/"/g, '""')}","${files.replace(/"/g, '""')}","${s.submissionId}"`;
    }),
  ];
  fs.writeFileSync(CSV, rows.join('\n'), 'utf8');

  console.log('\n--- Résumé ---');
  console.log(`Nouveaux récupérés: ${newlyRecovered.length}`);
  console.log(`Toujours manquants: ${stillMissing.length}`);
  console.log(`Rapport: ${REPORT}`);
  console.log(`CSV (pour Gmail / recherche): ${CSV}`);
  if (newlyRecovered.length) {
    console.log('\nLance ensuite:');
    console.log('  node scripts/importCustomFormFilesFolder.js ../exports/recovered-custom-forms');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
