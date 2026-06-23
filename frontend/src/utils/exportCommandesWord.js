/** Export Word (.doc) éditable — charte Rapido, une fiche claire par commande. */

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
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; color: ${BRAND.text}; font-size: 11pt; line-height: 1.45; margin: 0; padding: 24px; }
    h1 { font-size: 22pt; font-weight: bold; color: ${BRAND.white}; margin: 0; letter-spacing: 0.04em; }
    .rf-header { background: ${BRAND.brown}; padding: 18px 22px 16px; margin: -24px -24px 20px; }
    .rf-header-accent { height: 4px; background: ${BRAND.amber}; margin: 0 -24px 20px; }
    .rf-subtitle { color: #f5d78a; font-size: 10pt; margin: 6px 0 0; }
    .rf-meta { color: ${BRAND.muted}; font-size: 9.5pt; margin: 0 0 18px; }
    .rf-kpi-table { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 22px; }
    .rf-kpi-cell { background: ${BRAND.cream}; border: 1px solid ${BRAND.border}; padding: 12px 14px; vertical-align: top; width: 25%; }
    .rf-kpi-label { font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: ${BRAND.muted}; margin: 0 0 4px; }
    .rf-kpi-value { font-size: 13pt; font-weight: bold; color: ${BRAND.amber}; margin: 0; }
    .rf-order { margin-bottom: 22px; page-break-inside: avoid; }
    .rf-order-head { background: ${BRAND.brown}; color: ${BRAND.white}; padding: 10px 14px; }
    .rf-order-head-table { width: 100%; border-collapse: collapse; }
    .rf-order-num { font-size: 12pt; font-weight: bold; margin: 0; }
    .rf-order-meta { font-size: 9pt; color: #f5d78a; margin: 2px 0 0; }
    .rf-order-total { font-size: 13pt; font-weight: bold; text-align: right; color: ${BRAND.white}; margin: 0; }
    .rf-order-body { border: 1px solid ${BRAND.border}; border-top: none; background: ${BRAND.white}; }
    .rf-section { padding: 0; }
    .rf-section-title { background: ${BRAND.creamAlt}; color: ${BRAND.brown}; font-size: 8.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; padding: 7px 14px; margin: 0; border-bottom: 1px solid ${BRAND.border}; }
    .rf-fields { width: 100%; border-collapse: collapse; }
    .rf-fields td { padding: 8px 14px; border-bottom: 1px solid ${BRAND.border}; vertical-align: top; font-size: 10pt; }
    .rf-fields tr:last-child td { border-bottom: none; }
    .rf-label { width: 32%; color: ${BRAND.muted}; font-weight: 600; }
    .rf-value { color: ${BRAND.text}; font-weight: 600; }
    .rf-value-strong { color: ${BRAND.amber}; font-weight: bold; }
    .rf-notes { background: ${BRAND.cream}; padding: 10px 14px; font-size: 10pt; border-top: 1px solid ${BRAND.border}; white-space: pre-wrap; }
    .rf-footer { margin-top: 24px; padding-top: 12px; border-top: 2px solid ${BRAND.amber}; color: ${BRAND.muted}; font-size: 8.5pt; }
    .rf-total-bar { background: ${BRAND.brown}; color: ${BRAND.white}; padding: 12px 16px; margin-top: 8px; font-weight: bold; font-size: 11pt; }
  `;
}

function wordShell({ title, subtitle, metaHtml, kpiHtml, ordersHtml, totalHtml }) {
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
  ${kpiHtml}
  ${ordersHtml}
  ${totalHtml}
  <p class="rf-footer">Document généré le ${escapeHtml(new Date().toLocaleString('fr-FR'))} · Rapido Flash · Éditable dans Microsoft Word</p>
</body>
</html>`;
}

function fieldRow(label, value, { strong = false } = {}) {
  return `<tr>
    <td class="rf-label">${escapeHtml(label)}</td>
    <td class="rf-value${strong ? ' rf-value-strong' : ''}">${escapeHtml(value)}</td>
  </tr>`;
}

function section(title, rowsHtml) {
  return `<div class="rf-section">
    <p class="rf-section-title">${escapeHtml(title)}</p>
    <table class="rf-fields"><tbody>${rowsHtml}</tbody></table>
  </div>`;
}

function kpiRow(cells) {
  const tds = cells
    .map(
      (c) => `<td class="rf-kpi-cell">
        <p class="rf-kpi-label">${escapeHtml(c.label)}</p>
        <p class="rf-kpi-value">${escapeHtml(c.value)}</p>
      </td>`
    )
    .join('');
  return `<table class="rf-kpi-table"><tr>${tds}</tr></table>`;
}

function shopOrderCard(r, index) {
  const dates = [
    r.confirmedAt ? `Confirmée : ${fmtDateShort(r.confirmedAt)}` : null,
    r.requestedDeliveryAt ? `Livraison demandée : ${fmtDateShort(r.requestedDeliveryAt)}` : null,
    r.scheduledDeliveryAt ? `Relance : ${fmtDateShort(r.scheduledDeliveryAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const financeRows = [
    fieldRow('Prix unitaire', fmtMoney(r.unitPrice)),
    fieldRow('Sous-total produit', fmtMoney(r.subtotalPrice)),
    fieldRow(
      'Frais de livraison',
      r.freeDelivery ? 'Gratuite (promo)' : fmtMoney(r.deliveryFee)
    ),
    fieldRow('Total à payer', fmtMoney(r.totalPrice), { strong: true }),
  ];
  if (r.isPromoLive) {
    financeRows.push(fieldRow('Promotion', `-${r.discountPercent}%`));
  }

  return `<div class="rf-order">
    <div class="rf-order-head">
      <table class="rf-order-head-table">
        <tr>
          <td>
            <p class="rf-order-num">Commande ${index + 1} — N° ${escapeHtml(r.orderNumber)}</p>
            <p class="rf-order-meta">${escapeHtml(r.statutLabel)} · ${escapeHtml(fmtDateShort(r.orderDate))}${r.isOffPlatform ? ' · Hors plateforme' : ''}</p>
          </td>
          <td><p class="rf-order-total">${escapeHtml(fmtMoney(r.totalPrice))}</p></td>
        </tr>
      </table>
    </div>
    <div class="rf-order-body">
      ${section(
        'Produit commandé',
        [
          fieldRow('Produit', r.productName),
          fieldRow('Quantité', r.quantityLabel),
          fieldRow('Fiche produit', r.slug),
        ].join('')
      )}
      ${section(
        'Client',
        [
          fieldRow('Prénom', r.firstName),
          fieldRow('Nom', r.lastName),
          fieldRow('Téléphone / WhatsApp', r.phone),
          fieldRow('Ville', r.city),
        ].join('')
      )}
      ${section('Livraison', [fieldRow('Adresse complète', r.fullAddress), dates ? fieldRow('Dates', dates) : ''].filter(Boolean).join(''))}
      ${section('Paiement & montants', financeRows.join(''))}
      ${r.clientSpecifications && r.clientSpecifications !== '—'
        ? `<div class="rf-notes"><strong>Spécifications / instructions :</strong><br/>${escapeHtml(r.clientSpecifications)}</div>`
        : ''}
      <div class="rf-notes" style="background:#fff;border-top:1px solid ${BRAND.border};font-size:9pt;color:${BRAND.muted};">
        ${escapeHtml(r.paymentMode)}
      </div>
    </div>
  </div>`;
}

function restaurantOrderCard(r, index) {
  return `<div class="rf-order">
    <div class="rf-order-head">
      <table class="rf-order-head-table">
        <tr>
          <td>
            <p class="rf-order-num">Commande ${index + 1} — #${escapeHtml(r.orderNumber)}</p>
            <p class="rf-order-meta">${escapeHtml(r.statutLabel)} · ${escapeHtml(fmtDateShort(r.orderDate))} · ${escapeHtml(r.restaurantName)}</p>
          </td>
          <td><p class="rf-order-total">${escapeHtml(fmtMoney(r.total))}</p></td>
        </tr>
      </table>
    </div>
    <div class="rf-order-body">
      ${section(
        'Client',
        [
          fieldRow('Nom', r.clientName),
          fieldRow('Email', r.clientEmail),
          fieldRow('Téléphone', r.phone),
        ].join('')
      )}
      ${section(
        'Livraison',
        [fieldRow('Adresse', r.address), fieldRow('Instructions livreur', r.instructions)].join('')
      )}
      ${section('Articles commandés', [fieldRow('Détail', r.lineItems)].join(''))}
      ${section('Montant', [fieldRow('Total', fmtMoney(r.total), { strong: true })].join(''))}
    </div>
  </div>`;
}

export function exportShopOrdersToWord(exportData) {
  if (!exportData?.orders?.length) return;

  const period = `${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`;
  const metaHtml = `Période : <strong>${escapeHtml(period)}</strong> · Statut : ${escapeHtml(exportData.statutLabel)} · Produit : ${escapeHtml(exportData.productLabel)} · ${exportData.orderCount} commande(s)`;

  const kpiHtml = kpiRow([
    { label: 'Commandes', value: String(exportData.orderCount) },
    { label: 'Sous-total produits', value: fmtMoney(exportData.totalSubtotal) },
    { label: 'Frais livraison', value: fmtMoney(exportData.totalDelivery) },
    { label: 'Total à payer', value: fmtMoney(exportData.totalAmount) },
  ]);

  const ordersHtml = exportData.orders.map(shopOrderCard).join('');
  const totalHtml = `<div class="rf-total-bar">TOTAL EXPORT — ${exportData.orderCount} commande(s) · ${escapeHtml(fmtMoney(exportData.totalAmount))}</div>`;

  const html = wordShell({
    title: 'RAPIDO — Commandes Shop',
    subtitle: 'Export détaillé · document éditable',
    metaHtml,
    kpiHtml,
    ordersHtml,
    totalHtml,
  });

  downloadWord(html, `commandes-shop-${safeFilenamePart(exportData.statutLabel)}-${Date.now()}.doc`);
}

export function exportRestaurantCommandesToWord(exportData) {
  if (!exportData?.orders?.length) return;

  const period = `${fmtDateShort(exportData.dateFrom)} → ${fmtDateShort(exportData.dateTo)}`;
  const metaHtml = `Période : <strong>${escapeHtml(period)}</strong> · ${escapeHtml(exportData.restaurantLabel)} · Statut : ${escapeHtml(exportData.statutLabel)} · Article : ${escapeHtml(exportData.productLabel)} · ${exportData.orderCount} commande(s)`;

  const kpiHtml = kpiRow([
    { label: 'Commandes', value: String(exportData.orderCount) },
    { label: 'Montant total', value: fmtMoney(exportData.totalAmount) },
  ]);

  const ordersHtml = exportData.orders.map(restaurantOrderCard).join('');
  const totalHtml = `<div class="rf-total-bar">TOTAL EXPORT — ${exportData.orderCount} commande(s) · ${escapeHtml(fmtMoney(exportData.totalAmount))}</div>`;

  const html = wordShell({
    title: 'RAPIDO — Commandes',
    subtitle: 'Export détaillé · document éditable',
    metaHtml,
    kpiHtml,
    ordersHtml,
    totalHtml,
  });

  downloadWord(html, `commandes-${safeFilenamePart(exportData.restaurantLabel)}-${Date.now()}.doc`);
}
