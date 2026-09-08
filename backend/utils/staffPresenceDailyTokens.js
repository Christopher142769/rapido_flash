const crypto = require('crypto');
const { dateKeyBenin } = require('./staffPresenceShifts');

function newPresenceCode() {
  return crypto.randomBytes(16).toString('hex');
}

/** Prochaine minuit Africa/Porto-Novo (ISO string). */
function nextMidnightBeninIso(from = new Date()) {
  const today = dateKeyBenin(from);
  // Construire demain à 00:00 Porto-Novo via offset approximatif + verification
  const [y, m, d] = today.split('-').map(Number);
  // Minuit Bénin = UTC+1 (pas de DST) → 23:00 UTC veille = 00:00 Bénin le jour J
  // Donc minuit du lendemain = Date.UTC(y, m-1, d+1, -1, 0, 0) wait:
  // Africa/Porto-Novo is UTC+1 year-round.
  // Local midnight on date D = UTC (D 00:00) - 1h = previous day 23:00 UTC.
  // Next midnight after "today" = start of tomorrow in Porto-Novo = Date.UTC(y,m-1,d+1) - 1h
  const tomorrowUtcMs = Date.UTC(y, m - 1, d + 1, 0, 0, 0) - 60 * 60 * 1000;
  return new Date(tomorrowUtcMs).toISOString();
}

/**
 * Régénère les tokens journaliers si la date Bénin a changé.
 * Arrivée et sortie tournent ensemble.
 */
async function ensureDailyTokens(doc) {
  if (!doc) return doc;
  const today = dateKeyBenin();
  if (
    doc.dailyTokenDateKey === today &&
    doc.arrivalDailyCode &&
    doc.exitDailyCode
  ) {
    return doc;
  }
  doc.dailyTokenDateKey = today;
  doc.arrivalDailyCode = newPresenceCode();
  doc.exitDailyCode = newPresenceCode();
  await doc.save();
  return doc;
}

function resolveKindFromDaily(doc, code) {
  if (!doc || !code) return null;
  const today = dateKeyBenin();
  if (doc.dailyTokenDateKey !== today) return null;
  if (doc.exitDailyCode && doc.exitDailyCode === code) return 'exit';
  if (doc.arrivalDailyCode && doc.arrivalDailyCode === code) return 'arrival';
  return null;
}

function resolveKindFromPermanent(doc, code) {
  if (!doc || !code) return null;
  if (doc.exitCode && doc.exitCode === code) return 'exit';
  if (doc.arrivalCode && doc.arrivalCode === code) return 'arrival';
  if (doc.code && doc.code === code) return 'arrival';
  return null;
}

module.exports = {
  newPresenceCode,
  nextMidnightBeninIso,
  ensureDailyTokens,
  resolveKindFromDaily,
  resolveKindFromPermanent,
};
