/**
 * Récupère TOUS les fichiers listés dans exports/recovered-custom-forms/manifest.json
 * (HTTP multi-hôtes + recherche Mac par nom original cf-xxx).
 *
 * Usage: node scripts/recoverAllFromManifest.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const OUT_DIR = path.join(__dirname, '../../exports/recovered-custom-forms');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

const HOSTS = [
  'https://rapido-flash-back.onrender.com',
  'http://rapido-flash-back.onrender.com',
  'https://rapido.bj',
  'https://www.rapido.bj',
  'https://rapido.online',
  'https://www.rapido.online',
];

function fetchUrl(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 25000 }, (res) => {
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
      res.on('end', () => resolve({ ok: true, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

function findOnMac(originalName, cfFilename) {
  const hits = new Set();
  const tryName = (name) => {
    if (!name) return;
    try {
      const raw = execSync(`mdfind -name '${String(name).replace(/'/g, "'")}' 2>/dev/null`, {
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
      });
      raw.split('\n').forEach((p) => {
        if (p && fs.existsSync(p) && !p.includes('rapido_flash/exports/recovered-custom-forms/cf-')) hits.add(p);
      });
    } catch {
      /* ignore */
    }
  };
  tryName(cfFilename);
  tryName(path.basename(originalName));
  tryName(decodeURIComponent(originalName));
  return [...hits];
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const all = [...(manifest.recovered || []), ...(manifest.missing || [])];
  const byFile = new Map();
  for (const e of all) {
    if (!e.filename) continue;
    if (!byFile.has(e.filename)) byFile.set(e.filename, { ...e });
  }

  let httpOk = 0;
  let macOk = 0;
  const stillMissing = [];

  for (const [filename, entry] of byFile) {
    const dest = path.join(OUT_DIR, filename);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
      entry.recovered = true;
      entry.localPath = dest;
      continue;
    }

    let saved = false;
    for (const host of HOSTS) {
      const url = `${host}/uploads/custom-forms/${filename}`;
      const res = await fetchUrl(url);
      if (res.ok && res.buffer?.length > 100) {
        fs.writeFileSync(dest, res.buffer);
        entry.recovered = true;
        entry.localPath = dest;
        entry.recoveredFrom = url;
        httpOk++;
        saved = true;
        console.log(`[HTTP] ${filename}`);
        break;
      }
    }

    if (!saved) {
      const hits = findOnMac(entry.fileName, filename);
      if (hits.length) {
        fs.copyFileSync(hits[0], dest);
        entry.recovered = true;
        entry.localPath = dest;
        entry.recoveredFrom = `local:${hits[0]}`;
        macOk++;
        saved = true;
        console.log(`[MAC] ${filename} ← ${hits[0]}`);
      }
    }

    if (!saved) stillMissing.push(entry);
  }

  const recovered = [...byFile.values()].filter((e) => e.recovered);
  const missing = stillMissing;

  const updated = {
    scannedAt: new Date().toISOString(),
    total: byFile.size,
    recoveredCount: recovered.length,
    missingCount: missing.length,
    recovered,
    missing,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(updated, null, 2));

  const liste = path.join(OUT_DIR, 'FICHIERS-MANQUANTS.txt');
  fs.writeFileSync(
    liste,
    [
      `Total unique: ${byFile.size}`,
      `Récupérés: ${recovered.length}`,
      `Manquants: ${missing.length}`,
      '',
      '--- Manquants (cf-xxx) ---',
      ...missing.map((m) => `${m.filename}\t${m.fileName}`),
    ].join('\n')
  );

  console.log(`\n=== Bilan ===`);
  console.log(`Total fichiers uniques: ${byFile.size}`);
  console.log(`Déjà présents + HTTP: ${httpOk} nouveaux HTTP`);
  console.log(`Mac: ${macOk} nouveaux locaux`);
  console.log(`Récupérés au total: ${recovered.length}`);
  console.log(`Encore manquants: ${missing.length}`);
  console.log(`Dossier: ${OUT_DIR}`);
  console.log(`Liste: ${liste}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
