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
    second: '2-digit',
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
      month: 'short',
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

function normalizeKey(firstName, lastName) {
  return `${String(firstName || '').trim()} ${String(lastName || '').trim()}`
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Agrège arrivées + sorties par personne et par jour (période sélectionnée).
 * Évite les doublons : 1 arrivée + 1 sortie max par jour / personne.
 */
export function preparePresenceDetailedExport(records, meta = {}) {
  const byPerson = new Map();

  (records || []).forEach((r) => {
    if (!r) return;
    const firstName = String(r.firstName || '').trim();
    const lastName = String(r.lastName || '').trim();
    if (!firstName && !lastName) return;
    const key = r.normalizedName || normalizeKey(firstName, lastName);
    if (!key) return;

    if (!byPerson.has(key)) {
      byPerson.set(key, {
        key,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        days: new Map(),
      });
    }
    const person = byPerson.get(key);
    // Garder l’orthographe la plus récente / non vide
    if (firstName) person.firstName = firstName;
    if (lastName) person.lastName = lastName;
    person.fullName = `${person.firstName} ${person.lastName}`.trim();

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

    if (kind === 'exit') {
      // Une seule sortie : la plus tardive si doublon résiduel
      if (!day.exitAt || at > new Date(day.exitAt)) day.exitAt = at.toISOString();
    } else {
      // Une seule arrivée : la plus tôt si doublon résiduel
      if (!day.arrivalAt || at < new Date(day.arrivalAt)) day.arrivalAt = at.toISOString();
    }
  });

  const people = Array.from(byPerson.values())
    .map((p) => {
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
      const daysPresent = days.filter((d) => d.arrivalAt || d.exitAt).length;
      const daysComplete = days.filter((d) => d.arrivalAt && d.exitAt).length;
      return {
        ...p,
        days,
        daysPresent,
        daysComplete,
      };
    })
    .sort((a, b) =>
      a.lastName.localeCompare(b.lastName, 'fr', { sensitivity: 'base' }) ||
      a.firstName.localeCompare(b.firstName, 'fr', { sensitivity: 'base' })
    );

  const totalDayRows = people.reduce((n, p) => n + p.days.length, 0);

  // Lignes plates (Excel / Word / rétrocompat)
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
      th, td { border: 1px solid #d4c4b0; padding: 7px 9px; text-align: left; font-size: 13px; }
      th { background: #efe6dc; color: #381808; }
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
  if (y + need <= 280) return y;
  drawFooter?.(doc);
  doc.addPage();
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, 210, 297, 'F');
  return 18;
}

/** PDF soigné : une fiche par agent, tous les jours de la période. */
export function exportPresenceToPdf(exportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageW = 210;
  const contentW = pageW - margin * 2;
  const people = exportData.people || [];
  const exportedLabel = (exportData.exportedAt || new Date()).toLocaleString('fr-FR', {
    timeZone: 'Africa/Porto-Novo',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const drawFooter = (d) => {
    d.setFont('helvetica', 'normal');
    d.setFontSize(8);
    d.setTextColor(...BRAND.muted);
    d.text(
      `${exportData.companyName || 'Rapido'} · Export présence · ${exportedLabel}`,
      margin,
      290
    );
    d.text(`Page ${d.internal.getNumberOfPages()}`, pageW - margin, 290, { align: 'right' });
  };

  // Fond
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, pageW, 297, 'F');

  // En-tête
  doc.setFillColor(...BRAND.brown);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setFillColor(...BRAND.gold);
  doc.rect(0, 32, pageW, 1.2, 'F');

  doc.setTextColor(...BRAND.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(exportData.title || 'Présence personnel', margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 236, 210);
  doc.text(
    exportData.subtitle ||
      `${people.length} personnel · ${exportData.dayCount || 0} jour(s) pointé(s)`,
    margin,
    23
  );

  let y = 42;

  // Synthèse
  doc.setFillColor(...BRAND.creamDark);
  doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F');
  doc.setTextColor(...BRAND.brown);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${people.length}`, margin + 6, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text('Personnel', margin + 6, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.brown);
  doc.text(`${exportData.dayCount || 0}`, margin + 55, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text('Jours pointés', margin + 55, y + 12);

  const complete = people.reduce((n, p) => n + (p.daysComplete || 0), 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.brown);
  doc.text(`${complete}`, margin + 110, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text('Journées complètes', margin + 110, y + 12);

  y += 24;

  if (!people.length) {
    doc.setTextColor(...BRAND.muted);
    doc.setFontSize(11);
    doc.text('Aucune présence sur cette période.', margin, y);
    drawFooter(doc);
    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`${exportData.fileSlug || 'presence-detaillee'}-${stamp}.pdf`);
    return;
  }

  const col = {
    date: 52,
    arrival: 38,
    exit: 38,
    duration: contentW - 52 - 38 - 38,
  };

  people.forEach((person, idx) => {
    y = ensurePageSpace(doc, y, 28 + person.days.length * 7, margin, drawFooter);

    // Bandeau agent
    doc.setFillColor(...BRAND.brown);
    doc.roundedRect(margin, y, contentW, 11, 1.5, 1.5, 'F');
    doc.setTextColor(...BRAND.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${idx + 1}. ${person.fullName}`, margin + 4, y + 7.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 220, 180);
    doc.text(
      `${person.daysPresent} j · ${person.daysComplete} complète(s)`,
      pageW - margin - 4,
      y + 7.2,
      { align: 'right' }
    );
    y += 14;

    // En-tête tableau jours
    doc.setFillColor(...BRAND.creamDark);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setTextColor(...BRAND.brown);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    let x = margin + 2;
    doc.text('Date', x, y + 4.8);
    x += col.date;
    doc.text('Arrivée', x, y + 4.8);
    x += col.arrival;
    doc.text('Sortie', x, y + 4.8);
    x += col.exit;
    doc.text('Durée', x, y + 4.8);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    person.days.forEach((day, di) => {
      y = ensurePageSpace(doc, y, 8, margin, drawFooter);
      if (di % 2 === 0) {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y - 3.5, contentW, 7, 'F');
      }
      doc.setDrawColor(...BRAND.line);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 3.2, margin + contentW, y + 3.2);

      doc.setTextColor(...BRAND.text);
      x = margin + 2;
      doc.text(day.dateLabel, x, y + 1.5, { maxWidth: col.date - 3 });
      x += col.date;
      doc.setTextColor(...(day.arrivalAt ? BRAND.success : BRAND.muted));
      doc.text(day.arrivalLabel, x, y + 1.5);
      x += col.arrival;
      doc.setTextColor(...(day.exitAt ? BRAND.brownMid : BRAND.muted));
      doc.text(day.exitLabel, x, y + 1.5);
      x += col.exit;
      doc.setTextColor(...BRAND.text);
      doc.text(day.durationLabel, x, y + 1.5);
      y += 7;
    });

    y += 8;
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
