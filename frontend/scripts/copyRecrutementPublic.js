/**
 * Copie recrutement/ → frontend/public/recrutement/ (landing statique /recrutement).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const srcDir = path.join(root, 'recrutement');
const destDir = path.join(__dirname, '../public/recrutement');

const FILES = ['carrieres.html', 'merci.html', 'logo.png', '_redirects'];

function copyFile(name) {
  const from = path.join(srcDir, name);
  const to = path.join(destDir, name);
  if (!fs.existsSync(from)) {
    console.warn(`[copyRecrutementPublic] absent: ${from}`);
    return;
  }
  fs.copyFileSync(from, to);
}

if (!fs.existsSync(srcDir)) {
  console.warn('[copyRecrutementPublic] dossier recrutement/ introuvable');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
FILES.forEach(copyFile);

const staleIndex = path.join(destDir, 'index.html');
if (fs.existsSync(staleIndex)) {
  fs.unlinkSync(staleIndex);
  console.log('[copyRecrutementPublic] index.html obsolète supprimé');
}

console.log('[copyRecrutementPublic] → public/recrutement/');
