import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import SignaturePad from './SignaturePad';
import { FaBell, FaClipboardList, FaHistory, FaHome, FaMotorcycle, FaQrcode, FaSignOutAlt, FaUser, FaPlay } from 'react-icons/fa';
import './livreur.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'livreurToken';
const TZ = 'Africa/Porto-Novo';

const api = axios.create({ baseURL: `${API_URL}/livreur` });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const errMsg = (e) => e?.response?.data?.message || e?.message || 'Erreur réseau';

function getGeo() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  });
}

const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '—');

function fmtDur(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

function Elapsed({ since, offsetMs }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const s = Math.max(0, Math.floor((Date.now() + offsetMs - new Date(since).getTime()) / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return <span className="lv-timer">{`${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`}</span>;
}

/** Scanner intégré (Android/Chrome : BarcodeDetector) ; sinon l'appareil photo natif ouvre le lien du QR. */
function InAppScanner({ onToken, onClose }) {
  const videoRef = useRef(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    let stream;
    let stop = false;
    (async () => {
      if (!('BarcodeDetector' in window)) {
        setMsg('Scanner intégré indisponible : utilisez l’appareil photo du téléphone.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const det = new window.BarcodeDetector({ formats: ['qr_code'] });
        const loop = async () => {
          if (stop) return;
          try {
            const codes = await det.detect(videoRef.current);
            const raw = codes[0]?.rawValue || '';
            const m = raw.match(/\/livreur\/scan\/([^/?#]+)/);
            if (m) return onToken(decodeURIComponent(m[1]));
          } catch {
            /* ignore */
          }
          setTimeout(loop, 250);
        };
        loop();
      } catch {
        setMsg('Caméra inaccessible. Utilisez l’appareil photo du téléphone.');
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onToken]);
  return (
    <div className="lv-scanner">
      <video ref={videoRef} playsInline muted />
      {msg ? <p className="lv-hint">{msg}</p> : null}
      <button type="button" className="lv-btn lv-btn--ghost" onClick={onClose}>
        Fermer
      </button>
    </div>
  );
}

export default function LivreurApp() {
  const { token: scanToken } = useParams();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(!!localStorage.getItem(TOKEN_KEY));
  const [livreurs, setLivreurs] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [me, setMe] = useState(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState('home');
  const [ctx, setCtx] = useState({ orderRef: '', note: '' });
  const [client, setClient] = useState({ name: '', phone: '' });
  const padRef = useRef(null);
  const handledToken = useRef('');

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/me');
      setMe(data);
      setOffsetMs(new Date(data.serverTime).getTime() - Date.now());
      setCtx({ orderRef: data.current?.orderRef || '', note: data.current?.note || '' });
    } catch (e) {
      if (e?.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setAuthed(false);
      } else setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    if (authed) loadMe();
    else
      axios
        .get(`${API_URL}/livreur/public/livreurs`)
        .then((r) => setLivreurs(r.data))
        .catch(() => {});
  }, [authed, loadMe]);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/login', { employeeId, pin });
      localStorage.setItem(TOKEN_KEY, data.token);
      setPin('');
      setAuthed(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthed(false);
    setMe(null);
  };

  const postWithGeo = useCallback(async (url, extra = {}) => {
    const geo = await getGeo();
    if (geo.lat == null) {
      throw new Error('Position GPS indisponible : activez la localisation du téléphone (précision élevée) puis réessayez.');
    }
    return api.post(url, { ...extra, ...geo, clientTime: new Date().toISOString() });
  }, []);

  const submitScan = useCallback(
    async (token) => {
      setBusy(true);
      setError('');
      setInfo('');
      setScanning(false);
      try {
        await postWithGeo('/scan', { token });
        setInfo('Livraison démarrée : votre position a été enregistrée. Bonne route !');
        await loadMe();
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setBusy(false);
        if (scanToken) navigate('/livreur', { replace: true });
      }
    },
    [loadMe, navigate, scanToken, postWithGeo]
  );

  const startNext = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await postWithGeo('/delivery/start');
      setInfo('Nouvelle livraison démarrée : position enregistrée.');
      await loadMe();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (authed && me && scanToken && handledToken.current !== scanToken) {
      handledToken.current = scanToken;
      submitScan(scanToken);
    }
  }, [authed, me, scanToken, submitScan]);

  const saveCtx = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (ctx.orderRef.trim().length < 2 || ctx.note.trim().length < 2) {
      return setError('Renseignez le numéro de commande et la destination.');
    }
    setBusy(true);
    try {
      await api.patch('/delivery/context', ctx);
      setInfo('Informations enregistrées. Vous pouvez maintenant faire signer le client.');
      await loadMe();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const finish = async (e) => {
    e.preventDefault();
    setError('');
    const pad = padRef.current;
    if (!client.name.trim() || !client.phone.trim()) return setError('Nom et téléphone du client requis.');
    if (pad.isEmpty()) return setError('Le client doit signer dans le cadre.');
    setBusy(true);
    try {
      const blob = await pad.toBlob();
      const geo = await getGeo();
      if (geo.lat == null) throw new Error('Position GPS indisponible : activez la localisation du téléphone puis réessayez.');
      const fd = new FormData();
      fd.append('clientName', client.name);
      fd.append('clientPhone', client.phone);
      fd.append('strokes', String(pad.strokes()));
      fd.append('clientTime', new Date().toISOString());
      Object.entries(geo).forEach(([k, v]) => fd.append(k, String(v)));
      fd.append('signature', blob, 'signature.png');
      await api.post('/finish', fd);
      setClient({ name: '', phone: '' });
      setInfo('Livraison terminée : signature et position envoyées. Vous pouvez démarrer la suivante.');
      await loadMe();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const status = me?.current?.status;
  const infoDone = !!(me?.current?.orderRef && me?.current?.note);
  const step = !status ? 1 : infoDone ? 3 : 2;
  const initials = (me?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const avg = me?.recent?.length
    ? Math.round(me.recent.reduce((a, d) => a + (d.durationSeconds || 0), 0) / me.recent.length / 60)
    : null;
  const todayStr = new Date().toLocaleDateString('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

  if (!authed) {
    return (
      <div className="lv-page">
        <div className="lv-phone">
          <div className="lv-login-hero">
            <span className="lv-logo"><FaMotorcycle /></span>
            <h1>Espace livreur</h1>
            <p>King Fish · Rapido</p>
          </div>
          <form onSubmit={login} className="lv-sheet lv-form">
            {scanToken ? <p className="lv-hint">Connectez-vous pour valider le QR scanné (valable 1 minute).</p> : null}
            {error ? <p className="lv-msg lv-msg--err" role="alert">{error}</p> : null}
            <label>
              Livreur
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                <option value="">Choisir…</option>
                {livreurs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label>
              Code PIN
              <input type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required />
            </label>
            <button className="lv-btn" disabled={busy || !employeeId || pin.length < 4}>Se connecter</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="lv-page">
      <div className="lv-phone">
        <header className="lv-top">
          <span className="lv-avatar">{initials}</span>
          <button type="button" className="lv-round" aria-label="Notifications" onClick={() => setTab('history')}><FaBell /></button>
        </header>
        <p className="lv-greet">Bonjour,</p>
        <h1 className="lv-name">{me?.name || '…'}</h1>

        {error ? <p className="lv-msg lv-msg--err" role="alert">{error}</p> : null}
        {info ? <p className="lv-msg lv-msg--ok">{info}</p> : null}

        {!me ? <p className="lv-hint">Chargement…</p> : tab === 'home' ? (
          <>
            <section className="lv-hero">
              <div>
                <p className="lv-hero-k">{status ? 'Livraison en cours' : 'Livraisons aujourd’hui'}</p>
                {status ? <Elapsed since={me.current.startedAt} offsetMs={offsetMs} /> : <p className="lv-big">{String(me.todayCount).padStart(2, '0')}</p>}
                <p className="lv-hero-s">{status ? `Départ ${fmtTime(me.current.startedAt)}${me.current.startPlace ? ` · ${me.current.startPlace}` : ''}` : `${todayStr} · ${me.siteLabel}`}</p>
              </div>
              <FaMotorcycle className="lv-hero-ico" aria-hidden />
            </section>

            <ol className="lv-stepper" aria-label="Progression">
              {['Départ', 'Commande', 'Signature'].map((label, i) => (
                <li key={label} className={i + 1 < step ? 'is-done' : i + 1 === step && status ? 'is-cur' : ''}>
                  <span>{i + 1 < step ? '✓' : i + 1}</span>{label}
                </li>
              ))}
            </ol>

            {!status ? (
              <section className="lv-panel">
                <h2>{me.qrToday ? 'Nouvelle livraison' : 'Début de journée'}</h2>
                <p className="lv-hint">
                  {me.qrToday
                    ? 'Votre journée est lancée. Votre position est relevée au démarrage, sans nouveau QR.'
                    : 'Pointez votre arrivée (QR de présence + selfie), puis scannez le QR « Livraison » du site pour votre première livraison.'}
                </p>
                {me.qrToday ? (
                  <button type="button" className="lv-btn" disabled={busy} onClick={startNext}><FaPlay /> {busy ? 'Localisation…' : 'Démarrer une livraison'}</button>
                ) : (
                  <button type="button" className="lv-btn" disabled={busy} onClick={() => setScanning(true)}><FaQrcode /> Scanner le QR de livraison</button>
                )}
              </section>
            ) : !infoDone ? (
              <form className="lv-panel lv-form" onSubmit={saveCtx}>
                <h2>Informations de la commande</h2>
                <p className="lv-hint">À remplir avant de pouvoir faire signer le client.</p>
                <label>
                  N° de commande
                  <input value={ctx.orderRef} maxLength={80} onChange={(e) => setCtx({ ...ctx, orderRef: e.target.value })} required />
                </label>
                <label>
                  Destination / adresse
                  <input value={ctx.note} maxLength={300} onChange={(e) => setCtx({ ...ctx, note: e.target.value })} required />
                </label>
                <button className="lv-btn" disabled={busy}>Valider les informations</button>
              </form>
            ) : (
              <form className="lv-panel lv-form" onSubmit={finish}>
                <div className="lv-recap">
                  <span><FaClipboardList /> {me.current.orderRef}</span>
                  <small>{me.current.note}</small>
                </div>
                <h2>Signature du client</h2>
                <label>
                  Nom du client
                  <input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} maxLength={120} autoComplete="off" required />
                </label>
                <label>
                  Téléphone du client
                  <input type="tel" inputMode="tel" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} maxLength={20} autoComplete="off" required />
                </label>
                <p className="lv-label">Le client signe ci-dessous</p>
                <SignaturePad ref={padRef} />
                <button className="lv-btn" disabled={busy}>{busy ? 'Envoi…' : 'Émarger et terminer la livraison'}</button>
              </form>
            )}

            <section className="lv-overview">
              <header><h3>Aperçu du jour</h3></header>
              <div className="lv-stats">
                <div><small>Livraisons</small><b>{me.todayCount}</b><span>aujourd’hui</span></div>
                <div><small>Durée moy.</small><b>{avg ?? '—'}</b><span>min</span></div>
                <div><small>Dernier lieu</small><b className="lv-place">{me.recent?.[0]?.endPlace || '—'}</b></div>
              </div>
            </section>
          </>
        ) : tab === 'history' ? (
          <section className="lv-panel">
            <h2>Historique</h2>
            {me.recent?.length ? (
              <ul className="lv-recent">
                {me.recent.map((d) => (
                  <li key={d.id}>
                    <strong>{d.clientName || 'Client'}{d.orderRef ? ` · ${d.orderRef}` : ''}</strong>
                    <span>{fmtTime(d.startedAt)} → {fmtTime(d.signedAt)} · {fmtDur(d.durationSeconds)}</span>
                    {d.endPlace ? <small>{d.endPlace}</small> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="lv-hint">Aucune livraison terminée pour l’instant.</p>}
          </section>
        ) : (
          <section className="lv-panel">
            <h2>Mon compte</h2>
            <p className="lv-hint">{me.name} · {me.siteLabel}</p>
            <button type="button" className="lv-btn lv-btn--ghost" onClick={logout}><FaSignOutAlt /> Se déconnecter</button>
          </section>
        )}

        <nav className="lv-nav" aria-label="Navigation">
          <button type="button" className={tab === 'home' ? 'is-on' : ''} onClick={() => setTab('home')}><FaHome /><span>Accueil</span></button>
          <button type="button" className={tab === 'history' ? 'is-on' : ''} onClick={() => setTab('history')}><FaHistory /><span>Historique</span></button>
          <button type="button" className={tab === 'account' ? 'is-on' : ''} onClick={() => setTab('account')}><FaUser /><span>Compte</span></button>
        </nav>

        {scanning ? <InAppScanner onToken={submitScan} onClose={() => setScanning(false)} /> : null}
      </div>
    </div>
  );
}
