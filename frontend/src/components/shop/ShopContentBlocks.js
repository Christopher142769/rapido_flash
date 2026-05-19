import React, { useState } from 'react';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { getVideoEmbedUrl, isDirectVideo } from '../../utils/shopProductMedia';
import './ShopContentBlocks.css';

function FaqBlock({ section }) {
  const items = (section.faqItems || []).filter((f) => f.question || f.answer);
  const [openIndex, setOpenIndex] = useState(0);

  if (!items.length) return null;

  return (
    <section className="shop-pdp-block shop-pdp-block--faq">
      {section.title ? <h2 className="shop-pdp-block-heading">{section.title}</h2> : null}
      <div className="shop-pdp-faq-list">
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={i} className={`shop-pdp-faq-item${open ? ' is-open' : ''}`}>
              <button
                type="button"
                className="shop-pdp-faq-q"
                onClick={() => setOpenIndex(open ? -1 : i)}
                aria-expanded={open}
              >
                <span>{item.question}</span>
                <span className="shop-pdp-faq-icon" aria-hidden>
                  {open ? '−' : '+'}
                </span>
              </button>
              {open ? <div className="shop-pdp-faq-a">{item.answer}</div> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function VideoBlock({ section, baseUrl }) {
  const embed = getVideoEmbedUrl(section.mediaUrl);
  if (!embed) return null;

  return (
    <section className="shop-pdp-block shop-pdp-block--video">
      {section.title ? <h2 className="shop-pdp-block-heading">{section.title}</h2> : null}
      <div className="shop-pdp-video-wrap">
        {isDirectVideo(section.mediaUrl) ? (
          <video src={embed} controls playsInline className="shop-pdp-video-native" />
        ) : (
          <iframe
            src={embed}
            title={section.title || 'Vidéo produit'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </section>
  );
}

export default function ShopContentBlocks({ sections, baseUrl }) {
  if (!sections?.length) return null;

  return (
    <div className="shop-pdp-story">
      {sections.map((section, i) => {
        const type = section.type || 'text';

        if (type === 'title') {
          return (
            <section key={section._id || i} className="shop-pdp-block shop-pdp-block--title">
              {section.icon ? <span className="shop-pdp-block-eyebrow">{section.icon}</span> : null}
              <h2 className="shop-pdp-block-title">{section.title}</h2>
            </section>
          );
        }

        if (type === 'image' && section.mediaUrl) {
          return (
            <section key={section._id || i} className="shop-pdp-block shop-pdp-block--image">
              {section.title ? <h2 className="shop-pdp-block-heading">{section.title}</h2> : null}
              <div className="shop-pdp-block-img-wrap">
                <img
                  src={getImageUrl(section.mediaUrl, baseUrl)}
                  alt={section.title || ''}
                  className="shop-pdp-block-img"
                  loading="lazy"
                />
              </div>
              {section.body ? <p className="shop-pdp-block-caption">{section.body}</p> : null}
            </section>
          );
        }

        if (type === 'video') {
          return <VideoBlock key={section._id || i} section={section} baseUrl={baseUrl} />;
        }

        if (type === 'faq') {
          return <FaqBlock key={section._id || i} section={section} />;
        }

        return (
          <section key={section._id || i} className="shop-pdp-block shop-pdp-block--text">
            {section.icon ? <span className="shop-pdp-block-eyebrow">{section.icon}</span> : null}
            {section.title ? <h2 className="shop-pdp-block-heading">{section.title}</h2> : null}
            {section.body ? <p className="shop-pdp-block-body">{section.body}</p> : null}
          </section>
        );
      })}
    </div>
  );
}
