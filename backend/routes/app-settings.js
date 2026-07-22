const express = require('express');
const AppSettings = require('../models/AppSettings');
const { auth } = require('../middleware/auth');
const { canManageMaintenance } = require('../utils/maintenanceAccess');
const {
  isAllowedDnsNoticeUrl,
  isAllowedDnsSourceDomain,
  normalizeDnsSourceDomain,
  getNormalizedDomainFromUrl,
} = require('../utils/dnsNoticeUrl');
const {
  normalizeTwoFactorByRole,
  STAFF_2FA_ROLES,
} = require('../utils/twoFactorSettings');

const router = express.Router();

function buildPublicPayload(doc) {
  const rawUrl = String(doc.dnsNoticeUrl || '').trim();
  const urlOk = rawUrl && isAllowedDnsNoticeUrl(rawUrl);
  const sourceDomain = normalizeDnsSourceDomain(doc.dnsNoticeSourceDomain) || 'rapido.bj';
  const dnsNoticeEnabled = !!(doc.dnsNoticeEnabled && urlOk && isAllowedDnsSourceDomain(sourceDomain));
  return {
    maintenanceEnabled: !!doc.maintenanceEnabled,
    maintenanceMessage: doc.maintenanceMessage || '',
    dnsNoticeEnabled,
    dnsNoticeSourceDomain: sourceDomain,
    dnsNoticeUrl: dnsNoticeEnabled ? rawUrl : '',
    dnsNoticeMessage: doc.dnsNoticeMessage || '',
  };
}

function buildAdminPayload(doc) {
  return {
    ...buildPublicPayload(doc),
    twoFactorByRole: normalizeTwoFactorByRole(doc.twoFactorByRole || {}),
  };
}

async function getOrCreateSettings() {
  let doc = await AppSettings.findOne();
  if (!doc) {
    doc = await AppSettings.create({
      maintenanceEnabled: false,
      maintenanceMessage: '',
      dnsNoticeEnabled: false,
      dnsNoticeSourceDomain: 'rapido.bj',
      dnsNoticeUrl: '',
      dnsNoticeMessage: '',
      twoFactorByRole: normalizeTwoFactorByRole({}),
    });
  }
  return doc;
}

/** Public : maintenance + avis DNS (sans auth) */
router.get('/public', async (req, res) => {
  try {
    const doc = await getOrCreateSettings();
    res.json(buildPublicPayload(doc));
  } catch (e) {
    res.status(500).json({ message: e.message || 'Erreur serveur' });
  }
});

/** Admin : maintenance + DNS + 2FA par rôle */
router.get('/', auth, async (req, res) => {
  try {
    if (!canManageMaintenance(req.user)) {
      return res.status(403).json({ message: 'Non autorisé.' });
    }
    const doc = await getOrCreateSettings();
    res.json(buildAdminPayload(doc));
  } catch (e) {
    res.status(500).json({ message: e.message || 'Erreur serveur' });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    if (!canManageMaintenance(req.user)) {
      return res.status(403).json({ message: 'Non autorisé à modifier ce paramètre.' });
    }
    const {
      maintenanceEnabled,
      maintenanceMessage,
      dnsNoticeEnabled,
      dnsNoticeSourceDomain,
      dnsNoticeUrl,
      dnsNoticeMessage,
      twoFactorByRole,
    } = req.body;
    const doc = await getOrCreateSettings();

    if (typeof maintenanceEnabled === 'boolean') doc.maintenanceEnabled = maintenanceEnabled;
    if (typeof maintenanceMessage === 'string') {
      doc.maintenanceMessage = maintenanceMessage.slice(0, 2000);
    }
    if (typeof dnsNoticeEnabled === 'boolean') doc.dnsNoticeEnabled = dnsNoticeEnabled;
    if (typeof dnsNoticeSourceDomain === 'string') {
      doc.dnsNoticeSourceDomain = normalizeDnsSourceDomain(dnsNoticeSourceDomain) || '';
    }
    if (typeof dnsNoticeMessage === 'string') {
      doc.dnsNoticeMessage = dnsNoticeMessage.slice(0, 2000);
    }
    if (typeof dnsNoticeUrl === 'string') {
      doc.dnsNoticeUrl = dnsNoticeUrl.trim().slice(0, 500);
    }
    if (twoFactorByRole && typeof twoFactorByRole === 'object') {
      const merged = normalizeTwoFactorByRole({
        ...(doc.twoFactorByRole?.toObject?.() || doc.twoFactorByRole || {}),
        ...Object.fromEntries(
          STAFF_2FA_ROLES.filter((role) => typeof twoFactorByRole[role] === 'boolean').map((role) => [
            role,
            twoFactorByRole[role],
          ])
        ),
      });
      doc.twoFactorByRole = merged;
    }

    if (doc.dnsNoticeEnabled) {
      if (!isAllowedDnsSourceDomain(doc.dnsNoticeSourceDomain)) {
        return res.status(400).json({
          message: 'Domaine source invalide. Choisissez rapido.bj ou rapido.online.',
        });
      }
      const u = String(doc.dnsNoticeUrl || '').trim();
      if (!u || !isAllowedDnsNoticeUrl(u)) {
        return res.status(400).json({
          message:
            'URL HTTPS invalide. Utilisez uniquement rapido.bj ou rapido.online (avec ou sans www).',
        });
      }
      const targetDomain = getNormalizedDomainFromUrl(u);
      const sourceDomain = normalizeDnsSourceDomain(doc.dnsNoticeSourceDomain);
      if (targetDomain && sourceDomain && targetDomain === sourceDomain) {
        return res.status(400).json({
          message: 'Le lien alternatif doit pointer vers l’autre domaine (pas le même domaine source).',
        });
      }
    }

    await doc.save();
    res.json(buildAdminPayload(doc));
  } catch (e) {
    res.status(500).json({ message: e.message || 'Erreur serveur' });
  }
});

module.exports = router;
