/** Export bilan rows as CSV (ouvrable dans Excel). */
export function exportBilanToCsv(rows, filename = 'bilan-commercial.csv') {
  const headers = [
    'Date',
    'Produit',
    'Quantité',
    'N° commande',
    'Lieu',
    'Statut',
    'Montant (FCFA)',
    'Hors plateforme',
    'Client',
    'Téléphone',
    'Date livraison prévue',
  ];

  const escape = (v) => {
    const s = String(v ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const fmtDate = (d) => {
    if (!d) return '';
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    return x.toLocaleString('fr-FR');
  };

  const statusLabel = (s) => {
    if (s === 'livree') return 'Livré';
    if (s === 'relance') return 'Relance';
    if (s === 'commande') return 'Commande';
    return s;
  };

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        fmtDate(r.date),
        r.productName,
        r.quantityLabel || r.quantity,
        r.orderNumber,
        r.location,
        statusLabel(r.commercialStatus),
        r.amount,
        r.isOffPlatform ? 'Oui' : 'Non',
        r.customerName || '',
        r.customerPhone || '',
        fmtDate(r.scheduledDeliveryAt),
      ]
        .map(escape)
        .join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
