import { jsPDF } from 'jspdf';
import { inferShopOrderCity, matchesDeliveryCity } from './pointsByCity';
import { quantityToKg } from './shopEvisceration';

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

export function shopOrderQuantityKg(order) {
  return quantityToKg(order?.quantity, order?.quantityUnit || 'unit');
}

export function sumShopOrdersQuantityKg(orders) {
  return (orders || []).reduce((sum, order) => sum + shopOrderQuantityKg(order), 0);
}

export function filterShopOrders(
  orders,
  { dateFrom, dateTo, statut, productKey, city, evisceration } = {}
) {
  return (orders || []).filter((o) => {
    if (statut && o.statut !== statut) return false;
    if (!matchesShopProduct(o, productKey)) return false;
    if (!matchesDeliveryCity(o, city, inferShopOrderCity)) return false;
    if (evisceration === 'oui' && !o.eviscerationCleaning) return false;
    if (evisceration === 'non' && o.eviscerationCleaning) return false;
    const key = orderDayKey(o);
    if (!key) return false;
    if (dateFrom && key < dateFrom) return false;
    if (dateTo && key > dateTo) return false;
    return true;
  });
}

function sortShopOrdersEarliestFirst(orders) {
  return [...(orders || [])].sort((a, b) => {
    const ta = new Date(a.createdAt || a.orderDate || 0).getTime();
    const tb = new Date(b.createdAt || b.orderDate || 0).getTime();
    if (ta !== tb) return ta - tb;
    return String(a._id || '').localeCompare(String(b._id || ''));
  });
}

/**
 * Prend les commandes les plus anciennes jusqu’à atteindre maxKg (commande entière incluse).
 * maxKg vide / ≤ 0 → toutes les commandes.
 */
export function selectShopOrdersByMaxKg(orders, maxKg) {
  const limit = Number(maxKg);
  if (!Number.isFinite(limit) || limit <= 0) return [...(orders || [])];
  const selected = [];
  let sum = 0;
  for (const order of orders || []) {
    if (sum >= limit) break;
    selected.push(order);
    sum += shopOrderQuantityKg(order);
  }
  return selected;
}

export function partitionShopOrdersByEvisceration(orders) {
  const withEvisc = [];
  const withoutEvisc = [];
  for (const order of orders || []) {
    if (order.eviscerationCleaning) withEvisc.push(order);
    else withoutEvisc.push(order);
  }
  return { withEvisc, withoutEvisc };
}

/**
 * Sélection export / distribution livreurs :
 * - filtre éviscération + plafond kg (liste unique), ou
 * - 2 listes (éviscéré / non) avec plafonds kg indépendants, dès les premières commandes.
 */
export function buildShopLivreurSelection(orders, opts = {}) {
  const sorted = sortShopOrdersEarliestFirst(orders);
  const {
    evisceration = '',
    maxKg = '',
    splitLivreurLists = false,
    maxKgEvisc = '',
    maxKgNonEvisc = '',
  } = opts;

  if (splitLivreurLists) {
    const { withEvisc, withoutEvisc } = partitionShopOrdersByEvisceration(sorted);
    const eviscOrders = selectShopOrdersByMaxKg(withEvisc, maxKgEvisc);
    const nonEviscOrders = selectShopOrdersByMaxKg(withoutEvisc, maxKgNonEvisc);
    const lists = [
      {
        key: 'evisc',
        label: 'Liste livreur — Éviscéré & nettoyé',
        orders: eviscOrders,
        totalKg: sumShopOrdersQuantityKg(eviscOrders),
      },
      {
        key: 'non',
        label: 'Liste livreur — Non éviscéré',
        orders: nonEviscOrders,
        totalKg: sumShopOrdersQuantityKg(nonEviscOrders),
      },
    ];
    const all = [...eviscOrders, ...nonEviscOrders];
    return {
      split: true,
      lists,
      orders: all,
      totalKg: sumShopOrdersQuantityKg(all),
    };
  }

  let pool = sorted;
  if (evisceration === 'oui') pool = pool.filter((o) => !!o.eviscerationCleaning);
  if (evisceration === 'non') pool = pool.filter((o) => !o.eviscerationCleaning);
  const selected = selectShopOrdersByMaxKg(pool, maxKg);
  const eviscLabel =
    evisceration === 'oui'
      ? 'Éviscéré & nettoyé'
      : evisceration === 'non'
        ? 'Non éviscéré'
        : 'Toutes éviscérations';
  return {
    split: false,
    lists: [
      {
        key: 'all',
        label: `Liste commandes — ${eviscLabel}`,
        orders: selected,
        totalKg: sumShopOrdersQuantityKg(selected),
      },
    ],
    orders: selected,
    totalKg: sumShopOrdersQuantityKg(selected),
  };
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
    quantityKg: shopOrderQuantityKg(order),
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
  const totalKg = rows.reduce((s, r) => s + Number(r.quantityKg || 0), 0);

  const lists = (meta.lists || [])
    .map((list) => {
      const listRows = (list.orders || []).map((o) =>
        o && typeof o === 'object' && 'orderNumber' in o && 'eviscerationLabel' in o
          ? o
          : mapShopOrderToExportRow(o)
      );
      return {
        key: list.key || 'list',
        label: list.label || 'Liste',
        orders: listRows,
        orderCount: listRows.length,
        totalSubtotal: listRows.reduce((s, r) => s + r.subtotalPrice, 0),
        totalDelivery: listRows.reduce((s, r) => s + r.deliveryFee, 0),
        totalEvisceration: listRows.reduce((s, r) => s + r.eviscerationFee, 0),
        totalAmount: listRows.reduce((s, r) => s + r.totalPrice, 0),
        totalKg: listRows.reduce((s, r) => s + Number(r.quantityKg || 0), 0),
      };
    })
    .filter((list) => list.orders.length > 0);

  return {
    dateFrom: meta.dateFrom || '',
    dateTo: meta.dateTo || '',
    statutFilter: meta.statutFilter || '',
    statutLabel: meta.statutLabel || 'Tous les statuts',
    productFilter: meta.productFilter || '',
    productLabel: meta.productLabel || 'Tous les produits',
    cityFilter: meta.cityFilter || '',
    cityLabel: meta.cityLabel || 'Toutes les villes',
    eviscerationFilter: meta.eviscerationFilter || '',
    eviscerationLabel: meta.eviscerationLabel || 'Toutes',
    maxKgLabel: meta.maxKgLabel || '',
    splitLivreurLists: !!meta.splitLivreurLists || lists.length > 1,
    lists,
    orders: rows,
    orderCount: rows.length,
    totalSubtotal,
    totalDelivery,
    totalEvisceration,
    totalAmount,
    totalKg,
  };
}

function exportMetaLine(exportData) {
  const parts = [
    `Période : ${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`,
    `Statut : ${exportData.statutLabel}`,
    `Produit : ${exportData.productLabel}`,
    `Ville : ${exportData.cityLabel}`,
    `Éviscération : ${exportData.eviscerationLabel || 'Toutes'}`,
  ];
  if (exportData.maxKgLabel) parts.push(exportData.maxKgLabel);
  if (exportData.splitLivreurLists) parts.push('2 listes livreurs');
  parts.push(`${exportData.orderCount} commande(s)`);
  if (exportData.totalKg > 0) {
    parts.push(`${Number(exportData.totalKg).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`);
  }
  return parts.join(' · ');
}

function excelTableForRows(rows, totals) {
  const body = rows
    .map(
      (r) => `
    <tr>
      ${rowToExcelCells(r)
        .map((c) => `<td>${escapeCsv(c)}</td>`)
        .join('')}
    </tr>`
    )
    .join('');

  return `<table>
    <thead><tr>${EXCEL_HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${body}
      <tr class="total">
        <td colspan="8">TOTAL</td>
        <td>${totals.totalSubtotal}</td>
        <td>${totals.totalDelivery}</td>
        <td></td>
        <td>${totals.totalEvisceration}</td>
        <td>${totals.totalAmount}</td>
        <td colspan="${EXCEL_HEADERS.length - 12}"></td>
      </tr>
    </tbody>
  </table>`;
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

  const lists =
    exportData.splitLivreurLists && exportData.lists?.length
      ? exportData.lists
      : [
          {
            label: 'Commandes Shop',
            orders: exportData.orders,
            totalSubtotal: exportData.totalSubtotal,
            totalDelivery: exportData.totalDelivery,
            totalEvisceration: exportData.totalEvisceration,
            totalAmount: exportData.totalAmount,
            totalKg: exportData.totalKg,
            orderCount: exportData.orderCount,
          },
        ];

  const sections = lists
    .map((list) => {
      const kgLabel =
        list.totalKg > 0
          ? ` · ${Number(list.totalKg).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`
          : '';
      return `
  <h2>${escapeCsv(list.label)} (${list.orderCount} cmd${kgLabel})</h2>
  ${excelTableForRows(list.orders, list)}`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"/>
<style>
  body { font-family: Calibri, Arial, sans-serif; }
  h1 { color: #8B4513; font-size: 18pt; }
  h2 { color: #c76d2e; font-size: 13pt; margin: 18px 0 8px; }
  .meta { color: #666; font-size: 10pt; margin-bottom: 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; margin-bottom: 8px; }
  th { background: #8B4513; color: #fff; padding: 8px 6px; text-align: left; border: 1px solid #6d3610; }
  td { padding: 6px; border: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #fff9f5; }
  .total td { background: #8B4513; color: #fff; font-weight: bold; }
</style>
</head>
<body>
  <h1>RAPIDO — Commandes Shop</h1>
  <p class="meta">${escapeCsv(exportMetaLine(exportData))}</p>
  ${sections}
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
  pdf.setFontSize(8);
  setText(BRAND.goldLight);
  const headerMeta = pdf.splitTextToSize(exportMetaLine(exportData), contentW - 70);
  pdf.text(headerMeta[0] || '', margin, 19);

  pdf.setFontSize(8);
  pdf.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageW - margin, 12, { align: 'right' });
  if (headerMeta[1]) {
    pdf.text(headerMeta[1], pageW - margin, 19, { align: 'right' });
  }

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

  const pdfLists =
    exportData.splitLivreurLists && exportData.lists?.length
      ? exportData.lists
      : [{ label: null, orders: exportData.orders }];

  let globalIdx = 0;
  pdfLists.forEach((list) => {
    if (list.label) {
      addPageIfNeeded(12);
      setFill(BRAND.brown);
      pdf.roundedRect(margin, y, contentW, 9, 1.5, 1.5, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(BRAND.white);
      const kgBit =
        list.totalKg > 0
          ? ` · ${Number(list.totalKg).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`
          : '';
      pdf.text(
        `${list.label} (${list.orderCount || list.orders.length} cmd${kgBit})`,
        margin + 4,
        y + 6
      );
      y += 12;
    }

    list.orders.forEach((r) => {
      globalIdx += 1;
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
      pdf.text(`${globalIdx}. N° ${r.orderNumber}`, margin + 6, y + 5.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      setText(BRAND.muted);
      pdf.text(
        `${r.statutLabel} · Commande ${fmtDateShort(r.orderDate)} · Évisc. ${r.eviscerationLabel || 'Non'}`,
        margin + 45,
        y + 5.5
      );

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
        r.eviscerationFee > 0
          ? `Éviscération : ${fmtMoney(r.eviscerationFee)}`
          : r.eviscerationCleaning === false &&
              r.quantityUnit &&
              ['kg', 'g', 'tonne'].includes(r.quantityUnit)
            ? 'Éviscération : Non'
            : null,
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
  });

  addPageIfNeeded(14);
  setFill(BRAND.brown);
  pdf.roundedRect(margin, y, contentW, 11, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  setText(BRAND.white);
  pdf.text('TOTAL EXPORT', margin + 5, y + 7);
  const totalKgBit =
    exportData.totalKg > 0
      ? ` · ${Number(exportData.totalKg).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`
      : '';
  pdf.text(
    `${exportData.orderCount} cmd${totalKgBit}  ·  ${fmtMoney(exportData.totalAmount)}`,
    pageW - margin - 5,
    y + 7,
    { align: 'right' }
  );

  drawPageFooter();

  pdf.save(`commandes-shop-${safeFilenamePart(exportData.cityFilter || 'toutes-villes')}-${safeFilenamePart(exportData.statutLabel)}-${Date.now()}.pdf`);
}
