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

function buildPublicUrl(code) {
  if (!code) return '';
  if (typeof window !== 'undefined' && window.location?.origin) {
    // ASCII /presence/ — ouverture directe par l’appareil photo (pas « copier le lien »)
    return `${window.location.origin}/presence/${encodeURIComponent(code)}`;
  }
  return '';
}

function QrBlock({
  title,
  hint,
  publicUrl,
  canvasRef,
  busy,
  onDownloadPdf,
  onCopy,
  onRegenerate,
}) {
  return (
    <div className="commercial-card staff-presence-qr-card">
      <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem' }}>{title}</h2>
      <p className="commercial-lead" style={{ marginTop: 0, fontSize: '0.88rem' }}>
        {hint}
      </p>
      {publicUrl ? (
        <div className="staff-presence-qr-grid">
          <div className="staff-presence-qr-box">
            <QRCodeSVG value={publicUrl} size={160} level="M" includeMargin />
            <div className="staff-presence-qr-print" aria-hidden>
              <QRCodeCanvas ref={canvasRef} value={publicUrl} size={512} level="M" includeMargin />
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
                onClick={onDownloadPdf}
                disabled={busy || !publicUrl}
              >
                Télécharger PDF
              </button>
              <button
                type="button"
                className="commercial-btn commercial-btn--outline"
                onClick={onCopy}
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
                onClick={onRegenerate}
                disabled={busy}
              >
                Régénérer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p>Impossible de charger le QR.</p>
      )}
    </div>
  );
}

export default function StaffPresenceDashboard() {
  const { showSuccess, showError } = useModal();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [records, setRecords] = useState([]);
  const [listKind, setListKind] = useState('arrival');
  const [dateFrom, setDateFrom] = useState(() => todayKey());
  const [dateTo, setDateTo] = useState(() => todayKey());
  const [busy, setBusy] = useState(false);
  const arrivalCanvasRef = useRef(null);
  const exitCanvasRef = useRef(null);

  const loadSettings = useCallback(async () => {
    const res = await axios.get(`${API_URL}/staff-presence/settings`, authHeaders());
    setSettings(res.data);
  }, []);

  const loadRecords = useCallback(async () => {
    const res = await axios.get(`${API_URL}/staff-presence/records`, {
      ...authHeaders(),
      params: { dateFrom, dateTo, kind: listKind },
    });
    setRecords(Array.isArray(res.data) ? res.data : []);
  }, [dateFrom, dateTo, listKind]);

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

  const arrivalUrl = useMemo(
    () => buildPublicUrl(settings?.arrivalCode) || settings?.arrivalUrl || '',
    [settings?.arrivalCode, settings?.arrivalUrl]
  );
  const exitUrl = useMemo(
    () => buildPublicUrl(settings?.exitCode) || settings?.exitUrl || '',
    [settings?.exitCode, settings?.exitUrl]
  );

  const isExitList = listKind === 'exit';
  const listLabel = isExitList ? 'sortie' : 'arrivée';
  const timeHeader = isExitList ? 'Heure de sortie' : 'Heure d’arrivée';

  const exportMeta = useMemo(() => {
    const same = dateFrom && dateTo && dateFrom === dateTo;
    return {
      title: isExitList
        ? 'Présence personnel — Sortie'
        : 'Présence personnel — Arrivée',
      subtitle: same
        ? `Date : ${dateFrom} · ${records.length} ${listLabel}(s)`
        : `Du ${dateFrom || '…'} au ${dateTo || '…'} · ${records.length} ${listLabel}(s)`,
      timeHeader,
      fileSlug: isExitList ? 'presence-sortie' : 'presence-arrivee',
    };
  }, [dateFrom, dateTo, records.length, isExitList, listLabel, timeHeader]);

  const handleExport = (kind) => {
    const data = preparePresenceExport(records, exportMeta);
    data.timeHeader = exportMeta.timeHeader;
    data.fileSlug = exportMeta.fileSlug;
    if (!data.rows.length) {
      showError(`Aucune ${listLabel} à exporter pour cette période`);
      return;
    }
    if (kind === 'excel') exportPresenceToExcel(data);
    if (kind === 'pdf') exportPresenceToPdf(data);
    if (kind === 'word') exportPresenceToWord(data);
  };

  const regenerate = async (kind) => {
    const label = kind === 'exit' ? 'sortie' : 'arrivée';
    if (
      !window.confirm(
        `Régénérer le QR ${label} ? L’ancien code ne fonctionnera plus. Les enregistrements sont conservés.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/staff-presence/settings/regenerate`,
        { kind },
        authHeaders()
      );
      setSettings(res.data);
      showSuccess(`Nouveau QR ${label} généré`);
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      showSuccess('Lien copié');
    } catch {
      showError('Impossible de copier le lien');
    }
  };

  const resolveLogoDataUrl = async () => {
    let logoDataUrl = settings?.companyLogoDataUrl || null;
    if (!logoDataUrl && settings?.companyLogo) {
      try {
        logoDataUrl = await fetchImageAsDataUrl(absoluteMediaUrl(settings.companyLogo));
      } catch {
        logoDataUrl = null;
      }
    }
    return logoDataUrl;
  };

  const downloadQrPdf = async (kind) => {
    try {
      setBusy(true);
      const canvas = kind === 'exit' ? exitCanvasRef.current : arrivalCanvasRef.current;
      const publicUrl = kind === 'exit' ? exitUrl : arrivalUrl;
      if (!canvas || typeof canvas.toDataURL !== 'function') {
        showError('QR pas encore prêt');
        return;
      }
      const logoDataUrl = await resolveLogoDataUrl();
      await exportPresenceQrToPdf({
        url: publicUrl,
        qrDataUrl: canvas.toDataURL('image/png'),
        companyName: settings?.companyName || 'KING FISH',
        logoDataUrl,
        kind,
      });
      showSuccess(kind === 'exit' ? 'PDF sortie téléchargé' : 'PDF arrivée téléchargé');
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
        Deux QR codes distincts : <strong>arrivée</strong> (début de service) et{' '}
        <strong>sortie</strong> (fin de service). Chaque scan enregistre le nom, le prénom et
        l’heure côté serveur.
      </p>

      <div className="staff-presence-qr-pair">
        <QrBlock
          title="QR Arrivée"
          hint="À scanner en entrant · bouton « Je suis présent »"
          publicUrl={arrivalUrl}
          canvasRef={arrivalCanvasRef}
          busy={busy}
          onDownloadPdf={() => downloadQrPdf('arrival')}
          onCopy={() => copyUrl(arrivalUrl)}
          onRegenerate={() => regenerate('arrival')}
        />
        <QrBlock
          title="QR Sortie"
          hint="À scanner en quittant · bouton « Je suis parti »"
          publicUrl={exitUrl}
          canvasRef={exitCanvasRef}
          busy={busy}
          onDownloadPdf={() => downloadQrPdf('exit')}
          onCopy={() => copyUrl(exitUrl)}
          onRegenerate={() => regenerate('exit')}
        />
      </div>

      <div className="commercial-card">
        <div className="staff-presence-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={listKind === 'arrival'}
            className={`staff-presence-tab${listKind === 'arrival' ? ' is-active' : ''}`}
            onClick={() => setListKind('arrival')}
          >
            Liste arrivées
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listKind === 'exit'}
            className={`staff-presence-tab${listKind === 'exit' ? ' is-active' : ''}`}
            onClick={() => setListKind('exit')}
          >
            Liste sorties
          </button>
        </div>

        <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem' }}>
          {isExitList ? 'Présences à la sortie' : 'Présences à l’arrivée'}
        </h2>

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
          <strong>{records.length}</strong> {listLabel}
          {records.length > 1 ? 's' : ''} sur la période
        </p>

        <div className="commercial-table-wrap">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Prénom</th>
                <th>Nom</th>
                <th>{timeHeader}</th>
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
            <p style={{ padding: '1rem' }}>
              Aucune {listLabel} pour cette période.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
