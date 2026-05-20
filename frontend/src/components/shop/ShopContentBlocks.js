import React, { useState } from 'react';
import { getImageUrl } from '../../utils/imagePlaceholder';
import { getVideoEmbedUrl, isDirectVideo } from '../../utils/shopProductMedia';
import ShopBlockBody from './ShopBlockBody';
import './ShopContentBlocks.css';

function BlockEyebrow({ icon }) {
  if (!icon) return null;
  return <span className="shop-pdp-block-eyebrow">{icon}</span>;
}

function FaqBlock({ section }) {
  const items = (section.faqItems || []).filter((f) => f.question || f.answer);
  const [openIndex, setOpenIndex] = useState(0);

  if (!items.length) return null;

  return (
    <section className="shop-pdp-block shop-pdp-block--faq">
      <div className="shop-pdp-block-inner">
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
      </div>
    </section>
  );
}

function VideoBlock({ section }) {
  const embed = getVideoEmbedUrl(section.mediaUrl);
  if (!embed) return null;

  const hasCopy = section.title || section.body;

  return (
    <section className="shop-pdp-block shop-pdp-block--video">
      <div className="shop-pdp-block-media">
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
      </div>
      {hasCopy ? (
        <div className="shop-pdp-block-inner shop-pdp-block-copy">
          {section.title ? <h2 className="shop-pdp-block-heading">{section.title}</h2> : null}
          {section.body ? <ShopBlockBody body={section.body} className="shop-pdp-block-caption" /> : null}
        </div>
      ) : null}
    </section>
  );
}

function ImageBlock({ section, baseUrl }) {
  if (!section.mediaUrl) return null;

  const hasCopy = section.title || section.icon || section.body;

  return (
    <section className="shop-pdp-block shop-pdp-block--image">
      <div className="shop-pdp-block-media">
        <div className="shop-pdp-block-img-wrap">
          <img
            src={getImageUrl(section.mediaUrl, baseUrl)}
            alt={section.title || 'Visuel produit'}
            className="shop-pdp-block-img"
            loading="lazy"
          />
        </div>
      </div>
      {hasCopy ? (
        <div className="shop-pdp-block-inner shop-pdp-block-copy shop-pdp-block-copy--after-media">
          <BlockEyebrow icon={section.icon} />
          {section.title ? <h2 className="shop-pdp-block-heading">{section.title}</h2> : null}
          {section.body ? <ShopBlockBody body={section.body} className="shop-pdp-block-caption" /> : null}
        </div>
      ) : null}
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
              <div className="shop-pdp-block-inner shop-pdp-block-inner--title">
                <BlockEyebrow icon={section.icon} />
                {section.title ? <h2 className="shop-pdp-block-title">{section.title}</h2> : null}
              </div>
            </section>
          );
        }

        if (type === 'image') {
          return <ImageBlock key={section._id || i} section={section} baseUrl={baseUrl} />;
        }

        if (type === 'video') {
          return <VideoBlock key={section._id || i} section={section} />;
        }

        if (type === 'faq') {
          return <FaqBlock key={section._id || i} section={section} />;
        }

        return (
          <section key={section._id || i} className="shop-pdp-block shop-pdp-block--text">
            <div className="shop-pdp-block-inner shop-pdp-block-inner--prose">
              <BlockEyebrow icon={section.icon} />
              {section.title ? <h2 className="shop-pdp-block-heading">{section.title}</h2> : null}
              {section.body ? <ShopBlockBody body={section.body} /> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
