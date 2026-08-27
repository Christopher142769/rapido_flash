import { jsPDF } from 'jspdf';

const BRAND = {
  brown: [56, 24, 8],
  brownMid: [92, 46, 11],
  gold: [184, 147, 90],
  cream: [250, 247, 242],
  creamDark: [239, 230, 220],
  text: [28, 23, 18],
  muted: [86, 76, 64],
  white: [255, 255, 255],
  line: [212, 196, 176],
  success: [47, 125, 74],
};

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

function formatCheckedAt(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleString('fr-FR', {
    timeZone: 'Africa/Porto-Novo',
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

function formatTimeOnly(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleTimeString('fr-FR', {
    timeZone: 'Africa/Porto-Novo',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateKey(key) {
  if (!key) return '—';
  try {
    const [y, m, d] = String(key).split('-').map(Number);
    if (!y || !m || !d) return key;
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return key;
  }
}

function formatDuration(arrivalAt, exitAt) {
  if (!arrivalAt || !exitAt) return '—';
  const a = new Date(arrivalAt).getTime();
  const b = new Date(exitAt).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return '—';
  const mins = Math.round((b - a) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

function stripNameNoise(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(firstName, lastName) {
  return stripNameNoise(`${firstName || ''} ${lastName || ''}`)
    .split(' ')
    .filter(Boolean);
}

/** Clé stable : ordre prénom/nom indifférent (Jean Dupont = Dupont Jean). */
function identityKeyFromTokens(tokens) {
  return [...tokens].sort().join(' ');
}

function levenshtein(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const prev = Array.from({ length: t.length + 1 }, (_, j) => j);
  for (let i = 1; i <= s.length; i += 1) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= t.length; j += 1) {
      const temp = prev[j];
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, prevDiag + cost);
      prevDiag = temp;
    }
  }
  return prev[t.length];
}

function tokenDistanceAllowed(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 3) return a === b ? 0 : 1;
  if (maxLen <= 5) return 1;
  return 2;
}

function tokensPairMatch(tokensA, tokensB) {
  if (tokensA.length !== tokensB.length || tokensA.length < 2) return false;
  const used = new Set();
  for (const ta of tokensA) {
    let bestJ = -1;
    let bestD = Infinity;
    for (let j = 0; j < tokensB.length; j += 1) {
      if (used.has(j)) continue;
      const d = levenshtein(ta, tokensB[j]);
      if (d < bestD) {
        bestD = d;
        bestJ = j;
      }
    }
    if (bestJ < 0 || bestD > tokenDistanceAllowed(ta, tokensB[bestJ])) return false;
    used.add(bestJ);
  }
  return true;
}

/** Même personne malgré fautes / variantes (prenom / prenoms, koffi / kofi…). */
function tokensLikelySamePerson(tokensA, tokensB) {
  if (!tokensA?.length || !tokensB?.length) return false;
  const keyA = identityKeyFromTokens(tokensA);
  const keyB = identityKeyFromTokens(tokensB);
  if (keyA === keyB) return true;
  if (tokensPairMatch(tokensA, tokensB)) return true;

  const maxLen = Math.max(keyA.length, keyB.length);
  if (maxLen >= 8) {
    const allowed = maxLen <= 12 ? 2 : 3;
    if (levenshtein(keyA, keyB) <= allowed) return true;
  }
  return false;
}

function titleCaseName(part) {
  return String(part || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function pickDisplayName(nameVotes) {
  let best = null;
  let bestScore = -1;
  nameVotes.forEach((score, label) => {
    if (score > bestScore || (score === bestScore && label.length > (best?.length || 0))) {
      best = label;
      bestScore = score;
    }
  });
  return best || '';
}

function applyCheckToDay(day, kind, at) {
  if (kind === 'exit') {
    if (!day.exitAt || at > new Date(day.exitAt)) day.exitAt = at.toISOString();
  } else if (!day.arrivalAt || at < new Date(day.arrivalAt)) {
    day.arrivalAt = at.toISOString();
  }
}

function mergePersonInto(target, source) {
  source.nameVotes.forEach((n, label) => {
    target.nameVotes.set(label, (target.nameVotes.get(label) || 0) + n);
  });
  if (source.tokens.join(' ').length > target.tokens.join(' ').length) {
    target.tokens = [...source.tokens];
  }
  source.days.forEach((day, dateKey) => {
    if (!target.days.has(dateKey)) {
      target.days.set(dateKey, { ...day });
      return;
    }
    const t = target.days.get(dateKey);
    if (day.arrivalAt) {
      const at = new Date(day.arrivalAt);
      if (!t.arrivalAt || at < new Date(t.arrivalAt)) t.arrivalAt = day.arrivalAt;
    }
    if (day.exitAt) {
      const at = new Date(day.exitAt);
      if (!t.exitAt || at > new Date(t.exitAt)) t.exitAt = day.exitAt;
    }
  });
}

/**
 * Agrège arrivées + sorties par personne et par jour (période sélectionnée).
 * Fusionne les mêmes personnes malgré inversion prénom/nom ou orthographes proches.
 */
export function preparePresenceDetailedExport(records, meta = {}) {
  const buckets = [];

  (records || []).forEach((r) => {
    if (!r) return;
    const firstName = String(r.firstName || '').trim();
    const lastName = String(r.lastName || '').trim();
    if (!firstName && !lastName) return;
    const tokens = nameTokens(firstName, lastName);
    if (!tokens.length) return;

    const fullName = `${firstName} ${lastName}`.trim();
    let person = buckets.find((p) => tokensLikelySamePerson(p.tokens, tokens));
    if (!person) {
      person = {
        tokens: [...tokens],
        nameVotes: new Map(),
        days: new Map(),
      };
      buckets.push(person);
    }

    person.nameVotes.set(fullName, (person.nameVotes.get(fullName) || 0) + 1);
    if (tokens.join(' ').length > person.tokens.join(' ').length) {
      person.tokens = [...tokens];
    }

    const dateKey = String(r.dateKey || '').trim();
    if (!dateKey) return;
    if (!person.days.has(dateKey)) {
      person.days.set(dateKey, {
        dateKey,
        dateLabel: formatDateKey(dateKey),
        arrivalAt: null,
        exitAt: null,
      });
    }
    const day = person.days.get(dateKey);
    const kind = String(r.kind || 'arrival').toLowerCase();
    const at = r.checkedAt ? new Date(r.checkedAt) : null;
    if (!at || Number.isNaN(at.getTime())) return;
    applyCheckToDay(day, kind, at);
  });

  for (let i = 0; i < buckets.length; i += 1) {
    for (let j = i + 1; j < buckets.length; j += 1) {
      if (!buckets[i] || !buckets[j]) continue;
      if (!tokensLikelySamePerson(buckets[i].tokens, buckets[j].tokens)) continue;
      mergePersonInto(buckets[i], buckets[j]);
      buckets[j] = null;
    }
  }

  const people = buckets
    .filter(Boolean)
    .map((p) => {
      const display = pickDisplayName(p.nameVotes) || identityKeyFromTokens(p.tokens);
      const parts = display.split(/\s+/).filter(Boolean);
      const firstName = titleCaseName(parts[0] || '');
      const lastName = titleCaseName(parts.slice(1).join(' ') || '');
      const fullName = `${firstName} ${lastName}`.trim() || titleCaseName(display);
      const days = Array.from(p.days.values())
        .sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)))
        .map((d) => ({
          ...d,
          arrivalLabel: formatTimeOnly(d.arrivalAt),
          exitLabel: formatTimeOnly(d.exitAt),
          durationLabel: formatDuration(d.arrivalAt, d.exitAt),
          checkedArrival: formatCheckedAt(d.arrivalAt),
          checkedExit: formatCheckedAt(d.exitAt),
        }));
      return {
        key: identityKeyFromTokens(p.tokens),
        firstName,
        lastName,
        fullName,
        days,
        daysPresent: days.filter((d) => d.arrivalAt || d.exitAt).length,
        daysComplete: days.filter((d) => d.arrivalAt && d.exitAt).length,
      };
    })
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, 'fr', { sensitivity: 'base' }) ||
        a.firstName.localeCompare(b.firstName, 'fr', { sensitivity: 'base' })
    );

  const totalDayRows = people.reduce((n, p) => n + p.days.length, 0);

  const rows = [];
  let n = 0;
  people.forEach((p) => {
    p.days.forEach((d) => {
      n += 1;
      rows.push({
        n,
        date: d.dateLabel,
        dateKey: d.dateKey,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: p.fullName,
        arrival: d.arrivalLabel,
        exit: d.exitLabel,
        duration: d.durationLabel,
        checkedAt: d.arrivalLabel !== '—' ? d.checkedArrival : d.checkedExit,
      });
    });
  });

  return {
    people,
    rows,
    count: people.length,
    dayCount: totalDayRows,
    title: meta.title || 'Présence personnel — Détail par agent',
    subtitle: meta.subtitle || '',
    fileSlug: meta.fileSlug || 'presence-detaillee',
    companyName: meta.companyName || 'Rapido',
    exportedAt: new Date(),
  };
}

/** @deprecated Prefer preparePresenceDetailedExport — conservé pour appels simples. */
export function preparePresenceExport(records, meta = {}) {
  return preparePresenceDetailedExport(records, meta);
}

export function exportPresenceToExcel(exportData) {
  const headers = ['N°', 'Personnel', 'Date', 'Heure d’arrivée', 'Heure de sortie', 'Durée'];
  const body = (exportData.rows || [])
    .map(
      (r) =>
        `<tr>
          <td>${r.n}</td>
          <td>${escapeHtml(r.fullName || `${r.firstName} ${r.lastName}`.trim())}</td>
          <td>${escapeHtml(r.date)}</td>
          <td>${escapeHtml(r.arrival || '—')}</td>
          <td>${escapeHtml(r.exit || '—')}</td>
          <td>${escapeHtml(r.duration || '—')}</td>
        </tr>`
    )
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>
    <h2>${escapeHtml(exportData.title)}</h2>
    <p>${escapeHtml(
      exportData.subtitle ||
        `${exportData.count} personnel · ${exportData.dayCount || exportData.rows?.length || 0} jour(s)`
    )}</p>
    <table border="1" cellspacing="0" cellpadding="4">
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = String(exportData.fileSlug || 'presence-detaillee');
  triggerBrowserDownload(blob, `${slug}-${stamp}.xls`);
}

export function exportPresenceToWord(exportData) {
  const people = exportData.people || [];
  const sections = people
    .map((p) => {
      const rows = p.days
        .map(
          (d) =>
            `<tr>
              <td>${escapeHtml(d.dateLabel)}</td>
              <td>${escapeHtml(d.arrivalLabel)}</td>
              <td>${escapeHtml(d.exitLabel)}</td>
              <td>${escapeHtml(d.durationLabel)}</td>
            </tr>`
        )
        .join('');
      return `
        <h2 style="color:#381808;margin:28px 0 8px;border-bottom:2px solid #381808;padding-bottom:6px;">
          ${escapeHtml(p.fullName)}
        </h2>
        <p style="color:#564c40;margin:0 0 10px;font-size:13px;">
          ${p.daysPresent} jour(s) · ${p.daysComplete} journée(s) complète(s)
        </p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Arrivée</th>
              <th>Sortie</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <title>${escapeHtml(exportData.title)}</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #1c1712; }
      h1 { color: #381808; font-size: 22px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
      th, td { border: 1px solid #d4c4b0; padding: 8px 12px; text-align: left; font-size: 13px; }
      th { background: #efe6dc; color: #381808; }
      td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: center; }
    </style></head><body>
    <h1>${escapeHtml(exportData.title)}</h1>
    <p>${escapeHtml(
      exportData.subtitle ||
        `${exportData.count} personnel · ${exportData.dayCount || 0} ligne(s) jour`
    )}</p>
    ${sections || '<p>Aucune présence.</p>'}
  </body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = String(exportData.fileSlug || 'presence-detaillee');
  triggerBrowserDownload(blob, `${slug}-${stamp}.doc`);
}

function ensurePageSpace(doc, y, need, margin, drawFooter) {
  if (y + need <= 278) return y;
  drawFooter?.(doc);
  doc.addPage();
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, 210, 297, 'F');
  return 18;
}

function drawCellText(doc, text, x, y, w, align = 'left') {
  const label = String(text || '—');
  if (align === 'center') {
    doc.text(label, x + w / 2, y, { align: 'center', maxWidth: w - 4 });
  } else if (align === 'right') {
    doc.text(label, x + w - 3, y, { align: 'right', maxWidth: w - 4 });
  } else {
    doc.text(label, x + 3, y, { maxWidth: w - 5 });
  }
}

/** PDF soigné : une fiche par agent, colonnes aérées, tous les jours de la période. */
export function exportPresenceToPdf(exportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 16;
  const pageW = 210;
  const contentW = pageW - margin * 2;
  const people = exportData.people || [];
  const exportedLabel = (exportData.exportedAt || new Date()).toLocaleString('fr-FR', {
    timeZone: 'Africa/Porto-Novo',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const colPad = 1.5;
  const cols = [
    { key: 'date', label: 'Date', w: 58, align: 'left' },
    { key: 'arrival', label: 'Arrivée', w: 40, align: 'center' },
    { key: 'exit', label: 'Sortie', w: 40, align: 'center' },
    { key: 'duration', label: 'Durée', w: contentW - 58 - 40 - 40, align: 'center' },
  ];

  const drawFooter = (d) => {
    d.setDrawColor(...BRAND.line);
    d.setLineWidth(0.3);
    d.line(margin, 286, pageW - margin, 286);
    d.setFont('helvetica', 'normal');
    d.setFontSize(8);
    d.setTextColor(...BRAND.muted);
    d.text(
      `${exportData.companyName || 'Rapido'} · Export présence · ${exportedLabel}`,
      margin,
      292
    );
    d.text(`Page ${d.internal.getNumberOfPages()}`, pageW - margin, 292, { align: 'right' });
  };

  const paintPageBg = () => {
    doc.setFillColor(...BRAND.cream);
    doc.rect(0, 0, pageW, 297, 'F');
  };

  paintPageBg();

  // En-tête
  doc.setFillColor(...BRAND.brown);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setFillColor(...BRAND.gold);
  doc.rect(0, 34, pageW, 1.4, 'F');

  doc.setTextColor(...BRAND.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(exportData.title || 'Présence personnel', margin, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 236, 210);
  const subtitleLines = doc.splitTextToSize(
    exportData.subtitle ||
      `${people.length} personnel · ${exportData.dayCount || 0} jour(s) pointé(s)`,
    contentW
  );
  doc.text(subtitleLines, margin, 24);

  let y = 44;

  // Synthèse
  const cardW = (contentW - 8) / 3;
  const complete = people.reduce((n, p) => n + (p.daysComplete || 0), 0);
  const cards = [
    { value: String(people.length), label: 'Personnel' },
    { value: String(exportData.dayCount || 0), label: 'Jours pointés' },
    { value: String(complete), label: 'Journées complètes' },
  ];
  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 4);
    doc.setFillColor(...BRAND.white);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'F');
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'S');
    doc.setTextColor(...BRAND.brown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(card.value, x + cardW / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(card.label, x + cardW / 2, y + 14, { align: 'center' });
  });
  y += 26;

  if (!people.length) {
    doc.setTextColor(...BRAND.muted);
    doc.setFontSize(11);
    doc.text('Aucune présence sur cette période.', margin, y);
    drawFooter(doc);
    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`${exportData.fileSlug || 'presence-detaillee'}-${stamp}.pdf`);
    return;
  }

  const ROW_H = 9;
  const HEAD_H = 8;

  people.forEach((person, idx) => {
    const blockNeed = 16 + HEAD_H + Math.min(person.days.length, 3) * ROW_H + 6;
    y = ensurePageSpace(doc, y, blockNeed, margin, drawFooter);

    // Bandeau agent
    doc.setFillColor(...BRAND.brown);
    doc.roundedRect(margin, y, contentW, 12, 2, 2, 'F');
    doc.setTextColor(...BRAND.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${idx + 1}.  ${person.fullName}`, margin + 5, y + 7.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 220, 180);
    doc.text(
      `${person.daysPresent} jour(s)  ·  ${person.daysComplete} complète(s)`,
      pageW - margin - 5,
      y + 7.8,
      { align: 'right' }
    );
    y += 14;

    // En-tête colonnes
    doc.setFillColor(...BRAND.creamDark);
    doc.rect(margin, y, contentW, HEAD_H, 'F');
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.25);
    doc.rect(margin, y, contentW, HEAD_H, 'S');

    let x = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.brown);
    cols.forEach((col, ci) => {
      if (ci > 0) {
        doc.setDrawColor(...BRAND.line);
        doc.line(x, y + 1, x, y + HEAD_H - 1);
      }
      drawCellText(doc, col.label, x, y + 5.4, col.w - colPad, col.align);
      x += col.w;
    });
    y += HEAD_H;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    person.days.forEach((day, di) => {
      y = ensurePageSpace(doc, y, ROW_H + 2, margin, drawFooter);

      if (di % 2 === 0) {
        doc.setFillColor(...BRAND.white);
      } else {
        doc.setFillColor(252, 248, 243);
      }
      doc.rect(margin, y, contentW, ROW_H, 'F');

      doc.setDrawColor(...BRAND.line);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, contentW, ROW_H, 'S');

      x = margin;
      const values = [day.dateLabel, day.arrivalLabel, day.exitLabel, day.durationLabel];
      const colors = [
        BRAND.text,
        day.arrivalAt ? BRAND.success : BRAND.muted,
        day.exitAt ? BRAND.brownMid : BRAND.muted,
        BRAND.text,
      ];

      cols.forEach((col, ci) => {
        if (ci > 0) {
          doc.setDrawColor(...BRAND.line);
          doc.line(x, y + 0.5, x, y + ROW_H - 0.5);
        }
        doc.setTextColor(...colors[ci]);
        drawCellText(doc, values[ci], x, y + 5.8, col.w - colPad, col.align);
        x += col.w;
      });
      y += ROW_H;
    });

    y += 10;
  });

  drawFooter(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = String(exportData.fileSlug || 'presence-detaillee');
  doc.save(`${slug}-${stamp}.pdf`);
}

function detectImageFormat(dataUrl) {
  const m = String(dataUrl || '').match(/^data:image\/(png|jpeg|jpg|webp)/i);
  if (!m) return 'PNG';
  const t = m[1].toLowerCase();
  if (t === 'jpg' || t === 'jpeg') return 'JPEG';
  if (t === 'webp') return 'WEBP';
  return 'PNG';
}

/** Charge une image (logo entreprise) en data URL pour jsPDF. */
export async function fetchImageAsDataUrl(url) {
  if (!url) return null;
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error('Logo introuvable');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Lecture logo impossible'));
    reader.readAsDataURL(blob);
  });
}

/** PDF A4 imprimable avec le QR de pointage (image PNG du canvas). */
export async function exportPresenceQrToPdf({
  url,
  qrDataUrl,
  companyName = 'KING FISH',
  logoDataUrl = null,
  kind = 'arrival',
}) {
  if (!url || !qrDataUrl) {
    throw new Error('QR indisponible');
  }
  const isExit = kind === 'exit';
  const modeLabel = isExit ? 'Sortie' : 'Arrivée';
  const ctaLabel = isExit ? 'Je suis parti' : 'Je suis présent';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const m = 18;
  const title = `${String(companyName || 'KING FISH').toUpperCase()} — ${modeLabel}`;

  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, pageW, 297, 'F');

  let yCursor = 18;
  if (logoDataUrl) {
    const logoSize = 28;
    const logoX = (pageW - logoSize) / 2;
    try {
      doc.addImage(logoDataUrl, detectImageFormat(logoDataUrl), logoX, yCursor, logoSize, logoSize);
      yCursor += logoSize + 8;
    } catch {
      // logo optionnel
    }
  }

  doc.setTextColor(...BRAND.brown);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, pageW / 2, yCursor + 4, { align: 'center' });
  yCursor += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.text);
  doc.text(
    isExit
      ? 'Scannez ce QR code pour marquer votre sortie'
      : 'Scannez ce QR code pour marquer votre arrivée',
    pageW / 2,
    yCursor,
    { align: 'center' }
  );
  yCursor += 12;

  const qrSize = 110;
  const qrX = (pageW - qrSize) / 2;
  const qrY = yCursor;
  doc.setFillColor(...BRAND.white);
  doc.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 4, 4, 'F');
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.brown);
  doc.text('Comment faire ?', m, qrY + qrSize + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.text);
  const steps = [
    '1. Scannez le QR avec votre téléphone',
    '2. Saisissez votre prénom et votre nom',
    `3. Appuyez sur « ${ctaLabel} »`,
  ];
  let y = qrY + qrSize + 30;
  steps.forEach((line) => {
    doc.text(line, m, y);
    y += 7;
  });

  doc.save(isExit ? 'qr-presence-sortie.pdf' : 'qr-presence-arrivee.pdf');
}
