import React from 'react';
import { looksLikeHtml, sanitizeShopHtml } from '../../utils/shopRichText';

export default function ShopBlockBody({ body, className = 'shop-pdp-block-body' }) {
  if (!body) return null;

  if (looksLikeHtml(body)) {
    return (
      <div
        className={`${className} shop-pdp-block-body--rich`}
        dangerouslySetInnerHTML={{ __html: sanitizeShopHtml(body) }}
      />
    );
  }

  return <p className={className}>{body}</p>;
}
