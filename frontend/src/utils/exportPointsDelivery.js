import { jsPDF } from 'jspdf';
import { formatCommercialStatus } from './commercialApi';
import { formatQuantityWithUnit } from './shopQuantityUnit';

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

function safeFilenamePart(s) {
  return String(s || 'export')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
}

/** Export Excel (CSV) — feuille livreurs avec tous les détails. */
export function exportPointsToCsv(summary) {
  if (!summary?.orders?.length) return;

  const headers = [
    'Date commande',
    'N° commande',
    'Produit',
    'Quantité',
    'Prénom',
    'Nom',
    'Téléphone',
    'Ville',
    'Adresse livraison',
    'Lieu complet',
    'Statut commercial',
    'Statut commande',
    'Montant (FCFA)',
    'Livraison demandée',
    'Livraison planifiée',
    'Hors plateforme',
  ];

  const lines = [
    `Rapido — Livraisons confirmées`,
    `Produit;${summary.productName}`,
    `Période;${summary.dateFrom} au ${summary.dateTo}`,
    `Quantité totale;${formatQuantityWithUnit(summary.totalQuantity, summary.quantityUnit)}`,
    `Nombre de commandes;${summary.orderCount}`,
    '',
    headers.join(';'),
    ...summary.orders.map((r) =>
      [
        fmtDate(r.date),
        r.orderNumber,
        r.productName || summary.productName,
        r.quantityLabel || r.quantity,
        r.firstName,
        r.lastName,
        r.phone,
        r.city,
        r.address,
        r.location,
        formatCommercialStatus(r.commercialStatus),
        r.statutLabel || r.statut,
        r.amount,
        fmtDate(r.requestedDeliveryAt),
        fmtDate(r.scheduledDeliveryAt),
        r.isOffPlatform ? 'Oui' : 'Non',
      ]
        .map(escapeCsv)
        .join(';')
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `livraisons-${safeFilenamePart(summary.productName)}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export PDF — liste détaillée pour les livreurs. */
export function exportPointsToPdf(summary) {
  if (!summary?.orders?.length) return;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 10;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let y = margin;

  const addPageIfNeeded = (need = 8) => {
    if (y + need > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('Rapido — Commandes confirmées (livraison)', margin, y);
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Produit : ${summary.productName}`, margin, y);
  y += 5;
  pdf.text(
    `Période : ${new Date(summary.dateFrom).toLocaleDateString('fr-FR')} → ${new Date(summary.dateTo).toLocaleDateString('fr-FR')}`,
    margin,
    y
  );
  y += 5;
  pdf.text(
    `Total quantité : ${formatQuantityWithUnit(summary.totalQuantity, summary.quantityUnit)}  |  Commandes : ${summary.orderCount}`,
    margin,
    y
  );
  y += 8;

  summary.orders.forEach((r, idx) => {
    addPageIfNeeded(32);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(
      `${idx + 1}. N° ${r.orderNumber || '—'} — ${fmtDate(r.date)} — ${formatCommercialStatus(r.commercialStatus)}`,
      margin,
      y
    );
    y += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const lines = [
      `Client : ${r.firstName} ${r.lastName}  |  Tél. : ${r.phone}`,
      `Produit : ${r.productName || summary.productName}  |  Qté : ${r.quantityLabel || r.quantity}  |  Montant : ${Number(r.amount || 0).toLocaleString('fr-FR')} FCFA`,
      `Ville : ${r.city}`,
      `Adresse : ${r.address}`,
      `Lieu : ${r.location}`,
    ];
    if (r.scheduledDeliveryAt) {
      lines.push(`Livraison planifiée : ${fmtDate(r.scheduledDeliveryAt)}`);
    }
    if (r.requestedDeliveryAt) {
      lines.push(`Livraison demandée par le client : ${fmtDate(r.requestedDeliveryAt)}`);
    }

    lines.forEach((line) => {
      const wrapped = pdf.splitTextToSize(line, pageW - 2 * margin);
      wrapped.forEach((wl) => {
        addPageIfNeeded(5);
        pdf.text(wl, margin, y);
        y += 4;
      });
    });
    y += 3;
  });

  pdf.save(`livraisons-${safeFilenamePart(summary.productName)}-${Date.now()}.pdf`);
}
