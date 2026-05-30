export function fileFieldPrefix(sectionId, blockId) {
  return `file_${sectionId}_${blockId}`;
}

export function getPdfLimits(block) {
  const maxCount = Math.min(10, Math.max(1, Number(block?.pdfMaxCount) || 1));
  const maxSizeMb = Math.min(50, Math.max(1, Number(block?.pdfMaxSizeMb) || 15));
  return { maxCount, maxSizeMb, maxSizeBytes: maxSizeMb * 1024 * 1024 };
}

export function getImageLimits() {
  return { maxCount: 1, maxSizeMb: 15, maxSizeBytes: 15 * 1024 * 1024 };
}

export function getUploadLimits(block) {
  if (block?.fieldType === 'pdf') return getPdfLimits(block);
  if (block?.fieldType === 'image') return getImageLimits();
  return getImageLimits();
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}
