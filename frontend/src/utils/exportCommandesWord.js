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
};

const COL_COUNT = 6;

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
    @page { size: 29.7cm 21cm; margin: 1.2cm 1cm; }
    body { font-family: Calibri, Arial, sans-serif; color: ${BRAND.text}; font-size: 10pt; margin: 0; padding: 0; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    .rf-page { width: 100%; }
    .rf-brand td { background: ${BRAND.brown}; color: ${BRAND.white}; padding: 14px 16px; border: none; }
    .rf-brand h1 { margin: 0; font-size: 18pt; font-weight: bold; letter-spacing: 0.04em; }
    .rf-brand p { margin: 4px 0 0; font-size: 9.5pt; color: #f5d78a; }
    .rf-accent td { background: ${BRAND.amber}; height: 4px; padding: 0; border: none; font-size: 1px; line-height: 4px; }
    .rf-meta td { background: ${BRAND.cream}; border: 1px solid ${BRAND.border}; padding: 7px 10px; font-size: 9.5pt; vertical-align: top; }
    .rf-meta .lbl { color: ${BRAND.muted}; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; font-weight: bold; }
    .rf-meta .val { color: ${BRAND.text}; font-weight: 600; padding-top: 2px; }
    .rf-kpi td { background: #faf8f5; border: 1px solid ${BRAND.border}; padding: 10px 8px; text-align: center; vertical-align: middle; width: 25%; }
    .rf-kpi .kpi-lbl { font-size: 8pt; text-transform: uppercase; color: ${BRAND.muted}; letter-spacing: 0.07em; font-weight: bold; margin-bottom: 4px; }
    .rf-kpi .kpi-val { font-size: 14pt; font-weight: bold; color: ${BRAND.amber}; }
    .rf-kpi .kpi-sub { font-size: 8pt; color: ${BRAND.muted}; margin-top: 3px; }
    .rf-data { width: 100%; margin-top: 10px; }
    .rf-data th, .rf-data td { border: 1px solid ${BRAND.border}; padding: 7px 8px; vertical-align: top; font-size: 9.5pt; word-wrap: break-word; }
    .rf-city-h td { background: ${BRAND.brown}; color: ${BRAND.white}; font-weight: bold; font-size: 11pt; padding: 9px 10px; border: 1px solid #6d3610; }
    .rf-city-h .city-meta { font-size: 9pt; font-weight: normal; color: #f5d78a; }
    .rf-col-h th { background: ${BRAND.headerBg}; color: #444; font-size: 8.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px; text-align: left; }
    .rf-row-a td { background: ${BRAND.white}; }
    .rf-row-b td { background: ${BRAND.creamAlt}; }
    .rf-empty td { background: #fafafa; color: ${BRAND.muted}; font-style: italic; text-align: center; padding: 12px; }
    .rf-subtotal td { background: #fff8e8; font-weight: bold; font-size: 9.5pt; border-top: 2px solid ${BRAND.amber}; padding: 8px 10px; }
    .rf-spacer td { border: none; height: 8px; background: ${BRAND.white}; padding: 0; }
    .rf-grand td { background: ${BRAND.brown}; color: ${BRAND.white}; font-weight: bold; font-size: 10.5pt; padding: 11px 10px; border: 1px solid #6d3610; }
    .rf-footer td { border: none; padding: 12px 0 0; font-size: 8.5pt; color: ${BRAND.muted}; border-top: 2px solid ${BRAND.amber}; }
    .c-num { text-align: center; font-weight: bold; color: ${BRAND.muted}; width: 28px; }
    .c-nom { font-weight: 600; width: 95px; }
    .c-tel { width: 82px; white-space: nowrap; }
    .c-lieu { width: 200px; }
    .c-qty { text-align: center; font-weight: bold; color: ${BRAND.amber}; width: 52px; }
    .c-cons { width: 150px; }
  `;
}

const TABLE_HEADERS = ['N°', 'Nom', 'Téléphone', 'Lieu', 'Qté', 'Consignes'];

const COLGROUP = `<colgroup>
  <col class="c-num" style="width:28px"/>
  <col class="c-nom" style="width:95px"/>
  <col class="c-tel" style="width:82px"/>
  <col class="c-lieu" style="width:200px"/>
  <col class="c-qty" style="width:52px"/>
  <col class="c-cons" style="width:150px"/>
</colgroup>`;

function wordShell({ title, subtitle, metaRows, kpiCells, dataTableBody, grandTotalRow, footerText }) {
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
        <div class="kpi-val">${escapeHtml(k.value)}</div>
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
  <tr class="rf-brand"><td colspan="${COL_COUNT}">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
  </td></tr>
  <tr class="rf-accent"><td colspan="${COL_COUNT}">&nbsp;</td></tr>
  <tr><td colspan="${COL_COUNT}" style="height:10px;border:none;">&nbsp;</td></tr>
  <tr><td colspan="${COL_COUNT}" style="border:none;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0" class="rf-meta">
      ${metaHtml}
    </table>
  </td></tr>
  <tr><td colspan="${COL_COUNT}" style="height:8px;border:none;">&nbsp;</td></tr>
  <tr><td colspan="${COL_COUNT}" style="border:none;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0" class="rf-kpi">
      ${kpiHtml}
    </table>
  </td></tr>
  <tr><td colspan="${COL_COUNT}" style="height:10px;border:none;">&nbsp;</td></tr>
  <tr><td colspan="${COL_COUNT}" style="border:none;padding:0;">
    <table class="rf-data" width="100%" cellpadding="0" cellspacing="0">
      ${COLGROUP}
      <tbody>${dataTableBody}</tbody>
    </table>
  </td></tr>
  <tr><td colspan="${COL_COUNT}" style="height:6px;border:none;">&nbsp;</td></tr>
  <tr><td colspan="${COL_COUNT}" style="border:none;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${grandTotalRow}
    </table>
  </td></tr>
  <tr class="rf-footer"><td colspan="${COL_COUNT}">${footerText}</td></tr>
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
    <td class="c-qty">${escapeHtml(r.lineItems)}</td>
    <td class="c-cons">${escapeHtml(consignes)}</td>
  </tr>`;
}

function columnHeaderRow() {
  return `<tr class="rf-col-h">${TABLE_HEADERS.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
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

function groupRowsByCityFixed(rows, inferCity, getQuantity, getAmount, cityFilter) {
  const slots = Object.fromEntries(
    [...POINTS_CITIES, 'Autre'].map((city) => [
      city,
      { city, rows: [], totalQuantity: 0, orderCount: 0, totalAmount: 0 },
    ])
  );

  for (const row of rows) {
    const city = normalizeCity(inferCity(row));
    const g = slots[city];
    g.rows.push(row);
    g.totalQuantity += getQuantity(row);
    g.orderCount += 1;
    g.totalAmount += getAmount(row);
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

function buildCityBlock(group, rowMapper, formatGroupQuantity) {
  const qtyLabel = formatGroupQuantity(group);
  const cityTitle = group.city.toUpperCase();
  const cityMeta = `${group.orderCount} commande(s) · Qté : ${qtyLabel} · ${fmtMoney(group.totalAmount)}`;

  let body = `<tr class="rf-city-h"><td colspan="${COL_COUNT}">
    ${escapeHtml(cityTitle)}
    <span class="city-meta"> — ${escapeHtml(cityMeta)}</span>
  </td></tr>`;
  body += columnHeaderRow();

  if (!group.rows.length) {
    body += `<tr class="rf-empty"><td colspan="${COL_COUNT}">Aucune commande pour ${escapeHtml(group.city)}</td></tr>`;
  } else {
    body += group.rows.map((r, i) => rowMapper(r, i, i)).join('');
  }

  body += `<tr class="rf-subtotal">
    <td colspan="4" style="text-align:right;">Sous-total ${escapeHtml(group.city)}</td>
    <td class="c-qty">${escapeHtml(qtyLabel)}</td>
    <td>${group.orderCount} cmd · ${escapeHtml(fmtMoney(group.totalAmount))}</td>
  </tr>`;
  body += `<tr class="rf-spacer"><td colspan="${COL_COUNT}">&nbsp;</td></tr>`;

  return body;
}

function buildDataBody(groups, rowMapper, formatGroupQuantity) {
  return groups.map((g) => buildCityBlock(g, rowMapper, formatGroupQuantity)).join('');
}

function grandTotalRow(cells) {
  return `<tr class="rf-grand">${cells
    .map((c) => `<td colspan="${c.span}">${c.html}</td>`)
    .join('')}</tr>`;
}

function productQtyLabel(productLabel, fallback) {
  return productLabel && !productLabel.startsWith('Tous') ? productLabel : fallback;
}

function buildExportKpiCells({ cityFilter, cityLabel, totalQtyLabel, prodLabel, orderCount, totalAmount, cotonouQty, calaviQty }) {
  const base = [
    { label: 'Commandes', value: String(orderCount) },
    { label: 'Quantité totale', value: totalQtyLabel, sub: prodLabel },
    { label: 'Montant total', value: fmtMoney(totalAmount) },
  ];
  if (cityFilter) {
    base.push({ label: 'Ville', value: cityLabel });
  } else {
    base.push({ label: 'Répartition', value: `Cotonou ${cotonouQty}`, sub: `Calavi ${calaviQty}` });
  }
  return base;
}

export function exportShopOrdersToWord(exportData) {
  if (!exportData?.orders?.length) return;

  const rows = exportData.orders;
  const cityFilter = exportData.cityFilter || '';
  const cityLabel = exportData.cityLabel || 'Toutes les villes';
  const period = `${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`;
  const prodLabel = productQtyLabel(exportData.productLabel, 'produit');

  const totalQuantity = rows.reduce((s, r) => s + shopRowQuantity(r), 0);
  const totalQtyLabel = formatShopQuantity(totalQuantity, rows);

  const byCity = groupRowsByCityFixed(
    rows,
    inferShopRowCity,
    shopRowQuantity,
    (r) => Number(r.totalPrice || 0),
    cityFilter
  );

  const cotonouQty = formatShopQuantity(byCity[0]?.totalQuantity || 0, byCity[0]?.rows?.length ? byCity[0].rows : rows);
  const calaviQty = formatShopQuantity(
    byCity.find((g) => g.city === 'Calavi')?.totalQuantity || 0,
    byCity.find((g) => g.city === 'Calavi')?.rows?.length ? byCity.find((g) => g.city === 'Calavi').rows : rows
  );

  const formatGroupQty = (group) =>
    formatShopQuantity(group.totalQuantity, group.rows.length ? group.rows : rows);

  const dataTableBody = buildDataBody(byCity, shopTableRow, formatGroupQty);
  const subtitle = cityFilter
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
    ],
    kpiCells: buildExportKpiCells({
      cityFilter,
      cityLabel,
      totalQtyLabel,
      prodLabel,
      orderCount: exportData.orderCount,
      totalAmount: exportData.totalAmount,
      cotonouQty,
      calaviQty,
    }),
    dataTableBody,
    grandTotalRow: grandTotalRow([
      { span: 4, html: `TOTAL${cityFilter ? ` ${escapeHtml(cityLabel)}` : ' GÉNÉRAL'} — ${exportData.orderCount} commande(s)` },
      { span: 1, html: escapeHtml(totalQtyLabel) },
      { span: 1, html: escapeHtml(fmtMoney(exportData.totalAmount)) },
    ]),
    footerText: `Rapido Flash · Document éditable dans Microsoft Word · ${escapeHtml(prodLabel)}`,
  });

  downloadWord(
    html,
    `commandes-shop-${safeFilenamePart(cityFilter || 'toutes-villes')}-${safeFilenamePart(exportData.statutLabel)}-${Date.now()}.doc`
  );
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
    (r) => Number(r.total || 0),
    cityFilter
  );

  const cotonouQty = formatFilterQuantity(byCity[0]?.totalQuantity || 0);
  const calaviQty = formatFilterQuantity(byCity.find((g) => g.city === 'Calavi')?.totalQuantity || 0);
  const formatGroupQty = (group) => formatFilterQuantity(group.totalQuantity);

  const dataTableBody = buildDataBody(byCity, restaurantTableRow, formatGroupQty);
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
    kpiCells: buildExportKpiCells({
      cityFilter,
      cityLabel,
      totalQtyLabel,
      prodLabel,
      orderCount: exportData.orderCount,
      totalAmount: exportData.totalAmount,
      cotonouQty,
      calaviQty,
    }),
    dataTableBody,
    grandTotalRow: grandTotalRow([
      { span: 4, html: `TOTAL${cityFilter ? ` ${escapeHtml(cityLabel)}` : ' GÉNÉRAL'} — ${exportData.orderCount} commande(s)` },
      { span: 1, html: escapeHtml(totalQtyLabel) },
      { span: 1, html: escapeHtml(fmtMoney(exportData.totalAmount)) },
    ]),
    footerText: `Rapido Flash · Document éditable dans Microsoft Word`,
  });

  downloadWord(
    html,
    `commandes-${safeFilenamePart(exportData.restaurantLabel)}-${safeFilenamePart(cityFilter || 'toutes-villes')}-${Date.now()}.doc`
  );
}
