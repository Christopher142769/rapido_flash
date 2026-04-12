import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Capture un élément DOM et l’enregistre en PDF (A4, contenu mis à l’échelle sur une page).
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
  pdf.save(filename);
}
