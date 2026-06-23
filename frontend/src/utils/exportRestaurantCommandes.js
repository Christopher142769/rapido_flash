import { jsPDF } from 'jspdf';
import { SHOP_STATUT_LABELS } from './exportShopOrders';

const ORDER_TZ = 'Africa/Porto-Novo';

export const COMMANDE_STATUT_LABELS = SHOP_STATUT_LABELS;

const BRAND = {
  brown: [139, 69, 19],
  gold: [200, 134, 10],
  goldLight: [232, 196, 104],
  cream: [255, 252, 248],
  text: [26, 26, 26],
  muted: [102, 102, 102],
  white: [255, 255, 255],
};

function escapeCsv(v) {
  const s = String(v ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleString('fr-FR');
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

function orderDayKey(order) {
  const raw = order.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: ORDER_TZ }).format(d);
}

export function commandeProductKey(item, kind) {
  const name =
    kind === 'plat'
      ? item?.plat?.nom || (typeof item?.plat === 'string' ? item.plat : '')
      : item?.produit?.nom || (typeof item?.produit === 'string' ? item.produit : '');
  if (!name) return '';
  return `${kind}:${name}`;
}

export function getCommandeProductOptions(commandes) {
  const map = new Map();
  for (const commande of commandes || []) {
    for (const item of commande.plats || []) {
      const key = commandeProductKey(item, 'plat');
      if (!key || map.has(key)) continue;
      const name = item.plat?.nom || item.plat;
      map.set(key, { key, label: name, kind: 'plat' });
    }
    for (const item of commande.produits || []) {
      const key = commandeProductKey(item, 'prod');
      if (!key || map.has(key)) continue;
      const name = item.produit?.nom || item.produit;
      map.set(key, { key, label: name, kind: 'prod' });
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

function matchesCommandeProduct(commande, productKey) {
  if (!productKey) return true;
  if (productKey.startsWith('plat:')) {
    const name = productKey.slice(5);
    return (commande.plats || []).some((item) => {
      const n = item.plat?.nom || item.plat;
      return n === name;
    });
  }
  if (productKey.startsWith('prod:')) {
    const name = productKey.slice(5);
    return (commande.produits || []).some((item) => {
      const n = item.produit?.nom || item.produit;
      return n === name;
    });
  }
  return true;
}

export function filterRestaurantCommandes(
  commandes,
  { dateFrom, dateTo, statut, productKey, restaurantId } = {}
) {
  return (commandes || []).filter((c) => {
    if (restaurantId) {
      const rid = c.restaurant?._id || c.restaurant;
      if (!rid || String(rid) !== String(restaurantId)) return false;
    }
    if (statut && c.statut !== statut) return false;
    if (!matchesCommandeProduct(c, productKey)) return false;
    const key = orderDayKey(c);
    if (!key) return false;
    if (dateFrom && key < dateFrom) return false;
    if (dateTo && key > dateTo) return false;
    return true;
  });
}

function formatLineItems(commande) {
  const lines = [];
  for (const item of commande.plats || []) {
    const name = item.plat?.nom || item.plat || 'Plat';
    lines.push(`${name} x ${item.quantite} (${Number(item.prix * item.quantite || 0).toFixed(0)} FCFA)`);
  }
  for (const item of commande.produits || []) {
    const name = item.produit?.nom || item.produit || 'Produit';
    lines.push(`${name} x ${item.quantite} (${Number(item.prix * item.quantite || 0).toFixed(0)} FCFA)`);
  }
  return lines.join(' · ') || '—';
}

function formatAddress(commande) {
  const addr = commande.adresseLivraison;
  if (addr?.adresse) return addr.adresse;
  if (addr?.latitude != null && addr?.longitude != null) {
    return `Lat: ${addr.latitude.toFixed(6)}, Lng: ${addr.longitude.toFixed(6)}`;
  }
  return '—';
}

function sumCommandeItemQuantity(commande) {
  let q = 0;
  for (const item of commande.plats || []) {
    const n = Number(item.quantite);
    if (Number.isFinite(n) && n > 0) q += n;
  }
  for (const item of commande.produits || []) {
    const n = Number(item.quantite);
    if (Number.isFinite(n) && n > 0) q += n;
  }
  return q;
}

export function mapCommandeToExportRow(commande) {
  return {
    id: String(commande._id),
    orderNumber: commande._id?.slice(-6) || '—',
    orderDate: commande.createdAt,
    statut: commande.statut,
    statutLabel: COMMANDE_STATUT_LABELS[commande.statut] || commande.statut,
    restaurantName: commande.restaurant?.nom || '—',
    clientName: commande.client?.nom || '—',
    clientEmail: commande.client?.email || '—',
    phone:
      commande.client?.telephone ||
      commande.adresseLivraison?.telephoneContact ||
      '—',
    address: formatAddress(commande),
    instructions: String(commande.adresseLivraison?.instruction || '').trim() || '—',
    lineItems: formatLineItems(commande),
    itemQuantity: sumCommandeItemQuantity(commande),
    total: Number(commande.total || 0),
  };
}

export function prepareRestaurantCommandesExport(commandes, meta = {}) {
  const rows = (commandes || []).map(mapCommandeToExportRow);
  const totalAmount = rows.reduce((s, r) => s + r.total, 0);

  return {
    dateFrom: meta.dateFrom || '',
    dateTo: meta.dateTo || '',
    statutFilter: meta.statutFilter || '',
    statutLabel: meta.statutLabel || 'Tous les statuts',
    productFilter: meta.productFilter || '',
    productLabel: meta.productLabel || 'Tous les articles',
    restaurantFilter: meta.restaurantFilter || '',
    restaurantLabel: meta.restaurantLabel || 'Toutes les entreprises',
    orders: rows,
    orderCount: rows.length,
    totalAmount,
  };
}

const EXCEL_HEADERS = [
  'Date commande',
  'N° commande',
  'Statut',
  'Entreprise',
  'Client',
  'Email',
  'Téléphone',
  'Adresse',
  'Instructions livreur',
  'Articles',
  'Total (FCFA)',
];

function rowToExcelCells(r) {
  return [
    fmtDateShort(r.orderDate),
    r.orderNumber,
    r.statutLabel,
    r.restaurantName,
    r.clientName,
    r.clientEmail,
    r.phone,
    r.address,
    r.instructions,
    r.lineItems,
    r.total,
  ];
}

export function exportRestaurantCommandesToExcel(exportData) {
  if (!exportData?.orders?.length) return;

  const period = `${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`;
  const rows = exportData.orders
    .map(
      (r) => `
    <tr>
      ${rowToExcelCells(r)
        .map((c) => `<td>${escapeCsv(c)}</td>`)
        .join('')}
    </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"/>
<style>
  body { font-family: Calibri, Arial, sans-serif; }
  h1 { color: #8B4513; font-size: 18pt; }
  .meta { color: #666; font-size: 10pt; margin-bottom: 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; }
  th { background: #8B4513; color: #fff; padding: 8px 6px; text-align: left; border: 1px solid #6d3610; }
  td { padding: 6px; border: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #fff9f5; }
  .total td { background: #8B4513; color: #fff; font-weight: bold; }
</style>
</head>
<body>
  <h1>RAPIDO — Commandes</h1>
  <p class="meta">Période : ${period} · ${escapeCsv(exportData.restaurantLabel)} · Statut : ${escapeCsv(exportData.statutLabel)} · Article : ${escapeCsv(exportData.productLabel)} · ${exportData.orderCount} commande(s)</p>
  <table>
    <thead><tr>${EXCEL_HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows}
      <tr class="total">
        <td colspan="10">TOTAL</td>
        <td>${exportData.totalAmount}</td>
      </tr>
    </tbody>
  </table>
  <p class="meta">Généré le ${new Date().toLocaleString('fr-FR')} — Rapido Flash</p>
</body>
</html>`;

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commandes-${safeFilenamePart(exportData.restaurantLabel)}-${Date.now()}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRestaurantCommandesToPdf(exportData) {
  if (!exportData?.orders?.length) return;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 12;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - 2 * margin;
  let y = margin;

  const setFill = (rgb) => pdf.setFillColor(...rgb);
  const setText = (rgb) => pdf.setTextColor(...rgb);
  const setDraw = (rgb) => pdf.setDrawColor(...rgb);

  const drawPageFooter = () => {
    const fy = pageH - 8;
    setDraw(BRAND.goldLight);
    pdf.setLineWidth(0.3);
    pdf.line(margin, fy - 3, pageW - margin, fy - 3);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(BRAND.muted);
    pdf.text('Rapido Flash — Commandes — Document interne', margin, fy);
    pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageW - margin, fy, { align: 'right' });
  };

  const addPageIfNeeded = (need = 10) => {
    if (y + need > pageH - margin) {
      drawPageFooter();
      pdf.addPage();
      y = margin;
    }
  };

  setFill(BRAND.brown);
  pdf.rect(0, 0, pageW, 28, 'F');
  setFill(BRAND.gold);
  pdf.rect(0, 26, pageW, 2, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  setText(BRAND.white);
  pdf.text('RAPIDO — Commandes', margin, 12);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  setText(BRAND.goldLight);
  pdf.text(
    `${exportData.restaurantLabel} · ${exportData.statutLabel} · ${exportData.productLabel}`,
    margin,
    19
  );

  pdf.setFontSize(8);
  pdf.text(
    `Période : ${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`,
    pageW - margin,
    12,
    { align: 'right' }
  );
  pdf.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageW - margin, 19, { align: 'right' });

  y = 34;

  const kpiW = contentW / 2;
  const kpiH = 16;
  const kpiLabels = ['Commandes', 'Montant total'];
  const kpiValues = [String(exportData.orderCount), fmtMoney(exportData.totalAmount)];

  kpiLabels.forEach((label, i) => {
    const x = margin + i * kpiW;
    setFill(BRAND.cream);
    setDraw(BRAND.goldLight);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x + 1, y, kpiW - 2, kpiH, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    setText(BRAND.muted);
    pdf.text(label.toUpperCase(), x + 4, y + 5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(i === 1 ? 10 : 9);
    setText(i === 1 ? BRAND.gold : BRAND.text);
    pdf.text(kpiValues[i], x + 4, y + 11);
  });

  y += kpiH + 8;

  exportData.orders.forEach((r, idx) => {
    const itemLines = pdf.splitTextToSize(`Articles : ${r.lineItems}`, contentW - 14);
    const addrLines = pdf.splitTextToSize(`Adresse : ${r.address}`, contentW - 14);
    const cardH = 32 + itemLines.length * 3.2 + Math.max(0, addrLines.length - 1) * 3.2;
    addPageIfNeeded(cardH + 4);

    setFill(BRAND.white);
    setDraw(BRAND.goldLight);
    pdf.setLineWidth(0.15);
    pdf.roundedRect(margin, y, contentW, cardH, 1.5, 1.5, 'FD');
    setFill(BRAND.gold);
    pdf.rect(margin, y, 3, cardH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    setText(BRAND.brown);
    pdf.text(`${idx + 1}. Commande #${r.orderNumber}`, margin + 6, y + 5.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(BRAND.muted);
    pdf.text(`${r.statutLabel} · ${fmtDateShort(r.orderDate)} · ${r.restaurantName}`, margin + 45, y + 5.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    setText(BRAND.gold);
    pdf.text(fmtMoney(r.total), pageW - margin - 4, y + 5.5, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(BRAND.text);
    pdf.text(`${r.clientName} · ${r.phone}`, margin + 6, y + 11);

    let lineY = y + 15.5;
    addrLines.forEach((line) => {
      pdf.text(line, margin + 6, lineY);
      lineY += 3.2;
    });

    itemLines.forEach((line) => {
      pdf.text(line, margin + 6, lineY);
      lineY += 3.2;
    });

    y += cardH + 3;
  });

  addPageIfNeeded(14);
  setFill(BRAND.brown);
  pdf.roundedRect(margin, y, contentW, 11, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  setText(BRAND.white);
  pdf.text('TOTAL EXPORT', margin + 5, y + 7);
  pdf.text(
    `${exportData.orderCount} cmd  ·  ${fmtMoney(exportData.totalAmount)}`,
    pageW - margin - 5,
    y + 7,
    { align: 'right' }
  );

  drawPageFooter();

  pdf.save(`commandes-${safeFilenamePart(exportData.restaurantLabel)}-${Date.now()}.pdf`);
}

export function defaultCommandeDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}
