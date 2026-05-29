import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import './RapidoFormTheme.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const LOGO_SRC = '/recrutement/logo.png';

function resolveRedirect(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) {
    return `${window.location.origin}${s}`;
  }
  return s;
}

function FormShell({ children }) {
  return (
    <div className="rform-root">
      <header className="rform-header">
        <nav className="rform-nav">
          <Link to="/home" className="rform-logo">
            <img src={LOGO_SRC} alt="RAPIDO — Livraison Express" width="512" height="512" />
            <small>Formulaire</small>
          </Link>
        </nav>
      </header>
      {children}
      <footer className="rform-footer">
        <div className="rform-wrap">
          <Link to="/home" className="rform-logo">
            <img src={LOGO_SRC} alt="RAPIDO" width="512" height="512" />
          </Link>
          <p>Plateforme e-commerce &amp; marketplace · Cotonou, Bénin — Rapido Flash</p>
        </div>
      </footer>
    </div>
  );
}

function ThanksInline({ title }) {
  return (
    <section className="rform-hero rform-thanks">
      <div className="rform-hero-glow" />
      <div className="rform-hero-glow two" />
      <div className="rform-wrap">
        <svg className="rform-seal" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="ring" cx="60" cy="60" r="38" />
          <path className="check" d="M 44,61 L 55,72 L 78,49" />
        </svg>
        <span className="rform-eyebrow">Réponse enregistrée</span>
        <h1>
          Merci. Votre réponse est entre <span className="serif-i">nos mains</span>.
        </h1>
        <p className="rform-lead">
          {title ? (
            <>
              Votre formulaire <strong>{title}</strong> a bien été transmis. Notre équipe le traitera dans les meilleurs
              délais.
            </>
          ) : (
            <>Votre formulaire a bien été transmis. Notre équipe le traitera dans les meilleurs délais.</>
          )}
        </p>
      </div>
    </section>
  );
}

export default function PublicCustomFormPage() {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [textValues, setTextValues] = useState({});
  const [tableValues, setTableValues] = useState({});
  const [files, setFiles] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/custom-forms/public/${encodeURIComponent(slug)}`);
      setForm(res.data);
      const tv = {};
      const tt = {};
      (res.data.sections || []).forEach((sec) => {
        (sec.blocks || []).forEach((b) => {
          if (b.kind === 'field' && (b.fieldType === 'text' || b.fieldType === 'textarea')) {
            tv[`${sec.id}_${b.id}`] = '';
          }
          if (b.kind === 'table') {
            const rows = [];
            for (let r = 0; r < (b.rowCount || 3); r += 1) {
              rows.push((b.columns || []).map(() => ''));
            }
            tt[`${sec.id}_${b.id}`] = rows;
          }
        });
      });
      setTextValues(tv);
      setTableValues(tt);
    } catch (err) {
      setError(err.response?.data?.message || 'Formulaire introuvable');
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const setTableCell = (key, rowIdx, colIdx, value) => {
    setTableValues((prev) => {
      const rows = prev[key].map((row) => [...row]);
      rows[rowIdx][colIdx] = value;
      return { ...prev, [key]: rows };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form) return;

    const answers = [];
    for (const sec of form.sections || []) {
      for (const block of sec.blocks || []) {
        const key = `${sec.id}_${block.id}`;
        if (block.kind === 'table') {
          const rows = tableValues[key] || [];
          const hasData = rows.some((row) => row.some((c) => String(c).trim()));
          if (block.required && !hasData) {
            setError(`Le tableau « ${block.label} » est obligatoire`);
            return;
          }
          answers.push({
            sectionId: sec.id,
            blockId: block.id,
            label: block.label || sec.title,
            fieldType: 'table',
            tableRows: rows,
          });
        } else {
          const tv = textValues[key] || '';
          const file = files[`file_${sec.id}_${block.id}`];
          if (block.required && !tv.trim() && !file) {
            setError(`Le champ « ${block.label} » est obligatoire`);
            return;
          }
          answers.push({
            sectionId: sec.id,
            blockId: block.id,
            label: block.label,
            fieldType: block.fieldType,
            textValue: tv,
          });
        }
      }
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
          answers,
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
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l’envoi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <FormShell>
        <div className="rform-wrap" style={{ padding: '80px 0' }}>
          <p className="rform-lead">Chargement du formulaire…</p>
        </div>
      </FormShell>
    );
  }

  if (error && !form) {
    return (
      <FormShell>
        <div className="rform-wrap" style={{ padding: '80px 0' }}>
          <p className="rform-error">{error}</p>
        </div>
      </FormShell>
    );
  }

  if (done) {
    return (
      <FormShell>
        <ThanksInline title={form?.title} />
      </FormShell>
    );
  }

  return (
    <FormShell>
      <section className="rform-hero">
        <div className="rform-hero-glow" />
        <div className="rform-hero-glow two" />
        <div className="rform-wrap">
          <span className="rform-eyebrow">RAPIDO · Formulaire</span>
          <h1>{form.title}</h1>
          {form.description ? <p className="rform-lead">{form.description}</p> : null}
        </div>
      </section>

      <div className="rform-body">
        <div className="rform-wrap">
          <form onSubmit={onSubmit}>
            <div className="rform-sec">
              <h2>Vos <span className="serif-i">coordonnées</span></h2>
              <div className="rform-block">
                <label className="rform-label">Nom</label>
                <input
                  className="rform-input"
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
              <div className="rform-block">
                <label className="rform-label">E-mail</label>
                <input
                  type="email"
                  className="rform-input"
                  value={respondentEmail}
                  onChange={(e) => setRespondentEmail(e.target.value)}
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            {(form.sections || []).map((sec) => (
              <div key={sec.id} className="rform-sec">
                <h2>{sec.title}</h2>
                {sec.imageUrl ? <img src={sec.imageUrl} alt="" className="rform-sec-img" /> : null}

                {(sec.blocks || []).map((block) => {
                  const key = `${sec.id}_${block.id}`;
                  if (block.kind === 'table') {
                    const rows = tableValues[key] || [];
                    const cols = block.columns || [];
                    return (
                      <div key={block.id} className="rform-block">
                        <span className="rform-label">{block.label || 'Tableau à remplir'}</span>
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

                  return (
                    <div key={block.id} className="rform-block">
                      <label className="rform-label">
                        {block.label}
                        {block.required ? ' *' : ''}
                      </label>
                      {block.fieldType === 'textarea' ? (
                        <textarea
                          className="rform-textarea"
                          value={textValues[key] || ''}
                          onChange={(e) => setTextValues((p) => ({ ...p, [key]: e.target.value }))}
                        />
                      ) : block.fieldType === 'image' ? (
                        <input
                          type="file"
                          accept="image/*"
                          className="rform-file"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setFiles((p) => ({ ...p, [`file_${sec.id}_${block.id}`]: f }));
                          }}
                        />
                      ) : block.fieldType === 'pdf' ? (
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="rform-file"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setFiles((p) => ({ ...p, [`file_${sec.id}_${block.id}`]: f }));
                          }}
                        />
                      ) : (
                        <input
                          className="rform-input"
                          value={textValues[key] || ''}
                          onChange={(e) => setTextValues((p) => ({ ...p, [key]: e.target.value }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {error ? <p className="rform-error">{error}</p> : null}

            <button type="submit" className="rform-btn rform-btn-primary" disabled={submitting}>
              {submitting ? 'Envoi en cours…' : 'Envoyer ma réponse'}
            </button>
          </form>
        </div>
      </div>
    </FormShell>
  );
}
