import React, { useCallback, useEffect, useRef } from 'react';
import { sanitizeShopHtml } from '../../utils/shopRichText';
import './ShopRichTextEditor.css';

function exec(cmd) {
  document.execCommand(cmd, false, null);
}

export default function ShopRichTextEditor({ value, onChange, placeholder = 'Texte…' }) {
  const editorRef = useRef(null);

  const syncFromEditor = useCallback(() => {
    const html = sanitizeShopHtml(editorRef.current?.innerHTML || '');
    onChange(html);
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = value || '';
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
  }, [value]);

  const handleToolbar = (e, cmd) => {
    e.preventDefault();
    editorRef.current?.focus();
    exec(cmd);
    syncFromEditor();
  };

  return (
    <div className="shop-rich-editor">
      <div className="shop-rich-editor-toolbar" role="toolbar" aria-label="Mise en forme du texte">
        <button type="button" title="Gras" onMouseDown={(e) => handleToolbar(e, 'bold')}>
          <strong>B</strong>
        </button>
        <button type="button" title="Italique" onMouseDown={(e) => handleToolbar(e, 'italic')}>
          <em>I</em>
        </button>
        <button type="button" title="Souligné" onMouseDown={(e) => handleToolbar(e, 'underline')}>
          <u>U</u>
        </button>
      </div>
      <div
        ref={editorRef}
        className="shop-rich-editor-area"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={syncFromEditor}
        onBlur={syncFromEditor}
        suppressContentEditableWarning
      />
    </div>
  );
}
