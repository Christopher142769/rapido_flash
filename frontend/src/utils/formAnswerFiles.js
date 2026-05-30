/** Fichiers d'une réponse (multi-PDF ou fichier unique legacy). */
export function getAnswerFiles(answer) {
  if (!answer) return [];
  if (answer.fileAttachments?.length) {
    return answer.fileAttachments.map((f) => ({
      fileUrl: f.fileUrl,
      fileName: f.fileName,
      fieldType: answer.fieldType,
    }));
  }
  if (answer.fileUrl) {
    return [
      {
        fileUrl: answer.fileUrl,
        fileName: answer.fileName,
        fieldType: answer.fieldType,
      },
    ];
  }
  return [];
}

export function inferFileKind(file) {
  const fieldType = file?.fieldType;
  if (fieldType === 'image') return 'image';
  if (fieldType === 'pdf') return 'pdf';

  const name = String(file?.fileName || '').toLowerCase();
  const url = String(file?.fileUrl || '').toLowerCase();
  const probe = `${name} ${url}`;
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i.test(probe)) return 'image';
  if (/\.pdf(\?|#|$)/i.test(probe)) return 'pdf';
  return 'file';
}

export async function downloadFormFile(fileUrl, fileName) {
  const name = fileName || 'fichier';
  try {
    const res = await fetch(fileUrl, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
