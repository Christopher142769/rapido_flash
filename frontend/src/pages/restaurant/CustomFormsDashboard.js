import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  FaPlus,
  FaTrash,
  FaCopy,
  FaExternalLinkAlt,
  FaWpforms,
  FaInbox,
  FaTable,
  FaImage,
  FaFilePdf,
  FaAlignLeft,
  FaFont,
  FaListUl,
  FaCheckSquare,
  FaEnvelope,
} from 'react-icons/fa';
import { defaultFormSettings } from '../../utils/customFormSteps';
import FormRichTextEditor from '../../components/forms/FormRichTextEditor';
import { useModal } from '../../context/ModalContext';
import { getFormPublicUrls } from '../../utils/formPublicUrls';
import './CustomFormsDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const newId = () => Math.random().toString(36).slice(2, 11);

const emptySection = () => ({
  id: newId(),
  title: '',
  description: '',
  imageUrl: '',
  blocks: [],
});

const defaultSettings = () => ({
  showProgressBar: true,
  collectContact: true,
  requireName: false,
  requireEmail: false,
  confirmationMessage: '',
});

const emptyForm = () => ({
  title: '',
  slug: '',
  description: '',
  notifyEmails: '',
  redirectUrl: '',
  isPublished: false,
  settings: defaultSettings(),
  sections: [emptySection()],
});

const FIELD_ICONS = {
  text: FaFont,
  textarea: FaAlignLeft,
  email: FaEnvelope,
  image: FaImage,
  pdf: FaFilePdf,
  choice: FaListUl,
  checkbox: FaCheckSquare,
  table: FaTable,
};

const FIELD_TYPE_LABELS = {
  text: 'Texte court',
  textarea: 'Texte long',
  email: 'E-mail',
  image: 'Image',
  pdf: 'PDF',
  choice: 'Choix unique',
  checkbox: 'Cases à cocher',
};

function FieldTypeSelect({ value, onChange }) {
  return (
    <select className="cforms-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Type de réponse">
      <option value="text">Texte court</option>
      <option value="textarea">Texte long</option>
      <option value="email">E-mail</option>
      <option value="choice">Choix unique (une réponse)</option>
      <option value="checkbox">Choix multiples</option>
      <option value="image">Image</option>
      <option value="pdf">PDF</option>
    </select>
  );
}

function OptionsEditor({ options, onChange }) {
  const lines = (options || []).map((o) => o.label).join('\n');
  return (
    <div>
      <label className="cforms-label">Options (une par ligne)</label>
      <textarea
        className="cforms-textarea"
        rows={4}
        value={lines}
        placeholder={'Option A\nOption B\nOption C'}
        onChange={(e) => {
          const opts = e.target.value
            .split('\n')
            .map((label) => label.trim())
            .filter(Boolean)
            .map((label) => ({ id: newId(), label }));
          onChange(opts.length ? opts : [{ id: newId(), label: 'Option 1' }]);
        }}
      />
    </div>
  );
}

export default function CustomFormsDashboard() {
  const { showSuccess, showError } = useModal();
  const [tab, setTab] = useState('forms');
  const [forms, setForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(emptyForm());
  const [filterFormId, setFilterFormId] = useState('');
  const [detailSubmission, setDetailSubmission] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const token = localStorage.getItem('token');
  const authHeaders = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const loadForms = useCallback(async () => {
    const res = await axios.get(`${API_URL}/custom-forms`, authHeaders);
    setForms(res.data || []);
  }, [authHeaders]);

  const loadSubmissions = useCallback(async () => {
    const params = filterFormId ? { formId: filterFormId } : {};
    const res = await axios.get(`${API_URL}/custom-forms/submissions/list`, { ...authHeaders, params });
    setSubmissions(res.data?.items || []);
  }, [authHeaders, filterFormId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadForms(), loadSubmissions()])
      .catch(() => showError('Impossible de charger les formulaires'))
      .finally(() => setLoading(false));
  }, [loadForms, loadSubmissions, showError]);

  useEffect(() => {
    if (tab === 'responses') loadSubmissions();
  }, [filterFormId, tab, loadSubmissions]);

  const selectForm = (form) => {
    if (!form) {
      setSelectedId(null);
      setDraft(emptyForm());
      setEditorOpen(true);
      return;
    }
    setEditorOpen(true);
    setSelectedId(form._id);
    setDraft({
      title: form.title || '',
      slug: form.slug || '',
      description: form.description || '',
      notifyEmails: (form.notifyEmails || []).join(', '),
      redirectUrl: form.redirectUrl || '',
      isPublished: !!form.isPublished,
      settings: defaultFormSettings(form.settings),
      sections: (form.sections || []).length ? form.sections : [emptySection()],
    });
    setTab('forms');
  };

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await axios.post(`${API_URL}/custom-forms/upload`, fd, {
      ...authHeaders,
      headers: { ...authHeaders.headers, 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  };

  const saveForm = async () => {
    if (!draft.title.trim()) {
      showError('Titre du formulaire requis');
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: draft.title.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description,
        notifyEmails: draft.notifyEmails,
        redirectUrl: draft.redirectUrl,
        isPublished: draft.isPublished,
        settings: draft.settings,
        sections: draft.sections,
      };
      if (selectedId) {
        const res = await axios.put(`${API_URL}/custom-forms/${selectedId}`, body, authHeaders);
        showSuccess('Formulaire enregistré');
        selectForm(res.data);
      } else {
        const res = await axios.post(`${API_URL}/custom-forms`, body, authHeaders);
        showSuccess('Formulaire créé');
        selectForm(res.data);
      }
      await loadForms();
    } catch (err) {
      showError(err.response?.data?.message || 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const deleteForm = async () => {
    if (!selectedId) return;
    if (!window.confirm('Supprimer ce formulaire et toutes ses réponses ?')) return;
    try {
      await axios.delete(`${API_URL}/custom-forms/${selectedId}`, authHeaders);
      showSuccess('Formulaire supprimé');
      selectForm(null);
      await loadForms();
      await loadSubmissions();
    } catch (err) {
      showError(err.response?.data?.message || 'Erreur suppression');
    }
  };

  const copyPublicLink = (slug) => {
    const urls = getFormPublicUrls(slug);
    const text = urls.length ? urls.join('\n') : '';
    navigator.clipboard.writeText(text).then(() => showSuccess('Liens copiés'));
  };

  const updateSection = (idx, patch) => {
    setDraft((d) => {
      const sections = [...d.sections];
      sections[idx] = { ...sections[idx], ...patch };
      return { ...d, sections };
    });
  };

  const addSection = () => setDraft((d) => ({ ...d, sections: [...d.sections, emptySection()] }));

  const removeSection = (idx) => {
    setDraft((d) => ({
      ...d,
      sections: d.sections.filter((_, i) => i !== idx),
    }));
  };

  const addFieldBlock = (sIdx) => {
    setDraft((d) => {
      const sections = [...d.sections];
      sections[sIdx] = {
        ...sections[sIdx],
        blocks: [
          ...sections[sIdx].blocks,
          { id: newId(), kind: 'field', fieldType: 'text', label: '', required: false },
        ],
      };
      return { ...d, sections };
    });
  };

  const addTableBlock = (sIdx) => {
    setDraft((d) => {
      const sections = [...d.sections];
      sections[sIdx] = {
        ...sections[sIdx],
        blocks: [
          ...sections[sIdx].blocks,
          {
            id: newId(),
            kind: 'table',
            label: 'Tableau à remplir',
            columns: [
              { id: newId(), label: 'Colonne 1' },
              { id: newId(), label: 'Colonne 2' },
            ],
            rowCount: 3,
          },
        ],
      };
      return { ...d, sections };
    });
  };

  const updateBlock = (sIdx, bIdx, patch) => {
    setDraft((d) => {
      const sections = [...d.sections];
      const blocks = [...sections[sIdx].blocks];
      blocks[bIdx] = { ...blocks[bIdx], ...patch };
      sections[sIdx] = { ...sections[sIdx], blocks };
      return { ...d, sections };
    });
  };

  const removeBlock = (sIdx, bIdx) => {
    setDraft((d) => {
      const sections = [...d.sections];
      sections[sIdx] = {
        ...sections[sIdx],
        blocks: sections[sIdx].blocks.filter((_, i) => i !== bIdx),
      };
      return { ...d, sections };
    });
  };

  const onSectionImage = async (sIdx, file) => {
    if (!file) return;
    try {
      const url = await uploadFile(file);
      updateSection(sIdx, { imageUrl: url });
      showSuccess('Image de section ajoutée');
    } catch {
      showError('Échec upload image');
    }
  };

  const isEditing = editorOpen;
  const publishedCount = forms.filter((f) => f.isPublished).length;

  return (
    <div className="dashboard-page cforms-page">
      <header className="cforms-hero">
        <h1>Formulaires</h1>
        <p>
          Créez des formulaires type Google Forms : sections, texte, choix unique / multiple, fichiers et tableaux.
          La page publique affiche une question à la fois (style Typeform) avec barre de progression.
        </p>
        <div className="cforms-stats">
          <div className="cforms-stat">
            <strong>{forms.length}</strong>
            <span>Formulaires</span>
          </div>
          <div className="cforms-stat">
            <strong>{publishedCount}</strong>
            <span>Publiés</span>
          </div>
          <div className="cforms-stat">
            <strong>{submissions.length}</strong>
            <span>Réponses</span>
          </div>
        </div>
      </header>

      <div className="cforms-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'forms'}
          className={`cforms-tab ${tab === 'forms' ? 'active' : ''}`}
          onClick={() => setTab('forms')}
        >
          <FaWpforms style={{ marginRight: 6 }} />
          Mes formulaires
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'responses'}
          className={`cforms-tab ${tab === 'responses' ? 'active' : ''}`}
          onClick={() => {
            setTab('responses');
            loadSubmissions();
          }}
        >
          <FaInbox style={{ marginRight: 6 }} />
          Réponses
        </button>
      </div>

      {loading ? (
        <div className="cforms-loading">Chargement…</div>
      ) : tab === 'responses' ? (
        <div className="cforms-card">
          <div className="cforms-responses-toolbar">
            <div className="cforms-field-grow">
              <label className="cforms-label">Filtrer par formulaire</label>
              <select className="cforms-select" value={filterFormId} onChange={(e) => setFilterFormId(e.target.value)}>
                <option value="">Tous les formulaires</option>
                {forms.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="cforms-btn ghost" onClick={() => loadSubmissions()}>
              Actualiser
            </button>
          </div>

          {detailSubmission ? (
            <div className="cforms-detail">
              <button type="button" className="cforms-btn ghost" onClick={() => setDetailSubmission(null)}>
                ← Retour à la liste
              </button>
              <div className="cforms-detail-header">
                <span className="cforms-badge email-ok">{detailSubmission.formTitle}</span>
                <h3>{detailSubmission.respondentName || 'Sans nom'}</h3>
                <p className="cforms-response-meta">
                  {detailSubmission.respondentEmail || '—'} ·{' '}
                  {new Date(detailSubmission.createdAt).toLocaleString('fr-FR')}
                  {detailSubmission.emailSent ? ' · E-mail envoyé' : ''}
                </p>
              </div>
              {detailSubmission.answers?.map((a, i) => (
                <div key={i} className="cforms-answer-card">
                  <strong>{a.label}</strong>
                  {a.tableRows?.length ? (
                    <div className="cforms-table-wrap">
                      <table className="cforms-table-preview">
                        <tbody>
                          {a.tableRows.map((row, ri) => (
                            <tr key={ri}>
                              {row.map((cell, ci) => (
                                <td key={ci}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : a.fileUrl ? (
                    <>
                      <a className="cforms-link" href={a.fileUrl} target="_blank" rel="noreferrer">
                        {a.fileName || 'Voir le fichier'}
                      </a>
                      {a.fieldType === 'image' ? (
                        <img src={a.fileUrl} alt="" className="cforms-img-preview" />
                      ) : null}
                    </>
                  ) : a.selectedValues?.length ? (
                    <ul className="cforms-answer-list">
                      {a.selectedValues.map((v, vi) => (
                        <li key={vi}>{v}</li>
                      ))}
                    </ul>
                  ) : (
                    <pre>{a.textValue || '—'}</pre>
                  )}
                </div>
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="cforms-empty">
              <FaInbox size={32} style={{ opacity: 0.35 }} />
              <p>Aucune réponse pour le moment.</p>
            </div>
          ) : (
            submissions.map((s) => (
              <div
                key={s._id}
                className="cforms-response-card"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={async () => {
                  try {
                    const res = await axios.get(`${API_URL}/custom-forms/submissions/${s._id}`, authHeaders);
                    setDetailSubmission(res.data);
                  } catch {
                    showError('Impossible de charger la réponse');
                  }
                }}
              >
                <strong>{s.formTitle}</strong>
                <span className="cforms-response-meta">
                  {s.respondentName || 'Anonyme'}
                  {s.respondentEmail ? ` · ${s.respondentEmail}` : ''}
                  <br />
                  {new Date(s.createdAt).toLocaleString('fr-FR')}
                </span>
                <div className="cforms-form-item-meta">
                  {s.emailSent ? (
                    <span className="cforms-badge on">E-mail OK</span>
                  ) : (
                    <span className="cforms-badge off">E-mail non envoyé</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="cforms-layout">
          <aside className="cforms-card cforms-sidebar">
            <button type="button" className="cforms-btn primary block" onClick={() => selectForm(null)}>
              <FaPlus /> Nouveau formulaire
            </button>
            <div className="cforms-sidebar-list">
              {forms.length === 0 ? (
                <p className="cforms-hint" style={{ textAlign: 'center', padding: 16 }}>
                  Aucun formulaire. Créez-en un.
                </p>
              ) : (
                forms.map((f) => (
                  <button
                    key={f._id}
                    type="button"
                    className={`cforms-form-item ${selectedId === f._id ? 'selected' : ''}`}
                    onClick={() => selectForm(f)}
                  >
                    <h3>{f.title}</h3>
                    <div className="cforms-form-item-meta">
                      <span className={`cforms-badge ${f.isPublished ? 'on' : 'off'}`}>
                        {f.isPublished ? 'Publié' : 'Brouillon'}
                      </span>
                      <span className="cforms-form-slug">/form/{f.slug}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="cforms-card cforms-editor">
            {!isEditing ? (
              <div className="cforms-editor-empty">
                <FaWpforms size={40} style={{ opacity: 0.25, color: 'var(--cf-bronze)' }} />
                <p>Sélectionnez un formulaire ou créez-en un nouveau pour commencer.</p>
                <button type="button" className="cforms-btn primary" style={{ marginTop: 16 }} onClick={() => selectForm(null)}>
                  <FaPlus /> Créer un formulaire
                </button>
              </div>
            ) : (
              <>
                <h2 className="cforms-editor-title">{selectedId ? 'Modifier le formulaire' : 'Nouveau formulaire'}</h2>

                <div className="cforms-field-grid">
                  <div className="cforms-field-full">
                    <label className="cforms-label">Titre du formulaire *</label>
                    <input
                      className="cforms-input"
                      value={draft.title}
                      placeholder="Ex. Candidature Manager 2026"
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="cforms-label">Slug (URL)</label>
                    <input
                      className="cforms-input"
                      value={draft.slug}
                      placeholder="auto depuis le titre"
                      onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="cforms-label">E-mails de notification</label>
                    <input
                      className="cforms-input"
                      value={draft.notifyEmails}
                      placeholder="a@ex.com, b@ex.com"
                      onChange={(e) => setDraft((d) => ({ ...d, notifyEmails: e.target.value }))}
                    />
                  </div>
                  <div className="cforms-field-full">
                    <label className="cforms-label">Description (page d’accueil du formulaire)</label>
                    <FormRichTextEditor
                      value={draft.description}
                      placeholder="Texte d’introduction : sélectionnez un passage pour le mettre en gras, italique, lien…"
                      minHeight={120}
                      onChange={(html) => setDraft((d) => ({ ...d, description: html }))}
                    />
                  </div>
                  <div className="cforms-field-full">
                    <label className="cforms-label">Page de remerciement (après envoi)</label>
                    <input
                      className="cforms-input"
                      value={draft.redirectUrl}
                      placeholder="https://rapido.bj/recrutement/merci"
                      onChange={(e) => setDraft((d) => ({ ...d, redirectUrl: e.target.value }))}
                    />
                    <p className="cforms-hint">URL absolue ou chemin relatif (/recrutement/merci). Sinon, page merci intégrée.</p>
                  </div>
                </div>

                <div className="cforms-settings-box">
                  <h3>Présentation (page publique)</h3>
                  <p className="cforms-hint">Comme Google Forms : barre de progression, coordonnées, message de confirmation.</p>
                  <label className="cforms-check">
                    <input
                      type="checkbox"
                      checked={!!draft.settings?.showProgressBar}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          settings: { ...d.settings, showProgressBar: e.target.checked },
                        }))
                      }
                    />
                    Afficher la barre de progression
                  </label>
                  <label className="cforms-check">
                    <input
                      type="checkbox"
                      checked={draft.settings?.collectContact !== false}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          settings: { ...d.settings, collectContact: e.target.checked },
                        }))
                      }
                    />
                    Demander nom et e-mail en début de formulaire
                  </label>
                  {draft.settings?.collectContact !== false ? (
                    <>
                      <label className="cforms-check">
                        <input
                          type="checkbox"
                          checked={!!draft.settings?.requireName}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              settings: { ...d.settings, requireName: e.target.checked },
                            }))
                          }
                        />
                        Nom obligatoire
                      </label>
                      <label className="cforms-check">
                        <input
                          type="checkbox"
                          checked={!!draft.settings?.requireEmail}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              settings: { ...d.settings, requireEmail: e.target.checked },
                            }))
                          }
                        />
                        E-mail obligatoire
                      </label>
                    </>
                  ) : null}
                  <label className="cforms-label" style={{ marginTop: 12 }}>
                    Message de confirmation (si pas de redirection)
                  </label>
                  <textarea
                    className="cforms-textarea"
                    rows={2}
                    value={draft.settings?.confirmationMessage || ''}
                    placeholder="Merci pour votre candidature…"
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        settings: { ...d.settings, confirmationMessage: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="cforms-publish-row">
                  <div>
                    <strong>Publier le formulaire</strong>
                    <span>Rendre accessible via rapido.bj/form et rapido.online/form</span>
                  </div>
                  <label className="cforms-switch" aria-label="Publier">
                    <input
                      type="checkbox"
                      checked={draft.isPublished}
                      onChange={(e) => setDraft((d) => ({ ...d, isPublished: e.target.checked }))}
                    />
                    <span className="cforms-switch-slider" />
                  </label>
                </div>

                {draft.slug ? (
                  <div className="cforms-links-box">
                    {!draft.isPublished ? (
                      <p className="cforms-hint" style={{ marginBottom: 10 }}>
                        Publiez pour activer les liens publics.
                      </p>
                    ) : null}
                    <span className="cforms-label">Liens publics</span>
                    <ul>
                      {getFormPublicUrls(draft.slug).map((url) => (
                        <li key={url}>
                          <a className="cforms-link" href={url} target="_blank" rel="noreferrer">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="cforms-btn ghost" onClick={() => copyPublicLink(draft.slug)}>
                      <FaCopy /> Copier les liens
                    </button>
                  </div>
                ) : null}

                <div className="cforms-sections-head">
                  <h3>Sections du formulaire</h3>
                  <button type="button" className="cforms-btn ghost" onClick={addSection}>
                    <FaPlus /> Section
                  </button>
                </div>

                {draft.sections.map((sec, sIdx) => (
                  <div key={sec.id} className="cforms-section">
                    <span className="cforms-section-num">SECTION {sIdx + 1}</span>
                    <div className="cforms-section-toolbar">
                      <div className="cforms-section-toolbar-title">
                        <label className="cforms-label">Titre de la section *</label>
                        <input
                          className="cforms-input"
                          value={sec.title}
                          placeholder="Ex. Expérience professionnelle"
                          onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        className="cforms-btn danger icon-only"
                        aria-label="Supprimer la section"
                        onClick={() => removeSection(sIdx)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                    <div className="cforms-section-desc">
                      <label className="cforms-label">Description de la section</label>
                      <p className="cforms-hint">
                        Instructions, liens ou texte formaté affiché avant les questions de cette section.
                      </p>
                      <FormRichTextEditor
                        value={sec.description || ''}
                        placeholder="Texte de la section…"
                        minHeight={90}
                        onChange={(html) => updateSection(sIdx, { description: html })}
                      />
                    </div>
                    <div className="cforms-file-wrap">
                      <label className="cforms-label">Image illustrative (optionnel)</label>
                      <input type="file" accept="image/*" onChange={(e) => onSectionImage(sIdx, e.target.files?.[0])} />
                    </div>
                    {sec.imageUrl ? <img src={sec.imageUrl} alt="" className="cforms-img-preview" /> : null}

                    {sec.blocks.map((block, bIdx) => {
                      const typeKey = block.kind === 'table' ? 'table' : block.fieldType;
                      const TypeIcon = FIELD_ICONS[typeKey] || FaFont;
                      return (
                        <div key={block.id} className="cforms-block">
                          <div className="cforms-block-header">
                            <span className="cforms-block-type">
                              <TypeIcon style={{ marginRight: 4 }} />
                              {block.kind === 'table' ? 'Tableau' : FIELD_TYPE_LABELS[block.fieldType] || block.fieldType}
                            </span>
                            <button
                              type="button"
                              className="cforms-btn danger icon-only"
                              aria-label="Supprimer le bloc"
                              onClick={() => removeBlock(sIdx, bIdx)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                          {block.kind === 'table' ? (
                            <>
                              <label className="cforms-label">Libellé du tableau</label>
                              <input
                                className="cforms-input"
                                value={block.label}
                                onChange={(e) => updateBlock(sIdx, bIdx, { label: e.target.value })}
                              />
                              <label className="cforms-label" style={{ marginTop: 10 }}>
                                Colonnes (séparées par ;)
                              </label>
                              <input
                                className="cforms-input"
                                value={(block.columns || []).map((c) => c.label).join('; ')}
                                onChange={(e) => {
                                  const cols = e.target.value
                                    .split(';')
                                    .map((label) => label.trim())
                                    .filter(Boolean)
                                    .map((label) => ({ id: newId(), label }));
                                  updateBlock(sIdx, bIdx, {
                                    columns: cols.length ? cols : [{ id: newId(), label: 'Colonne 1' }],
                                  });
                                }}
                              />
                              <label className="cforms-label" style={{ marginTop: 10 }}>
                                Nombre de lignes
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                className="cforms-input"
                                value={block.rowCount || 3}
                                onChange={(e) => updateBlock(sIdx, bIdx, { rowCount: parseInt(e.target.value, 10) || 3 })}
                              />
                              <label className="cforms-check" style={{ marginTop: 10 }}>
                                <input
                                  type="checkbox"
                                  checked={!!block.required}
                                  onChange={(e) => updateBlock(sIdx, bIdx, { required: e.target.checked })}
                                />
                                Tableau obligatoire
                              </label>
                            </>
                          ) : (
                            <div className="cforms-block-fields">
                              <div>
                                <label className="cforms-label">Libellé</label>
                                <input
                                  className="cforms-input"
                                  value={block.label}
                                  onChange={(e) => updateBlock(sIdx, bIdx, { label: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="cforms-label">Type</label>
                                <FieldTypeSelect
                                  value={block.fieldType}
                                  onChange={(v) => {
                                    const patch = { fieldType: v };
                                    if (v === 'choice' || v === 'checkbox') {
                                      patch.options = block.options?.length
                                        ? block.options
                                        : [
                                            { id: newId(), label: 'Option 1' },
                                            { id: newId(), label: 'Option 2' },
                                          ];
                                    }
                                    updateBlock(sIdx, bIdx, patch);
                                  }}
                                />
                              </div>
                              {(block.fieldType === 'choice' || block.fieldType === 'checkbox') && (
                                <div className="cforms-field-full">
                                  <OptionsEditor
                                    options={block.options}
                                    onChange={(options) => updateBlock(sIdx, bIdx, { options })}
                                  />
                                </div>
                              )}
                              <label className="cforms-check">
                                <input
                                  type="checkbox"
                                  checked={!!block.required}
                                  onChange={(e) => updateBlock(sIdx, bIdx, { required: e.target.checked })}
                                />
                                Champ obligatoire
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="cforms-section-actions">
                      <button type="button" className="cforms-btn ghost" onClick={() => addFieldBlock(sIdx)}>
                        + Champ
                      </button>
                      <button type="button" className="cforms-btn ghost" onClick={() => addTableBlock(sIdx)}>
                        + Tableau
                      </button>
                    </div>
                  </div>
                ))}

                <div className="cforms-actions cforms-actions-sticky">
                  <button type="button" className="cforms-btn primary" disabled={saving} onClick={saveForm}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  {selectedId && draft.slug && draft.isPublished ? (
                    <a className="cforms-btn ghost" href={`/form/${draft.slug}`} target="_blank" rel="noreferrer">
                      <FaExternalLinkAlt /> Aperçu
                    </a>
                  ) : null}
                  {selectedId ? (
                    <button type="button" className="cforms-btn danger" onClick={deleteForm}>
                      Supprimer
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
