import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaTrash, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';
import { useModal } from '../../context/ModalContext';
import { getFormPublicUrls } from '../../utils/formPublicUrls';
import './CustomFormsDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

const newId = () => Math.random().toString(36).slice(2, 11);

const emptySection = () => ({
  id: newId(),
  title: '',
  imageUrl: '',
  blocks: [],
});

const emptyForm = () => ({
  title: '',
  slug: '',
  description: '',
  notifyEmails: '',
  redirectUrl: '',
  isPublished: false,
  sections: [emptySection()],
});

function FieldTypeSelect({ value, onChange }) {
  return (
    <select className="cforms-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="text">Texte court</option>
      <option value="textarea">Texte long</option>
      <option value="image">Image</option>
      <option value="pdf">PDF</option>
    </select>
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
      return;
    }
    setSelectedId(form._id);
    setDraft({
      title: form.title || '',
      slug: form.slug || '',
      description: form.description || '',
      notifyEmails: (form.notifyEmails || []).join(', '),
      redirectUrl: form.redirectUrl || '',
      isPublished: !!form.isPublished,
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
    const text = urls.length ? urls.join('\n') : `${SITE_ORIGIN}/form/${slug}`;
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

  return (
    <div className="dashboard-page cforms-page">
      <header>
        <h1 className="text-xl font-bold text-[var(--rf-text-dark)]">Formulaires</h1>
        <p className="mt-1 text-sm text-[var(--rf-text-muted)]">
          Créez des formulaires avec sections, champs (texte, image, PDF) ou tableaux. Les réponses sont envoyées par
          e-mail et listées dans « Réponses ».
        </p>
      </header>

      <div className="cforms-tabs">
        <button type="button" className={`cforms-tab ${tab === 'forms' ? 'active' : ''}`} onClick={() => setTab('forms')}>
          Mes formulaires
        </button>
        <button
          type="button"
          className={`cforms-tab ${tab === 'responses' ? 'active' : ''}`}
          onClick={() => {
            setTab('responses');
            loadSubmissions();
          }}
        >
          Réponses formulaire
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--rf-text-muted)]">Chargement…</p>
      ) : tab === 'responses' ? (
        <div className="cforms-card">
          <div className="cforms-field-row" style={{ marginBottom: 12 }}>
            <div>
              <label className="cforms-label">Filtrer par formulaire</label>
              <select className="cforms-select" value={filterFormId} onChange={(e) => setFilterFormId(e.target.value)}>
                <option value="">Tous</option>
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
              <button type="button" className="cforms-btn ghost" style={{ marginBottom: 12 }} onClick={() => setDetailSubmission(null)}>
                ← Retour à la liste
              </button>
              <h3 className="font-bold">{detailSubmission.formTitle}</h3>
              <p className="text-sm text-[var(--rf-text-muted)]">
                {detailSubmission.respondentName || '—'} · {detailSubmission.respondentEmail || '—'} ·{' '}
                {new Date(detailSubmission.createdAt).toLocaleString('fr-FR')}
              </p>
              {detailSubmission.answers?.map((a, i) => (
                <div key={i} style={{ marginTop: 12 }}>
                  <strong>{a.label}</strong>
                  {a.tableRows?.length ? (
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
                  ) : a.fileUrl ? (
                    <p>
                      <a className="cforms-link" href={a.fileUrl} target="_blank" rel="noreferrer">
                        {a.fileName || 'Voir le fichier'}
                      </a>
                      {a.fieldType === 'image' ? (
                        <img src={a.fileUrl} alt="" className="cforms-img-preview" />
                      ) : null}
                    </p>
                  ) : (
                    <pre>{a.textValue || '—'}</pre>
                  )}
                </div>
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-[var(--rf-text-muted)]">Aucune réponse pour le moment.</p>
          ) : (
            submissions.map((s) => (
              <div
                key={s._id}
                className="cforms-response-item"
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
                <span className="text-sm text-[var(--rf-text-muted)]">
                  {' '}
                  — {s.respondentName || 'Anonyme'} — {new Date(s.createdAt).toLocaleString('fr-FR')}
                </span>
                {s.emailSent ? (
                  <span className="cforms-badge on">E-mail envoyé</span>
                ) : (
                  <span className="cforms-badge off">E-mail non envoyé</span>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 16 }}>
          <div className="cforms-card">
            <button
              type="button"
              className="cforms-btn primary"
              style={{ width: '100%', marginBottom: 12 }}
              onClick={() => selectForm(null)}
            >
              <FaPlus style={{ marginRight: 6 }} /> Nouveau formulaire
            </button>
            <div className="cforms-grid" style={{ gridTemplateColumns: '1fr' }}>
              {forms.map((f) => (
                <div
                  key={f._id}
                  className={`cforms-form-item ${selectedId === f._id ? 'selected' : ''}`}
                  onClick={() => selectForm(f)}
                >
                  <h3>{f.title}</h3>
                  <span className={`cforms-badge ${f.isPublished ? 'on' : 'off'}`}>
                    {f.isPublished ? 'Publié' : 'Brouillon'}
                  </span>
                  <p className="text-xs text-[var(--rf-text-muted)] mt-1">/{f.slug}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="cforms-card cforms-editor">
            <div>
              <label className="cforms-label">Titre du formulaire *</label>
              <input
                className="cforms-input"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div className="cforms-field-row">
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
            </div>
            <div>
              <label className="cforms-label">Description</label>
              <textarea
                className="cforms-textarea"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="cforms-label">Page de remerciement (après envoi)</label>
              <input
                className="cforms-input"
                value={draft.redirectUrl}
                placeholder="https://rapido.bj/recrutement/merci ou /recrutement/merci"
                onChange={(e) => setDraft((d) => ({ ...d, redirectUrl: e.target.value }))}
              />
              <p className="text-xs text-[var(--rf-text-muted)] mt-1">
                URL absolue ou chemin relatif. Si vide, une page merci au style Rapido s’affiche sur le site.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(e) => setDraft((d) => ({ ...d, isPublished: e.target.checked }))}
              />
              Publier le formulaire (accessible publiquement)
            </label>

            {draft.slug ? (
              <div className="text-sm" style={{ marginTop: 8 }}>
                {!draft.isPublished ? (
                  <p className="text-xs text-[var(--rf-text-muted)] mb-2">
                    Publiez le formulaire pour le rendre accessible via ces liens.
                  </p>
                ) : null}
                <p className="cforms-label" style={{ marginBottom: 6 }}>
                  Liens publics
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px' }}>
                  {getFormPublicUrls(draft.slug).map((url) => (
                    <li key={url} style={{ marginBottom: 6 }}>
                      <a className="cforms-link" href={url} target="_blank" rel="noreferrer">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
                <button type="button" className="cforms-btn ghost" onClick={() => copyPublicLink(draft.slug)}>
                  <FaCopy /> Copier les liens (.bj + .online)
                </button>
              </div>
            ) : null}

            <h3 className="font-bold mt-2">Sections</h3>
            {draft.sections.map((sec, sIdx) => (
              <div key={sec.id} className="cforms-section">
                <div className="cforms-field-row">
                  <div>
                    <label className="cforms-label">Titre de la section *</label>
                    <input
                      className="cforms-input"
                      value={sec.title}
                      onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="cforms-label">Image de section</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onSectionImage(sIdx, e.target.files?.[0])}
                    />
                  </div>
                  <button type="button" className="cforms-btn danger" onClick={() => removeSection(sIdx)}>
                    <FaTrash />
                  </button>
                </div>
                {sec.imageUrl ? (
                  <img src={sec.imageUrl} alt="" className="cforms-img-preview" />
                ) : null}

                {sec.blocks.map((block, bIdx) => (
                  <div key={block.id} className="cforms-block">
                    {block.kind === 'table' ? (
                      <>
                        <label className="cforms-label">Tableau — libellé</label>
                        <input
                          className="cforms-input"
                          value={block.label}
                          onChange={(e) => updateBlock(sIdx, bIdx, { label: e.target.value })}
                        />
                        <label className="cforms-label" style={{ marginTop: 8 }}>
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
                            updateBlock(sIdx, bIdx, { columns: cols.length ? cols : [{ id: newId(), label: 'Colonne 1' }] });
                          }}
                        />
                        <label className="cforms-label" style={{ marginTop: 8 }}>
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
                      </>
                    ) : (
                      <div className="cforms-field-row">
                        <div>
                          <label className="cforms-label">Libellé du champ</label>
                          <input
                            className="cforms-input"
                            value={block.label}
                            onChange={(e) => updateBlock(sIdx, bIdx, { label: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="cforms-label">Type de réponse</label>
                          <FieldTypeSelect
                            value={block.fieldType}
                            onChange={(v) => updateBlock(sIdx, bIdx, { fieldType: v })}
                          />
                        </div>
                        <label style={{ fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={!!block.required}
                            onChange={(e) => updateBlock(sIdx, bIdx, { required: e.target.checked })}
                          />{' '}
                          Obligatoire
                        </label>
                      </div>
                    )}
                    <button type="button" className="cforms-btn danger" style={{ marginTop: 8 }} onClick={() => removeBlock(sIdx, bIdx)}>
                      Supprimer le bloc
                    </button>
                  </div>
                ))}

                <div className="cforms-actions">
                  <button type="button" className="cforms-btn ghost" onClick={() => addFieldBlock(sIdx)}>
                    + Champ
                  </button>
                  <button type="button" className="cforms-btn ghost" onClick={() => addTableBlock(sIdx)}>
                    + Tableau
                  </button>
                </div>
              </div>
            ))}

            <button type="button" className="cforms-btn ghost" onClick={addSection}>
              + Ajouter une section
            </button>

            <div className="cforms-actions">
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
          </div>
        </div>
      )}
    </div>
  );
}
