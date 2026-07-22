const express = require('express');
const crypto = require('crypto');

const { auth, isRestaurant } = require('../middleware/auth');
const Invitation = require('../models/Invitation');
const { buildInvitationLetterPdf, safePdfFilename } = require('../services/invitationLetterPdf');
const { sendInvitationLetterToGuest } = require('../services/invitationMailer');

const router = express.Router();

function normalizeName(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isValidEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return e.includes('@') && e.includes('.');
}

/** Parse une ligne : "Jean Dupont <email@x.com>" ou "Jean Dupont, email@x.com" */
function parseGuestLine(line) {
  const raw = String(line || '').trim();
  if (!raw) return null;

  const angle = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    return {
      fullName: angle[1].trim(),
      email: angle[2].trim().toLowerCase(),
      domain: '',
    };
  }

  const parts = raw.split(/[,;\t|]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const nameParts = [...parts];
    const emailIdx = nameParts.findIndex((p) => isValidEmail(p));
    let email = '';
    if (emailIdx >= 0) {
      email = nameParts.splice(emailIdx, 1)[0].toLowerCase();
    }
    let domain = '';
    if (email && nameParts.length >= 2) {
      domain = nameParts.pop();
    }
    const fullName = nameParts.join(' ').trim();
    if (fullName) {
      return { fullName, email, domain };
    }
  }

  return { fullName: raw, email: '', domain: '' };
}

function generateCode() {
  return crypto.randomBytes(16).toString('hex');
}

async function ensureUniqueCode(existingSet, retry = 5) {
  for (let i = 0; i < retry; i++) {
    const c = generateCode();
    if (existingSet.has(c)) continue;
    const exists = await Invitation.exists({ code: c });
    if (!exists) return c;
  }
  let c = generateCode();
  while (await Invitation.exists({ code: c })) c = generateCode();
  return c;
}

function serializeList(invitations, eventKey) {
  return {
    eventKey,
    invitations,
    future: invitations.filter((i) => !i.present),
    present: invitations.filter((i) => i.present),
  };
}

// Dashboard — récupérer la liste
router.get('/', auth, isRestaurant, async (req, res) => {
  try {
    const eventKey = String(req.query.eventKey || 'default').trim() || 'default';
    const invitations = await Invitation.find({ eventKey })
      .sort({ present: 1, createdAt: 1 })
      .lean();
    res.json(serializeList(invitations, eventKey));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dashboard — créer/compléter la liste
router.post('/batch', auth, isRestaurant, async (req, res) => {
  try {
    const body = req.body || {};
    const eventKey = String(body.eventKey || 'default').trim() || 'default';
    const defaultDomain = String(body.domain || '').trim();

    const rawLines = Array.isArray(body.names)
      ? body.names
      : Array.isArray(body.guests)
        ? body.guests
        : [];

    const guests = [];
    for (const line of rawLines.slice(0, 5000)) {
      if (line && typeof line === 'object') {
        const fullName = String(line.fullName || line.name || '').trim();
        if (!fullName) continue;
        guests.push({
          fullName,
          email: String(line.email || '').trim().toLowerCase(),
          domain: String(line.domain || defaultDomain || '').trim(),
        });
        continue;
      }
      const parsed = parseGuestLine(line);
      if (!parsed?.fullName) continue;
      if (!parsed.domain && defaultDomain) parsed.domain = defaultDomain;
      guests.push(parsed);
    }

    if (!guests.length) {
      return res.status(400).json({ message: 'Aucun invité fourni' });
    }

    const normalizedToGuest = new Map();
    for (const g of guests) {
      const normalizedName = normalizeName(g.fullName);
      if (!normalizedName) continue;
      if (!normalizedToGuest.has(normalizedName)) {
        normalizedToGuest.set(normalizedName, g);
      } else {
        const prev = normalizedToGuest.get(normalizedName);
        normalizedToGuest.set(normalizedName, {
          fullName: prev.fullName || g.fullName,
          email: prev.email || g.email,
          domain: prev.domain || g.domain,
        });
      }
    }

    const normalizedNames = [...normalizedToGuest.keys()];
    const existing = await Invitation.find({
      eventKey,
      normalizedName: { $in: normalizedNames },
    });

    const existingMap = new Map(existing.map((i) => [i.normalizedName, i]));
    const existingCodes = new Set(existing.map((i) => i.code));

    const toCreate = [];
    for (const normalizedName of normalizedNames) {
      const guest = normalizedToGuest.get(normalizedName);
      const found = existingMap.get(normalizedName);
      if (found) {
        let dirty = false;
        if (guest.email && !found.email) {
          found.email = guest.email;
          dirty = true;
        }
        if (guest.domain && !found.domain) {
          found.domain = guest.domain;
          dirty = true;
        }
        if (dirty) await found.save();
        continue;
      }

      toCreate.push({
        eventKey,
        fullName: guest.fullName,
        normalizedName,
        email: guest.email || '',
        domain: guest.domain || '',
        code: null,
      });
    }

    for (const doc of toCreate) {
      doc.code = await ensureUniqueCode(existingCodes);
      existingCodes.add(doc.code);
    }

    if (toCreate.length) {
      await Invitation.insertMany(toCreate, { ordered: false });
    }

    const invitations = await Invitation.find({ eventKey })
      .sort({ present: 1, createdAt: 1 })
      .lean();

    res.json(serializeList(invitations, eventKey));
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur lors de l’enregistrement' });
  }
});

// Dashboard — envoyer les lettres à tous les invités avec e-mail
router.post('/send-emails', auth, isRestaurant, async (req, res) => {
  try {
    const eventKey = String(req.body?.eventKey || 'default').trim() || 'default';
    const onlyUnsent = req.body?.onlyUnsent !== false;

    const filter = {
      eventKey,
      email: { $exists: true, $ne: '' },
    };
    if (onlyUnsent) filter.emailSentAt = null;

    const invitations = await Invitation.find(filter).sort({ createdAt: 1 });
    if (!invitations.length) {
      return res.status(400).json({ message: 'Aucun invité avec e-mail à envoyer' });
    }

    const results = { sent: 0, failed: 0, errors: [] };

    for (const invitation of invitations) {
      const result = await sendInvitationLetterToGuest(invitation);
      if (result.sent) {
        invitation.emailSentAt = new Date();
        await invitation.save();
        results.sent += 1;
      } else {
        results.failed += 1;
        results.errors.push({
          fullName: invitation.fullName,
          email: invitation.email,
          error: result.error || 'send_failed',
        });
      }
    }

    res.json({ ok: true, ...results, total: invitations.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dashboard — télécharger la lettre PDF d’un invité
router.get('/:code/letter.pdf', auth, isRestaurant, async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    const invitation = await Invitation.findOne({ code }).lean();
    if (!invitation) return res.status(404).json({ message: 'Invité introuvable' });

    const pdfBuffer = await buildInvitationLetterPdf(invitation);
    const filename = safePdfFilename(invitation.fullName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dashboard — envoyer la lettre à un invité
router.post('/:code/send-email', auth, isRestaurant, async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    const invitation = await Invitation.findOne({ code });
    if (!invitation) return res.status(404).json({ message: 'Invité introuvable' });

    const result = await sendInvitationLetterToGuest(invitation);
    if (!result.sent) {
      return res.status(400).json({
        message:
          result.error === 'email_missing'
            ? 'Adresse e-mail manquante pour cet invité'
            : result.error || 'Envoi impossible',
      });
    }

    invitation.emailSentAt = new Date();
    await invitation.save();

    res.json({ ok: true, sent: true, email: invitation.email, dev: !!result.dev });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public — valider un invité (page après scan QR)
router.get('/public/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Code manquant' });

    const invitation = await Invitation.findOne({ code }).lean();
    if (!invitation) return res.status(404).json({ message: 'Invité introuvable' });

    res.json({
      eventKey: invitation.eventKey,
      code: invitation.code,
      fullName: invitation.fullName,
      present: invitation.present,
      checkedAt: invitation.checkedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public — cocher la présence (idempotent)
router.post('/public/:code/check', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Code manquant' });

    const invitation = await Invitation.findOne({ code });
    if (!invitation) return res.status(404).json({ message: 'Invité introuvable' });

    if (invitation.present) {
      return res.json({
        ok: true,
        alreadyPresent: true,
        present: true,
        checkedAt: invitation.checkedAt,
      });
    }

    invitation.present = true;
    invitation.checkedAt = new Date();
    invitation.checkedIp = String(req.ip || '').trim().slice(0, 80);
    await invitation.save();

    res.json({
      ok: true,
      alreadyPresent: false,
      present: true,
      checkedAt: invitation.checkedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
