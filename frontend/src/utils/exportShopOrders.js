import { jsPDF } from 'jspdf';
import { inferShopOrderCity, matchesDeliveryCity } from './pointsByCity';

const SHOP_ORDER_TZ = 'Africa/Porto-Novo';

export const SHOP_STATUT_LABELS = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

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
  const raw = order.orderDate || order.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_ORDER_TZ }).format(d);
}

export function shopProductKey(order) {
  const id = order?.shopProduct?._id || order?.shopProduct;
  if (id) return String(id);
  if (order?.slug) return `slug:${order.slug}`;
  if (order?.productName) return `name:${order.productName}`;
  return '';
}

export function catalogProductKey(product) {
  if (product?._id) return String(product._id);
  if (product?.name) return `name:${product.name}`;
  return '';
}

/** Options filtre produit : catalogue Shop + produits vus uniquement dans les commandes. */
export function getShopProductFilterOptions(catalogProducts, orders) {
  const map = new Map();
  const catalogNames = new Set();

  for (const product of catalogProducts || []) {
    const key = catalogProductKey(product);
    if (!key) continue;
    const label = product.name || 'Produit';
    map.set(key, { key, label, fromOrders: !!product.fromOrders });
    catalogNames.add(label.toLowerCase());
  }

  for (const order of orders || []) {
    const name = String(order.productName || '').trim();
    if (name && catalogNames.has(name.toLowerCase())) continue;
    const key = shopProductKey(order);
    if (!key || map.has(key)) continue;
    map.set(key, {
      key,
      label: name || order.slug || 'Produit',
      fromOrders: true,
    });
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/** @deprecated Préférer getShopProductFilterOptions */
export function getShopProductOptions(orders) {
  return getShopProductFilterOptions([], orders);
}

function matchesShopProduct(order, productKey) {
  if (!productKey) return true;
  if (productKey.startsWith('name:')) {
    const name = productKey.slice(5);
    return String(order.productName || '').toLowerCase() === name.toLowerCase();
  }
  if (productKey.startsWith('slug:')) {
    return String(order.slug || '').toLowerCase() === productKey.slice(5).toLowerCase();
  }
  const productId = order?.shopProduct?._id || order?.shopProduct;
  if (productId && String(productId) === productKey) return true;
  return shopProductKey(order) === productKey;
}

export function filterShopOrders(orders, { dateFrom, dateTo, statut, productKey, city } = {}) {
  return (orders || []).filter((o) => {
    if (statut && o.statut !== statut) return false;
    if (!matchesShopProduct(o, productKey)) return false;
    if (!matchesDeliveryCity(o, city, inferShopOrderCity)) return false;
    const key = orderDayKey(o);
    if (!key) return false;
    if (dateFrom && key < dateFrom) return false;
    if (dateTo && key > dateTo) return false;
    return true;
  });
}

export function mapShopOrderToExportRow(order) {
  const c = order.customer || {};
  const subtotal =
    order.subtotalPrice != null
      ? Number(order.subtotalPrice)
      : Number(order.unitPrice || 0) * Number(order.quantity || 0);
  return {
    id: String(order._id),
    orderNumber: order.orderNumber || '—',
    orderDate: order.orderDate || order.createdAt,
    confirmedAt: order.confirmedAt || null,
    deliveredAt: order.deliveredAt || null,
    statut: order.statut,
    statutLabel: SHOP_STATUT_LABELS[order.statut] || order.statut,
    commercialStatus: order.commercialStatus || '—',
    productName: order.productName || '—',
    slug: order.slug || '—',
    quantity: order.quantity,
    quantityUnit: order.quantityUnit || 'unit',
    quantityLabel: order.quantityLabel || String(order.quantity ?? '—'),
    unitPrice: Number(order.unitPrice || 0),
    subtotalPrice: subtotal,
    deliveryFee: Number(order.deliveryFee || 0),
    eviscerationCleaning: !!order.eviscerationCleaning,
    eviscerationFee: Number(order.eviscerationFee || 0),
    eviscerationLabel: order.eviscerationCleaning ? 'Oui' : 'Non',
    totalPrice: Number(order.totalPrice || 0),
    freeDelivery: !!order.freeDelivery,
    isPromoLive: !!order.isPromoLive,
    discountPercent: order.discountPercent || 0,
    firstName: c.firstName || '—',
    lastName: c.lastName || '—',
    phone: c.phone || '—',
    city: c.city || '—',
    address: c.addressDescription || '—',
    fullAddress: order.isOffPlatform
      ? order.offPlatformLocation || '—'
      : [c.city, c.addressDescription].filter(Boolean).join(' — ') || '—',
    clientSpecifications: String(order.clientSpecifications || '').trim() || '—',
    requestedDeliveryAt: order.requestedDeliveryAt || null,
    scheduledDeliveryAt: order.scheduledDeliveryAt || null,
    isOffPlatform: !!order.isOffPlatform,
    paymentMode: 'Paiement à la livraison',
  };
}

export function prepareShopOrdersExport(orders, meta = {}) {
  const rows = (orders || []).map(mapShopOrderToExportRow);
  const totalSubtotal = rows.reduce((s, r) => s + r.subtotalPrice, 0);
  const totalDelivery = rows.reduce((s, r) => s + r.deliveryFee, 0);
  const totalEvisceration = rows.reduce((s, r) => s + r.eviscerationFee, 0);
  const totalAmount = rows.reduce((s, r) => s + r.totalPrice, 0);

  return {
    dateFrom: meta.dateFrom || '',
    dateTo: meta.dateTo || '',
    statutFilter: meta.statutFilter || '',
    statutLabel: meta.statutLabel || 'Tous les statuts',
    productFilter: meta.productFilter || '',
    productLabel: meta.productLabel || 'Tous les produits',
    cityFilter: meta.cityFilter || '',
    cityLabel: meta.cityLabel || 'Toutes les villes',
    orders: rows,
    orderCount: rows.length,
    totalSubtotal,
    totalDelivery,
    totalEvisceration,
    totalAmount,
  };
}

const EXCEL_HEADERS = [
  'Date commande',
  'Date confirmation',
  'Date livraison',
  'N° commande',
  'Statut',
  'Produit',
  'Quantité',
  'Prix unitaire (FCFA)',
  'Sous-total (FCFA)',
  'Frais livraison (FCFA)',
  'Éviscération et nettoyage',
  'Montant éviscération (FCFA)',
  'Total (FCFA)',
  'Promo',
  'Livraison gratuite',
  'Prénom',
  'Nom',
  'Téléphone',
  'Ville',
  'Adresse',
  'Spécifications',
  'Livraison demandée',
  'Relance planifiée',
  'Hors plateforme',
  'Fiche produit',
  'Paiement',
];

function rowToExcelCells(r) {
  return [
    fmtDateShort(r.orderDate),
    fmtDateShort(r.confirmedAt),
    fmtDateShort(r.deliveredAt),
    r.orderNumber,
    r.statutLabel,
    r.productName,
    r.quantityLabel,
    r.unitPrice,
    r.subtotalPrice,
    r.deliveryFee,
    r.eviscerationLabel,
    r.eviscerationFee,
    r.totalPrice,
    r.isPromoLive ? `-${r.discountPercent}%` : '—',
    r.freeDelivery ? 'Oui' : 'Non',
    r.firstName,
    r.lastName,
    r.phone,
    r.city,
    r.address,
    r.clientSpecifications,
    fmtDate(r.requestedDeliveryAt),
    fmtDate(r.scheduledDeliveryAt),
    r.isOffPlatform ? 'Oui' : 'Non',
    r.slug,
    r.paymentMode,
  ];
}

export function exportShopOrdersToExcel(exportData) {
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
  <h1>RAPIDO — Commandes Shop</h1>
  <p class="meta">Période : ${period} · Statut : ${escapeCsv(exportData.statutLabel)} · Produit : ${escapeCsv(exportData.productLabel)} · Ville : ${escapeCsv(exportData.cityLabel)} · ${exportData.orderCount} commande(s)</p>
  <table>
    <thead><tr>${EXCEL_HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows}
      <tr class="total">
        <td colspan="8">TOTAL</td>
        <td>${exportData.totalSubtotal}</td>
        <td>${exportData.totalDelivery}</td>
        <td></td>
        <td>${exportData.totalEvisceration}</td>
        <td>${exportData.totalAmount}</td>
        <td colspan="${EXCEL_HEADERS.length - 12}"></td>
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
  a.download = `commandes-shop-${safeFilenamePart(exportData.cityFilter || 'toutes-villes')}-${safeFilenamePart(exportData.statutLabel)}-${Date.now()}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportShopOrdersToPdf(exportData) {
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
    pdf.text('Rapido Flash — Commandes Shop — Document interne', margin, fy);
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
  pdf.text('RAPIDO — Commandes Shop', margin, 12);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  setText(BRAND.goldLight);
  pdf.text(`Export détaillé · ${exportData.statutLabel} · ${exportData.productLabel} · ${exportData.cityLabel}`, margin, 19);

  pdf.setFontSize(8);
  pdf.text(
    `Période : ${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`,
    pageW - margin,
    12,
    { align: 'right' }
  );
  pdf.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageW - margin, 19, { align: 'right' });

  y = 34;

  const kpiW = contentW / 5;
  const kpiH = 16;
  const kpiLabels = ['Commandes', 'Sous-total produits', 'Frais livraison', 'Éviscération', 'Total à payer'];
  const kpiValues = [
    String(exportData.orderCount),
    fmtMoney(exportData.totalSubtotal),
    fmtMoney(exportData.totalDelivery),
    fmtMoney(exportData.totalEvisceration),
    fmtMoney(exportData.totalAmount),
  ];

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
    pdf.setFontSize(i === 4 ? 10 : 9);
    setText(i === 4 ? BRAND.gold : BRAND.text);
    pdf.text(kpiValues[i], x + 4, y + 11);
  });

  y += kpiH + 8;

  exportData.orders.forEach((r, idx) => {
    const specsLines = pdf.splitTextToSize(`Spécifications : ${r.clientSpecifications}`, contentW - 14);
    const addrLines = pdf.splitTextToSize(`Adresse : ${r.fullAddress}`, contentW - 14);
    const cardH = 38 + specsLines.length * 3.2 + Math.max(0, addrLines.length - 1) * 3.2;
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
    pdf.text(`${idx + 1}. N° ${r.orderNumber}`, margin + 6, y + 5.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(BRAND.muted);
    pdf.text(`${r.statutLabel} · Commande ${fmtDateShort(r.orderDate)}`, margin + 45, y + 5.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    setText(BRAND.gold);
    pdf.text(fmtMoney(r.totalPrice), pageW - margin - 4, y + 5.5, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(BRAND.text);
    pdf.text(`${r.productName} · ${r.quantityLabel}`, margin + 6, y + 11);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(BRAND.text);
    pdf.text(`${r.firstName} ${r.lastName} · ${r.phone}`, margin + 6, y + 15.5);

    let lineY = y + 19.5;
    addrLines.forEach((line) => {
      pdf.text(line, margin + 6, lineY);
      lineY += 3.2;
    });

    const priceLine = [
      `Unitaire : ${fmtMoney(r.unitPrice)}`,
      `Sous-total : ${fmtMoney(r.subtotalPrice)}`,
      r.deliveryFee > 0 ? `Livraison : ${fmtMoney(r.deliveryFee)}` : r.freeDelivery ? 'Livraison gratuite' : null,
      r.eviscerationFee > 0 ? `Éviscération : ${fmtMoney(r.eviscerationFee)}` : r.eviscerationCleaning === false && r.quantityUnit && ['kg', 'g', 'tonne'].includes(r.quantityUnit) ? 'Éviscération : Non' : null,
      r.isPromoLive ? `Promo -${r.discountPercent}%` : null,
    ]
      .filter(Boolean)
      .join('  ·  ');
    pdf.text(priceLine, margin + 6, lineY);
    lineY += 3.5;

    if (r.confirmedAt || r.requestedDeliveryAt || r.scheduledDeliveryAt) {
      const dates = [
        r.confirmedAt ? `Confirmée : ${fmtDateShort(r.confirmedAt)}` : null,
        r.requestedDeliveryAt ? `Livraison demandée : ${fmtDateShort(r.requestedDeliveryAt)}` : null,
        r.scheduledDeliveryAt ? `Relance : ${fmtDateShort(r.scheduledDeliveryAt)}` : null,
      ]
        .filter(Boolean)
        .join('  ·  ');
      pdf.text(dates, margin + 6, lineY);
      lineY += 3.5;
    }

    specsLines.forEach((line) => {
      pdf.text(line, margin + 6, lineY);
      lineY += 3.2;
    });

    pdf.setFontSize(7);
    setText(BRAND.muted);
    pdf.text(r.paymentMode, margin + 6, y + cardH - 2);

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

  pdf.save(`commandes-shop-${safeFilenamePart(exportData.cityFilter || 'toutes-villes')}-${safeFilenamePart(exportData.statutLabel)}-${Date.now()}.pdf`);
}
