import React from 'react';
import { looksLikeFormHtml, sanitizeFormHtml } from '../../utils/formRichText';

/** Affiche une description HTML sécurisée (page publique formulaire). */
export default function FormRichHtml({ html, className = 'rform-rich-html' }) {
  const raw = String(html || '').trim();
  if (!raw) return null;

  if (looksLikeFormHtml(raw)) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizeFormHtml(raw) }}
      />
    );
  }

  return <p className={className}>{raw}</p>;
}
