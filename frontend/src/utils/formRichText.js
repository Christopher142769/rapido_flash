const ALLOWED_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'BR',
  'P',
  'A',
  'SPAN',
  'SMALL',
]);

const ALLOWED_CLASSES = new Set([
  'rform-txt-lowercase',
  'rform-txt-uppercase',
  'rform-txt-capitalize',
  'rform-txt-small',
]);

export function looksLikeFormHtml(text) {
  return /<[a-z][\s\S]*>/i.test(String(text || ''));
}

function sanitizeHref(href) {
  const s = String(href || '').trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 500);
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') {
      return u.href.slice(0, 500);
    }
  } catch {
    /* ignore */
  }
  return '';
}

/** Nettoie le HTML des descriptions formulaire (gras, italique, liens, casse). */
export function sanitizeFormHtml(html) {
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

      [...child.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (tag === 'A' && name === 'href') {
          const safe = sanitizeHref(attr.value);
          if (safe) child.setAttribute('href', safe);
          else child.removeAttribute('href');
          return;
        }
        if (tag === 'A' && (name === 'target' || name === 'rel')) {
          return;
        }
        if (tag === 'SPAN' && name === 'class') {
          const classes = attr.value
            .split(/\s+/)
            .filter((c) => ALLOWED_CLASSES.has(c));
          if (classes.length) child.setAttribute('class', classes.join(' '));
          else child.removeAttribute('class');
          return;
        }
        child.removeAttribute(attr.name);
      });

      if (tag === 'A') {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
        if (!child.getAttribute('href')) {
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          child.remove();
          continue;
        }
      }

      walk(child);
    }
  };

  walk(doc.body);
  return doc.body.innerHTML.trim();
}
