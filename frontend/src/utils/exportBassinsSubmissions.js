import { jsPDF } from 'jspdf';
import { BASSINS_FORM_SLUG } from '../data/bassinsFunnel';

/** Début de la fenêtre « bons clients » (heure Bénin / locale saisie). */
export const BASSINS_GOOD_CLIENTS_SINCE = new Date('2026-08-29T20:19:08');

const TEST_NAME_RE =
  /^(test|xxx+|asdf|qwerty|aaa+|bbb+|n\/a|na|anonyme|inconnu|foo|bar|john\s*doe|jane|client)[\s.]*$/i;
const TEST_ADDR_RE =
  /\b(test|fake|truc|bidon|exemple|dummy|asdf|qwerty|xxx+|zzz+|foo|bar|adresse\s*test|quartier\s*test)\b/i;
const PLACEHOLDER_ADDR_RE =
  /^(adresse|quartier|ville|ici|là|la|ok|bonjour|hello|n\/a|na|aucun|rien|aaa+|xxx+|123+)[\s.!]*$/i;
const CITY_HINT_RE =
  /\b(cotonou|porto[- ]?novo|calo(vi)?|parakou|abomey|godomey|akpakpa|fidjrosse|ganhi|zogbo|gbegamey|gbagamey|sèmè|seme|ouidah|bohicon|djougou|natitingou|lokossa|allada|pobè|pobe)\b/i;

function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function digitsOnly(v) {
  return String(v || '').replace(/\D/g, '');
}

function answerText(answer) {
  if (!answer) return '';
  if (Array.isArray(answer.selectedValues) && answer.selectedValues.length) {
    return answer.selectedValues.join(' · ');
  }
  return String(answer.textValue || '').trim();
}

function findAnswer(answers, matcher) {
  const list = Array.isArray(answers) ? answers : [];
  return list.find((a) => matcher(String(a.label || '').toLowerCase()));
}

export function extractBassinsFields(submission) {
  const answers = submission?.answers || [];
  const phoneA = findAnswer(
    answers,
    (l) => l.includes('whatsapp') || l.includes('téléphone') || l.includes('telephone')
  );
  const qtyA = findAnswer(answers, (l) => l.includes('combien') && l.includes('bassin'));
  const addrA = findAnswer(
    answers,
    (l) => l.includes('adresse') || l.includes('livraison') || l.includes('installation')
  );
  const activityA = findAnswer(
    answers,
    (l) => l.includes('activité') || l.includes('activite') || l.includes('économique')
  );
  const spaceA = findAnswer(
    answers,
    (l) => l.includes('espace') || l.includes('cour') || l.includes('parcelle') || l.includes('terrain')
  );
  const budgetA = findAnswer(answers, (l) => l.includes('budget'));
  const delayA = findAnswer(
    answers,
    (l) => l.includes('délai') || l.includes('delai') || l.includes('démarrer') || l.includes('demarrer')
  );

  return {
    name: String(submission?.respondentName || '').trim(),
    email: String(submission?.respondentEmail || '').trim(),
    phone: answerText(phoneA),
    quantity: answerText(qtyA),
    address: answerText(addrA),
    activity: answerText(activityA),
    space: answerText(spaceA),
    budget: answerText(budgetA),
    delay: answerText(delayA),
    createdAt: submission?.createdAt,
    formTitle: submission?.formTitle || '',
    formSlug: submission?.formSlug || '',
    _id: submission?._id,
  };
}

function scoreName(name) {
  const t = String(name || '').trim();
  if (!t) return { pts: 0, flags: ['Nom manquant'] };
  if (TEST_NAME_RE.test(t) || t.length < 2) return { pts: 0, flags: ['Nom suspect / test'] };
  if (t.split(/\s+/).length >= 2) return { pts: 2, flags: [] };
  return { pts: 1, flags: [] };
}

function scorePhone(phone) {
  const d = digitsOnly(phone);
  if (!d) return { pts: 0, flags: ['Téléphone manquant'] };
  if (d.length < 8) return { pts: 0, flags: ['Téléphone trop court'] };
  if (/^(\d)\1{7,}$/.test(d) || /^0{8,}$/.test(d) || /^123456/.test(d)) {
    return { pts: 0, flags: ['Téléphone test'] };
  }
  return { pts: 2, flags: [] };
}

function scoreAddress(address) {
  const t = String(address || '').trim();
  if (!t) return { pts: 0, flags: ['Adresse vide'] };
  if (t.length < 12) return { pts: 0, flags: ['Adresse trop courte'] };
  if (PLACEHOLDER_ADDR_RE.test(t) || TEST_ADDR_RE.test(t)) {
    return { pts: 0, flags: ['Adresse test / placeholder'] };
  }
  let pts = 2;
  const flags = [];
  if (t.length >= 25) pts += 1;
  if (t.length >= 45) pts += 1;
  if (/,|;|\d/.test(t) || /\b(près|derrière|face|carrefour|maison|rue|avenue)\b/i.test(t)) {
    pts += 1;
  }
  if (CITY_HINT_RE.test(t)) pts += 2;
  else if (t.length < 20) flags.push('Adresse peu précise');
  return { pts: Math.min(pts, 6), flags };
}

function scoreQuantity(qty) {
  const n = Number(String(qty || '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return { pts: 0, flags: ['Quantité manquante'] };
  if (n > 50) return { pts: 0, flags: ['Quantité irréaliste'] };
  if (n >= 1 && n <= 10) return { pts: 2, flags: [] };
  return { pts: 1, flags: [] };
}

function scoreChoice(value, label) {
  const t = String(value || '').trim();
  if (!t) return { pts: 0, flags: [`${label} manquant`] };
  return { pts: 1, flags: [] };
}

function scoreBudget(budget) {
  const t = String(budget || '').toLowerCase();
  if (!t) return { pts: 0, flags: ['Budget manquant'] };
  if (t.includes('inférieur') || t.includes('inferieur')) {
    return { pts: 0, flags: ['Budget insuffisant déclaré'] };
  }
  if (t.includes('me convient') || t.includes('apport')) return { pts: 2, flags: [] };
  if (t.includes('échéancier') || t.includes('echeancier') || t.includes('financement')) {
    return { pts: 1, flags: [] };
  }
  return { pts: 1, flags: [] };
}

function scoreDelay(delay) {
  const t = String(delay || '').toLowerCase();
  if (!t) return { pts: 0, flags: ['Délai manquant'] };
  if (t.includes('renseigne')) return { pts: 0, flags: ['Simple renseignement'] };
  if (t.includes('immédiat') || t.includes('immediat') || t.includes('15 jours')) {
    return { pts: 2, flags: [] };
  }
  if (t.includes('mois-ci') || t.includes('ce mois')) return { pts: 2, flags: [] };
  if (t.includes('1 à 3') || t.includes('1 a 3')) return { pts: 1, flags: [] };
  return { pts: 1, flags: [] };
}

/**
 * Score 0–18. « Sérieux » si score >= 10 et aucune flag bloquante (adresse/téléphone test).
 */
export function scoreBassinsSubmission(submission) {
  const f = extractBassinsFields(submission);
  const parts = [
    scoreName(f.name),
    scorePhone(f.phone),
    scoreAddress(f.address),
    scoreQuantity(f.quantity),
    scoreChoice(f.activity, 'Activité'),
    scoreChoice(f.space, 'Espace'),
    scoreBudget(f.budget),
    scoreDelay(f.delay),
  ];
  const score = parts.reduce((s, p) => s + p.pts, 0);
  const flags = parts.flatMap((p) => p.flags);
  const blocking = flags.some(
    (x) =>
      /test|placeholder|vide|manquant|trop court|irr|insuffisant|renseignement/i.test(x)
  );
  const isSerious = score >= 10 && !blocking && f.address.length >= 15 && digitsOnly(f.phone).length >= 8;
  return {
    ...f,
    score,
    maxScore: 18,
    flags,
    isSerious,
    qualityLabel: isSerious ? 'Sérieux' : score >= 7 ? 'Moyen' : 'Faible / test',
  };
}

export function isBassinsSubmission(s) {
  const slug = String(s?.formSlug || '').toLowerCase();
  const title = String(s?.formTitle || '').toLowerCase();
  return slug === BASSINS_FORM_SLUG || slug.includes('bassin') || title.includes('bassin');
}

export function filterBassinsPeriod(submissions, since = BASSINS_GOOD_CLIENTS_SINCE, until = new Date()) {
  const from = since.getTime();
  const to = until.getTime();
  return (submissions || []).filter((s) => {
    if (!isBassinsSubmission(s)) return false;
    const t = new Date(s.createdAt).getTime();
    return Number.isFinite(t) && t >= from && t <= to;
  });
}

export function prepareBassinsExport(
  submissions,
  { seriousOnly = true, since = BASSINS_GOOD_CLIENTS_SINCE, assumeBassins = false } = {}
) {
  const from = since.getTime();
  const to = Date.now();
  const inPeriod = (submissions || []).filter((s) => {
    if (!assumeBassins && !isBassinsSubmission(s)) return false;
    const t = new Date(s.createdAt).getTime();
    return Number.isFinite(t) && t >= from && t <= to;
  });
  const scored = inPeriod
    .map(scoreBassinsSubmission)
    .sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt));
  const rows = seriousOnly ? scored.filter((r) => r.isSerious) : scored;
  return {
    rows,
    allScored: scored,
    seriousCount: scored.filter((r) => r.isSerious).length,
    totalInPeriod: scored.length,
    seriousOnly,
    since,
    until: new Date(),
    title: seriousOnly
      ? 'Bassins Rapido — Bons clients (réponses sérieuses)'
      : 'Bassins Rapido — Toutes les réponses (période)',
    subtitle: `Du ${since.toLocaleString('fr-FR')} au ${new Date().toLocaleString('fr-FR')} · ${
      seriousOnly
        ? `${rows.length} sérieux / ${scored.length} réponses`
        : `${rows.length} réponses analysées`
    }`,
  };
}

function formatDt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

export function exportBassinsToExcel(exportData) {
  const headers = [
    'N°',
    'Qualité',
    'Score',
    'Date',
    'Nom',
    'Téléphone',
    'E-mail',
    'Nb bassins',
    'Adresse',
    'Activité',
    'Espace',
    'Budget',
    'Délai',
    'Alertes',
  ];
  const body = (exportData.rows || [])
    .map(
      (r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.qualityLabel)}</td>
        <td>${r.score}/${r.maxScore}</td>
        <td>${escapeHtml(formatDt(r.createdAt))}</td>
        <td>${escapeHtml(r.name || '—')}</td>
        <td>${escapeHtml(r.phone || '—')}</td>
        <td>${escapeHtml(r.email || '—')}</td>
        <td>${escapeHtml(r.quantity || '—')}</td>
        <td>${escapeHtml(r.address || '—')}</td>
        <td>${escapeHtml(r.activity || '—')}</td>
        <td>${escapeHtml(r.space || '—')}</td>
        <td>${escapeHtml(r.budget || '—')}</td>
        <td>${escapeHtml(r.delay || '—')}</td>
        <td>${escapeHtml((r.flags || []).join(' · ') || '—')}</td>
      </tr>`
    )
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>
    <h2>${escapeHtml(exportData.title)}</h2>
    <p>${escapeHtml(exportData.subtitle || '')}</p>
    <table border="1" cellspacing="0" cellpadding="4">
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${body || '<tr><td colspan="14">Aucune réponse</td></tr>'}</tbody>
    </table>
  </body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = exportData.seriousOnly ? 'bassins-bons-clients' : 'bassins-reponses';
  triggerBrowserDownload(blob, `${slug}-${stamp}.xls`);
}

export function exportBassinsToPdf(exportData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (need = 28) => {
    if (y + need > pageH - 14) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFillColor(56, 24, 8);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('King Fish / Rapido — Bassins', margin, 14);
  y = 30;

  doc.setTextColor(56, 24, 8);
  doc.setFontSize(12);
  doc.text(exportData.title || 'Export bassins', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(86, 76, 64);
  const subLines = doc.splitTextToSize(exportData.subtitle || '', maxW);
  doc.text(subLines, margin, y);
  y += subLines.length * 4.5 + 6;

  const rows = exportData.rows || [];
  if (!rows.length) {
    doc.setTextColor(180, 83, 9);
    doc.text('Aucune réponse sérieuse sur cette période.', margin, y);
  }

  rows.forEach((r, idx) => {
    const lines = [
      `Tél. : ${r.phone || '—'}`,
      `E-mail : ${r.email || '—'}`,
      `Bassins : ${r.quantity || '—'}`,
      `Adresse : ${r.address || '—'}`,
      `Activité : ${r.activity || '—'}`,
      `Espace : ${r.space || '—'}`,
      `Budget : ${r.budget || '—'}`,
      `Délai : ${r.delay || '—'}`,
    ];
    const wrappedBlocks = lines.map((line) => doc.splitTextToSize(line, maxW - 6));
    const contentH = wrappedBlocks.reduce((h, w) => h + w.length * 3.4, 0);
    const boxH = Math.max(28, 14 + contentH + 4);
    ensureSpace(boxH + 4);

    doc.setFillColor(idx % 2 === 0 ? 250 : 245, 247, 242);
    doc.roundedRect(margin, y - 4, maxW, boxH, 2, 2, 'F');

    doc.setTextColor(56, 24, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${idx + 1}. ${r.name || 'Sans nom'}`, margin + 3, y + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(92, 46, 11);
    doc.text(`${r.qualityLabel} · ${r.score}/${r.maxScore} · ${formatDt(r.createdAt)}`, margin + 3, y + 7);

    doc.setTextColor(28, 23, 18);
    let ly = y + 12;
    wrappedBlocks.forEach((wrapped) => {
      doc.text(wrapped, margin + 3, ly);
      ly += wrapped.length * 3.4;
    });
    y = y - 4 + boxH + 6;
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const slug = exportData.seriousOnly ? 'bassins-bons-clients' : 'bassins-reponses';
  doc.save(`${slug}-${stamp}.pdf`);
}
