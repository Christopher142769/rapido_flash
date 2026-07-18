/** Export Word (.doc) — tableau livraison Rapido, sections Cotonou / Calavi (MS Word). */

import { formatFilterQuantity } from './commandesFilterStats';
import { inferOrderCity, POINTS_CITIES } from './pointsByCity';
import { formatQuantityWithUnit } from './shopQuantityUnit';

const BRAND = {
  brown: '#8B4513',
  amber: '#c76d2e',
  cream: '#fffbf7',
  creamAlt: '#fff9f5',
  headerBg: '#f5efe8',
  border: '#d4c4b0',
  text: '#1a1411',
  muted: '#7a6558',
  white: '#ffffff',
  green: '#2e7d32',
};

const RESTAURANT_COL_COUNT = 9;

const RESTAURANT_TABLE_HEADERS = [
  'N°',
  'Nom',
  'Téléphone',
  'Lieu',
  'Qté',
  'Consignes',
  'Montant',
  'Livraison',
  'Total',
];

const SHOP_COL_COUNT = 11;

const SHOP_TABLE_HEADERS = [
  'N°',
  'Nom',
  'Téléphone',
  'Lieu',
  'Qté',
  'Consignes',
  'Évisc. & nett.',
  'Montant évisc.',
  'Montant',
  'Livraison',
  'Total',
];

const COLGROUP_RESTAURANT = `<colgroup>
  <col style="width:24px"/>
  <col style="width:78px"/>
  <col style="width:72px"/>
  <col style="width:118px"/>
  <col style="width:36px"/>
  <col style="width:100px"/>
  <col style="width:62px"/>
  <col style="width:58px"/>
  <col style="width:62px"/>
</colgroup>`;

const COLGROUP_SHOP = `<colgroup>
  <col style="width:22px"/>
  <col style="width:72px"/>
  <col style="width:68px"/>
  <col style="width:108px"/>
  <col style="width:34px"/>
  <col style="width:88px"/>
  <col style="width:44px"/>
  <col style="width:52px"/>
  <col style="width:54px"/>
  <col style="width:50px"/>
  <col style="width:54px"/>
</colgroup>`;

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

function fmtMoneyCell(n) {
  return Number(n || 0).toLocaleString('fr-FR');
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
    @page { size: 29.7cm 21cm; margin: 1cm 0.8cm; }
    body { font-family: Calibri, Arial, sans-serif; color: ${BRAND.text}; font-size: 9.5pt; margin: 0; padding: 0; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    .rf-page { width: 100%; }
    .rf-brand td { background: ${BRAND.brown}; color: ${BRAND.white}; padding: 14px 16px; border: none; }
    .rf-brand h1 { margin: 0; font-size: 17pt; font-weight: bold; letter-spacing: 0.04em; }
    .rf-brand p { margin: 4px 0 0; font-size: 9pt; color: #f5d78a; }
    .rf-accent td { background: ${BRAND.amber}; height: 4px; padding: 0; border: none; font-size: 1px; line-height: 4px; }
    .rf-meta td { background: ${BRAND.cream}; border: 1px solid ${BRAND.border}; padding: 7px 10px; font-size: 9pt; vertical-align: top; }
    .rf-meta .lbl { color: ${BRAND.muted}; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.06em; font-weight: bold; }
    .rf-meta .val { color: ${BRAND.text}; font-weight: 600; padding-top: 2px; }
    .rf-kpi td { background: #faf8f5; border: 1px solid ${BRAND.border}; padding: 9px 6px; text-align: center; vertical-align: middle; width: 20%; }
    .rf-kpi .kpi-lbl { font-size: 7.5pt; text-transform: uppercase; color: ${BRAND.muted}; letter-spacing: 0.07em; font-weight: bold; margin-bottom: 3px; }
    .rf-kpi .kpi-val { font-size: 12pt; font-weight: bold; color: ${BRAND.amber}; }
    .rf-kpi .kpi-sub { font-size: 7.5pt; color: ${BRAND.muted}; margin-top: 2px; }
    .rf-kpi .kpi-val--total { color: ${BRAND.brown}; font-size: 13pt; }
    .rf-data { width: 100%; margin-top: 10px; }
    .rf-data th, .rf-data td { border: 1px solid ${BRAND.border}; padding: 6px 5px; vertical-align: top; font-size: 9pt; word-wrap: break-word; }
    .rf-city-h td { background: ${BRAND.brown}; color: ${BRAND.white}; font-weight: bold; font-size: 10.5pt; padding: 8px 10px; border: 1px solid #6d3610; }
    .rf-city-h .city-meta { font-size: 8.5pt; font-weight: normal; color: #f5d78a; }
    .rf-list-h td { background: ${BRAND.amber}; color: ${BRAND.white}; font-weight: bold; font-size: 11pt; padding: 10px 12px; border: 1px solid #a85a20; }
    .rf-list-h .list-meta { font-size: 8.5pt; font-weight: normal; color: #ffe8c8; }
    .rf-col-h th { background: ${BRAND.headerBg}; color: #444; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; padding: 7px 5px; text-align: left; }
    .rf-col-h .th-money { text-align: right; background: #efe6dc; color: ${BRAND.brown}; }
    .rf-col-h .th-total { background: #e8d4c0; color: ${BRAND.brown}; }
    .rf-row-a td { background: ${BRAND.white}; }
    .rf-row-b td { background: ${BRAND.creamAlt}; }
    .rf-empty td { background: #fafafa; color: ${BRAND.muted}; font-style: italic; text-align: center; padding: 12px; }
    .rf-subtotal td { background: #fff8e8; font-weight: bold; font-size: 9pt; border-top: 2px solid ${BRAND.amber}; padding: 7px 6px; }
    .rf-subtotal .sub-lbl { text-align: right; color: ${BRAND.brown}; }
    .rf-spacer td { border: none; height: 8px; background: ${BRAND.white}; padding: 0; }
    .rf-grand td { background: ${BRAND.brown}; color: ${BRAND.white}; font-weight: bold; font-size: 10pt; padding: 10px 6px; border: 1px solid #6d3610; }
    .rf-grand .g-money { text-align: right; }
    .rf-grand .g-total { background: #6d3610; text-align: right; font-size: 10.5pt; }
    .rf-footer td { border: none; padding: 12px 0 0; font-size: 8pt; color: ${BRAND.muted}; border-top: 2px solid ${BRAND.amber}; }
    .c-num { text-align: center; font-weight: bold; color: ${BRAND.muted}; }
    .c-nom { font-weight: 600; }
    .c-tel { white-space: nowrap; font-size: 8.5pt; }
    .c-qty { text-align: center; font-weight: bold; color: ${BRAND.amber}; }
    .c-cons { font-size: 8.5pt; }
    .c-money { text-align: right; white-space: nowrap; font-size: 8.5pt; color: #333; }
    .c-money-del { color: ${BRAND.muted}; }
    .c-evic { text-align: center; font-weight: bold; font-size: 8.5pt; }
    .c-money-total { text-align: right; font-weight: bold; color: ${BRAND.amber}; background: #fffbf5; font-size: 9pt; }
  `;
}

function wordShell({ title, subtitle, metaRows, kpiCells, dataTableBody, grandTotalRow, footerText, colCount, colgroup }) {
  const metaHtml = metaRows
    .map(
      (row) => `<tr>${row
        .map(
          (cell) => `<td width="25%">
          <div class="lbl">${escapeHtml(cell.label)}</div>
          <div class="val">${cell.valueHtml}</div>
        </td>`
        )
        .join('')}</tr>`
    )
    .join('');

  const kpiHtml = `<tr>${kpiCells
    .map(
      (k) => `<td>
        <div class="kpi-lbl">${escapeHtml(k.label)}</div>
        <div class="kpi-val${k.highlight ? ' kpi-val--total' : ''}">${escapeHtml(k.value)}</div>
        ${k.sub ? `<div class="kpi-sub">${escapeHtml(k.sub)}</div>` : ''}
      </td>`
    )
    .join('')}</tr>`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8"/>
<meta name="ProgId" content="Word.Document"/>
<meta name="Generator" content="Rapido Flash"/>
<!--[if gte mso 9]><xml>
<w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument>
</xml><![endif]-->
<style>${wordStyles()}</style>
</head>
<body>
<div class="Section1">
<table class="rf-page" width="100%" cellpadding="0" cellspacing="0">
  <tr class="rf-brand"><td colspan="${colCount}">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
  </td></tr>
  <tr class="rf-accent"><td colspan="${colCount}">&nbsp;</td></tr>
  <tr><td colspan="${colCount}" style="height:10px;border:none;">&nbsp;</td></tr>
  <tr><td colspan="${colCount}" style="border:none;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0" class="rf-meta">${metaHtml}</table>
  </td></tr>
  <tr><td colspan="${colCount}" style="height:8px;border:none;">&nbsp;</td></tr>
  <tr><td colspan="${colCount}" style="border:none;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0" class="rf-kpi">${kpiHtml}</table>
  </td></tr>
  <tr><td colspan="${colCount}" style="height:10px;border:none;">&nbsp;</td></tr>
  <tr><td colspan="${colCount}" style="border:none;padding:0;">
    <table class="rf-data" width="100%" cellpadding="0" cellspacing="0">
      ${colgroup}
      <tbody>${dataTableBody}</tbody>
    </table>
  </td></tr>
  <tr><td colspan="${colCount}" style="height:6px;border:none;">&nbsp;</td></tr>
  <tr><td colspan="${colCount}" style="border:none;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">${grandTotalRow}</table>
  </td></tr>
  <tr class="rf-footer"><td colspan="${colCount}">${footerText}</td></tr>
</table>
</div>
</body>
</html>`;
}

function shopLieu(r) {
  const addr = r.address && r.address !== '—' ? r.address : '';
  if (addr) return addr;
  const full = r.fullAddress || '';
  if (!full || full === '—') return '—';
  return full.replace(/^(Cotonou|Calavi)\s*[—–-]\s*/i, '').trim() || full;
}

function moneyTd(amount, className = 'c-money') {
  return `<td class="${className}">${escapeHtml(fmtMoneyCell(amount))}</td>`;
}

function shopDeliveryTd(r) {
  if (r.freeDelivery) {
    return '<td class="c-money-free">Gratuit</td>';
  }
  return moneyTd(r.deliveryFee, 'c-money c-money-del');
}

function shopTableRow(r, index, stripe) {
  const fullName = [r.firstName, r.lastName].filter((p) => p && p !== '—').join(' ') || '—';
  const consignes = r.clientSpecifications && r.clientSpecifications !== '—' ? r.clientSpecifications : '—';
  const rowClass = stripe % 2 === 0 ? 'rf-row-a' : 'rf-row-b';

  return `<tr class="${rowClass}">
    <td class="c-num">${index + 1}</td>
    <td class="c-nom">${escapeHtml(fullName)}</td>
    <td class="c-tel">${escapeHtml(r.phone)}</td>
    <td class="c-lieu">${escapeHtml(shopLieu(r))}</td>
    <td class="c-qty">${escapeHtml(r.quantityLabel)}</td>
    <td class="c-cons">${escapeHtml(consignes)}</td>
    <td class="c-evic">${escapeHtml(r.eviscerationLabel || 'Non')}</td>
    ${moneyTd(r.eviscerationFee || 0)}
    ${moneyTd(r.subtotalPrice)}
    ${shopDeliveryTd(r)}
    ${moneyTd(r.totalPrice, 'c-money c-money-total')}
  </tr>`;
}

function restaurantTableRow(r, index, stripe) {
  const consignes = r.instructions && r.instructions !== '—' ? r.instructions : '—';
  const rowClass = stripe % 2 === 0 ? 'rf-row-a' : 'rf-row-b';

  return `<tr class="${rowClass}">
    <td class="c-num">${index + 1}</td>
    <td class="c-nom">${escapeHtml(r.clientName)}</td>
    <td class="c-tel">${escapeHtml(r.phone)}</td>
    <td class="c-lieu">${escapeHtml(r.address)}</td>
    <td class="c-qty">${escapeHtml(String(r.itemQuantity || '—'))}</td>
    <td class="c-cons">${escapeHtml(consignes)}</td>
    ${moneyTd(r.subtotalPrice)}
    ${moneyTd(r.deliveryFee, 'c-money c-money-del')}
    ${moneyTd(r.total, 'c-money c-money-total')}
  </tr>`;
}

function columnHeaderRow(headers) {
  const moneyClass = (h) => {
    if (h === 'Total') return 'th-money th-total';
    if (['Montant', 'Livraison', 'Montant évisc.'].includes(h)) return 'th-money';
    return '';
  };
  return `<tr class="rf-col-h">${headers.map((h) => `<th class="${moneyClass(h)}">${escapeHtml(h)}</th>`).join('')}</tr>`;
}

function inferShopRowCity(r) {
  return inferOrderCity({
    city: r.city,
    address: r.address,
    location: r.fullAddress,
    offPlatformLocation: r.isOffPlatform ? r.fullAddress : '',
  });
}

function inferRestaurantRowCity(r) {
  return inferOrderCity({ address: r.address, location: r.address });
}

function shopRowQuantity(r) {
  const q = Number(r.quantity);
  return Number.isFinite(q) && q > 0 ? q : 0;
}

function restaurantRowQuantity(r) {
  const q = Number(r.itemQuantity);
  return Number.isFinite(q) && q > 0 ? q : 0;
}

function normalizeCity(city) {
  if (city === 'Cotonou' || city === 'Calavi') return city;
  return 'Autre';
}

function emptyCitySlot(city) {
  return {
    city,
    rows: [],
    totalQuantity: 0,
    orderCount: 0,
    totalSubtotal: 0,
    totalDelivery: 0,
    totalEvisceration: 0,
    totalAmount: 0,
  };
}

function groupRowsByCityFixed(rows, inferCity, getQuantity, getMoney, cityFilter) {
  const slots = Object.fromEntries(
    [...POINTS_CITIES, 'Autre'].map((city) => [city, emptyCitySlot(city)])
  );

  for (const row of rows) {
    const city = normalizeCity(inferCity(row));
    const g = slots[city];
    g.rows.push(row);
    g.totalQuantity += getQuantity(row);
    g.orderCount += 1;
    g.totalSubtotal += getMoney.subtotal(row);
    g.totalDelivery += getMoney.delivery(row);
    if (getMoney.evisceration) g.totalEvisceration += getMoney.evisceration(row);
    g.totalAmount += getMoney.total(row);
  }

  if (cityFilter && POINTS_CITIES.includes(cityFilter)) {
    return [slots[cityFilter]];
  }

  const result = POINTS_CITIES.map((city) => slots[city]);
  if (slots.Autre.orderCount > 0) result.push(slots.Autre);
  return result;
}

function resolveShopQuantityUnit(rows) {
  const units = [...new Set(rows.map((r) => r.quantityUnit || 'unit'))];
  return units.length === 1 ? units[0] : null;
}

function formatShopQuantity(total, rows) {
  const unit = resolveShopQuantityUnit(rows);
  return unit ? formatQuantityWithUnit(total, unit) : formatFilterQuantity(total);
}

function buildCityBlock(group, rowMapper, formatGroupQuantity, { colCount, headers, shopMode = false }) {
  const qtyLabel = formatGroupQuantity(group);
  const cityTitle = group.city.toUpperCase();
  const cityMeta = [
    `${group.orderCount} cmd`,
    `Qté ${qtyLabel}`,
    `Produits ${fmtMoney(group.totalSubtotal)}`,
    shopMode && group.totalEvisceration ? `Évisc. ${fmtMoney(group.totalEvisceration)}` : null,
    `Livraison ${fmtMoney(group.totalDelivery)}`,
    `Total ${fmtMoney(group.totalAmount)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  let body = `<tr class="rf-city-h"><td colspan="${colCount}">
    ${escapeHtml(cityTitle)}
    <span class="city-meta"> — ${escapeHtml(cityMeta)}</span>
  </td></tr>`;
  body += columnHeaderRow(headers);

  if (!group.rows.length) {
    body += `<tr class="rf-empty"><td colspan="${colCount}">Aucune commande pour ${escapeHtml(group.city)}</td></tr>`;
  } else {
    body += group.rows.map((r, i) => rowMapper(r, i, i)).join('');
  }

  body += `<tr class="rf-subtotal">
    <td colspan="4" class="sub-lbl">Sous-total ${escapeHtml(group.city)}</td>
    <td class="c-qty">${escapeHtml(qtyLabel)}</td>
    <td>&nbsp;</td>
    ${shopMode ? `<td>&nbsp;</td>${moneyTd(group.totalEvisceration || 0)}` : ''}
    <td class="c-money">${escapeHtml(fmtMoneyCell(group.totalSubtotal))}</td>
    <td class="c-money c-money-del">${escapeHtml(fmtMoneyCell(group.totalDelivery))}</td>
    <td class="c-money c-money-total">${escapeHtml(fmtMoneyCell(group.totalAmount))}</td>
  </tr>`;
  body += `<tr class="rf-spacer"><td colspan="${colCount}">&nbsp;</td></tr>`;

  return body;
}

function buildDataBody(groups, rowMapper, formatGroupQuantity, tableConfig) {
  return groups.map((g) => buildCityBlock(g, rowMapper, formatGroupQuantity, tableConfig)).join('');
}

function buildGrandTotalRow({
  label,
  qtyLabel,
  totalSubtotal,
  totalDelivery,
  totalEvisceration = 0,
  totalAmount,
  colCount,
  shopMode = false,
}) {
  return `<tr class="rf-grand">
    <td colspan="4">${escapeHtml(label)}</td>
    <td style="text-align:center;">${escapeHtml(qtyLabel)}</td>
    <td>&nbsp;</td>
    ${shopMode ? `<td>&nbsp;</td><td class="g-money">${escapeHtml(fmtMoneyCell(totalEvisceration))}</td>` : ''}
    <td class="g-money">${escapeHtml(fmtMoneyCell(totalSubtotal))}</td>
    <td class="g-money">${escapeHtml(fmtMoneyCell(totalDelivery))}</td>
    <td class="g-total">${escapeHtml(fmtMoneyCell(totalAmount))}</td>
  </tr>
  <tr><td colspan="${colCount}" style="border:none;padding:4px 0 0;font-size:8pt;color:${BRAND.muted};text-align:right;">
    Montants en FCFA · Total = Montant produits${shopMode ? ' + Éviscération' : ''} + Frais de livraison
  </td></tr>`;
}

function productQtyLabel(productLabel, fallback) {
  return productLabel && !productLabel.startsWith('Tous') ? productLabel : fallback;
}

function buildMoneyKpiCells({
  orderCount,
  totalQtyLabel,
  prodLabel,
  totalSubtotal,
  totalDelivery,
  totalEvisceration = 0,
  totalAmount,
}) {
  const cells = [
    { label: 'Commandes', value: String(orderCount) },
    { label: 'Quantité totale', value: totalQtyLabel, sub: prodLabel },
    { label: 'Montant produits', value: fmtMoney(totalSubtotal) },
    { label: 'Frais livraison', value: fmtMoney(totalDelivery) },
  ];
  if (totalEvisceration > 0) {
    cells.push({ label: 'Éviscération', value: fmtMoney(totalEvisceration) });
  }
  cells.push({ label: 'Total général', value: fmtMoney(totalAmount), highlight: true });
  return cells;
}

const SHOP_MONEY = {
  subtotal: (r) => Number(r.subtotalPrice || 0),
  delivery: (r) => Number(r.deliveryFee || 0),
  evisceration: (r) => Number(r.eviscerationFee || 0),
  total: (r) => Number(r.totalPrice || 0),
};

const RESTAURANT_MONEY = {
  subtotal: (r) => Number(r.subtotalPrice || 0),
  delivery: (r) => Number(r.deliveryFee || 0),
  total: (r) => Number(r.total || 0),
};

export function exportShopOrdersToWord(exportData) {
  if (!exportData?.orders?.length) return;

  const cityFilter = exportData.cityFilter || '';
  const cityLabel = exportData.cityLabel || 'Toutes les villes';
  const period = `${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`;
  const prodLabel = productQtyLabel(exportData.productLabel, 'produit');

  const lists =
    exportData.splitLivreurLists && exportData.lists?.length
      ? exportData.lists
      : [
          {
            label: null,
            orders: exportData.orders,
            orderCount: exportData.orderCount,
            totalKg: exportData.totalKg,
            totalSubtotal: exportData.totalSubtotal,
            totalDelivery: exportData.totalDelivery,
            totalEvisceration: exportData.totalEvisceration,
            totalAmount: exportData.totalAmount,
          },
        ];

  const formatGroupQty = (group, fallbackRows) =>
    formatShopQuantity(group.totalQuantity, group.rows.length ? group.rows : fallbackRows);

  let dataTableBody = '';
  lists.forEach((list) => {
    const rows = list.orders || [];
    if (!rows.length) return;

    if (list.label) {
      const kgLabel =
        list.totalKg > 0
          ? `${Number(list.totalKg).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`
          : formatShopQuantity(
              rows.reduce((s, r) => s + shopRowQuantity(r), 0),
              rows
            );
      dataTableBody += `<tr class="rf-list-h"><td colspan="${SHOP_COL_COUNT}">
        ${escapeHtml(list.label)}
        <span class="list-meta"> — ${list.orderCount || rows.length} cmd · Qté ${escapeHtml(kgLabel)}</span>
      </td></tr>`;
    }

    const byCity = groupRowsByCityFixed(
      rows,
      inferShopRowCity,
      shopRowQuantity,
      SHOP_MONEY,
      cityFilter
    );
    dataTableBody += buildDataBody(
      byCity,
      shopTableRow,
      (group) => formatGroupQty(group, rows),
      {
        colCount: SHOP_COL_COUNT,
        headers: SHOP_TABLE_HEADERS,
        shopMode: true,
      }
    );
  });

  const totalQuantity = exportData.orders.reduce((s, r) => s + shopRowQuantity(r), 0);
  const totalQtyLabel =
    exportData.totalKg > 0
      ? `${Number(exportData.totalKg).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`
      : formatShopQuantity(totalQuantity, exportData.orders);

  const subtitle = exportData.splitLivreurLists
    ? cityFilter
      ? `2 listes livreurs · ${cityLabel}`
      : '2 listes livreurs · Cotonou & Calavi'
    : cityFilter
      ? `Feuille de tournée · ${cityLabel}`
      : 'Feuille de tournée · Cotonou & Calavi';

  const html = wordShell({
    title: 'RAPIDO — Commandes Shop',
    subtitle,
    metaRows: [
      [
        { label: 'Période', valueHtml: escapeHtml(period) },
        { label: 'Statut', valueHtml: escapeHtml(exportData.statutLabel) },
        { label: 'Produit', valueHtml: escapeHtml(exportData.productLabel) },
        { label: 'Ville', valueHtml: escapeHtml(cityLabel) },
      ],
      [
        {
          label: 'Éviscération',
          valueHtml: escapeHtml(exportData.eviscerationLabel || 'Toutes'),
        },
        {
          label: 'Sélection kg',
          valueHtml: escapeHtml(exportData.maxKgLabel || 'Toutes quantités'),
        },
        {
          label: 'Mode',
          valueHtml: escapeHtml(
            exportData.splitLivreurLists ? '2 listes livreurs' : 'Liste unique'
          ),
        },
        { label: 'Généré le', valueHtml: escapeHtml(new Date().toLocaleString('fr-FR')) },
      ],
    ],
    kpiCells: buildMoneyKpiCells({
      orderCount: exportData.orderCount,
      totalQtyLabel,
      prodLabel,
      totalSubtotal: exportData.totalSubtotal,
      totalDelivery: exportData.totalDelivery,
      totalEvisceration: exportData.totalEvisceration,
      totalAmount: exportData.totalAmount,
    }),
    dataTableBody,
    grandTotalRow: buildGrandTotalRow({
      label: `TOTAL${cityFilter ? ` ${cityLabel}` : ' GÉNÉRAL'} — ${exportData.orderCount} commande(s)`,
      qtyLabel: totalQtyLabel,
      totalSubtotal: exportData.totalSubtotal,
      totalDelivery: exportData.totalDelivery,
      totalEvisceration: exportData.totalEvisceration,
      totalAmount: exportData.totalAmount,
      colCount: SHOP_COL_COUNT,
      shopMode: true,
    }),
    footerText: `Rapido Flash · Document éditable dans Microsoft Word · ${escapeHtml(prodLabel)}`,
    colCount: SHOP_COL_COUNT,
    colgroup: COLGROUP_SHOP,
  });

  const wordNameParts = ['commandes-shop'];
  if (exportData.filenameTag) wordNameParts.push(safeFilenamePart(exportData.filenameTag));
  wordNameParts.push(
    safeFilenamePart(cityFilter || 'toutes-villes'),
    safeFilenamePart(exportData.statutLabel),
    String(Date.now())
  );
  downloadWord(html, `${wordNameParts.join('-')}.doc`);
}

export function exportRestaurantCommandesToWord(exportData) {
  if (!exportData?.orders?.length) return;

  const rows = exportData.orders;
  const cityFilter = exportData.cityFilter || '';
  const cityLabel = exportData.cityLabel || 'Toutes les villes';
  const period = `${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`;
  const prodLabel = productQtyLabel(exportData.productLabel, 'articles');

  const totalQuantity = rows.reduce((s, r) => s + restaurantRowQuantity(r), 0);
  const totalQtyLabel = formatFilterQuantity(totalQuantity);

  const byCity = groupRowsByCityFixed(
    rows,
    inferRestaurantRowCity,
    restaurantRowQuantity,
    RESTAURANT_MONEY,
    cityFilter
  );

  const formatGroupQty = (group) => formatFilterQuantity(group.totalQuantity);

  const dataTableBody = buildDataBody(byCity, restaurantTableRow, formatGroupQty, {
    colCount: RESTAURANT_COL_COUNT,
    headers: RESTAURANT_TABLE_HEADERS,
    shopMode: false,
  });
  const subtitle = cityFilter
    ? `Feuille de tournée · ${cityLabel}`
    : 'Feuille de tournée · Cotonou & Calavi';

  const html = wordShell({
    title: 'RAPIDO — Commandes',
    subtitle,
    metaRows: [
      [
        { label: 'Période', valueHtml: escapeHtml(period) },
        { label: 'Entreprise', valueHtml: escapeHtml(exportData.restaurantLabel) },
        { label: 'Statut', valueHtml: escapeHtml(exportData.statutLabel) },
        { label: 'Ville', valueHtml: escapeHtml(cityLabel) },
      ],
      [
        { label: 'Article', valueHtml: escapeHtml(exportData.productLabel) },
        { label: 'Généré le', valueHtml: escapeHtml(new Date().toLocaleString('fr-FR')) },
        { label: '', valueHtml: '' },
        { label: '', valueHtml: '' },
      ],
    ],
    kpiCells: buildMoneyKpiCells({
      orderCount: exportData.orderCount,
      totalQtyLabel,
      prodLabel,
      totalSubtotal: exportData.totalSubtotal,
      totalDelivery: exportData.totalDelivery,
      totalAmount: exportData.totalAmount,
    }),
    dataTableBody,
    grandTotalRow: buildGrandTotalRow({
      label: `TOTAL${cityFilter ? ` ${cityLabel}` : ' GÉNÉRAL'} — ${exportData.orderCount} commande(s)`,
      qtyLabel: totalQtyLabel,
      totalSubtotal: exportData.totalSubtotal,
      totalDelivery: exportData.totalDelivery,
      totalAmount: exportData.totalAmount,
      colCount: RESTAURANT_COL_COUNT,
      shopMode: false,
    }),
    footerText: 'Rapido Flash · Document éditable dans Microsoft Word',
    colCount: RESTAURANT_COL_COUNT,
    colgroup: COLGROUP_RESTAURANT,
  });

  downloadWord(
    html,
    `commandes-${safeFilenamePart(exportData.restaurantLabel)}-${safeFilenamePart(cityFilter || 'toutes-villes')}-${Date.now()}.doc`
  );
}
