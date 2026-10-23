import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { exportLivreurQrPdf, fetchImageAsDataUrl } from '../../utils/exportStaffPresence';
import './LivreursPanel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TZ = 'Africa/Porto-Novo';

const authCfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const get = (url, params) => axios.get(`${API_URL}/livreur${url}`, { ...authCfg(), params });
const send = (method, url, data) => axios({ method, url: `${API_URL}/livreur${url}`, data, ...authCfg() });
const patchSite = (id, body) => axios.patch(`${API_URL}/staff-presence/sites/${id}`, body, authCfg());
const errMsg = (e) => e?.response?.data?.message || e?.message || 'Erreur';

const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const dt = (d) => (d ? new Date(d).toLocaleString('fr-FR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'medium' }) : '—');
const dur = (s) => {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min ${s % 60} s`;
};

const FLAGS = {
  out_of_zone: 'Hors zone',
  no_geo: 'Sans GPS',
  low_gps_accuracy: 'GPS imprécis',
  too_short: 'Trop court',
  too_long: 'Trop long',
  not_clocked_in: 'Non pointé',
  duplicate_signature: 'Signature dupliquée',
  weak_signature: 'Signature sommaire',
  clock_skew: 'Heure téléphone décalée',
  repeat_client: 'Client répété',
  cancelled_by_hr: 'Annulé RH',
};

const STATUS = { active: 'En cours', awaiting_signature: 'Attente signature', completed: 'Terminée', cancelled: 'Annulée' };
const EVENT_LABELS = {
  login: 'Connexion',
  login_failed: 'Connexion refusée',
  scan_rejected: 'Scan rejeté',
  delivery_start: 'Début livraison',
  delivery_context: 'Contexte modifié',
  delivery_signed: 'Signature client',
  delivery_completed_qr: 'Fin par QR client',
  admin_qr_regenerated: 'QR régénéré',
  admin_cancel: 'Annulation RH',
  admin_livreur_set: 'Livreur créé/PIN',
  admin_livreur_update: 'Livreur modifié',
};

function Flags({ flags }) {
  if (!flags?.length) return <span className="lvp-ok">RAS</span>;
  return flags.map((f) => (
    <span key={f} className="lvp-flag">{FLAGS[f] || f}</span>
  ));
}

function SignatureThumb({ id }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let u;
    axios
      .get(`${API_URL}/livreur/admin/deliveries/${id}/signature`, { ...authCfg(), responseType: 'blob' })
      .then((r) => {
        u = URL.createObjectURL(r.data);
        setUrl(u);
      })
      .catch(() => {});
    return () => u && URL.revokeObjectURL(u);
  }, [id]);
  return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Signature" className="lvp-sig" /></a> : <span>—</span>;
}

/* ───────── Écran QR du site ───────── */
function StationTab({ sites }) {
  const [siteId, setSiteId] = useState('');
  const [qr, setQr] = useState({});
  const [err, setErr] = useState('');
  const [perm, setPerm] = useState(null);
  const permRef = useRef(null);
  useEffect(() => {
    if (!siteId && sites[0]) setSiteId(sites[0].id);
  }, [sites, siteId]);

  useEffect(() => {
    if (!siteId) return;
    setPerm(null);
    axios
      .get(`${API_URL}/staff-presence/settings`, { ...authCfg(), params: { site: siteId } })
      .then((r) => setPerm(r.data))
      .catch((e) => setErr(errMsg(e)));
  }, [siteId]);

  const downloadPdf = async () => {
    try {
      const canvases = permRef.current?.querySelectorAll('canvas.lvp-hidden-qr');
      if (!canvases || canvases.length < 3) throw new Error('QR en cours de chargement, réessayez.');
      const data = Array.from(canvases).map((c) => c.toDataURL('image/png'));
      let logo = null;
      try {
        logo = await fetchImageAsDataUrl('/images/logo.png');
      } catch {
        /* logo optionnel */
      }
      await exportLivreurQrPdf({
        siteLabel: qr.siteLabel || siteId,
        logoDataUrl: logo,
        items: [
          { title: 'Arrivée de service', lead: 'Scannez pour marquer votre arrivée', qrDataUrl: data[0], steps: ['Scannez le QR avec votre téléphone', 'Choisissez votre nom puis prenez un selfie', 'Appuyez sur « Je suis présent »'] },
          { title: 'Départ de service', lead: 'Scannez pour marquer votre départ', qrDataUrl: data[1], steps: ['Scannez le QR avec votre téléphone', 'Choisissez votre nom puis prenez un selfie', 'Appuyez sur « Je suis parti »'] },
          { title: 'Début de livraison', lead: 'Scannez pour lancer votre 1re livraison', qrDataUrl: data[2], steps: ['Connectez-vous à votre espace livreur (PIN)', 'Scannez ce QR sur place : votre position est relevée', 'Les livraisons suivantes démarrent depuis l’appli'] },
        ],
      });
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  const loadStation = useCallback(async () => {
    try {
      const { data } = await get(`/admin/station/${siteId}`);
      setQr(data);
      setErr('');
    } catch (e) {
      setErr(errMsg(e));
    }
  }, [siteId]);

  useEffect(() => {
    if (siteId) loadStation();
  }, [siteId, loadStation]);

  const regenerate = async () => {
    if (!window.confirm('Régénérer le QR de livraison ? Les QR déjà imprimés ne fonctionneront plus.')) return;
    try {
      const { data } = await send('post', `/admin/station/${siteId}/regenerate`);
      setQr((q) => ({ ...q, start: data.start }));
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  return (
    <div>
      <p className="lvp-hint">
        Les trois QR sont permanents : imprimez-les une fois et affichez-les au centre / au restaurant. Les deux QR
        de présence (avec selfie) sont ceux du personnel ; le QR de livraison lance la première livraison de la
        journée (scan accepté uniquement sur place, position vérifiée).
      </p>
      <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
        {sites.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      {err ? <p className="lvp-err">{err}</p> : null}
      <div className="lvp-qrs" ref={permRef}>
        {[
          ['Arrivée de service', perm?.arrivalCode && `${window.location.origin}/presence/${encodeURIComponent(perm.arrivalCode)}`],
          ['Départ de service', perm?.exitCode && `${window.location.origin}/presence/${encodeURIComponent(perm.exitCode)}`],
          ['Début de livraison', qr.start?.path && `${window.location.origin}${qr.start.path}`],
        ].map(([label, value]) => (
          <div key={label} className="lvp-qr">
            <h3>{label}</h3>
            {value ? <QRCodeSVG value={value} size={200} level="M" includeMargin /> : <p>…</p>}
            {value ? <QRCodeCanvas className="lvp-hidden-qr" value={value} size={700} level="M" includeMargin={false} style={{ display: 'none' }} /> : null}
          </div>
        ))}
      </div>
      <div className="lvp-form">
        <button type="button" className="lvp-btn lvp-btn--primary" onClick={downloadPdf}>Télécharger le PDF des 3 QR</button>
        <button type="button" className="lvp-btn lvp-btn--danger" onClick={regenerate}>Régénérer le QR de livraison</button>
      </div>
    </div>
  );
}

/* ───────── Gestion livreurs + zone ───────── */
function ManageTab({ data, reload }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', siteId: '', pin: '' });
  const [msg, setMsg] = useState('');
  const sites = data.sites;

  const call = async (fn) => {
    try {
      await fn();
      setMsg('Enregistré.');
      reload();
    } catch (e) {
      setMsg(errMsg(e));
    }
  };

  const locate = (site) =>
    navigator.geolocation.getCurrentPosition(
      (p) => call(() => patchSite(site.id, { lat: p.coords.latitude, lng: p.coords.longitude })),
      () => setMsg('Position indisponible'),
      { enableHighAccuracy: true, timeout: 10000 }
    );

  return (
    <div>
      {msg ? <p className="lvp-hint">{msg}</p> : null}
      <h3>Livreurs</h3>
      <table className="lvp-table">
        <thead><tr><th>Nom</th><th>Site</th><th>PIN</th><th>Actif</th><th /></tr></thead>
        <tbody>
          {data.livreurs.map((l) => (
            <tr key={l.id}>
              <td>{l.name}</td>
              <td>{l.siteId}</td>
              <td>{l.hasPin ? 'défini' : '—'}</td>
              <td>{l.active ? 'oui' : 'non'}</td>
              <td>
                <button type="button" className="lvp-btn" onClick={() => {
                  const pin = window.prompt('Nouveau PIN (4 à 8 chiffres)');
                  if (pin) call(() => send('patch', `/admin/livreurs/${l.id}`, { pin }));
                }}>Changer PIN</button>{' '}
                <button type="button" className="lvp-btn" onClick={() => call(() => send('patch', `/admin/livreurs/${l.id}`, { active: !l.active }))}>
                  {l.active ? 'Désactiver' : 'Réactiver'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="lvp-form" onSubmit={(e) => { e.preventDefault(); call(() => send('post', '/admin/livreurs', form).then(() => setForm({ firstName: '', lastName: '', siteId: form.siteId, pin: '' }))); }}>
        <input placeholder="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
        <input placeholder="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        <select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} required>
          <option value="">Site…</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <input placeholder="PIN (4-8 chiffres)" inputMode="numeric" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} required />
        <button className="lvp-btn lvp-btn--primary">Ajouter le livreur</button>
      </form>

      <h3>Zone GPS des sites (contrôle des scans)</h3>
      <p className="lvp-hint">
        Les scans de début hors du rayon sont signalés comme anomalie. Placez-vous là où l’écran QR est installé puis
        cliquez « Définir ma position ».
      </p>
      <table className="lvp-table">
        <thead><tr><th>Site</th><th>Position</th><th>Rayon (m)</th><th /></tr></thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td>{s.label}</td>
              <td>{s.lat != null ? `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}` : 'non définie (contrôle désactivé)'}</td>
              <td>
                <input type="number" min={30} max={5000} defaultValue={s.radiusM} style={{ width: 80 }}
                  onBlur={(e) => Number(e.target.value) !== s.radiusM && call(() => patchSite(s.id, { radiusM: Number(e.target.value) }))} />
              </td>
              <td><button type="button" className="lvp-btn" onClick={() => locate(s)}>Définir ma position</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lvp-hint">
        Seuils d’anomalie : durée &lt; {dur(data.thresholds.minDurationSeconds)} ou &gt; {dur(data.thresholds.maxDurationSeconds)}.
      </p>
    </div>
  );
}

/* ───────── Destinataires e-mail ───────── */
const CHANNEL_LABELS = {
  presence: 'Présence du personnel (arrivées / sorties)',
  livreur: 'Livreurs (début, fin, signature)',
  repas: 'Commandes Repas (nouvelle commande)',
};

function EmailsTab() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    try {
      setData((await axios.get(`${API_URL}/notification-recipients`, authCfg())).data);
    } catch (e) {
      setMsg(errMsg(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const add = async (channel) => {
    try {
      await axios.post(`${API_URL}/notification-recipients`, { channel, email: draft[channel] }, authCfg());
      setDraft({ ...draft, [channel]: '' });
      setMsg('Adresse ajoutée.');
      load();
    } catch (e) {
      setMsg(errMsg(e));
    }
  };
  const remove = async (id) => {
    try {
      await axios.delete(`${API_URL}/notification-recipients/${id}`, authCfg());
      load();
    } catch (e) {
      setMsg(errMsg(e));
    }
  };
  if (!data) return <p>{msg || 'Chargement…'}</p>;
  return (
    <div>
      <p className="lvp-hint">Les adresses par défaut restent toujours actives ; ajoutez-en autant que nécessaire, elles reçoivent les e-mails immédiatement.</p>
      {msg ? <p className="lvp-hint">{msg}</p> : null}
      {Object.keys(CHANNEL_LABELS).map((ch) => (
        <section key={ch}>
          <h3>{CHANNEL_LABELS[ch]}</h3>
          <ul>
            {data[ch].defaults.map((e) => <li key={e}>{e} <small>(par défaut)</small></li>)}
            {data[ch].added.map((r) => (
              <li key={r.id}>{r.email} <button type="button" className="lvp-btn" onClick={() => remove(r.id)}>Retirer</button></li>
            ))}
            {!data[ch].defaults.length && !data[ch].added.length ? <li><small>Aucune adresse : aucun e-mail envoyé.</small></li> : null}
          </ul>
          <form className="lvp-form" onSubmit={(e) => { e.preventDefault(); add(ch); }}>
            <input type="email" placeholder="nouvelle@adresse.com" value={draft[ch] || ''} onChange={(e) => setDraft({ ...draft, [ch]: e.target.value })} required />
            <button className="lvp-btn lvp-btn--primary">Ajouter</button>
          </form>
        </section>
      ))}
    </div>
  );
}

/* ───────── Panneau principal ───────── */
export default function LivreursPanel() {
  const [tab, setTab] = useState('overview');
  const [meta, setMeta] = useState({ livreurs: [], sites: [], thresholds: { minDurationSeconds: 0, maxDurationSeconds: 0 } });
  const [filters, setFilters] = useState({ dateFrom: todayKey(), dateTo: todayKey(), employeeId: '', flagged: false });
  const [deliveries, setDeliveries] = useState([]);
  const [presence, setPresence] = useState([]);
  const [events, setEvents] = useState([]);
  const [verify, setVerify] = useState(null);
  const [error, setError] = useState('');

  const loadMeta = useCallback(async () => {
    try {
      setMeta((await get('/admin/livreurs')).data);
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const q = { dateFrom: filters.dateFrom, dateTo: filters.dateTo };
      const [d, p] = await Promise.all([
        get('/admin/deliveries', { ...q, employeeId: filters.employeeId || undefined, flagged: filters.flagged || undefined }),
        get('/admin/presence', q),
      ]);
      setDeliveries(d.data);
      setPresence(p.data.filter((r) => !filters.employeeId || String(r.employeeId) === filters.employeeId));
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, [filters]);

  const loadEvents = useCallback(async () => {
    try {
      const from = new Date(`${filters.dateFrom}T00:00:00+01:00`).toISOString();
      const to = new Date(`${filters.dateTo}T23:59:59+01:00`).toISOString();
      const [ev, v] = await Promise.all([
        get('/admin/events', { from, to, employeeId: filters.employeeId || undefined }),
        get('/admin/audit/verify'),
      ]);
      setEvents(ev.data);
      setVerify(v.data);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [filters]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (tab === 'audit') loadEvents(); }, [tab, loadEvents]);

  const summary = useMemo(() => ({
    done: deliveries.filter((d) => d.status === 'completed').length,
    flagged: deliveries.filter((d) => d.flags?.length).length,
    open: deliveries.filter((d) => ['active', 'awaiting_signature'].includes(d.status)).length,
  }), [deliveries]);

  const cancel = async (d) => {
    const reason = window.prompt(`Annuler la livraison de ${d.livreurName} ? Motif :`);
    if (!reason) return;
    try {
      await send('post', `/admin/deliveries/${d._id}/cancel`, { reason });
      loadData();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const exportCsv = () => {
    const rows = [['Livreur', 'Site', 'Statut', 'Début', 'Lieu départ', 'Signature', 'Lieu arrivée', 'Durée (s)', 'Réf', 'Client', 'Téléphone', 'Anomalies']];
    deliveries.forEach((d) => rows.push([d.livreurName, d.siteLabel, STATUS[d.status], dt(d.startedAt), d.startGeo?.place || '', dt(d.signedAt), d.endGeo?.place || '', d.durationSeconds ?? '', d.orderRef, d.clientName, d.clientPhone, (d.flags || []).join('|')]));
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv' }));
    a.download = `livraisons-${filters.dateFrom}_${filters.dateTo}.csv`;
    a.click();
  };

  return (
    <div className="lvp">
      <nav className="lvp-tabs">
        {[['overview', 'Livraisons & heures'], ['station', 'Écran QR'], ['manage', 'Livreurs & zone'], ['audit', 'Journal d’audit'], ['emails', 'E-mails']].map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      {error ? <p className="lvp-err">{error}</p> : null}

      {!['station', 'manage', 'emails'].includes(tab) ? (
        <div className="lvp-filters">
          <label>Du <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} /></label>
          <label>Au <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} /></label>
          <select value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}>
            <option value="">Tous les livreurs</option>
            {meta.livreurs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <label><input type="checkbox" checked={filters.flagged} onChange={(e) => setFilters({ ...filters, flagged: e.target.checked })} /> Anomalies seulement</label>
          <button type="button" className="lvp-btn" onClick={tab === 'audit' ? loadEvents : loadData}>Actualiser</button>
          {tab === 'overview' ? <button type="button" className="lvp-btn lvp-btn--primary" onClick={exportCsv}>Export CSV</button> : null}
        </div>
      ) : null}

      {tab === 'overview' ? (
        <>
          <div className="lvp-kpis">
            <div className="lvp-kpi"><span>Terminées</span><b>{summary.done}</b></div>
            <div className="lvp-kpi"><span>En cours</span><b>{summary.open}</b></div>
            <div className={`lvp-kpi${summary.flagged ? ' is-alert' : ''}`}><span>Avec anomalie</span><b>{summary.flagged}</b></div>
            <div className="lvp-kpi"><span>Pointages</span><b>{presence.length}</b></div>
          </div>

          <h3 className="lvp-h">Livraisons</h3>
          <div className="lvp-cards">
            {deliveries.map((d) => (
              <article key={d._id} className={`lvp-card${d.flags?.length ? ' is-flag' : ''}`}>
                <header className="lvp-card-head">
                  <div>
                    <strong>{d.livreurName}</strong>
                    <small>{d.siteLabel}{d.orderRef ? ` · ${d.orderRef}` : ''}</small>
                  </div>
                  <span className={`lvp-status lvp-status--${d.status}`}>{STATUS[d.status]}</span>
                </header>
                <ol className="lvp-steps">
                  <li><em>Départ{d.startVia === 'qr' ? ' (QR)' : ''}</em><span>{dt(d.startedAt)}</span><small>{d.startGeo?.place || 'Lieu non identifié'}</small></li>
                  <li><em>Arrivée / signature</em><span>{dt(d.signedAt)}</span><small>{d.endGeo?.place || (d.signedAt ? 'Lieu non identifié' : '')}</small></li>
                  <li><em>Durée</em><span className="lvp-dur">{dur(d.durationSeconds)}</span></li>
                  <li><em>Alentours</em><small>{[...(d.startGeo?.nearby || []), ...(d.endGeo?.nearby || [])].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).join(' · ') || '—'}</small></li>
                </ol>
                {d.clientName ? (
                  <div className="lvp-client">
                    <div>
                      <small>Client</small>
                      <strong>{d.clientName}</strong>
                      <span>{d.clientPhone}</span>
                    </div>
                    {d.hasSignature ? <SignatureThumb id={d._id} /> : null}
                  </div>
                ) : null}
                {d.orderSummary ? (
                  <div className="lvp-order">
                    <small>{d.orderSummary.typeLabel} · {d.orderSummary.number} · QR client scanné</small>
                    <ul>{(d.orderSummary.items || []).map((it) => <li key={it}>{it}</li>)}</ul>
                    <strong>{Math.round(d.orderSummary.total || 0).toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                ) : null}
                {d.note ? <p className="lvp-note">{d.note}</p> : null}
                <footer className="lvp-card-foot">
                  <span className="lvp-geo">Du site : départ {d.startGeo?.distanceM ?? '?'} m · arrivée {d.endGeo?.distanceM ?? '?'} m</span>
                  <div className="lvp-flags"><Flags flags={d.flags} /></div>
                  {['active', 'awaiting_signature'].includes(d.status) ? (
                    <button type="button" className="lvp-btn lvp-btn--danger" onClick={() => cancel(d)}>Annuler</button>
                  ) : null}
                </footer>
              </article>
            ))}
            {!deliveries.length ? <p className="lvp-empty">Aucune livraison sur la période.</p> : null}
          </div>

          <h3 className="lvp-h">Arrivées / sorties des livreurs</h3>
          <div className="lvp-list">
            {presence.map((r) => (
              <div key={r._id} className="lvp-row">
                <span className={`lvp-dot lvp-dot--${r.kind}`} />
                <div>
                  <strong>{`${r.firstName} ${r.lastName || ''}`.trim()}</strong>
                  <small>{r.siteLabel}</small>
                </div>
                <span className="lvp-kind">{r.kind === 'exit' ? 'Sortie' : 'Arrivée'}</span>
                <span className="lvp-time">{dt(r.checkedAt)}</span>
                <span className="lvp-worked">{r.workedMinutes != null ? `${Math.floor(r.workedMinutes / 60)} h ${r.workedMinutes % 60} min` : ''}</span>
              </div>
            ))}
            {!presence.length ? <p className="lvp-empty">Aucun pointage livreur sur la période.</p> : null}
          </div>
        </>
      ) : null}

      {tab === 'station' ? <StationTab sites={meta.sites} /> : null}
      {tab === 'emails' ? <EmailsTab /> : null}
      {tab === 'manage' ? <ManageTab data={meta} reload={loadMeta} /> : null}

      {tab === 'audit' ? (
        <>
          {verify ? (
            <p className={verify.ok ? 'lvp-ok' : 'lvp-err'}>
              {verify.ok ? `Chaîne d’intégrité vérifiée : ${verify.checked} événements, aucune altération.` : `ALTÉRATION DÉTECTÉE à l’événement n°${verify.brokenAtSeq}.`}
            </p>
          ) : null}
          <div className="lvp-scroll">
            <table className="lvp-table">
              <thead><tr><th>#</th><th>Heure serveur</th><th>Événement</th><th>Livreur</th><th>Détails</th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e._id}>
                    <td>{e.seq}</td>
                    <td>{dt(e.at)}</td>
                    <td>{EVENT_LABELS[e.type] || e.type}</td>
                    <td>{e.livreurName}</td>
                    <td><small>{[
                      e.data?.reason && `motif: ${e.data.reason}`,
                      e.data?.clientName && `client: ${e.data.clientName} ${e.data.clientPhone || ''}`,
                      e.data?.geo && `${e.data.geo.place || `GPS ${e.data.geo.lat?.toFixed(4)},${e.data.geo.lng?.toFixed(4)}`}${e.data.via ? ` (${e.data.via === 'qr' ? 'QR' : 'appli'})` : ''}`,
                      e.data?.flags?.length && `⚠ ${e.data.flags.map((f) => FLAGS[f] || f).join(', ')}`,
                      e.data?.ip && `IP ${e.data.ip}`,
                    ].filter(Boolean).join(' · ')}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
