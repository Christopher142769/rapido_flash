import { jsPDF } from 'jspdf';
import { formatCommercialStatus } from './commercialApi';
import { enrichSummaryWithCities } from './pointsByCity';
import { formatQuantityWithUnit } from './shopQuantityUnit';

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

function safeFilenamePart(s) {
  return String(s || 'export')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
}

function fmtMoney(n) {
  return `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
}

function prepareSummary(summary) {
  const enriched = enrichSummaryWithCities(summary);
  return {
    ...enriched,
    byCity: enriched.byCity?.length ? enriched.byCity : [],
  };
}

const SIGNATURE_PLACEHOLDER = '';

function rowCells(r) {
  return [
    fmtDateShort(r.confirmedAt || r.date),
    fmtDateShort(r.orderDate),
    r.orderNumber || '—',
    r.firstName,
    r.lastName,
    r.phone,
    r.city,
    r.address,
    r.location,
    r.quantityLabel || r.quantity,
    formatCommercialStatus(r.commercialStatus),
    r.amount,
    r.clientSpecifications || '—',
    SIGNATURE_PLACEHOLDER,
    fmtDate(r.requestedDeliveryAt),
    fmtDate(r.scheduledDeliveryAt),
    r.isOffPlatform ? 'Oui' : 'Non',
  ];
}

const TABLE_HEADERS = [
  'Date confirmation',
  'Date commande',
  'N° commande',
  'Prénom',
  'Nom',
  'Téléphone',
  'Ville',
  'Adresse',
  'Lieu',
  'Quantité',
  'Statut',
  'Montant (FCFA)',
  'Spécifications client',
  'Signature client',
  'Livraison demandée',
  'Livraison planifiée',
  'Hors plateforme',
];

const TABLE_COL_COUNT = TABLE_HEADERS.length;

/** Export Excel stylé (.xls HTML) — groupé par ville avec totaux. */
export function exportPointsToCsv(summary) {
  exportPointsToExcel(summary);
}

export function exportPointsToExcel(summary) {
  if (!summary?.orders?.length) return;

  const data = prepareSummary(summary);
  const cityLabel = data.cityFilter ? ` — ${data.cityFilter}` : '';
  const period = `${fmtDateShort(data.dateFrom)} → ${fmtDateShort(data.dateTo)}`;

  const cityBlocks = data.byCity
    .map((group) => {
      const rows = group.orders
        .map(
          (r) => `
        <tr>
          ${rowCells(r)
            .map((c, i) => {
              const isSignature = TABLE_HEADERS[i] === 'Signature client';
              const cell = isSignature
                ? '<td class="signature-cell">&nbsp;</td>'
                : `<td>${String(c ?? '').replace(/</g, '&lt;')}</td>`;
              return cell;
            })
            .join('')}
        </tr>`
        )
        .join('');

      return `
      <tr><td colspan="${TABLE_COL_COUNT}" class="city-header">${group.city}</td></tr>
      <tr class="col-header">
        ${TABLE_HEADERS.map((h) => `<th>${h}</th>`).join('')}
      </tr>
      ${rows}
      <tr class="city-total">
        <td colspan="9"><strong>Sous-total ${group.city}</strong></td>
        <td><strong>${group.totalQuantityLabel || formatQuantityWithUnit(group.totalQuantity, data.quantityUnit)}</strong></td>
        <td colspan="3"><strong>${group.orderCount} commande(s)</strong></td>
        <td colspan="5"><strong>${fmtMoney(group.totalAmount)}</strong></td>
      </tr>
      <tr class="spacer"><td colspan="${TABLE_COL_COUNT}"></td></tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Livraisons</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; }
  .brand-bar { background: linear-gradient(90deg, #8B4513, #c8860a); color: #fff; padding: 16px 20px; }
  .brand-bar h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
  .brand-bar p { margin: 6px 0 0; font-size: 13px; opacity: 0.95; }
  .meta { padding: 14px 20px; background: #fffcf8; border-bottom: 2px solid #e8c468; }
  .meta table td { padding: 4px 24px 4px 0; font-size: 13px; }
  .meta strong { color: #8B4513; }
  .kpi-row td { background: #faf8f5; border: 1px solid #e8e0d8; padding: 12px 16px; text-align: center; }
  .kpi-label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.06em; }
  .kpi-value { font-size: 18px; font-weight: bold; color: #c8860a; }
  table.data { width: 100%; border-collapse: collapse; margin: 0 0 8px; }
  table.data th, table.data td { border: 1px solid #e0d8d0; padding: 7px 9px; font-size: 11px; vertical-align: top; }
  .city-header { background: #8B4513; color: #fff; font-weight: bold; font-size: 14px; padding: 10px 12px !important; }
  .col-header th { background: #f5efe8; font-weight: bold; color: #555; font-size: 10px; text-transform: uppercase; }
  .city-total td { background: #fff8e8; font-weight: bold; border-top: 2px solid #c8860a; }
  .signature-cell { min-width: 90px; height: 28px; background: #fff; }
  .spacer td { border: none; height: 10px; background: #fff; }
  .grand-total td { background: #8B4513; color: #fff; font-weight: bold; font-size: 13px; padding: 12px; }
  .footer { padding: 12px 20px; font-size: 11px; color: #888; border-top: 1px solid #eee; }
</style>
</head>
<body>
  <div class="brand-bar">
    <h1>RAPIDO — Livraisons confirmées${cityLabel}</h1>
    <p>Document de synthèse pour livreurs · Commandes au statut Confirmé</p>
  </div>
  <div class="meta">
    <table>
      <tr>
        <td><strong>Produit</strong></td><td>${data.productName}</td>
        <td><strong>Période</strong></td><td>${period}</td>
      </tr>
    </table>
    <table style="margin-top:10px;width:100%">
      <tr class="kpi-row">
        <td><div class="kpi-label">Quantité totale</div><div class="kpi-value">${formatQuantityWithUnit(data.totalQuantity, data.quantityUnit)}</div></td>
        <td><div class="kpi-label">Commandes</div><div class="kpi-value">${data.orderCount}</div></td>
        <td><div class="kpi-label">Montant total</div><div class="kpi-value">${fmtMoney(data.totalAmount)}</div></td>
        <td><div class="kpi-label">Villes</div><div class="kpi-value">${data.byCity.map((g) => g.city).join(' · ') || '—'}</div></td>
      </tr>
    </table>
  </div>
  <table class="data">
    <tbody>
      ${cityBlocks}
      <tr class="grand-total">
        <td colspan="9">TOTAL GÉNÉRAL</td>
        <td>${formatQuantityWithUnit(data.totalQuantity, data.quantityUnit)}</td>
        <td colspan="3">${data.orderCount} commande(s)</td>
        <td colspan="5">${fmtMoney(data.totalAmount)}</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">Généré le ${new Date().toLocaleString('fr-FR')} — Rapido Flash</div>
</body>
</html>`;

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `livraisons-${safeFilenamePart(data.productName)}${cityLabel ? `-${safeFilenamePart(data.cityFilter)}` : ''}-${Date.now()}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export PDF — design Rapido, groupé par ville avec totaux. */
export function exportPointsToPdf(summary) {
  if (!summary?.orders?.length) return;

  const data = prepareSummary(summary);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 12;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - 2 * margin;
  let y = margin;

  const setFill = (rgb) => pdf.setFillColor(...rgb);
  const setText = (rgb) => pdf.setTextColor(...rgb);
  const setDraw = (rgb) => pdf.setDrawColor(...rgb);

  const addPageIfNeeded = (need = 10) => {
    if (y + need > pageH - margin) {
      pdf.addPage();
      y = margin;
      drawPageFooter();
    }
  };

  const drawPageFooter = () => {
    const fy = pageH - 8;
    setDraw(BRAND.goldLight);
    pdf.setLineWidth(0.3);
    pdf.line(margin, fy - 3, pageW - margin, fy - 3);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(BRAND.muted);
    pdf.text('Rapido Flash — Document confidentiel livreurs', margin, fy);
    pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageW - margin, fy, { align: 'right' });
  };

  const drawHeader = () => {
    setFill(BRAND.brown);
    pdf.rect(0, 0, pageW, 28, 'F');
    setFill(BRAND.gold);
    pdf.rect(0, 26, pageW, 2, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    setText(BRAND.white);
    const title = 'RAPIDO — Livraisons confirmées';
    pdf.text(title, margin, 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setText(BRAND.goldLight);
    const sub = data.cityFilter
      ? `Synthèse ${data.productName} · ${data.cityFilter}`
      : `Synthèse ${data.productName} · Toutes villes`;
    pdf.text(sub, margin, 19);

    pdf.setFontSize(8);
    pdf.text(
      `Période : ${fmtDateShort(data.dateFrom)} → ${fmtDateShort(data.dateTo)}`,
      pageW - margin,
      12,
      { align: 'right' }
    );
    pdf.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageW - margin, 19, { align: 'right' });

    y = 34;
  };

  const drawKpiStrip = () => {
    const kpiW = contentW / 4;
    const kpiH = 16;
    const labels = ['Quantité totale', 'Commandes', 'Montant total', 'Villes'];
    const values = [
      formatQuantityWithUnit(data.totalQuantity, data.quantityUnit),
      String(data.orderCount),
      fmtMoney(data.totalAmount),
      data.byCity.map((g) => `${g.city} (${g.totalQuantityLabel || g.totalQuantity})`).join(' · ') || '—',
    ];

    labels.forEach((label, i) => {
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
      pdf.setFontSize(i === 0 ? 10 : 9);
      setText(i === 0 ? BRAND.gold : BRAND.text);
      const val = pdf.splitTextToSize(values[i], kpiW - 8);
      pdf.text(val[0], x + 4, y + 11);
    });

    y += kpiH + 6;
  };

  const drawCityBanner = (city, qtyLabel, count, amount) => {
    addPageIfNeeded(14);
    setFill(BRAND.brown);
    pdf.roundedRect(margin, y, contentW, 10, 1.5, 1.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setText(BRAND.white);
    pdf.text(city, margin + 4, y + 6.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setText(BRAND.goldLight);
    const right = `${qtyLabel}  ·  ${count} cmd  ·  ${fmtMoney(amount)}`;
    pdf.text(right, pageW - margin - 4, y + 6.5, { align: 'right' });

    y += 12;
  };

  const drawOrderCard = (r, idx) => {
    const specs = String(r.clientSpecifications || '').trim();
    const specsLines = specs ? pdf.splitTextToSize(`Spécifications : ${specs}`, contentW - 12) : [];
    const extraH = specsLines.length * 3.5 + 5;
    const cardH = 20 + extraH;
    addPageIfNeeded(cardH + 4);
    setFill(BRAND.white);
    setDraw(BRAND.goldLight);
    pdf.setLineWidth(0.15);
    pdf.roundedRect(margin, y, contentW, cardH, 1.5, 1.5, 'FD');

    setFill(BRAND.gold);
    pdf.rect(margin, y, 3, cardH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(BRAND.brown);
    pdf.text(`${idx}. N° ${r.orderNumber || '—'}`, margin + 6, y + 5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(BRAND.muted);
    pdf.text(`${fmtDateShort(r.date)} · ${formatCommercialStatus(r.commercialStatus)}`, margin + 45, y + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(BRAND.gold);
    pdf.text(r.quantityLabel || String(r.quantity), pageW - margin - 4, y + 5, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    setText(BRAND.text);
    pdf.text(`${r.firstName} ${r.lastName}  ·  ${r.phone}`, margin + 6, y + 10);

    const addr = pdf.splitTextToSize(`Adresse : ${r.address || '—'}`, contentW * 0.55);
    pdf.text(addr[0], margin + 6, y + 14.5);

    pdf.setFontSize(7);
    setText(BRAND.muted);
    const lieu = pdf.splitTextToSize(`Lieu : ${r.location || '—'}`, contentW * 0.35);
    pdf.text(lieu[0], margin + contentW * 0.58, y + 14.5);

    let lineY = y + 18;
    if (r.scheduledDeliveryAt || r.requestedDeliveryAt) {
      const del = [
        r.scheduledDeliveryAt ? `Planifiée : ${fmtDateShort(r.scheduledDeliveryAt)}` : null,
        r.requestedDeliveryAt ? `Demandée : ${fmtDateShort(r.requestedDeliveryAt)}` : null,
      ]
        .filter(Boolean)
        .join('  ·  ');
      pdf.text(del, margin + 6, lineY);
      lineY += 3.5;
    }

    if (specsLines.length) {
      pdf.setFontSize(7);
      setText(BRAND.text);
      specsLines.forEach((line) => {
        pdf.text(line, margin + 6, lineY);
        lineY += 3.5;
      });
    }

    pdf.setFontSize(7);
    setText(BRAND.muted);
    pdf.text('Signature client : ________________________________', margin + 6, y + cardH - 2);

    y += cardH + 2.5;
  };

  const drawGrandTotal = () => {
    addPageIfNeeded(14);
    y += 2;
    setFill(BRAND.brown);
    pdf.roundedRect(margin, y, contentW, 11, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    setText(BRAND.white);
    pdf.text('TOTAL GÉNÉRAL', margin + 5, y + 7);
    pdf.text(
      `${formatQuantityWithUnit(data.totalQuantity, data.quantityUnit)}  ·  ${data.orderCount} commandes  ·  ${fmtMoney(data.totalAmount)}`,
      pageW - margin - 5,
      y + 7,
      { align: 'right' }
    );
    y += 14;
  };

  drawHeader();
  drawKpiStrip();

  let globalIdx = 0;
  data.byCity.forEach((group) => {
    const qtyLabel = group.totalQuantityLabel || formatQuantityWithUnit(group.totalQuantity, data.quantityUnit);
    drawCityBanner(group.city, qtyLabel, group.orderCount, group.totalAmount);
    group.orders.forEach((r) => {
      globalIdx += 1;
      drawOrderCard(r, globalIdx);
    });
    y += 3;
  });

  drawGrandTotal();
  drawPageFooter();

  const citySuffix = data.cityFilter ? `-${safeFilenamePart(data.cityFilter)}` : '';
  pdf.save(`livraisons-${safeFilenamePart(data.productName)}${citySuffix}-${Date.now()}.pdf`);
}
