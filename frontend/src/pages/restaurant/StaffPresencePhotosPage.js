import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import PageLoader from '../../components/PageLoader';
import { useModal } from '../../context/ModalContext';
import { toDashboardPath } from '../../config/dashboardPath';
import { getMediaBaseUrl, resolveMediaUrl } from '../../utils/mediaUrl';
import { formatStaffPerson } from '../../utils/staffPresenceFormat';
import '../commercial/commercial.css';
import './StaffPresencePhotosPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const MEDIA_BASE = getMediaBaseUrl();

const SITES = [
  { id: '', label: 'Tous les sites' },
  { id: 'gbegamey', label: 'Gbegamey' },
  { id: 'zogbo', label: 'Zogbo' },
];

const KINDS = [
  { id: '', label: 'Arrivées et sorties' },
  { id: 'arrival', label: 'Arrivées' },
  { id: 'exit', label: 'Sorties' },
];

const SHIFT_LABELS = {
  morning: '08h – 16h',
  afternoon: '16h – 00h',
  night: '00h – 08h',
};

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

function photoUrl(selfieUrl) {
  return resolveMediaUrl(selfieUrl, MEDIA_BASE);
}

export default function StaffPresencePhotosPage({
  variant = 'dashboard',
  backPath,
  hidePageTitle = false,
}) {
  const { showError } = useModal();
  const isRh = variant === 'rh';
  const registrePath = backPath || toDashboardPath('/presence-personnel');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [dateFrom, setDateFrom] = useState(todayKey());
  const [dateTo, setDateTo] = useState(todayKey());
  const [site, setSite] = useState('');
  const [kind, setKind] = useState('');

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    if (site) p.set('site', site);
    if (kind) p.set('kind', kind);
    return p;
  }, [dateFrom, dateTo, site, kind]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API_URL}/staff-presence/photos?${queryParams.toString()}`,
        authHeaders()
      );
      setPhotos(Array.isArray(data?.photos) ? data.photos : []);
    } catch (e) {
      showError(e.response?.data?.message || 'Impossible de charger les photos');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [queryParams, showError]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const exportZip = async () => {
    setExporting(true);
    try {
      const res = await axios.get(
        `${API_URL}/staff-presence/photos/export-zip?${queryParams.toString()}`,
        { ...authHeaders(), responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presence-photos_${dateFrom || 'all'}_${dateTo || 'all'}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      let msg = 'Export ZIP impossible';
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const parsed = JSON.parse(text);
          msg = parsed.message || msg;
        } catch {
          /* ignore */
        }
      } else if (e.response?.data?.message) {
        msg = e.response.data.message;
      }
      showError(msg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={`commercial-page staff-presence-photos-page${
        isRh ? ' staff-presence-photos-page--rh' : ''
      }`}
    >
      <header className="staff-presence-photos-header">
        {!hidePageTitle ? (
          <div>
            <p className="commercial-kicker">Présence personnel</p>
            <h1 className="commercial-title">Galerie photos</h1>
            <p className="commercial-lead">
              Toutes les selfies prises à l&apos;arrivée et à la sortie, avec l&apos;heure exacte du
              pointage.
            </p>
          </div>
        ) : (
          <div />
        )}
        <div className="staff-presence-photos-actions">
          <Link to={registrePath} className="commercial-btn commercial-btn--ghost">
            ← Registre présence
          </Link>
          <button
            type="button"
            className="commercial-btn commercial-btn--primary"
            onClick={exportZip}
            disabled={exporting || loading || photos.length === 0}
          >
            {exporting ? 'Export…' : 'Exporter en ZIP'}
          </button>
        </div>
      </header>

      <div className="commercial-card staff-presence-photos-filters">
        <div className="staff-presence-photos-filter-grid">
          <label>
            Du
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            Au
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <label>
            Site
            <select value={site} onChange={(e) => setSite(e.target.value)}>
              {SITES.map((s) => (
                <option key={s.id || 'all'} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k.id || 'all'} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="staff-presence-photos-count">
          {loading ? 'Chargement…' : `${photos.length} photo${photos.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loading ? (
        <PageLoader />
      ) : photos.length === 0 ? (
        <div className="commercial-card staff-presence-photos-empty">
          Aucune photo pour cette période.
        </div>
      ) : (
        <div className="staff-presence-photos-grid">
          {photos.map((p) => {
            const fullName = formatStaffPerson(p);
            const src = photoUrl(p.selfieUrl);
            return (
              <article key={p._id} className="staff-presence-photo-card">
                <div className="staff-presence-photo-frame">
                  {src ? (
                    <img src={src} alt={`Selfie ${fullName}`} loading="lazy" />
                  ) : (
                    <div className="staff-presence-photo-missing">Photo indisponible</div>
                  )}
                  <span
                    className={`staff-presence-photo-badge ${
                      p.kind === 'exit' ? 'is-exit' : 'is-arrival'
                    }`}
                  >
                    {p.kind === 'exit' ? 'Sortie' : 'Arrivée'}
                  </span>
                </div>
                <div className="staff-presence-photo-meta">
                  <strong>{fullName}</strong>
                  <span>{formatCheckedAt(p.checkedAt)}</span>
                  <span className="staff-presence-photo-sub">
                    {SITES.find((s) => s.id === p.siteId)?.label || p.siteId} ·{' '}
                    {SHIFT_LABELS[p.shift] || p.shift}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
