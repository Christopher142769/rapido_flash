import { jsPDF } from 'jspdf';

const BRAND = {
  brown: [139, 69, 19],
  gold: [200, 134, 10],
  cream: [255, 252, 248],
  text: [26, 26, 26],
  muted: [102, 102, 102],
  white: [255, 255, 255],
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

function formatDateKey(key) {
  if (!key) return '—';
  try {
    const [y, m, d] = String(key).split('-').map(Number);
    if (!y || !m || !d) return key;
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR');
  } catch {
    return key;
  }
}

export function preparePresenceExport(records, meta = {}) {
  const rows = (records || []).map((r, i) => ({
    n: i + 1,
    date: formatDateKey(r.dateKey),
    dateKey: r.dateKey || '',
    firstName: r.firstName || '',
    lastName: r.lastName || '',
    fullName: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
    checkedAt: formatCheckedAt(r.checkedAt),
    checkedAtRaw: r.checkedAt,
  }));
  return {
    rows,
    count: rows.length,
    title: meta.title || 'Présence personnel',
    subtitle: meta.subtitle || '',
    exportedAt: new Date(),
  };
}

export function exportPresenceToExcel(exportData) {
  const headers = ['N°', 'Date', 'Prénom', 'Nom', 'Heure de pointage'];
  const body = exportData.rows
    .map(
      (r) =>
        `<tr>
          <td>${r.n}</td>
          <td>${escapeHtml(r.date)}</td>
          <td>${escapeHtml(r.firstName)}</td>
          <td>${escapeHtml(r.lastName)}</td>
          <td>${escapeHtml(r.checkedAt)}</td>
        </tr>`
    )
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>
    <h2>${escapeHtml(exportData.title)}</h2>
    <p>${escapeHtml(exportData.subtitle || `${exportData.count} présence(s)`)}</p>
    <table border="1" cellspacing="0" cellpadding="4">
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerBrowserDownload(blob, `presence-personnel-${stamp}.xls`);
}

export function exportPresenceToPdf(exportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  let y = 18;
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(...BRAND.brown);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(exportData.title || 'Présence personnel', margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.muted);
  doc.text(exportData.subtitle || `${exportData.count} présence(s)`, margin, y);
  y += 10;

  const cols = [
    { key: 'n', label: 'N°', w: 12 },
    { key: 'date', label: 'Date', w: 28 },
    { key: 'firstName', label: 'Prénom', w: 40 },
    { key: 'lastName', label: 'Nom', w: 40 },
    { key: 'checkedAt', label: 'Heure', w: 52 },
  ];

  const drawHeader = () => {
    doc.setFillColor(...BRAND.brown);
    doc.rect(margin, y, 182, 8, 'F');
    doc.setTextColor(...BRAND.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    let x = margin + 2;
    cols.forEach((c) => {
      doc.text(c.label, x, y + 5.5);
      x += c.w;
    });
    y += 10;
  };

  drawHeader();
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.text);

  for (const row of exportData.rows) {
    if (y > 280) {
      doc.addPage();
      y = 18;
      drawHeader();
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.text);
    }
    let x = margin + 2;
    cols.forEach((c) => {
      doc.text(String(row[c.key] ?? ''), x, y, { maxWidth: c.w - 2 });
      x += c.w;
    });
    y += 7;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`presence-personnel-${stamp}.pdf`);
}

export function exportPresenceToWord(exportData) {
  const headers = ['N°', 'Date', 'Prénom', 'Nom', 'Heure de pointage'];
  const rows = exportData.rows
    .map(
      (r) =>
        `<tr>
          <td>${r.n}</td>
          <td>${escapeHtml(r.date)}</td>
          <td>${escapeHtml(r.firstName)}</td>
          <td>${escapeHtml(r.lastName)}</td>
          <td>${escapeHtml(r.checkedAt)}</td>
        </tr>`
    )
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <title>${escapeHtml(exportData.title)}</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #1a1411; }
      h1 { color: #8B4513; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d4c4b0; padding: 6px 8px; text-align: left; }
      th { background: #f5efe8; }
    </style></head><body>
    <h1>${escapeHtml(exportData.title)}</h1>
    <p>${escapeHtml(exportData.subtitle || `${exportData.count} présence(s)`)}</p>
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerBrowserDownload(blob, `presence-personnel-${stamp}.doc`);
}

/** PDF A4 imprimable avec le QR de pointage (image PNG du canvas). */
export function exportPresenceQrToPdf({ url, qrDataUrl }) {
  if (!url || !qrDataUrl) {
    throw new Error('QR indisponible');
  }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 18;

  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, pageW, 297, 'F');

  doc.setTextColor(...BRAND.brown);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Rapido Flash — Présence personnel', pageW / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.text);
  doc.text('Scannez ce QR code pour marquer votre présence', pageW / 2, 40, { align: 'center' });

  const qrSize = 110;
  const qrX = (pageW - qrSize) / 2;
  const qrY = 55;
  doc.setFillColor(...BRAND.white);
  doc.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 4, 4, 'F');
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.brown);
  doc.text('Comment faire ?', margin, qrY + qrSize + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.text);
  const steps = [
    '1. Scannez le QR avec votre téléphone',
    '2. Saisissez votre prénom et votre nom',
    '3. Appuyez sur « Je suis présent »',
    'L’heure est enregistrée automatiquement.',
  ];
  let y = qrY + qrSize + 30;
  steps.forEach((line) => {
    doc.text(line, margin, y);
    y += 7;
  });

  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  const linkLines = doc.splitTextToSize(`Lien : ${url}`, pageW - margin * 2);
  doc.text(linkLines, margin, y + 8);

  doc.setFontSize(8);
  doc.text('QR définitif — à afficher sur le lieu de travail', pageW / 2, 285, { align: 'center' });

  doc.save('qr-presence-personnel.pdf');
}
