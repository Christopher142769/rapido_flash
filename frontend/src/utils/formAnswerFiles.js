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
  // Le nom du fichier prime : un champ « CV » accepte PDF et photos.
  const name = String(file?.fileName || '').toLowerCase();
  const url = String(file?.fileUrl || '').toLowerCase();
  const probe = `${name} ${url}`;
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$|\s)/i.test(probe)) return 'image';
  if (/\.pdf(\?|#|$|\s)/i.test(probe)) return 'pdf';
  if (file?.fieldType === 'image') return 'image';
  if (file?.fieldType === 'pdf') return 'pdf';
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
    // Fichiers stockés en base : ?download=1 force le téléchargement côté serveur.
    a.href = /\/api\/custom-forms\/files\//.test(fileUrl) ? `${fileUrl}?download=1` : fileUrl;
    a.download = name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
