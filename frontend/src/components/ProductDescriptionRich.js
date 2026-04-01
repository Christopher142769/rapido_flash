import React from 'react';
import './ProductDescriptionRich.css';

function isSafeHref(href) {
  const u = String(href || '').trim();
  return /^https?:\/\//i.test(u);
}

/** Gras : **texte** ou __texte__. Liens : [libellé](https://...) */
function parseBoldSegments(text, keyPrefix) {
  if (text === '' || text == null) return [];
  const parts = String(text).split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts
    .filter((p) => p !== '')
    .map((part, idx) => {
      const ms = part.match(/^\*\*([^*]+)\*\*$/);
      if (ms) return <strong key={`${keyPrefix}-s-${idx}`}>{ms[1]}</strong>;
      const mu = part.match(/^__([^_]+)__$/);
      if (mu) return <strong key={`${keyPrefix}-u-${idx}`}>{mu[1]}</strong>;
      return <React.Fragment key={`${keyPrefix}-f-${idx}`}>{part}</React.Fragment>;
    });
}

function parseInline(text, keyBase) {
  const s = String(text ?? '');
  const re = /\[([^\]]*)\]\(([^)]+)\)/g;
  const out = [];
  let last = 0;
  let m;
  let ki = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      out.push(...parseBoldSegments(s.slice(last, m.index), `${keyBase}-t-${ki}`));
    }
    const href = m[2].trim();
    if (isSafeHref(href)) {
      out.push(
        <a
          key={`${keyBase}-a-${ki}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="product-description-rich__link"
        >
          {parseBoldSegments(m[1], `${keyBase}-l-${ki}`)}
        </a>
      );
    } else {
      out.push(...parseBoldSegments(m[0], `${keyBase}-e-${ki}`));
    }
    ki += 1;
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    out.push(...parseBoldSegments(s.slice(last), `${keyBase}-end`));
  }
  if (out.length === 0) {
    return parseBoldSegments(s, keyBase);
  }
  return out;
}

/**
 * Affiche une description produit : paragraphes (double saut de ligne),
 * sauts simples → retour à la ligne, **gras** / __gras__, [texte](https://...).
 */
const ProductDescriptionRich = ({ text, className = '' }) => {
  const raw = String(text ?? '').replace(/^\s+/, '').replace(/\s+$/, '');
  if (!raw) return null;

  const blocks = raw.split(/\n\n+/);

  return (
    <div className={`product-description-rich ${className}`.trim()}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        return (
          <p key={bi} className="product-description-rich__p">
            {lines.map((line, li) => (
              <React.Fragment key={li}>
                {li > 0 ? <br /> : null}
                {parseInline(line, `b${bi}-l${li}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};

export default ProductDescriptionRich;
