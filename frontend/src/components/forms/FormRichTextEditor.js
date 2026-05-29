import React, { useCallback, useEffect, useRef } from 'react';
import { sanitizeFormHtml } from '../../utils/formRichText';
import './FormRichTextEditor.css';

function exec(cmd, value = null) {
  document.execCommand(cmd, false, value);
}

function wrapSelectionWithClass(className) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;
  try {
    const fragment = range.extractContents();
    const span = document.createElement('span');
    span.className = className;
    span.appendChild(fragment);
    range.insertNode(span);
    sel.removeAllRanges();
    return true;
  } catch {
    return false;
  }
}

export default function FormRichTextEditor({ value, onChange, placeholder = 'Saisissez votre texte…', minHeight = 100 }) {
  const editorRef = useRef(null);

  const syncFromEditor = useCallback(() => {
    const html = sanitizeFormHtml(editorRef.current?.innerHTML || '');
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

  const handleToolbar = (e, action) => {
    e.preventDefault();
    editorRef.current?.focus();

    if (action === 'link') {
      const sel = window.getSelection();
      if (!sel?.rangeCount || sel.isCollapsed) {
        window.alert('Sélectionnez d’abord le texte à transformer en lien.');
        return;
      }
      const url = window.prompt('URL du lien', 'https://');
      if (!url) return;
      exec('createLink', url.trim());
    } else if (action === 'unlink') {
      exec('unlink');
    } else if (action === 'lowercase') {
      wrapSelectionWithClass('rform-txt-lowercase');
    } else if (action === 'uppercase') {
      wrapSelectionWithClass('rform-txt-uppercase');
    } else if (action === 'capitalize') {
      wrapSelectionWithClass('rform-txt-capitalize');
    } else if (action === 'small') {
      wrapSelectionWithClass('rform-txt-small');
    } else {
      exec(action);
    }

    syncFromEditor();
  };

  return (
    <div className="form-rich-editor">
      <div className="form-rich-editor-toolbar" role="toolbar" aria-label="Mise en forme">
        <button type="button" title="Gras — sélectionnez du texte puis cliquez" onMouseDown={(e) => handleToolbar(e, 'bold')}>
          <strong>B</strong>
        </button>
        <button type="button" title="Italique" onMouseDown={(e) => handleToolbar(e, 'italic')}>
          <em>I</em>
        </button>
        <button type="button" title="Souligné" onMouseDown={(e) => handleToolbar(e, 'underline')}>
          <u>U</u>
        </button>
        <span className="form-rich-editor-sep" aria-hidden />
        <button type="button" title="Lien" onMouseDown={(e) => handleToolbar(e, 'link')}>
          Lien
        </button>
        <button type="button" title="Retirer le lien" onMouseDown={(e) => handleToolbar(e, 'unlink')}>
          ⨯
        </button>
        <span className="form-rich-editor-sep" aria-hidden />
        <button type="button" title="Minuscules" onMouseDown={(e) => handleToolbar(e, 'lowercase')}>
          aa
        </button>
        <button type="button" title="Majuscules" onMouseDown={(e) => handleToolbar(e, 'uppercase')}>
          AA
        </button>
        <button type="button" title="Capitale" onMouseDown={(e) => handleToolbar(e, 'capitalize')}>
          Aa
        </button>
        <button type="button" title="Petit texte" onMouseDown={(e) => handleToolbar(e, 'small')}>
          <small>Petit</small>
        </button>
        <span className="form-rich-editor-sep" aria-hidden />
        <button type="button" title="Retirer la mise en forme" onMouseDown={(e) => handleToolbar(e, 'removeFormat')}>
          Effacer
        </button>
      </div>
      <p className="form-rich-editor-hint">Sélectionnez un passage de texte, puis utilisez les boutons ci-dessus.</p>
      <div
        ref={editorRef}
        className="form-rich-editor-area"
        style={{ minHeight }}
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
