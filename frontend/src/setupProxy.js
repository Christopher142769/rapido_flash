/**
 * En dev : sert la landing recrutement statique sur /recrutement (sans shell React).
 */
const path = require('path');

const recrutementDir = path.join(__dirname, '../public/recrutement');

module.exports = function setupRecrutementProxy(app) {
  app.get(['/recrutement', '/recrutement/'], (_req, res) => {
    res.sendFile(path.join(recrutementDir, 'carrieres.html'));
  });
  app.get(['/recrutement/merci', '/recrutement/merci/'], (_req, res) => {
    res.sendFile(path.join(recrutementDir, 'merci.html'));
  });
};
