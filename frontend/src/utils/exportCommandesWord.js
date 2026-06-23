/** Export Word (.doc) — tableau opérationnel Rapido (nom, téléphone, lieu, quantité, consignes). */

const BRAND = {
  brown: '#8B4513',
  amber: '#c76d2e',
  cream: '#fffbf7',
  creamAlt: '#fff9f5',
  border: '#e8dcc8',
  text: '#1a1411',
  muted: '#7a6558',
  white: '#ffffff',
};

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDateShort(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString('fr-FR');
}

function fmtMoney(n) {
  return `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
}

function safeFilenamePart(s) {
  return String(s || 'export')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
}

function downloadWord(html, filename) {
  const blob = new Blob(['\uFEFF', html], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function wordStyles() {
  return `
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; color: ${BRAND.text}; font-size: 10.5pt; line-height: 1.4; margin: 0; padding: 24px; }
    h1 { font-size: 20pt; font-weight: bold; color: ${BRAND.white}; margin: 0; letter-spacing: 0.04em; }
    .rf-header { background: ${BRAND.brown}; padding: 16px 20px 14px; margin: -24px -24px 0; }
    .rf-header-accent { height: 4px; background: ${BRAND.amber}; margin: 0 -24px 18px; }
    .rf-subtitle { color: #f5d78a; font-size: 9.5pt; margin: 5px 0 0; }
    .rf-meta { color: ${BRAND.muted}; font-size: 9pt; margin: 0 0 14px; }
    .rf-summary { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .rf-summary td { background: ${BRAND.cream}; border: 1px solid ${BRAND.border}; padding: 8px 12px; font-size: 9pt; }
    .rf-summary strong { color: ${BRAND.amber}; }
    .rf-data { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .rf-data th { background: ${BRAND.brown}; color: ${BRAND.white}; font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 8px; text-align: left; border: 1px solid #6d3610; vertical-align: middle; }
    .rf-data td { padding: 9px 8px; border: 1px solid ${BRAND.border}; vertical-align: top; font-size: 10pt; word-wrap: break-word; }
    .rf-data tr:nth-child(even) td { background: ${BRAND.creamAlt}; }
    .rf-data tr:hover td { background: ${BRAND.cream}; }
    .rf-col-num { width: 5%; text-align: center; font-weight: bold; color: ${BRAND.muted}; }
    .rf-col-nom { width: 16%; font-weight: 600; }
    .rf-col-tel { width: 13%; }
    .rf-col-lieu { width: 26%; }
    .rf-col-qty { width: 12%; text-align: center; font-weight: bold; color: ${BRAND.amber}; }
    .rf-col-consignes { width: 28%; white-space: pre-wrap; }
    .rf-footer { margin-top: 18px; padding-top: 10px; border-top: 2px solid ${BRAND.amber}; color: ${BRAND.muted}; font-size: 8.5pt; }
    .rf-total-bar { background: ${BRAND.brown}; color: ${BRAND.white}; padding: 10px 14px; margin-top: 12px; font-weight: bold; font-size: 10pt; }
  `;
}

function wordShell({ title, subtitle, metaHtml, summaryHtml, tableHtml, totalHtml }) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8"/>
<meta name="ProgId" content="Word.Document"/>
<meta name="Generator" content="Rapido Flash"/>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>${wordStyles()}</style>
</head>
<body>
  <div class="rf-header">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="rf-subtitle">${escapeHtml(subtitle)}</p>` : ''}
  </div>
  <div class="rf-header-accent"></div>
  <p class="rf-meta">${metaHtml}</p>
  ${summaryHtml}
  ${tableHtml}
  ${totalHtml}
  <p class="rf-footer">Généré le ${escapeHtml(new Date().toLocaleString('fr-FR'))} · Rapido Flash · Document éditable (Word)</p>
</body>
</html>`;
}

function summaryTable(cells) {
  const tds = cells.map((c) => `<td><strong>${escapeHtml(c.value)}</strong> ${escapeHtml(c.label)}</td>`).join('');
  return `<table class="rf-summary"><tr>${tds}</tr></table>`;
}

function shopTableRow(r, index) {
  const fullName = [r.firstName, r.lastName].filter((p) => p && p !== '—').join(' ') || '—';
  const lieu = r.fullAddress || [r.city, r.address].filter((p) => p && p !== '—').join(' — ') || '—';
  const consignes = r.clientSpecifications && r.clientSpecifications !== '—' ? r.clientSpecifications : '—';
  const qty = r.productName && r.productName !== '—'
    ? `${r.quantityLabel}\n(${r.productName})`
    : r.quantityLabel;

  return `<tr>
    <td class="rf-col-num">${index + 1}</td>
    <td class="rf-col-nom">${escapeHtml(fullName)}</td>
    <td class="rf-col-tel">${escapeHtml(r.phone)}</td>
    <td class="rf-col-lieu">${escapeHtml(lieu)}</td>
    <td class="rf-col-qty">${escapeHtml(qty)}</td>
    <td class="rf-col-consignes">${escapeHtml(consignes)}</td>
  </tr>`;
}

function restaurantTableRow(r, index) {
  return `<tr>
    <td class="rf-col-num">${index + 1}</td>
    <td class="rf-col-nom">${escapeHtml(r.clientName)}</td>
    <td class="rf-col-tel">${escapeHtml(r.phone)}</td>
    <td class="rf-col-lieu">${escapeHtml(r.address)}</td>
    <td class="rf-col-qty">${escapeHtml(r.lineItems)}</td>
    <td class="rf-col-consignes">${escapeHtml(r.instructions && r.instructions !== '—' ? r.instructions : '—')}</td>
  </tr>`;
}

function buildDataTable(headers, rowsHtml) {
  return `<table class="rf-data">
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>`;
}

const TABLE_HEADERS = ['N°', 'Nom', 'Téléphone', 'Lieu', 'Quantité', 'Consignes'];

export function exportShopOrdersToWord(exportData) {
  if (!exportData?.orders?.length) return;

  const period = `${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`;
  const metaHtml = `Période : <strong>${escapeHtml(period)}</strong> · Statut : ${escapeHtml(exportData.statutLabel)} · Produit : ${escapeHtml(exportData.productLabel)}`;

  const summaryHtml = summaryTable([
    { value: String(exportData.orderCount), label: 'commande(s)' },
    { value: fmtMoney(exportData.totalAmount), label: 'total' },
    { value: fmtMoney(exportData.totalSubtotal), label: 'sous-total produits' },
    { value: fmtMoney(exportData.totalDelivery), label: 'livraison' },
  ]);

  const tableHtml = buildDataTable(TABLE_HEADERS, exportData.orders.map(shopTableRow).join(''));

  const totalHtml = `<div class="rf-total-bar">${exportData.orderCount} commande(s) · Total ${escapeHtml(fmtMoney(exportData.totalAmount))}</div>`;

  const html = wordShell({
    title: 'RAPIDO — Commandes Shop',
    subtitle: 'Tableau de livraison · édition Word',
    metaHtml,
    summaryHtml,
    tableHtml,
    totalHtml,
  });

  downloadWord(html, `commandes-shop-${safeFilenamePart(exportData.statutLabel)}-${Date.now()}.doc`);
}

export function exportRestaurantCommandesToWord(exportData) {
  if (!exportData?.orders?.length) return;

  const period = `${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`;
  const metaHtml = `Période : <strong>${escapeHtml(period)}</strong> · ${escapeHtml(exportData.restaurantLabel)} · Statut : ${escapeHtml(exportData.statutLabel)} · Article : ${escapeHtml(exportData.productLabel)}`;

  const summaryHtml = summaryTable([
    { value: String(exportData.orderCount), label: 'commande(s)' },
    { value: fmtMoney(exportData.totalAmount), label: 'total' },
  ]);

  const tableHtml = buildDataTable(TABLE_HEADERS, exportData.orders.map(restaurantTableRow).join(''));

  const totalHtml = `<div class="rf-total-bar">${exportData.orderCount} commande(s) · Total ${escapeHtml(fmtMoney(exportData.totalAmount))}</div>`;

  const html = wordShell({
    title: 'RAPIDO — Commandes',
    subtitle: 'Tableau de livraison · édition Word',
    metaHtml,
    summaryHtml,
    tableHtml,
    totalHtml,
  });

  downloadWord(html, `commandes-${safeFilenamePart(exportData.restaurantLabel)}-${Date.now()}.doc`);
}
