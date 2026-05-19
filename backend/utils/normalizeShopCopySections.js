const BLOCK_TYPES = ['text', 'title', 'image', 'video', 'faq'];

function normalizeFaqItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim(),
    }))
    .filter((item) => item.question || item.answer);
}

function inferType(section) {
  if (section.type && BLOCK_TYPES.includes(section.type)) return section.type;
  if (Array.isArray(section.faqItems) && section.faqItems.length) return 'faq';
  if (section.mediaUrl) {
    const url = String(section.mediaUrl).toLowerCase();
    if (/youtube|youtu\.be|vimeo|\.mp4|\.webm/.test(url)) return 'video';
    return 'image';
  }
  if (section.title && !section.body) return 'title';
  return 'text';
}

function blockHasContent(section) {
  const type = section.type;
  if (type === 'image' || type === 'video') return !!section.mediaUrl;
  if (type === 'faq') return section.faqItems.length > 0;
  if (type === 'title') return !!section.title;
  return !!(section.title || section.body || section.icon);
}

function normalizeCopySections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((raw) => {
      const type = inferType(raw || {});
      return {
        type,
        title: String(raw?.title || '').trim(),
        body: String(raw?.body || '').trim(),
        icon: String(raw?.icon || '').trim(),
        mediaUrl: String(raw?.mediaUrl || '').trim(),
        faqItems: type === 'faq' ? normalizeFaqItems(raw?.faqItems) : [],
      };
    })
    .filter(blockHasContent);
}

function normalizeGalleryImages(images, mainImage) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const main = mainImage || list[0] || null;
  const ordered = [];
  if (main) ordered.push(main);
  for (const url of list) {
    if (url && !ordered.includes(url)) ordered.push(url);
  }
  return { images: ordered, mainImage: main || ordered[0] || null };
}

module.exports = { normalizeCopySections, normalizeGalleryImages, BLOCK_TYPES };
