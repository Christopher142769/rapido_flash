function fileFieldPrefix(sectionId, blockId) {
  return `file_${sectionId}_${blockId}`;
}

function getPdfLimits(block) {
  const maxCount = Math.min(10, Math.max(1, parseInt(block?.pdfMaxCount, 10) || 1));
  const maxSizeMb = Math.min(50, Math.max(1, parseInt(block?.pdfMaxSizeMb, 10) || 15));
  return { maxCount, maxSizeMb, maxSizeBytes: maxSizeMb * 1024 * 1024 };
}

function getImageLimits() {
  return { maxCount: 1, maxSizeMb: 15, maxSizeBytes: 15 * 1024 * 1024 };
}

function getUploadLimits(block) {
  if (block?.fieldType === 'pdf') return getPdfLimits(block);
  if (block?.fieldType === 'image') return getImageLimits();
  return getImageLimits();
}

/** Fichiers reçus pour un bloc (file_sid_bid ou file_sid_bid_0, _1, …). */
function collectBlockFiles(fileMap, sectionId, blockId) {
  const prefix = fileFieldPrefix(sectionId, blockId);
  const out = [];
  if (fileMap[prefix]) out.push(fileMap[prefix]);
  const indexed = [];
  Object.keys(fileMap).forEach((key) => {
    if (!key.startsWith(`${prefix}_`)) return;
    const suffix = key.slice(prefix.length + 1);
    if (!/^\d+$/.test(suffix)) return;
    indexed.push({ index: parseInt(suffix, 10), file: fileMap[key] });
  });
  indexed.sort((a, b) => a.index - b.index);
  indexed.forEach(({ file }) => out.push(file));
  return out;
}

function validateBlockUploads(block, sectionId, blockId, fileMap, required) {
  if (block.fieldType !== 'pdf' && block.fieldType !== 'image') return null;

  const limits = getUploadLimits(block);
  const collected = collectBlockFiles(fileMap, sectionId, blockId);

  if (required && !collected.length) {
    return `Le fichier « ${block.label} » est obligatoire`;
  }
  if (collected.length > limits.maxCount) {
    const kind = block.fieldType === 'pdf' ? 'PDF' : 'fichier';
    return `Maximum ${limits.maxCount} ${kind}(s) pour « ${block.label} »`;
  }
  for (const f of collected) {
    const size = Number(f.size) || 0;
    if (size > limits.maxSizeBytes) {
      return `« ${f.fileName || 'Fichier'} » dépasse ${limits.maxSizeMb} Mo (limite du champ)`;
    }
  }
  return null;
}

module.exports = {
  fileFieldPrefix,
  getPdfLimits,
  getUploadLimits,
  collectBlockFiles,
  validateBlockUploads,
};
