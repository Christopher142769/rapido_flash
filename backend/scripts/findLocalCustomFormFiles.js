/**
 * Cherche sur le Mac les fichiers candidature perdus (par nom original)
 * et les copie dans exports/recovered-custom-forms/local-found/
 * avec le nom cf-xxx attendu par MongoDB.
 *
 * Usage:
 *   node scripts/findLocalCustomFormFiles.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPORT = path.join(__dirname, '../../exports/recovered-custom-forms/candidatures-fichiers-perdus.json');
const OUT_DIR = path.join(__dirname, '../../exports/recovered-custom-forms/local-found');

function mdfind(name) {
  const safe = name.replace(/'/g, "'");
  let raw = '';
  try {
    raw = execSync(`mdfind -name '${safe}' 2>/dev/null`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return [];
  }
  return raw
    .split('\n')
    .filter((p) => p && fs.existsSync(p) && !p.includes('rapido_flash/exports/recovered-custom-forms'));
}

function main() {
  if (!fs.existsSync(REPORT)) {
    console.error('Rapport introuvable:', REPORT);
    console.error('Lancez d’abord exportMissingCandidatesReport.js');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  const byCf = new Map();
  for (const c of rows) {
    for (const f of c.brokenFiles || []) {
      const cf = (f.fileUrl || '').split('/').pop();
      if (!cf || !cf.startsWith('cf-')) continue;
      if (!byCf.has(cf)) byCf.set(cf, f.fileName);
    }
  }

  const found = [];
  const missing = [];
  for (const [cfName, originalName] of byCf) {
    const dest = path.join(OUT_DIR, cfName);
    if (fs.existsSync(dest)) {
      found.push({ cfName, originalName, src: dest, already: true });
      continue;
    }
    const hits = mdfind(path.basename(originalName));
    if (!hits.length) {
      missing.push({ cfName, originalName });
      continue;
    }
    fs.copyFileSync(hits[0], dest);
    found.push({ cfName, originalName, src: hits[0] });
  }

  console.log(`\n${found.length} trouvé(s), ${missing.length} encore introuvable(s) sur ce Mac.\n`);
  found.forEach((x) => console.log(`  [ok] ${x.cfName} ← ${x.originalName}${x.already ? ' (déjà là)' : ''}`));
  missing.forEach((x) => console.log(`  [--] ${x.originalName}`));
  console.log(`\nDossier: ${OUT_DIR}`);
  console.log('Puis fusionnez et importez:');
  console.log('  cp local-found/cf-* ../exports/recovered-custom-forms/');
  console.log('  node scripts/importCustomFormFilesFolder.js ../exports/recovered-custom-forms');
}

main();
