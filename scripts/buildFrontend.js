/**
 * Build du frontend React pour le serveur Node (Hostinger) : `npm run build` à la racine.
 *
 * Hostinger écrit ses variables d’environnement dans .env (racine) ; CRA ne lit que frontend/.env,
 * donc on les charge ici et on les transmet au build. L’API est servie en même origine (/api).
 */
/* eslint-disable no-console */
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });
require('dotenv').config({ path: path.join(root, 'backend', '.env') });

const env = {
  ...process.env,
  REACT_APP_API_URL: '/api',
  REACT_APP_BASE_URL: '',
  PUBLIC_URL: '/',
  CI: 'false',
  GENERATE_SOURCEMAP: 'false',
};

// Même client OAuth « Application Web » côté backend et frontend
if (!env.REACT_APP_GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_ID) {
  env.REACT_APP_GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
}
if (!env.REACT_APP_GOOGLE_CLIENT_ID_CAPACITOR && env.GOOGLE_CLIENT_ID_CAPACITOR) {
  env.REACT_APP_GOOGLE_CLIENT_ID_CAPACITOR = env.GOOGLE_CLIENT_ID_CAPACITOR;
}

console.log(
  `[buildFrontend] Google client ID : ${env.REACT_APP_GOOGLE_CLIENT_ID ? 'présent' : 'ABSENT'}`
);

const run = (cmd) => execSync(cmd, { cwd: root, env, stdio: 'inherit' });
// --include=dev : react-scripts est en devDependencies et NODE_ENV=production sur le serveur
run('npm install --include=dev --prefix frontend');
run('npm run build --prefix frontend');
