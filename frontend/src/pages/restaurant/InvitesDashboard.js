import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

import PageLoader from '../../components/PageLoader';
import { useModal } from '../../context/ModalContext';
import './InvitesDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: token ? `Bearer ${token}` : '' } };
}

function parseNames(text) {
  const raw = String(text || '')
    .replace(/\r/g, '')
    .trim();
  if (!raw) return [];

  return raw
    .split(/\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InvitesDashboard() {
  const { showSuccess, showError } = useModal();
  const [eventKey, setEventKey] = useState('default');
  const [defaultDomain, setDefaultDomain] = useState('');
  const [namesText, setNamesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [view, setView] = useState('future');
  const [showQr, setShowQr] = useState(false);

  const publicOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/invitations`, {
        ...authHeaders(),
        params: { eventKey },
      });
      setInvitations(Array.isArray(res.data?.invitations) ? res.data.invitations : []);
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [eventKey, showError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const futureInvites = useMemo(() => invitations.filter((i) => !i.present), [invitations]);
  const presentInvites = useMemo(() => invitations.filter((i) => i.present), [invitations]);
  const withEmailCount = useMemo(
    () => invitations.filter((i) => String(i.email || '').includes('@')).length,
    [invitations]
  );

  const handleSaveNames = async () => {
    const names = parseNames(namesText);
    if (!names.length) {
      showError('Collez au moins un nom et prénom (avec e-mail si possible).');
      return;
    }
    setSaving(true);
    setShowQr(false);
    try {
      const res = await axios.post(
        `${API_URL}/invitations/batch`,
        {
          eventKey,
          names,
          domain: defaultDomain,
        },
        authHeaders()
      );
      setInvitations(Array.isArray(res.data?.invitations) ? res.data.invitations : []);
      showSuccess(`Liste enregistrée : ${names.length} ligne(s) traitées.`);
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Impossible d’enregistrer.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQr = () => {
    if (!futureInvites.length) {
      showError('Aucun invité « à confirmer » à générer.');
      return;
    }
    setShowQr(true);
  };

  const handleSendAllEmails = async () => {
    setSending(true);
    try {
      const res = await axios.post(
        `${API_URL}/invitations/send-emails`,
        { eventKey, onlyUnsent: true },
        authHeaders()
      );
      await refresh();
      showSuccess(
        `E-mails envoyés : ${res.data?.sent || 0} / ${res.data?.total || 0}` +
          (res.data?.failed ? ` (${res.data.failed} échec(s))` : '')
      );
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadLetter = async (inv) => {
    try {
      const res = await axios.get(`${API_URL}/invitations/${inv.code}/letter.pdf`, {
        ...authHeaders(),
        responseType: 'blob',
      });
      downloadBlob(res.data, `Invitation_${inv.fullName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      showError(err.response?.data?.message || 'Téléchargement impossible.');
    }
  };

  const handleSendOneEmail = async (inv) => {
    try {
      await axios.post(`${API_URL}/invitations/${inv.code}/send-email`, {}, authHeaders());
      await refresh();
      showSuccess(`Lettre envoyée à ${inv.email}`);
    } catch (err) {
      showError(err.response?.data?.message || 'Envoi impossible.');
    }
  };

  if (loading) {
    return (
      <div className="invites-dashboard">
        <PageLoader message="Chargement des invités…" />
      </div>
    );
  }

  const listToShow = view === 'future' ? futureInvites : presentInvites;

  return (
    <div className="invites-dashboard">
      <div className="invites-dashboard-head">
        <h1>Invités</h1>
        <p>
          Collez la liste (nom + e-mail), générez les QR codes et envoyez la lettre PDF personnalisée
          à chaque invité.
        </p>
      </div>

      <div className="invites-dashboard-card">
        <div className="invites-dashboard-grid">
          <div className="invites-dashboard-field">
            <label>Événement (clé)</label>
            <input
              className="invites-dashboard-input"
              value={eventKey}
              onChange={(e) => setEventKey(e.target.value || 'default')}
            />
          </div>
          <div className="invites-dashboard-field">
            <label>Domaine par défaut (optionnel)</label>
            <input
              className="invites-dashboard-input"
              value={defaultDomain}
              onChange={(e) => setDefaultDomain(e.target.value)}
              placeholder="Ex. Agroalimentaire"
            />
          </div>
          <div className="invites-dashboard-field invites-dashboard-field--right">
            <button
              type="button"
              className="invites-dashboard-tab-btn"
              onClick={() => setView('future')}
              aria-pressed={view === 'future'}
            >
              Futurs ({futureInvites.length})
            </button>
            <button
              type="button"
              className="invites-dashboard-tab-btn"
              onClick={() => setView('present')}
              aria-pressed={view === 'present'}
            >
              Présence ({presentInvites.length})
            </button>
          </div>
        </div>

        <div className="invites-dashboard-field">
          <label>Liste invités (nom + e-mail)</label>
          <textarea
            className="invites-dashboard-textarea"
            rows={8}
            placeholder={
              'Collez ici (une ligne par invité) :\n' +
              'Jean Dupont <jean@email.com>\n' +
              'Marie Koffi, marie@email.com\n' +
              'Paul Agro, paul@email.com, Agroalimentaire'
            }
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
          />
          <p className="invites-dashboard-hint">
            Formats : <code>Nom Prénom &lt;email&gt;</code> ou <code>Nom, email</code> ou{' '}
            <code>Nom, email, domaine</code>. Plus de 100 invités OK.
          </p>
        </div>

        <div className="invites-dashboard-actions">
          <button
            type="button"
            className="invites-dashboard-primary"
            disabled={saving}
            onClick={handleSaveNames}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer la liste'}
          </button>

          <button
            type="button"
            className="invites-dashboard-secondary"
            onClick={handleGenerateQr}
            disabled={!futureInvites.length}
          >
            Générer les QR codes
          </button>

          <button
            type="button"
            className="invites-dashboard-secondary"
            onClick={handleSendAllEmails}
            disabled={sending || withEmailCount === 0}
          >
            {sending ? 'Envoi…' : `Envoyer les lettres par e-mail (${withEmailCount})`}
          </button>

          <button
            type="button"
            className="invites-dashboard-secondary"
            onClick={() => {
              setShowQr(false);
              void refresh();
            }}
          >
            Rafraîchir
          </button>
        </div>
      </div>

      <div className="invites-dashboard-card invites-dashboard-card--list">
        <header className="invites-dashboard-list-head">
          <div>
            <h2 className="invites-dashboard-list-title">
              {view === 'future' ? 'Futurs invités' : 'Invités présents'}
            </h2>
            <p className="invites-dashboard-list-sub">
              {view === 'future'
                ? 'QR unique par invité. La lettre PDF reprend le modèle officiel avec nom et QR en bas.'
                : 'Invités ayant coché leur présence via le scan.'}
            </p>
          </div>
        </header>

        {!listToShow.length ? (
          <p className="invites-dashboard-empty">Rien à afficher pour le moment.</p>
        ) : (
          <div className="invites-dashboard-list">
            {listToShow.map((inv) => {
              const inviteUrl = `${publicOrigin}/invités/${inv.code}`;
              return (
                <article key={inv.code} className={`invites-card ${inv.present ? 'invites-card--present' : ''}`}>
                  <div className="invites-card-top">
                    <div>
                      <div className="invites-card-name">{inv.fullName}</div>
                      {inv.email ? (
                        <div className="invites-card-email">{inv.email}</div>
                      ) : (
                        <div className="invites-card-email invites-card-email--missing">E-mail manquant</div>
                      )}
                      {inv.domain ? <div className="invites-card-domain">{inv.domain}</div> : null}
                    </div>
                    <div className="invites-card-status">
                      {inv.present ? (
                        <span className="invites-pill invites-pill--ok">Présent</span>
                      ) : (
                        <span className="invites-pill invites-pill--todo">À confirmer</span>
                      )}
                    </div>
                  </div>

                  <div className="invites-card-actions-row">
                    <button type="button" className="invites-card-btn" onClick={() => handleDownloadLetter(inv)}>
                      PDF
                    </button>
                    {inv.email ? (
                      <button
                        type="button"
                        className="invites-card-btn invites-card-btn--primary"
                        onClick={() => handleSendOneEmail(inv)}
                      >
                        {inv.emailSentAt ? 'Renvoyer' : 'Envoyer'}
                      </button>
                    ) : null}
                  </div>

                  {view === 'future' && showQr ? (
                    <div className="invites-card-qr">
                      <QRCodeSVG value={inviteUrl} size={96} level="M" includeMargin />
                      <a
                        href={inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="invites-card-qr-link"
                      >
                        Ouvrir le lien
                      </a>
                    </div>
                  ) : null}

                  {inv.emailSentAt ? (
                    <div className="invites-card-checked">
                      E-mail envoyé :{' '}
                      <strong>
                        {new Date(inv.emailSentAt).toLocaleString('fr-FR', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </strong>
                    </div>
                  ) : null}

                  {inv.present && inv.checkedAt ? (
                    <div className="invites-card-checked">
                      Présence :{' '}
                      <strong>
                        {new Date(inv.checkedAt).toLocaleString('fr-FR', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </strong>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
