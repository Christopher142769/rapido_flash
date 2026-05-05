import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function safePdfFilename(name) {
  return String(name || 'recu-rapido.pdf').replace(/[^\w.-]/g, '_');
}

/**
 * Capture un élément DOM et l’enregistre en PDF (A4, contenu mis à l’échelle sur une page).
 * Sur app native : écrit dans le cache puis ouvre le partage système (enregistrer / Drive / etc.).
 */
export async function exportElementToPdf(element, filename) {
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxW = pageW - 2 * margin;
  const maxH = pageH - 2 * margin;

  let w = maxW;
  let h = (canvas.height * w) / canvas.width;
  if (h > maxH) {
    h = maxH;
    w = (canvas.width * h) / canvas.height;
  }
  const x = margin + (maxW - w) / 2;
  pdf.addImage(imgData, 'JPEG', x, margin, w, h);

  const name = safePdfFilename(filename);

  if (Capacitor.isNativePlatform()) {
    const blob = pdf.output('blob');
    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: name,
      data: base64,
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({
      path: name,
      directory: Directory.Cache,
    });
    try {
      await Share.share({
        title: 'Reçu Rapido',
        text: 'Facture / reçu PDF',
        files: [uri],
        dialogTitle: 'Enregistrer ou partager le PDF',
      });
    } catch (e) {
      await Share.share({
        title: 'Reçu Rapido',
        url: uri,
        dialogTitle: 'Enregistrer ou partager le PDF',
      });
    }
    return;
  }

  pdf.save(name);
}
