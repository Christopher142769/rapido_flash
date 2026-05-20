const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P']);

export function looksLikeHtml(text) {
  return /<[a-z][\s\S]*>/i.test(String(text || ''));
}

/** Nettoie le HTML issu de l’éditeur shop (gras, italique, souligné). */
export function sanitizeShopHtml(html) {
  const raw = String(html || '').trim();
  if (!raw) return '';

  if (typeof DOMParser === 'undefined') {
    return raw.replace(/<[^>]+>/g, '');
  }

  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const walk = (node) => {
    const children = [...node.childNodes];
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        continue;
      }
      const tag = child.tagName;
      if (!ALLOWED_TAGS.has(tag)) {
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        child.remove();
        continue;
      }
      [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML.trim();
}
