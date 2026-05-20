import React from 'react';
import { SHOP_BLOCK_TYPES } from '../../utils/shopProductMedia';
import ShopRichTextEditor from './ShopRichTextEditor';
import ShopImageUploadZone from './ShopImageUploadZone';
import './ShopCopyBlockEditor.css';

export default function ShopCopyBlockEditor({
  sections,
  onChange,
  onPickMedia,
  onUploadImage,
  uploadingBlockIndex = null,
  onRemove,
  onAdd,
  onMove,
}) {
  const update = (index, patch) => {
    const next = sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
  };

  const updateFaq = (secIndex, faqIndex, field, value) => {
    const sec = sections[secIndex];
    const faqItems = sec.faqItems.map((f, i) => (i === faqIndex ? { ...f, [field]: value } : f));
    update(secIndex, { faqItems });
  };

  return (
    <div className="shop-block-editor">
      {sections.map((sec, i) => (
        <div key={i} className="shop-block-editor-card">
          <div className="shop-block-editor-toolbar">
            <select
              className="shop-block-editor-select"
              value={sec.type}
              onChange={(e) => update(i, { type: e.target.value })}
            >
              {SHOP_BLOCK_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="shop-block-editor-moves">
              <button type="button" className="shop-block-editor-mini" disabled={i === 0} onClick={() => onMove(i, -1)}>
                ↑
              </button>
              <button
                type="button"
                className="shop-block-editor-mini"
                disabled={i === sections.length - 1}
                onClick={() => onMove(i, 1)}
              >
                ↓
              </button>
              {sections.length > 1 ? (
                <button type="button" className="shop-block-editor-mini shop-block-editor-mini--danger" onClick={() => onRemove(i)}>
                  ×
                </button>
              ) : null}
            </div>
          </div>

          {sec.type === 'title' || sec.type === 'text' || sec.type === 'faq' || sec.type === 'image' ? (
            <input
              className="shop-block-editor-input"
              placeholder="Titre du bloc"
              value={sec.title}
              onChange={(e) => update(i, { title: e.target.value })}
            />
          ) : null}

          {sec.type === 'text' ? (
            <>
              <input
                className="shop-block-editor-input"
                placeholder="Emoji / accroche (optionnel)"
                value={sec.icon}
                onChange={(e) => update(i, { icon: e.target.value })}
              />
              <ShopRichTextEditor
                value={sec.body}
                onChange={(html) => update(i, { body: html })}
                placeholder="Texte — sélectionnez puis gras, italique ou souligné"
              />
            </>
          ) : null}

          {sec.type === 'title' ? (
            <input
              className="shop-block-editor-input"
              placeholder="Emoji (optionnel)"
              value={sec.icon}
              onChange={(e) => update(i, { icon: e.target.value })}
            />
          ) : null}

          {(sec.type === 'image' || sec.type === 'video') && (
            <>
              {sec.type === 'image' ? (
                <input
                  className="shop-block-editor-input"
                  placeholder="Emoji / accroche (optionnel)"
                  value={sec.icon}
                  onChange={(e) => update(i, { icon: e.target.value })}
                />
              ) : null}
              <input
                className="shop-block-editor-input"
                placeholder={sec.type === 'video' ? 'URL YouTube, Vimeo ou .mp4' : 'URL image (ou galerie)'}
                value={sec.mediaUrl}
                onChange={(e) => update(i, { mediaUrl: e.target.value })}
              />
              {sec.type === 'image' && onUploadImage ? (
                <ShopImageUploadZone
                  compact
                  multiple={false}
                  uploading={uploadingBlockIndex === i}
                  label="Importer l'image depuis mon PC"
                  hint=""
                  onFiles={(files) => onUploadImage(i, files)}
                />
              ) : null}
              <button type="button" className="shop-block-editor-pick" onClick={() => onPickMedia(i)}>
                {sec.type === 'image' ? 'Ou choisir dans la galerie médias' : 'Choisir depuis la galerie médias'}
              </button>
              {sec.type === 'image' ? (
                <textarea
                  className="shop-block-editor-textarea shop-block-editor-textarea--sm"
                  placeholder="Texte sous l'image (optionnel)"
                  value={sec.body}
                  onChange={(e) => update(i, { body: e.target.value })}
                />
              ) : null}
            </>
          )}

          {sec.type === 'faq' ? (
            <div className="shop-block-editor-faq">
              {(sec.faqItems || []).map((faq, fi) => (
                <div key={fi} className="shop-block-editor-faq-row">
                  <input
                    className="shop-block-editor-input"
                    placeholder="Question"
                    value={faq.question}
                    onChange={(e) => updateFaq(i, fi, 'question', e.target.value)}
                  />
                  <textarea
                    className="shop-block-editor-textarea shop-block-editor-textarea--sm"
                    placeholder="Réponse"
                    value={faq.answer}
                    onChange={(e) => updateFaq(i, fi, 'answer', e.target.value)}
                  />
                </div>
              ))}
              <button
                type="button"
                className="shop-block-editor-mini"
                onClick={() =>
                  update(i, {
                    faqItems: [...(sec.faqItems || []), { question: '', answer: '' }],
                  })
                }
              >
                + Question FAQ
              </button>
            </div>
          ) : null}
        </div>
      ))}

      <button type="button" className="shop-block-editor-add" onClick={onAdd}>
        + Ajouter un bloc
      </button>
    </div>
  );
}
