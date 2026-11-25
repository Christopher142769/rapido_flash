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
  },
  cuisinier: {
    slug: 'candidature-cuisinier',
    eyebrow: 'Rapido recrute · Cotonou',
    title: 'Cuisinier·ère',
    salary: '70 000 F CFA',
    salaryNote: 'par mois, à partir de — selon diplôme et expérience',
    perks: ['Diplôme de cuisine exigé', 'Cuisine professionnelle moderne', 'Évolution selon vos résultats'],
    contentName: 'Candidature Cuisinier',
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

export default function RecruitmentApplyPage({ role = 'livreur' }) {
  const cfg = ROLES[role] || ROLES.livreur;
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [choices, setChoices] = useState({});
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(false);
  const cameraRef = useRef(null);
  const pickerRef = useRef(null);
  const formTopRef = useRef(null);

  useEffect(() => {
    document.title = `Postuler · ${cfg.title} · RAPIDO`;
    let alive = true;
    axios
      .get(`${API_URL}/custom-forms/public/${cfg.slug}`)
      .then((res) => alive && setForm(res.data))
      .catch(() => alive && setLoadError('Le formulaire est momentanément indisponible. Réessayez dans quelques minutes.'));
    return () => {
      alive = false;
    };
  }, [cfg.slug, cfg.title]);

  const section = form?.sections?.[0];
  const blocks = useMemo(() => section?.blocks || [], [section]);
  const phoneBlock = blocks.find((b) => b.inputFormat === 'bj-phone');
  const cvBlock = blocks.find((b) => b.fieldType === 'pdf' || b.fieldType === 'image');
  const choiceBlocks = blocks.filter((b) => b.fieldType === 'choice' || b.fieldType === 'checkbox');
  const maxFiles = cvBlock?.pdfMaxCount || 4;

  const toggleChoice = (block, label) => {
    setErrors((e) => ({ ...e, [block.id]: '' }));
    setChoices((prev) => {
      if (block.fieldType === 'choice') return { ...prev, [block.id]: [label] };
      const cur = prev[block.id] || [];
      const isNone = /^ni |^aucun/i.test(label);
      let next = cur.includes(label) ? cur.filter((v) => v !== label) : [...cur, label];
      // « Ni moto ni permis » exclut les autres cases (et inversement).
      next = isNone ? (cur.includes(label) ? [] : [label]) : next.filter((v) => !/^ni |^aucun/i.test(v));
      return { ...prev, [block.id]: next };
    });
  };

  const addFiles = useCallback(
    async (list) => {
      const incoming = Array.from(list || []);
      if (!incoming.length) return;
      setErrors((e) => ({ ...e, cv: '' }));
      const room = maxFiles - files.length;
      if (room <= 0) {
        setErrors((e) => ({ ...e, cv: `${maxFiles} fichiers maximum` }));
        return;
      }
      const accepted = [];
      for (const f of incoming.slice(0, room)) {
        const okType = f.type.startsWith('image/') || f.type === 'application/pdf' || /\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(f.name);
        if (!okType) {
          setErrors((e) => ({ ...e, cv: 'Envoyez un PDF ou une photo (JPG, PNG).' }));
          continue;
        }
        const small = await shrinkImage(f);
        if (small.size > MAX_FILE_MB * 1024 * 1024) {
          setErrors((e) => ({ ...e, cv: `« ${f.name} » dépasse ${MAX_FILE_MB} Mo.` }));
          continue;
        }
        accepted.push(small);
      }
      setFiles((prev) => [...prev, ...accepted].slice(0, maxFiles));
    },
    [files.length, maxFiles]
  );

  const validate = () => {
    const e = {};
    if (name.trim().length < 3) e.name = 'Entrez votre nom et prénom';
    if (phoneBlock) {
      const pe = phoneError(phone);
      if (pe) e.phone = pe;
    }
    choiceBlocks.forEach((b) => {
      if (b.required && !(choices[b.id] || []).length) e[b.id] = 'Choisissez une réponse';
    });
    if (cvBlock?.required && !files.length) e.cv = 'Ajoutez votre CV (PDF ou photo)';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (progress !== null) return;
    const e = validate();
    setErrors(e);
    setSubmitError('');
    if (Object.keys(e).length) {
      const first = document.querySelector(`[data-field="${Object.keys(e)[0]}"]`);
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

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
    if (cvBlock) {
      files.forEach((f, i) => fd.append(`file_${section.id}_${cvBlock.id}_${i}`, f, f.name));
    }

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
      trackMeta(
        'Lead',
        { content_name: cfg.contentName, content_category: 'Recrutement' },
        `lead_${cfg.slug}_${Date.now()}`
      );
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
  };

  if (done) {
    return (
      <div className="rap-root">
        <Header />
        <main className="rap-main">
          <section className="rap-done" aria-live="polite">
            <div className="rap-done-icon" aria-hidden="true">✓</div>
            <h1>Candidature envoyée</h1>
            <p>
              Merci {name.trim().split(' ')[0]} ! Votre candidature <strong>{cfg.title}</strong> est bien reçue.
            </p>
            <p>
              {form?.settings?.confirmationMessage ||
                'Nous vous appelons au numéro indiqué si votre profil est retenu.'}
            </p>
            <p className="rap-done-phone">📞 {formatPhone(phone)}</p>
            <a className="rap-btn rap-btn--ghost" href="/recrutement">
              Voir les autres postes
            </a>
          </section>
        </main>
      </div>
    );
  }

  const sending = progress !== null;

  return (
    <div className="rap-root">
      <Header />
      <main className="rap-main">
        <section className="rap-hero">
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
          <p className="rap-time">⏱ 1 minute pour postuler</p>
        </section>

        {loadError ? <p className="rap-banner rap-banner--err">{loadError}</p> : null}
        {!form && !loadError ? <p className="rap-loading">Chargement du formulaire…</p> : null}

        {form ? (
          <form className="rap-card" onSubmit={submit} noValidate ref={formTopRef}>
            <div className="rap-field" data-field="name">
              <label htmlFor="rap-name">Nom et prénom</label>
              <input
                id="rap-name"
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                placeholder="Ex. Koffi Adjovi"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((x) => ({ ...x, name: '' }));
                }}
                aria-invalid={!!errors.name}
                maxLength={120}
              />
              <FieldError msg={errors.name} />
            </div>

            {phoneBlock ? (
              <div className="rap-field" data-field="phone">
                <label htmlFor="rap-phone">{phoneBlock.label}</label>
                <div className={`rap-phone ${errors.phone ? 'is-invalid' : ''}`}>
                  <span className="rap-phone-prefix">🇧🇯 +229</span>
                  <input
                    id="rap-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="01 XX XX XX XX"
                    value={formatPhone(phone)}
                    onChange={(e) => {
                      setPhone(cleanPhoneInput(e.target.value));
                      setErrors((x) => ({ ...x, phone: '' }));
                    }}
                    onBlur={() => phone && setErrors((x) => ({ ...x, phone: phoneError(phone) }))}
                    aria-invalid={!!errors.phone}
                  />
                </div>
                <FieldError msg={errors.phone} />
              </div>
            ) : null}

            {choiceBlocks.map((b) => (
              <fieldset className="rap-field" key={b.id} data-field={b.id}>
                <legend>
                  {b.label}
                  {b.fieldType === 'checkbox' ? <span className="rap-hint"> · plusieurs réponses possibles</span> : null}
                </legend>
                <div className="rap-options">
                  {(b.options || []).map((o) => {
                    const on = (choices[b.id] || []).includes(o.label);
                    return (
                      <button
                        type="button"
                        key={o.id}
                        className={`rap-option ${on ? 'is-on' : ''} ${b.fieldType === 'checkbox' ? 'is-check' : ''}`}
                        aria-pressed={on}
                        onClick={() => toggleChoice(b, o.label)}
                      >
                        <span className="rap-option-mark" aria-hidden="true" />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                <FieldError msg={errors[b.id]} />
              </fieldset>
            ))}

            {cvBlock ? (
              <div className="rap-field" data-field="cv">
                <span className="rap-label">
                  {cvBlock.label}
                  {!cvBlock.required ? <span className="rap-hint"> · facultatif</span> : null}
                </span>
                <p className="rap-sub">PDF, ou photo de votre CV prise avec le téléphone{maxFiles > 1 ? ` (jusqu’à ${maxFiles} pages)` : ''}.</p>

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
                    <button type="button" className="rap-upload-btn" onClick={() => cameraRef.current?.click()}>
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
                <FieldError msg={errors.cv} />
              </div>
            ) : null}

            {submitError ? <p className="rap-banner rap-banner--err" role="alert">{submitError}</p> : null}

            {sending ? (
              <div className="rap-progress" aria-live="polite">
                <div className="rap-progress-bar">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <p>{progress < 100 ? `Envoi en cours… ${progress} %` : 'Finalisation…'}</p>
              </div>
            ) : null}

            <button type="submit" className="rap-btn rap-submit" disabled={sending}>
              {sending ? 'Envoi…' : 'Envoyer ma candidature'}
            </button>
            <p className="rap-legal">
              Vos informations servent uniquement à étudier votre candidature chez RAPIDO.
            </p>
          </form>
        ) : null}
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
