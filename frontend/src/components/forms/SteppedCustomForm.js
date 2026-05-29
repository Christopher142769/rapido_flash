import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  buildFormSteps,
  blockKey,
  defaultFormSettings,
  isFileField,
} from '../../utils/customFormSteps';
import FormRichHtml from './FormRichHtml';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function resolveRedirect(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) {
    return `${window.location.origin}${s}`;
  }
  return s;
}

function validateStep(step, state) {
  const { respondentName, respondentEmail, textValues, choiceValues, tableValues, files } = state;

  if (step.type === 'contact') {
    if (step.requireName && !String(respondentName || '').trim()) {
      return 'Indiquez votre nom';
    }
    if (step.requireEmail) {
      const em = String(respondentEmail || '').trim();
      if (!em) return 'Indiquez votre e-mail';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return 'E-mail invalide';
    }
    return '';
  }

  if (step.type !== 'question') return '';

  const { section, block } = step;
  const key = blockKey(section.id, block.id);

  if (block.kind === 'table') {
    if (!block.required) return '';
    const rows = tableValues[key] || [];
    const hasData = rows.some((row) => row.some((c) => String(c).trim()));
    return hasData ? '' : 'Remplissez au moins une cellule du tableau';
  }

  if (!block.required) return '';

  if (block.fieldType === 'choice') {
    const sel = choiceValues[key];
    return sel ? '' : 'Sélectionnez une réponse';
  }
  if (block.fieldType === 'checkbox') {
    const sel = choiceValues[key] || [];
    return sel.length ? '' : 'Sélectionnez au moins une réponse';
  }
  if (isFileField(block)) {
    return files[`file_${section.id}_${block.id}`] ? '' : 'Joignez un fichier';
  }

  const tv = String(textValues[key] || '').trim();
  if (!tv) return 'Ce champ est obligatoire';
  if (block.fieldType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tv)) {
    return 'E-mail invalide';
  }
  if (block.fieldType === 'number') {
    const n = tv.replace(/\s/g, '').replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(n)) return 'Saisissez un nombre valide';
  }
  if (block.fieldType === 'date' && tv && !/^\d{4}-\d{2}-\d{2}$/.test(tv)) {
    return 'Date invalide';
  }
  return '';
}

function initStateFromForm(form) {
  const textValues = {};
  const choiceValues = {};
  const tableValues = {};

  (form.sections || []).forEach((sec) => {
    (sec.blocks || []).forEach((b) => {
      const key = blockKey(sec.id, b.id);
      if (b.kind === 'table') {
        const rows = [];
        for (let r = 0; r < (b.rowCount || 3); r += 1) {
          rows.push((b.columns || []).map(() => ''));
        }
        tableValues[key] = rows;
      } else if (b.fieldType === 'checkbox') {
        choiceValues[key] = [];
      } else if (b.fieldType === 'choice') {
        choiceValues[key] = '';
      } else if (['text', 'textarea', 'email', 'number', 'date'].includes(b.fieldType)) {
        textValues[key] = '';
      }
    });
  });

  return { textValues, choiceValues, tableValues, files: {} };
}

export default function SteppedCustomForm({ form, slug, onDone }) {
  const settings = useMemo(() => defaultFormSettings(form.settings), [form.settings]);
  const steps = useMemo(() => buildFormSteps(form), [form]);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [{ textValues, choiceValues, tableValues, files }, setFieldState] = useState(() =>
    initStateFromForm(form)
  );

  const inputRef = useRef(null);
  const step = steps[stepIndex];
  const totalSteps = steps.length;
  const progress = totalSteps > 1 ? ((stepIndex + 1) / totalSteps) * 100 : 100;
  const isLast = stepIndex >= totalSteps - 1;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, [stepIndex]);

  const goTo = useCallback(
    (nextIdx) => {
      if (animating || nextIdx < 0 || nextIdx >= totalSteps) return;
      setDirection(nextIdx > stepIndex ? 1 : -1);
      setAnimating(true);
      setError('');
      setTimeout(() => {
        setStepIndex(nextIdx);
        setAnimating(false);
      }, 220);
    },
    [animating, stepIndex, totalSteps]
  );

  const validateAll = useCallback(() => {
    const state = { respondentName, respondentEmail, textValues, choiceValues, tableValues, files };
    for (const s of steps) {
      const err = validateStep(s, state);
      if (err) return err;
    }
    return '';
  }, [steps, respondentName, respondentEmail, textValues, choiceValues, tableValues, files]);

  const buildAnswers = useCallback(() => {
    const answers = [];
    for (const sec of form.sections || []) {
      for (const block of sec.blocks || []) {
        const key = blockKey(sec.id, block.id);
        if (block.kind === 'table') {
          answers.push({
            sectionId: sec.id,
            blockId: block.id,
            label: block.label || sec.title,
            fieldType: 'table',
            tableRows: tableValues[key] || [],
          });
        } else if (block.fieldType === 'choice' || block.fieldType === 'checkbox') {
          const raw = choiceValues[key];
          const selectedValues = block.fieldType === 'checkbox' ? raw || [] : raw ? [raw] : [];
          answers.push({
            sectionId: sec.id,
            blockId: block.id,
            label: block.label,
            fieldType: block.fieldType,
            selectedValues,
          });
        } else {
          answers.push({
            sectionId: sec.id,
            blockId: block.id,
            label: block.label,
            fieldType: block.fieldType,
            textValue: textValues[key] || '',
          });
        }
      }
    }
    return answers;
  }, [form.sections, textValues, choiceValues, tableValues]);

  const submitForm = useCallback(async () => {
    const allErr = validateAll();
    if (allErr) {
      setError(allErr);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append(
        'payload',
        JSON.stringify({
          respondentName,
          respondentEmail,
          answers: buildAnswers(),
        })
      );
      Object.entries(files).forEach(([key, file]) => {
        if (file) fd.append(key, file);
      });

      const res = await axios.post(`${API_URL}/custom-forms/public/${encodeURIComponent(slug)}/submit`, fd);
      const target = resolveRedirect(res.data?.redirectUrl || form.redirectUrl);
      if (target) {
        window.location.assign(target);
        return;
      }
      onDone?.({ confirmationMessage: settings.confirmationMessage });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l’envoi');
    } finally {
      setSubmitting(false);
    }
  }, [buildAnswers, files, form.redirectUrl, onDone, respondentEmail, respondentName, settings.confirmationMessage, slug, validateAll]);

  const onNext = useCallback(() => {
    if (!step) return;
    const err = validateStep(step, {
      respondentName,
      respondentEmail,
      textValues,
      choiceValues,
      tableValues,
      files,
    });
    if (err) {
      setError(err);
      return;
    }
    if (isLast) {
      submitForm();
      return;
    }
    goTo(stepIndex + 1);
  }, [step, respondentName, respondentEmail, textValues, choiceValues, tableValues, files, isLast, stepIndex, goTo, submitForm]);

  const onPrev = () => {
    if (stepIndex > 0) goTo(stepIndex - 1);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && step?.type === 'question') {
      const block = step.block;
      if (block?.fieldType !== 'textarea' && block?.kind !== 'table') {
        e.preventDefault();
        onNext();
      }
    }
  };

  const setTableCell = (key, rowIdx, colIdx, value) => {
    setFieldState((prev) => {
      const rows = prev.tableValues[key].map((row) => [...row]);
      rows[rowIdx][colIdx] = value;
      return { ...prev, tableValues: { ...prev.tableValues, [key]: rows } };
    });
  };

  const toggleCheckbox = (key, label) => {
    setFieldState((prev) => {
      const cur = prev.choiceValues[key] || [];
      const next = cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label];
      return { ...prev, choiceValues: { ...prev.choiceValues, [key]: next } };
    });
    setError('');
  };

  const selectChoice = (key, label, block, section) => {
    setFieldState((prev) => ({
      ...prev,
      choiceValues: { ...prev.choiceValues, [key]: label },
    }));
    setError('');
    if (block.fieldType === 'choice') {
      setTimeout(() => {
        const err = validateStep(
          { type: 'question', section, block },
          {
            respondentName,
            respondentEmail,
            textValues,
            choiceValues: { ...choiceValues, [key]: label },
            tableValues,
            files,
          }
        );
        if (!err) {
          if (isLast) submitForm();
          else goTo(stepIndex + 1);
        }
      }, 380);
    }
  };

  if (!step) return null;

  const slideClass = animating
    ? direction > 0
      ? 'rform-step-exit-next'
      : 'rform-step-exit-prev'
    : direction > 0
      ? 'rform-step-enter-next'
      : 'rform-step-enter-prev';

  const renderQuestion = () => {
    const { section, block } = step;
    const key = blockKey(section.id, block.id);

    if (block.kind === 'table') {
      const rows = tableValues[key] || [];
      const cols = block.columns || [];
      return (
        <div className="rform-step-table-wrap">
          <table className="rform-table">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.id}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>
                      <input
                        className="rform-input"
                        value={cell}
                        onChange={(e) => setTableCell(key, ri, ci, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (block.fieldType === 'choice' || block.fieldType === 'checkbox') {
      const options = block.options || [];
      const selected = choiceValues[key];
      return (
        <div className="rform-choices" role={block.fieldType === 'choice' ? 'radiogroup' : 'group'}>
          {options.map((opt) => {
            const isSelected =
              block.fieldType === 'choice' ? selected === opt.label : (selected || []).includes(opt.label);
            return (
              <button
                key={opt.id}
                type="button"
                className={`rform-choice${isSelected ? ' selected' : ''}`}
                onClick={() =>
                  block.fieldType === 'choice'
                    ? selectChoice(key, opt.label, block, section)
                    : toggleCheckbox(key, opt.label)
                }
              >
                <span className="rform-choice-marker" aria-hidden />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (block.fieldType === 'textarea') {
      return (
        <textarea
          ref={inputRef}
          className="rform-textarea rform-step-input"
          value={textValues[key] || ''}
          onChange={(e) =>
            setFieldState((p) => ({ ...p, textValues: { ...p.textValues, [key]: e.target.value } }))
          }
          onKeyDown={onKeyDown}
          placeholder="Votre réponse"
          rows={4}
        />
      );
    }

    if (isFileField(block)) {
      const fileKey = `file_${section.id}_${block.id}`;
      const file = files[fileKey];
      return (
        <div className="rform-file-step">
          <input
            type="file"
            accept={block.fieldType === 'pdf' ? 'application/pdf,.pdf' : 'image/*'}
            className="rform-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFieldState((p) => ({ ...p, files: { ...p.files, [fileKey]: f } }));
            }}
          />
          {file ? <p className="rform-file-name">{file.name}</p> : null}
        </div>
      );
    }

    if (block.fieldType === 'date') {
      return (
        <input
          ref={inputRef}
          type="date"
          className="rform-input rform-step-input rform-step-input--date"
          value={textValues[key] || ''}
          onChange={(e) =>
            setFieldState((p) => ({ ...p, textValues: { ...p.textValues, [key]: e.target.value } }))
          }
          onKeyDown={onKeyDown}
        />
      );
    }

    if (block.fieldType === 'number') {
      return (
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step="any"
          className="rform-input rform-step-input"
          value={textValues[key] || ''}
          onChange={(e) =>
            setFieldState((p) => ({ ...p, textValues: { ...p.textValues, [key]: e.target.value } }))
          }
          onKeyDown={onKeyDown}
          placeholder="0"
        />
      );
    }

    return (
      <input
        ref={inputRef}
        type={block.fieldType === 'email' ? 'email' : 'text'}
        className="rform-input rform-step-input"
        value={textValues[key] || ''}
        onChange={(e) =>
          setFieldState((p) => ({ ...p, textValues: { ...p.textValues, [key]: e.target.value } }))
        }
        onKeyDown={onKeyDown}
        placeholder="Votre réponse"
      />
    );
  };

  const renderBody = () => {
    if (step.type === 'welcome') {
      return (
        <div className="rform-step-welcome">
          <h1 className="rform-step-title">{step.title}</h1>
          {step.description ? <FormRichHtml html={step.description} className="rform-step-desc rform-rich-html" /> : null}
        </div>
      );
    }

    if (step.type === 'contact') {
      return (
        <div className="rform-step-fields">
          <h2 className="rform-step-q">
            Vos <span className="serif-i">coordonnées</span>
          </h2>
          <label className="rform-label">
            Nom{step.requireName ? ' *' : ''}
          </label>
          <input
            ref={inputRef}
            className="rform-input rform-step-input"
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nom et prénom"
          />
          <label className="rform-label" style={{ marginTop: 20 }}>
            E-mail{step.requireEmail ? ' *' : ''}
          </label>
          <input
            type="email"
            className="rform-input rform-step-input"
            value={respondentEmail}
            onChange={(e) => setRespondentEmail(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="votre@email.com"
          />
        </div>
      );
    }

    if (step.type === 'section') {
      const sec = step.section;
      return (
        <div className="rform-step-section-intro">
          <span className="rform-step-section-tag">Section</span>
          {sec.title ? <h2 className="rform-step-title">{sec.title}</h2> : null}
          {sec.description ? (
            <FormRichHtml html={sec.description} className="rform-step-desc rform-rich-html" />
          ) : null}
          {sec.imageUrl ? <img src={sec.imageUrl} alt="" className="rform-sec-img" /> : null}
        </div>
      );
    }

    if (step.type === 'question') {
      const { block } = step;
      const qNum = steps.slice(0, stepIndex + 1).filter((s) => s.type === 'question').length;
      const qTotal = steps.filter((s) => s.type === 'question').length;
      return (
        <div className="rform-step-question">
          <span className="rform-step-qnum">
            {qNum} / {qTotal}
          </span>
          <h2 className="rform-step-q">
            {block.label}
            {block.required ? <span className="rform-req"> *</span> : null}
          </h2>
          {renderQuestion()}
        </div>
      );
    }

    return null;
  };

  const nextLabel =
    step.type === 'welcome'
      ? 'Commencer'
      : isLast
        ? submitting
          ? 'Envoi…'
          : 'Envoyer'
        : 'Suivant';

  return (
    <div className="rform-stepped">
      {settings.showProgressBar ? (
        <div className="rform-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="rform-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <div className={`rform-step-viewport ${slideClass}`} onKeyDown={onKeyDown}>
        <div className="rform-step-card">{renderBody()}</div>
      </div>

      {error ? <p className="rform-error rform-step-error">{error}</p> : null}

      <footer className="rform-step-footer">
        {stepIndex > 0 ? (
          <button type="button" className="rform-btn rform-btn-ghost" onClick={onPrev} disabled={submitting || animating}>
            ← Précédent
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="rform-btn rform-btn-next"
          onClick={onNext}
          disabled={submitting || animating}
        >
          {nextLabel}
          {!isLast && step.type !== 'welcome' ? <span className="rform-btn-arrow"> ↵</span> : null}
        </button>
      </footer>

      <p className="rform-step-hint">
        Appuyez sur <kbd>Entrée</kbd> pour continuer
      </p>
    </div>
  );
}
