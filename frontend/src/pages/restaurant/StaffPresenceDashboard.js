import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import PageLoader from '../../components/PageLoader';
import { useModal } from '../../context/ModalContext';
import {
  exportPresenceQrToPdf,
  exportPresenceToExcel,
  exportPresenceToPdf,
  exportPresenceToWord,
  fetchImageAsDataUrl,
  preparePresenceDetailedExport,
} from '../../utils/exportStaffPresence';
import '../commercial/commercial.css';
import './StaffPresenceDashboard.css';
import { getMediaBaseUrl, resolveMediaUrl } from '../../utils/mediaUrl';
import { toDashboardPath } from '../../config/dashboardPath';
import { formatStaffPerson } from '../../utils/staffPresenceFormat';
import StaffPresencePlanning, {
  DEFAULT_WEEKDAYS,
  restDaysSummary,
} from './StaffPresencePlanning';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const MEDIA_BASE = getMediaBaseUrl();

const SITES = [
  { id: 'gbegamey', label: 'Gbegamey' },
  { id: 'zogbo', label: 'Zogbo' },
];

const SHIFT_LABELS = {
  morning: 'Matin (08h – 16h)',
  afternoon: 'Soir (16h – 00h)',
  night: 'Nuit (00h – 08h)',
};

function absoluteMediaUrl(path) {
  return resolveMediaUrl(path, MEDIA_BASE);
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

function formatOvertime(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  if (!m) return '—';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r} min`;
  return `${h} h ${String(r).padStart(2, '0')}`;
}

function buildPublicUrl(code) {
  if (!code) return '';
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/presence/${encodeURIComponent(code)}`;
  }
  return '';
}

function QrBlock({ title, hint, publicUrl, canvasRef, busy, onDownloadPdf, onCopy, onRegenerate }) {
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
              <button type="button" className="commercial-btn commercial-btn--primary" onClick={onDownloadPdf} disabled={busy}>
                PDF
              </button>
              <button type="button" className="commercial-btn commercial-btn--outline" onClick={onCopy}>
                Copier
              </button>
              <a className="commercial-btn commercial-btn--outline" href={publicUrl} target="_blank" rel="noreferrer">
                Ouvrir
              </a>
              <button type="button" className="commercial-btn commercial-btn--outline" onClick={onRegenerate} disabled={busy}>
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
  const [settingsBundle, setSettingsBundle] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [activeSite, setActiveSite] = useState('gbegamey');
  const [listKind, setListKind] = useState('arrival');
  const [viewMode, setViewMode] = useState('all');
  const [dateFrom, setDateFrom] = useState(() => todayKey());
  const [dateTo, setDateTo] = useState(() => todayKey());
  const [busy, setBusy] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [empEdit, setEmpEdit] = useState({ restDays: [], contractDaysPerWeek: 5, notes: '' });
  const [empForm, setEmpForm] = useState({ firstName: '', lastName: '', siteId: 'gbegamey' });
  const arrivalCanvasRef = useRef(null);
  const exitCanvasRef = useRef(null);

  const siteSettings = useMemo(() => {
    const sites = settingsBundle?.sites;
    if (!Array.isArray(sites)) return null;
    return sites.find((s) => s.siteId === activeSite) || sites[0] || null;
  }, [settingsBundle, activeSite]);

  const companyName = settingsBundle?.companyName || siteSettings?.companyName || 'KING FISH';

  const loadSettings = useCallback(async () => {
    const res = await axios.get(`${API_URL}/staff-presence/settings`, authHeaders());
    setSettingsBundle(res.data);
  }, []);

  const loadEmployees = useCallback(async () => {
    const res = await axios.get(`${API_URL}/staff-presence/employees`, {
      ...authHeaders(),
      params: { site: activeSite },
    });
    setEmployees(Array.isArray(res.data) ? res.data : []);
  }, [activeSite]);

  const loadSchedule = useCallback(async () => {
    const res = await axios.get(`${API_URL}/staff-presence/schedule`, {
      ...authHeaders(),
      params: { site: activeSite },
    });
    setSchedule(res.data?.schedule || null);
    if (Array.isArray(res.data?.employees)) setEmployees(res.data.employees);
  }, [activeSite]);

  const loadRecords = useCallback(async () => {
    const params = { dateFrom, dateTo, kind: listKind, site: activeSite };
    if (viewMode === 'overtime') params.overtimeOnly = 'true';
    const res = await axios.get(`${API_URL}/staff-presence/records`, {
      ...authHeaders(),
      params,
    });
    setRecords(Array.isArray(res.data) ? res.data : []);
  }, [dateFrom, dateTo, listKind, activeSite, viewMode]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadSettings(), loadEmployees(), loadRecords(), loadSchedule()]);
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [loadSettings, loadEmployees, loadRecords, loadSchedule, showError]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    loadEmployees().catch(() => {});
    loadRecords().catch(() => {});
    loadSchedule().catch(() => {});
  }, [activeSite, listKind, viewMode, loadEmployees, loadRecords, loadSchedule]);

  const arrivalUrl = useMemo(
    () => buildPublicUrl(siteSettings?.arrivalCode) || siteSettings?.arrivalUrl || '',
    [siteSettings]
  );
  const exitUrl = useMemo(
    () => buildPublicUrl(siteSettings?.exitCode) || siteSettings?.exitUrl || '',
    [siteSettings]
  );

  const isExitList = listKind === 'exit';
  const listLabel = isExitList ? 'sortie' : 'arrivée';

  const exportMeta = useMemo(() => {
    const site = SITES.find((s) => s.id === activeSite)?.label || activeSite;
    const same = dateFrom && dateTo && dateFrom === dateTo;
    return {
      title: `Présence personnel — ${site}`,
      subtitle: same
        ? `Date : ${dateFrom} · ${site}`
        : `Période du ${dateFrom || '…'} au ${dateTo || '…'} · ${site}`,
      fileSlug: `presence-${activeSite}`,
      companyName,
    };
  }, [dateFrom, dateTo, activeSite, companyName]);

  const handleExport = async (kind) => {
    try {
      setBusy(true);
      const res = await axios.get(`${API_URL}/staff-presence/records`, {
        ...authHeaders(),
        params: { dateFrom, dateTo, site: activeSite },
      });
      const allRecords = Array.isArray(res.data) ? res.data : [];
      const data = preparePresenceDetailedExport(allRecords, exportMeta);
      if (!data.people.length) {
        showError('Aucune présence à exporter pour cette période');
        return;
      }
      data.subtitle = `${exportMeta.subtitle} · ${data.count} personnel · ${data.dayCount} ligne(s)`;
      if (kind === 'excel') exportPresenceToExcel(data);
      if (kind === 'pdf') exportPresenceToPdf(data);
      if (kind === 'word') exportPresenceToWord(data);
      showSuccess('Export téléchargé');
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Export impossible');
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async (kind) => {
    const label = kind === 'exit' ? 'sortie' : 'arrivée';
    if (
      !window.confirm(
        `Régénérer le QR ${label} pour ${SITES.find((s) => s.id === activeSite)?.label} ? L’ancien code ne fonctionnera plus.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await axios.post(
        `${API_URL}/staff-presence/settings/regenerate`,
        { kind, site: activeSite },
        authHeaders()
      );
      await loadSettings();
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
    let logoDataUrl = settingsBundle?.companyLogoDataUrl || siteSettings?.companyLogoDataUrl || null;
    const logo = settingsBundle?.companyLogo || siteSettings?.companyLogo;
    if (!logoDataUrl && logo) {
      try {
        logoDataUrl = await fetchImageAsDataUrl(absoluteMediaUrl(logo));
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
      const siteLabel = SITES.find((s) => s.id === activeSite)?.label || activeSite;
      const logoDataUrl = await resolveLogoDataUrl();
      await exportPresenceQrToPdf({
        url: publicUrl,
        qrDataUrl: canvas.toDataURL('image/png'),
        companyName: `${companyName} — ${siteLabel}`,
        logoDataUrl,
        kind,
      });
      showSuccess('PDF QR téléchargé');
    } catch (e) {
      showError(e.message || 'Impossible de générer le PDF');
    } finally {
      setBusy(false);
    }
  };

  const addEmployee = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post(
        `${API_URL}/staff-presence/employees`,
        { ...empForm, siteId: activeSite },
        authHeaders()
      );
      setEmpForm({ firstName: '', lastName: '', siteId: activeSite });
      await loadEmployees();
      await loadSchedule();
      showSuccess('Employé ajouté');
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const deactivateEmployee = async (id) => {
    if (!window.confirm('Désactiver cet employé ?')) return;
    setBusy(true);
    try {
      await axios.delete(`${API_URL}/staff-presence/employees/${id}`, authHeaders());
      await loadEmployees();
      await loadSchedule();
      showSuccess('Employé désactivé');
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = async () => {
    if (!schedule) return;
    setBusy(true);
    try {
      const payload = {
        siteId: activeSite,
        rules: schedule.rules,
        slots: (schedule.slots || []).map((s) => ({
          weekday: s.weekday,
          shift: s.shift,
          closed: !!s.closed,
          employeeIds: (s.employeeIds || []).map(String).filter(Boolean),
        })),
      };
      const res = await axios.put(`${API_URL}/staff-presence/schedule`, payload, authHeaders());
      setSchedule(res.data?.schedule || schedule);
      if (Array.isArray(res.data?.employees)) setEmployees(res.data.employees);
      showSuccess('Planning enregistré');
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const seedGbegamey = async () => {
    if (
      !window.confirm(
        'Réimporter le planning Gbegamey (employés + créneaux + repos) ? Les modifications manuelles seront écrasées.'
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/staff-presence/schedule/seed-gbegamey?force=true`,
        {},
        authHeaders()
      );
      setSchedule(res.data?.schedule || null);
      if (Array.isArray(res.data?.employees)) setEmployees(res.data.employees);
      showSuccess(res.data?.seeded ? 'Planning Gbegamey importé' : 'Planning déjà en place');
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const startEditEmployee = (emp) => {
    setEditingEmpId(emp._id);
    setEmpEdit({
      restDays: Array.isArray(emp.restDays) ? [...emp.restDays] : [],
      contractDaysPerWeek: emp.contractDaysPerWeek ?? 5,
      notes: emp.notes || '',
    });
  };

  const toggleRestDay = (dayId) => {
    setEmpEdit((prev) => {
      const set = new Set(prev.restDays || []);
      if (set.has(dayId)) set.delete(dayId);
      else set.add(dayId);
      return { ...prev, restDays: [...set].sort((a, b) => a - b) };
    });
  };

  const saveEmployeeEdit = async () => {
    if (!editingEmpId) return;
    setBusy(true);
    try {
      await axios.put(
        `${API_URL}/staff-presence/employees/${editingEmpId}`,
        empEdit,
        authHeaders()
      );
      setEditingEmpId(null);
      await loadEmployees();
      await loadSchedule();
      showSuccess('Employé mis à jour');
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.active !== false),
    [employees]
  );

  if (loading) return <PageLoader message="Présence personnel…" />;

  return (
    <div className="commercial-page staff-presence-dash">
      <div className="staff-presence-dash-head">
        <h1>Présence personnel</h1>
        <Link to={toDashboardPath('/presence-photos')} className="commercial-btn commercial-btn--ghost">
          Galerie photos →
        </Link>
      </div>
      <p className="commercial-lead">
        Deux sites <strong>Gbegamey</strong> et <strong>Zogbo</strong> — QR arrivée / sortie par site.
        Scan : selfie, choix du personnel et plage horaire (08–16 · 16–00 · 00–08).
      </p>

      <div className="staff-presence-tabs" role="tablist">
        {SITES.map((site) => (
          <button
            key={site.id}
            type="button"
            role="tab"
            aria-selected={activeSite === site.id}
            className={`staff-presence-tab${activeSite === site.id ? ' is-active' : ''}`}
            onClick={() => setActiveSite(site.id)}
          >
            {site.label}
          </button>
        ))}
      </div>

      <div className="staff-presence-qr-pair">
        <QrBlock
          title={`QR Arrivée — ${SITES.find((s) => s.id === activeSite)?.label}`}
          hint="Selfie + personnel + plage → arrivée"
          publicUrl={arrivalUrl}
          canvasRef={arrivalCanvasRef}
          busy={busy}
          onDownloadPdf={() => downloadQrPdf('arrival')}
          onCopy={() => copyUrl(arrivalUrl)}
          onRegenerate={() => regenerate('arrival')}
        />
        <QrBlock
          title={`QR Sortie — ${SITES.find((s) => s.id === activeSite)?.label}`}
          hint="Selfie + personnel + plage → sortie (+ heures sup.)"
          publicUrl={exitUrl}
          canvasRef={exitCanvasRef}
          busy={busy}
          onDownloadPdf={() => downloadQrPdf('exit')}
          onCopy={() => copyUrl(exitUrl)}
          onRegenerate={() => regenerate('exit')}
        />
      </div>

      <div className="commercial-card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem' }}>
          Personnel — {SITES.find((s) => s.id === activeSite)?.label}
        </h2>
        <form className="staff-presence-emp-form staff-presence-emp-form--optional-nom" onSubmit={addEmployee}>
          <label>
            Prénom
            <input
              value={empForm.firstName}
              onChange={(e) => setEmpForm((f) => ({ ...f, firstName: e.target.value }))}
              required
              minLength={2}
            />
          </label>
          <label>
            Nom <span style={{ fontWeight: 500, opacity: 0.7 }}>(optionnel)</span>
            <input
              value={empForm.lastName}
              onChange={(e) => setEmpForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="Laisser vide si prénom seul"
            />
          </label>
          <button type="submit" className="commercial-btn commercial-btn--primary" disabled={busy}>
            Ajouter
          </button>
        </form>
        <div className="commercial-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Personnel</th>
                <th>Repos</th>
                <th>Contrat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <React.Fragment key={e._id}>
                  <tr className={e.active === false ? 'is-inactive' : ''}>
                    <td>
                      {formatStaffPerson(e)}
                      {e.active === false ? (
                        <span style={{ marginLeft: 8, fontSize: '0.78rem', opacity: 0.7 }}>(inactif)</span>
                      ) : null}
                    </td>
                    <td>{restDaysSummary(e.restDays, DEFAULT_WEEKDAYS)}</td>
                    <td>{e.contractDaysPerWeek ?? 5} j/sem.</td>
                    <td>
                      <button
                        type="button"
                        className="commercial-btn commercial-btn--outline commercial-btn--sm"
                        onClick={() =>
                          editingEmpId === e._id ? setEditingEmpId(null) : startEditEmployee(e)
                        }
                      >
                        {editingEmpId === e._id ? 'Annuler' : 'Modifier'}
                      </button>{' '}
                      {e.active !== false ? (
                        <button
                          type="button"
                          className="commercial-btn commercial-btn--outline commercial-btn--sm"
                          onClick={() => deactivateEmployee(e._id)}
                        >
                          Retirer
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  {editingEmpId === e._id ? (
                    <tr className="staff-presence-emp-edit-row">
                      <td colSpan={4}>
                        <div className="staff-presence-emp-rest">
                          {DEFAULT_WEEKDAYS.map((wd) => (
                            <label key={wd.id}>
                              <input
                                type="checkbox"
                                checked={(empEdit.restDays || []).includes(wd.id)}
                                onChange={() => toggleRestDay(wd.id)}
                              />
                              {wd.short}
                            </label>
                          ))}
                        </div>
                        <div className="commercial-filters" style={{ marginTop: '0.65rem' }}>
                          <label>
                            Jours / semaine
                            <input
                              type="number"
                              min={1}
                              max={7}
                              value={empEdit.contractDaysPerWeek}
                              onChange={(ev) =>
                                setEmpEdit((f) => ({
                                  ...f,
                                  contractDaysPerWeek: Number(ev.target.value) || 5,
                                }))
                              }
                            />
                          </label>
                          <label style={{ flex: 1 }}>
                            Notes
                            <input
                              value={empEdit.notes}
                              onChange={(ev) => setEmpEdit((f) => ({ ...f, notes: ev.target.value }))}
                            />
                          </label>
                          <button
                            type="button"
                            className="commercial-btn commercial-btn--primary"
                            disabled={busy}
                            onClick={saveEmployeeEdit}
                          >
                            Enregistrer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {!employees.length ? (
            <p style={{ padding: '1rem' }}>Aucun employé enregistré pour ce site.</p>
          ) : null}
        </div>
        <p className="commercial-lead" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>{activeEmployees.length}</strong> actif(s) au scan ·{' '}
          {employees.length - activeEmployees.length} inactif(s)
        </p>
      </div>

      {schedule ? (
        <StaffPresencePlanning
          siteId={activeSite}
          siteLabel={SITES.find((s) => s.id === activeSite)?.label || activeSite}
          schedule={schedule}
          employees={employees}
          busy={busy}
          onChange={setSchedule}
          onSave={saveSchedule}
          onSeed={seedGbegamey}
        />
      ) : null}

      <div className="commercial-card">
        <div className="staff-presence-tabs" role="tablist">
          <button
            type="button"
            className={`staff-presence-tab${listKind === 'arrival' ? ' is-active' : ''}`}
            onClick={() => setListKind('arrival')}
          >
            Arrivées
          </button>
          <button
            type="button"
            className={`staff-presence-tab${listKind === 'exit' ? ' is-active' : ''}`}
            onClick={() => setListKind('exit')}
          >
            Sorties
          </button>
          <button
            type="button"
            className={`staff-presence-tab${viewMode === 'overtime' ? ' is-active' : ''}`}
            onClick={() => setViewMode(viewMode === 'overtime' ? 'all' : 'overtime')}
          >
            Heures sup.
          </button>
        </div>

        <div className="commercial-filters">
          <label>
            Du
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            Au
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <button type="button" className="commercial-btn commercial-btn--outline" onClick={loadRecords} disabled={busy}>
            Actualiser
          </button>
          <button type="button" className="commercial-btn commercial-btn--primary" onClick={() => handleExport('pdf')} disabled={busy}>
            PDF détaillé
          </button>
          <button type="button" className="commercial-btn commercial-btn--outline" onClick={() => handleExport('excel')} disabled={busy}>
            Excel
          </button>
        </div>

        <p className="commercial-lead" style={{ marginTop: 0 }}>
          <strong>{records.length}</strong>{' '}
          {viewMode === 'overtime' ? 'sortie(s) avec heures sup.' : `${listLabel}(s)`} ·{' '}
          {SITES.find((s) => s.id === activeSite)?.label}
        </p>

        <div className="commercial-table-wrap">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Personnel</th>
                <th>Plage</th>
                <th>{isExitList ? 'Sortie' : 'Arrivée'}</th>
                <th>Selfie</th>
                {isExitList || viewMode === 'overtime' ? <th>Heures sup.</th> : null}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r._id}>
                  <td>{i + 1}</td>
                  <td>{r.dateKey}</td>
                  <td>{formatStaffPerson(r)}</td>
                  <td>{SHIFT_LABELS[r.shift] || r.shift || '—'}</td>
                  <td>{formatCheckedAt(r.checkedAt)}</td>
                  <td>
                    {r.selfieUrl ? (
                      <a href={absoluteMediaUrl(r.selfieUrl)} target="_blank" rel="noreferrer">
                        Voir
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  {isExitList || viewMode === 'overtime' ? (
                    <td className={r.overtimeMinutes > 0 ? 'staff-presence-ot' : ''}>
                      {formatOvertime(r.overtimeMinutes)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {!records.length ? (
            <p style={{ padding: '1rem' }}>Aucun enregistrement pour cette période.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
