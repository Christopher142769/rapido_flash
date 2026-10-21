const crypto = require('crypto');
const LivreurAuditEvent = require('../models/LivreurAuditEvent');
const { withChainLock } = require('../utils/livreurSecurity');

const GENESIS = '0'.repeat(64);

function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v instanceof Date ? v.toISOString() : v ?? null);
}

function computeHash(e) {
  const raw = [
    e.prevHash,
    e.seq,
    e.type,
    e.livreurName || '',
    e.employeeId || '',
    e.deliveryId || '',
    e.siteId || '',
    new Date(e.at).toISOString(),
    stable(e.data || {}),
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function recordEvent({ type, employeeId, livreurName, deliveryId, siteId, data = {}, at = new Date() }) {
  return withChainLock(async () => {
    const last = await LivreurAuditEvent.findOne().sort({ seq: -1 }).select('seq hash').lean();
    const e = {
      seq: (last?.seq || 0) + 1,
      type,
      employeeId,
      livreurName: livreurName || '',
      deliveryId,
      siteId: siteId || '',
      at,
      data,
      prevHash: last?.hash || GENESIS,
    };
    e.hash = computeHash({
      ...e,
      employeeId: employeeId ? String(employeeId) : '',
      deliveryId: deliveryId ? String(deliveryId) : '',
    });
    return LivreurAuditEvent.create(e);
  });
}

async function verifyChain() {
  const events = await LivreurAuditEvent.find().sort({ seq: 1 }).lean();
  let prev = GENESIS;
  let expectedSeq = 1;
  for (const e of events) {
    const h = computeHash({
      ...e,
      employeeId: e.employeeId ? String(e.employeeId) : '',
      deliveryId: e.deliveryId ? String(e.deliveryId) : '',
    });
    if (e.seq !== expectedSeq || e.prevHash !== prev || e.hash !== h) {
      return { ok: false, checked: expectedSeq - 1, brokenAtSeq: e.seq };
    }
    prev = e.hash;
    expectedSeq += 1;
  }
  return { ok: true, checked: events.length };
}

module.exports = { recordEvent, verifyChain };
