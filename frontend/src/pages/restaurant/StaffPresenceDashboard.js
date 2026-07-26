import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import PageLoader from '../../components/PageLoader';
import { useModal } from '../../context/ModalContext';
import {
  exportPresenceQrToPdf,
  exportPresenceToExcel,
  exportPresenceToPdf,
  exportPresenceToWord,
  fetchImageAsDataUrl,
  preparePresenceExport,
} from '../../utils/exportStaffPresence';
import '../commercial/commercial.css';
import './StaffPresenceDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const MEDIA_BASE = API_URL.replace(/\/api\/?$/, '');

function absoluteMediaUrl(path) {
  if (!path) return '';
  const s = String(path);
  if (/^https?:\/\//i.test(s)) return s;
  return `${MEDIA_BASE}${s.startsWith('/') ? '' : '/'}${s}`;
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo' }).format(new Date());
}

function formatCheckedAt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    timeZone: 'Africa/Porto-Novo',
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

export default function StaffPresenceDashboard() {
  const { showSuccess, showError } = useModal();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [records, setRecords] = useState([]);
  const [dateFrom, setDateFrom] = useState(() => todayKey());
  const [dateTo, setDateTo] = useState(() => todayKey());
  const [busy, setBusy] = useState(false);
  const qrCanvasRef = useRef(null);

  const loadSettings = useCallback(async () => {
    const res = await axios.get(`${API_URL}/staff-presence/settings`, authHeaders());
    setSettings(res.data);
  }, []);

  const loadRecords = useCallback(async () => {
    const res = await axios.get(`${API_URL}/staff-presence/records`, {
      ...authHeaders(),
      params: { dateFrom, dateTo },
    });
    setRecords(Array.isArray(res.data) ? res.data : []);
  }, [dateFrom, dateTo]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadSettings(), loadRecords()]);
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [loadSettings, loadRecords, showError]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Toujours le domaine courant (rapido.bj / rapido.online), jamais un host fantôme.
  const publicUrl = useMemo(() => {
    const code = settings?.code;
    if (!code) return '';
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/présence/${encodeURIComponent(code)}`;
    }
    return settings?.url || '';
  }, [settings?.code, settings?.url]);

  const exportMeta = useMemo(() => {
    const same = dateFrom && dateTo && dateFrom === dateTo;
    return {
      title: 'Présence personnel — Rapido Flash',
      subtitle: same
        ? `Date : ${dateFrom} · ${records.length} présence(s)`
        : `Du ${dateFrom || '…'} au ${dateTo || '…'} · ${records.length} présence(s)`,
    };
  }, [dateFrom, dateTo, records.length]);

  const handleExport = (kind) => {
    const data = preparePresenceExport(records, exportMeta);
    if (!data.rows.length) {
      showError('Aucune présence à exporter pour cette période');
      return;
    }
    if (kind === 'excel') exportPresenceToExcel(data);
    if (kind === 'pdf') exportPresenceToPdf(data);
    if (kind === 'word') exportPresenceToWord(data);
  };

  const regenerate = async () => {
    if (
      !window.confirm(
        'Régénérer le QR ? L’ancien code ne fonctionnera plus. Les présences déjà enregistrées sont conservées.'
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/staff-presence/settings/regenerate`,
        {},
        authHeaders()
      );
      setSettings(res.data);
      showSuccess('Nouveau QR généré');
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showSuccess('Lien copié');
    } catch {
      showError('Impossible de copier le lien');
    }
  };

  const downloadQrPdf = async () => {
    try {
      setBusy(true);
      const canvas = qrCanvasRef.current;
      if (!canvas || typeof canvas.toDataURL !== 'function') {
        showError('QR pas encore prêt');
        return;
      }
      let logoDataUrl = settings?.companyLogoDataUrl || null;
      if (!logoDataUrl && settings?.companyLogo) {
        try {
          logoDataUrl = await fetchImageAsDataUrl(absoluteMediaUrl(settings.companyLogo));
        } catch {
          logoDataUrl = null;
        }
      }
      await exportPresenceQrToPdf({
        url: publicUrl,
        qrDataUrl: canvas.toDataURL('image/png'),
        companyName: settings?.companyName || 'KING FISH',
        logoDataUrl,
      });
      showSuccess('PDF du QR téléchargé');
    } catch (e) {
      showError(e.message || 'Impossible de générer le PDF');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader message="Présence personnel…" />;

  return (
    <div className="commercial-page staff-presence-dash">
      <h1>Présence personnel</h1>
      <p className="commercial-lead">
        QR code définitif à afficher / imprimer. Les employés scannent, saisissent leur nom et
        prénom, puis cliquent sur « Je suis présent ». L’heure est prise automatiquement côté
        serveur.
      </p>

      <div className="commercial-card staff-presence-qr-card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem' }}>QR de pointage</h2>
        {publicUrl ? (
          <div className="staff-presence-qr-grid">
            <div className="staff-presence-qr-box">
              <QRCodeSVG value={publicUrl} size={180} level="M" includeMargin />
              {/* Canvas haute résolution pour le PDF (hors écran) */}
              <div className="staff-presence-qr-print" aria-hidden>
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={publicUrl}
                  size={512}
                  level="M"
                  includeMargin
                />
              </div>
            </div>
            <div className="staff-presence-qr-meta">
              <label>
                Lien public
                <input readOnly value={publicUrl} />
              </label>
              <div className="commercial-filters" style={{ marginBottom: 0 }}>
                <button
                  type="button"
                  className="commercial-btn commercial-btn--primary"
                  onClick={downloadQrPdf}
                  disabled={busy || !publicUrl}
                >
                  Télécharger PDF
                </button>
                <button
                  type="button"
                  className="commercial-btn commercial-btn--outline"
                  onClick={copyUrl}
                >
                  Copier le lien
                </button>
                <a
                  className="commercial-btn commercial-btn--outline"
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir
                </a>
                <button
                  type="button"
                  className="commercial-btn commercial-btn--outline"
                  onClick={regenerate}
                  disabled={busy}
                >
                  Régénérer le QR
                </button>
              </div>
              <p className="commercial-lead" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
                Pas d’expiration : le même QR sert tous les jours jusqu’à régénération.
              </p>
            </div>
          </div>
        ) : (
          <p>Impossible de charger le QR.</p>
        )}
      </div>

      <div className="commercial-card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem' }}>Liste des présences</h2>
        <div className="commercial-filters">
          <label>
            Du
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            Au
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <button
            type="button"
            className="commercial-btn commercial-btn--outline"
            onClick={async () => {
              try {
                setBusy(true);
                await loadRecords();
              } catch (e) {
                showError(e.response?.data?.message || e.message);
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            Actualiser
          </button>
          <button
            type="button"
            className="commercial-btn commercial-btn--primary"
            onClick={() => handleExport('excel')}
            disabled={!records.length}
          >
            Excel
          </button>
          <button
            type="button"
            className="commercial-btn commercial-btn--outline"
            onClick={() => handleExport('pdf')}
            disabled={!records.length}
          >
            PDF
          </button>
          <button
            type="button"
            className="commercial-btn commercial-btn--outline"
            onClick={() => handleExport('word')}
            disabled={!records.length}
          >
            Word
          </button>
        </div>

        <p className="commercial-lead" style={{ marginTop: 0 }}>
          <strong>{records.length}</strong> présence{records.length > 1 ? 's' : ''} sur la période
        </p>

        <div className="commercial-table-wrap">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Prénom</th>
                <th>Nom</th>
                <th>Heure de pointage</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r._id}>
                  <td>{i + 1}</td>
                  <td>{r.dateKey}</td>
                  <td>{r.firstName}</td>
                  <td>{r.lastName}</td>
                  <td>{formatCheckedAt(r.checkedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!records.length ? (
            <p style={{ padding: '1rem' }}>Aucune présence pour cette période.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
