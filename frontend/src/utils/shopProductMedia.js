/** Galerie produit : image principale en premier, sans doublons. */
export function getProductGallery(product) {
  const main = product?.mainImage || null;
  const extra = Array.isArray(product?.images) ? product.images : [];
  const urls = [];
  if (main) urls.push(main);
  for (const url of extra) {
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

export function getVideoEmbedUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;

  const ytShort = raw.match(/youtu\.be\/([\w-]+)/i);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;

  const ytWatch = raw.match(/[?&]v=([\w-]+)/i);
  if (ytWatch && /youtube|youtu\.be/i.test(raw)) {
    return `https://www.youtube.com/embed/${ytWatch[1]}`;
  }

  const vimeo = raw.match(/vimeo\.com\/(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  if (/\.(mp4|webm|ogg)(\?|$)/i.test(raw)) return raw;

  return null;
}

export function isDirectVideo(url) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(String(url || ''));
}

export const SHOP_BLOCK_TYPES = [
  { id: 'text', label: 'Texte' },
  { id: 'title', label: 'Titre' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Vidéo' },
  { id: 'faq', label: 'FAQ' },
];

export function emptyCopyBlock(type = 'text') {
  return {
    type,
    title: '',
    body: '',
    icon: '',
    mediaUrl: '',
    faqItems: [{ question: '', answer: '' }],
  };
}

export function normalizeCopyBlockForForm(section) {
  const type = section?.type || 'text';
  return {
    type: SHOP_BLOCK_TYPES.some((t) => t.id === type) ? type : 'text',
    title: section?.title || '',
    body: section?.body || '',
    icon: section?.icon || '',
    mediaUrl: section?.mediaUrl || '',
    faqItems:
      Array.isArray(section?.faqItems) && section.faqItems.length
        ? section.faqItems.map((f) => ({
            question: f.question || '',
            answer: f.answer || '',
          }))
        : [{ question: '', answer: '' }],
  };
}
