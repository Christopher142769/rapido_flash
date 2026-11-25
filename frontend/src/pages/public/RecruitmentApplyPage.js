import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { trackMeta } from '../../utils/metaPixel';
import './RecruitmentApplyPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const LOGO_SRC = '/recrutement/logo.png';
const MAX_FILE_MB = 20;

/** Contenu propre à chaque poste (le reste vient du formulaire en base, modifiable au dashboard). */
export const ROLES = {
  livreur: {
    slug: 'candidature-livreur',
    eyebrow: 'Rapido recrute · Cotonou & Calavi',
    title: 'Livreur à moto',
    salary: '60 000 F CFA',
    salaryNote: 'par mois pendant les 3 mois d’essai, puis davantage ensuite',
    perks: ['Paiement chaque mois', 'Missions dans votre zone', 'Équipe sérieuse et respectueuse'],
    contentName: 'Candidature Livreur',
    other: 'cuisinier',
  },
  cuisinier: {
    slug: 'candidature-cuisinier',
    eyebrow: 'Rapido recrute · Cotonou',
    title: 'Cuisinier·ère',
    salary: '70 000 F CFA',
    salaryNote: 'par mois, selon diplôme et expérience',
    perks: ['Diplôme de cuisine exigé', 'Cuisine professionnelle moderne', 'Évolution selon vos résultats'],
    contentName: 'Candidature Cuisinier',
    other: 'livreur',
  },
};

function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

/** Garde 10 chiffres béninois ; accepte un collage « +229 01 … ». */
function cleanPhoneInput(raw) {
  let d = onlyDigits(raw);
  if (d.startsWith('00229')) d = d.slice(5);
  else if (d.startsWith('229') && d.length > 10) d = d.slice(3);
  return d.slice(0, 10);
}

function formatPhone(d) {
  return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

function phoneError(d) {
  if (!d) return 'Entrez votre numéro';
  if (d.length < 10) return 'Le numéro doit avoir 10 chiffres (01 XX XX XX XX)';
  if (!d.startsWith('01')) return 'Les numéros béninois commencent par 01';
  return '';
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Photo de téléphone (souvent 4–8 Mo) → JPEG ~1600 px (~300 Ko) : envoi rapide en 3G.
 * En cas d’échec (HEIC non lisible, vieux navigateur), on garde le fichier d’origine.
 */
async function shrinkImage(file) {
  if (!file.type.startsWith('image/') || file.size < 900 * 1024 || !window.createImageBitmap) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'cv';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="rap-err" role="alert">
      {msg}
    </p>
  );
}


const isNoneLabel = (label) => /^ni |^aucun/i.test(String(label));

export default function RecruitmentApplyPage({ role = 'livreur' }) {
  const cfg = ROLES[role] || ROLES.livreur;
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [choices, setChoices] = useState({});
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState('next');
  const cameraRef = useRef(null);
  const pickerRef = useRef(null);
  const stepRef = useRef(null);
  const advanceTimer = useRef(null);

  useEffect(() => {
    document.title = `Postuler · ${cfg.title} · RAPIDO`;
    let alive = true;
    axios
      .get(`${API_URL}/custom-forms/public/${cfg.slug}`)
      .then((res) => alive && setForm(res.data))
      .catch(() => alive && setLoadError('Le formulaire est momentanément indisponible. Réessayez dans quelques minutes.'));
    return () => {
      alive = false;
      clearTimeout(advanceTimer.current);
    };
  }, [cfg.slug, cfg.title]);

  const section = form?.sections?.[0];
  const blocks = useMemo(() => section?.blocks || [], [section]);
  const phoneBlock = blocks.find((b) => b.inputFormat === 'bj-phone');
  const cvBlock = blocks.find((b) => b.fieldType === 'pdf' || b.fieldType === 'image');
  const maxFiles = cvBlock?.pdfMaxCount || 4;

  /** Une question par écran, dans l'ordre du formulaire (nom en premier). */
  const steps = useMemo(() => {
    const out = [{ key: 'name', label: 'Nom et prénom' }];
    blocks.forEach((b) => {
      if (b === phoneBlock) out.push({ key: 'phone', label: b.label, block: b });
      else if (b === cvBlock) out.push({ key: 'cv', label: b.label, block: b });
      else if (b.fieldType === 'choice' || b.fieldType === 'checkbox') out.push({ key: b.id, label: b.label, block: b });
    });
    return out;
  }, [blocks, phoneBlock, cvBlock]);

  const current = steps[Math.min(step, steps.length - 1)];
  const isLast = step >= steps.length - 1;
  const sending = progress !== null;

  // Focus sur le champ de l'étape (clavier ouvert directement sur mobile pour nom / téléphone).
  useEffect(() => {
    if (!form || done) return;
    const el = stepRef.current?.querySelector('input:not([type=file])');
    if (el) el.focus({ preventScroll: true });
  }, [step, form, done]);

  const stepError = (s) => {
    if (!s) return '';
    if (s.key === 'name') return name.trim().length < 3 ? 'Entrez votre nom et prénom' : '';
    if (s.key === 'phone') return phoneError(phone);
    if (s.key === 'cv') return cvBlock?.required && !files.length ? 'Ajoutez votre CV (PDF ou photo)' : '';
    if (s.block?.required && !(choices[s.block.id] || []).length) return 'Choisissez une réponse';
    return '';
  };

  const goTo = (n, direction) => {
    clearTimeout(advanceTimer.current);
    setDir(direction);
    setError('');
    setStep(Math.max(0, Math.min(steps.length - 1, n)));
  };

  const next = () => {
    const e = stepError(current);
    if (e) {
      setError(e);
      return;
    }
    if (isLast) submit();
    else goTo(step + 1, 'next');
  };

  const back = () => {
    if (step > 0 && !sending) goTo(step - 1, 'back');
  };

  const toggleChoice = (block, label) => {
    setError('');
    if (block.fieldType === 'choice') {
      setChoices((prev) => ({ ...prev, [block.id]: [label] }));
      // Choix unique : on passe tout seul à la question suivante.
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => goTo(step + 1, 'next'), 280);
      return;
    }
    setChoices((prev) => {
      const cur = prev[block.id] || [];
      let nextSel = cur.includes(label) ? cur.filter((v) => v !== label) : [...cur, label];
      // « Ni moto ni permis » exclut les autres cases (et inversement).
      nextSel = isNoneLabel(label) ? (cur.includes(label) ? [] : [label]) : nextSel.filter((v) => !isNoneLabel(v));
      return { ...prev, [block.id]: nextSel };
    });
  };

  const addFiles = useCallback(
    async (list) => {
      const incoming = Array.from(list || []);
      if (!incoming.length) return;
      setError('');
      const room = maxFiles - files.length;
      if (room <= 0) {
        setError(`${maxFiles} fichiers maximum`);
        return;
      }
      const accepted = [];
      for (const f of incoming.slice(0, room)) {
        const okType =
          f.type.startsWith('image/') || f.type === 'application/pdf' || /\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(f.name);
        if (!okType) {
          setError('Envoyez un PDF ou une photo (JPG, PNG).');
          continue;
        }
        const small = await shrinkImage(f);
        if (small.size > MAX_FILE_MB * 1024 * 1024) {
          setError(`« ${f.name} » dépasse ${MAX_FILE_MB} Mo.`);
          continue;
        }
        accepted.push(small);
      }
      setFiles((prev) => [...prev, ...accepted].slice(0, maxFiles));
    },
    [files.length, maxFiles]
  );

  async function submit() {
    if (sending) return;
    // Revalide tout (au cas où) et renvoie à la première étape incomplète.
    const badIndex = steps.findIndex((s) => stepError(s));
    if (badIndex !== -1) {
      goTo(badIndex, 'back');
      setError(stepError(steps[badIndex]));
      return;
    }
    setSubmitError('');

    const answers = blocks
      .filter((b) => b.kind === 'field' && b !== cvBlock)
      .map((b) => {
        const base = { sectionId: section.id, blockId: b.id, label: b.label, fieldType: b.fieldType };
        if (b === phoneBlock) return { ...base, textValue: formatPhone(phone) };
        if (b.fieldType === 'choice' || b.fieldType === 'checkbox') return { ...base, selectedValues: choices[b.id] || [] };
        return { ...base, textValue: '' };
      });
    if (cvBlock) {
      answers.push({ sectionId: section.id, blockId: cvBlock.id, label: cvBlock.label, fieldType: cvBlock.fieldType });
    }

    const fd = new FormData();
    fd.append('payload', JSON.stringify({ respondentName: name.trim(), respondentEmail: '', answers }));
    if (cvBlock) files.forEach((f, i) => fd.append(`file_${section.id}_${cvBlock.id}_${i}`, f, f.name));

    setProgress(0);
    try {
      await axios.post(`${API_URL}/custom-forms/public/${cfg.slug}/submit`, fd, {
        timeout: 180000,
        onUploadProgress: (p) => {
          if (p.total) setProgress(Math.min(99, Math.round((p.loaded / p.total) * 100)));
        },
      });
      setProgress(100);
      // Lead uniquement après un envoi réussi (jamais au clic).
      trackMeta('Lead', { content_name: cfg.contentName, content_category: 'Recrutement' }, `lead_${cfg.slug}_${Date.now()}`);
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.code === 'ECONNABORTED' || !err.response
          ? 'Connexion trop lente ou coupée. Vérifiez votre réseau puis réessayez : vos réponses sont conservées.'
          : 'L’envoi a échoué. Réessayez.');
      setSubmitError(msg);
      setProgress(null);
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
      next();
    }
  };

  const hero = (
    <aside className={`rap-hero ${step > 0 && !done ? 'is-compact' : ''}`}>
      <p className="rap-eyebrow">{cfg.eyebrow}</p>
      <h1>{cfg.title}</h1>
      <div className="rap-salary">
        <span className="rap-salary-from">À partir de</span>
        <span className="rap-salary-amount">{cfg.salary}</span>
        <span className="rap-salary-note">{cfg.salaryNote}</span>
      </div>
      <ul className="rap-perks">
        {cfg.perks.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="rap-time">⏱ 1 minute · {steps.length} questions</p>
    </aside>
  );

  if (done) {
    return (
      <div className="rap-root">
        <Header />
        <main className="rap-layout">
          {hero}
          <section className="rap-panel">
            <div className="rap-card rap-done" aria-live="polite">
              <div className="rap-done-icon" aria-hidden="true">
                ✓
              </div>
              <h2>Candidature envoyée</h2>
              <p>
                Merci {name.trim().split(' ')[0]} ! Votre candidature <strong>{cfg.title}</strong> est bien reçue.
              </p>
              <p>{form?.settings?.confirmationMessage || 'Nous vous appelons au numéro indiqué si votre profil est retenu.'}</p>
              <p className="rap-done-phone">📞 {formatPhone(phone)}</p>
              {/* « Autres postes » = l'autre formulaire de campagne (livreur ↔ cuisinier). */}
              <a className="rap-btn rap-btn--ghost" href={`/recrutement/${cfg.other}`}>
                Postuler aussi : {ROLES[cfg.other].title} →
              </a>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const pct = steps.length ? Math.round(((step + (sending ? 1 : 0)) / steps.length) * 100) : 0;
  const block = current?.block;

  return (
    <div className="rap-root">
      <Header />
      <main className="rap-layout">
        {hero}
        <section className="rap-panel">
          {loadError ? <p className="rap-banner rap-banner--err">{loadError}</p> : null}
          {!form && !loadError ? <p className="rap-loading">Chargement du formulaire…</p> : null}

          {form && current ? (
            <form
              className="rap-card"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
              onKeyDown={onKeyDown}
              noValidate
            >
              <div className="rap-steps-head">
                <span className="rap-steps-count">
                  Question {step + 1} / {steps.length}
                </span>
                <div className="rap-steps-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(pct, 4)}%` }} />
                </div>
              </div>

              <div className={`rap-step rap-step--${dir}`} key={current.key} ref={stepRef}>
                {current.key === 'name' ? (
                  <div className="rap-field">
                    <label htmlFor="rap-name" className="rap-q">
                      Quel est votre nom et prénom ?
                    </label>
                    <input
                      id="rap-name"
                      type="text"
                      autoComplete="name"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      placeholder="Ex. Koffi Adjovi"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError('');
                      }}
                      aria-invalid={!!error}
                      maxLength={120}
                    />
                  </div>
                ) : null}

                {current.key === 'phone' ? (
                  <div className="rap-field">
                    <label htmlFor="rap-phone" className="rap-q">
                      {current.label}
                    </label>
                    <p className="rap-sub">Le numéro où nous pouvons vous appeler.</p>
                    <div className={`rap-phone ${error ? 'is-invalid' : ''}`}>
                      <span className="rap-phone-prefix">🇧🇯 +229</span>
                      <input
                        id="rap-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        enterKeyHint="next"
                        placeholder="01 XX XX XX XX"
                        value={formatPhone(phone)}
                        onChange={(e) => {
                          setPhone(cleanPhoneInput(e.target.value));
                          setError('');
                        }}
                        aria-invalid={!!error}
                      />
                    </div>
                  </div>
                ) : null}

                {block && (block.fieldType === 'choice' || block.fieldType === 'checkbox') ? (
                  <fieldset className="rap-field">
                    <legend className="rap-q">{block.label}</legend>
                    {block.fieldType === 'checkbox' ? <p className="rap-sub">Cochez tout ce qui vous correspond.</p> : null}
                    <div className="rap-options">
                      {(block.options || []).map((o) => {
                        const on = (choices[block.id] || []).includes(o.label);
                        return (
                          <button
                            type="button"
                            key={o.id}
                            className={`rap-option ${on ? 'is-on' : ''} ${block.fieldType === 'checkbox' ? 'is-check' : ''}`}
                            aria-pressed={on}
                            onClick={() => toggleChoice(block, o.label)}
                          >
                            <span className="rap-option-mark" aria-hidden="true" />
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                {current.key === 'cv' ? (
                  <div className="rap-field">
                    <span className="rap-q">
                      {current.label}
                      {!cvBlock.required ? <span className="rap-hint"> · facultatif</span> : null}
                    </span>
                    <p className="rap-sub">
                      Un PDF, ou une photo de votre CV prise avec le téléphone
                      {maxFiles > 1 ? ` (jusqu’à ${maxFiles} pages)` : ''}.
                    </p>

                    {files.length ? (
                      <ul className="rap-files">
                        {files.map((f, i) => (
                          <li key={`${f.name}-${i}`}>
                            <span className="rap-file-icon" aria-hidden="true">
                              {f.type === 'application/pdf' ? 'PDF' : 'IMG'}
                            </span>
                            <span className="rap-file-name">{f.name}</span>
                            <span className="rap-file-size">{formatSize(f.size)}</span>
                            {!sending ? (
                              <button
                                type="button"
                                className="rap-file-remove"
                                aria-label={`Retirer ${f.name}`}
                                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                              >
                                ×
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {files.length < maxFiles && !sending ? (
                      <div className="rap-upload">
                        <button type="button" className="rap-upload-btn rap-upload-btn--camera" onClick={() => cameraRef.current?.click()}>
                          <span aria-hidden="true">📷</span> {files.length ? 'Ajouter une page' : 'Prendre en photo'}
                        </button>
                        <button type="button" className="rap-upload-btn" onClick={() => pickerRef.current?.click()}>
                          <span aria-hidden="true">📄</span> Choisir un fichier
                        </button>
                      </div>
                    ) : null}
                    <input
                      ref={cameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      hidden
                      onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <input
                      ref={pickerRef}
                      type="file"
                      accept="application/pdf,image/*"
                      multiple
                      hidden
                      onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </div>
                ) : null}

                <FieldError msg={error} />
              </div>

              {submitError ? (
                <p className="rap-banner rap-banner--err" role="alert">
                  {submitError}
                </p>
              ) : null}

              {sending ? (
                <div className="rap-progress" aria-live="polite">
                  <div className="rap-progress-bar">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <p>{progress < 100 ? `Envoi en cours… ${progress} %` : 'Finalisation…'}</p>
                </div>
              ) : null}

              <div className="rap-nav">
                {step > 0 ? (
                  <button type="button" className="rap-back" onClick={back} disabled={sending} aria-label="Question précédente">
                    ←
                  </button>
                ) : null}
                <button type="submit" className="rap-btn rap-next" disabled={sending}>
                  {sending
                    ? 'Envoi…'
                    : isLast
                      ? 'Envoyer ma candidature'
                      : current.key === 'cv' && !files.length && !cvBlock?.required
                        ? 'Passer'
                        : 'Suivant →'}
                </button>
              </div>
              {isLast ? (
                <p className="rap-legal">Vos informations servent uniquement à étudier votre candidature chez RAPIDO.</p>
              ) : null}
            </form>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="rap-header">
      <a href="/recrutement" className="rap-logo">
        <img src={LOGO_SRC} alt="RAPIDO" width="40" height="40" />
        <span>RAPIDO</span>
      </a>
    </header>
  );
}
