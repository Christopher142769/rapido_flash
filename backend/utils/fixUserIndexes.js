/**
 * Supprime l'index obsolète username_1 si présent.
 * Sans champ `username` dans le schéma Mongoose actuel, plusieurs utilisateurs
 * avaient implicitement username=null → violation de l'unique (E11000).
 */
const mongoose = require('mongoose');

async function fixStaleUserIndexes() {
  try {
    const coll = mongoose.connection.collection('users');
    const indexes = await coll.indexes();
    const stale = indexes.find((ix) => ix.name === 'username_1');
    if (stale) {
      await coll.dropIndex('username_1');
      console.log('✅ Index obsolète "username_1" supprimé sur la collection users.');
    }
  } catch (err) {
    // Index déjà absent ou autre erreur non bloquante
    if (err.code === 27 || err.codeName === 'IndexNotFound') return;
    console.warn('⚠️ fixUserIndexes:', err.message);
  }
}

module.exports = fixStaleUserIndexes;
