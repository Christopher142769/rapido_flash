import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import SignaturePad from './SignaturePad';
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

  const postWithGeo = useCallback(
    async (url, extra = {}) => {
      const geo = await getGeo();
      if (geo.lat == null) {
        throw new Error('Position GPS indisponible : activez la localisation du téléphone (précision élevée) puis réessayez.');
      }
      return api.post(url, { ...extra, ...geo, clientTime: new Date().toISOString() });
    },
    []
  );

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
      setInfo('Nouvelle livraison démarrée : votre position a été enregistrée.');
      await loadMe();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // Arrivée par le lien du QR : traiter dès que connecté (le jeton ne sert qu'une fois).
  useEffect(() => {
    if (authed && me && scanToken && handledToken.current !== scanToken) {
      handledToken.current = scanToken;
      submitScan(scanToken);
    }
  }, [authed, me, scanToken, submitScan]);

  const saveCtx = async () => {
    try {
      await api.patch('/delivery/context', ctx);
      setInfo('Informations enregistrées.');
    } catch (e) {
      setError(errMsg(e));
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
      setInfo('Livraison terminée, signature et position envoyées. Vous pouvez démarrer la suivante.');
      await loadMe();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const status = me?.current?.status;

  return (
    <div className="lv-page">
      <div className="lv-card">
        <header className="lv-head">
          <img src="/images/logo.png" alt="" width={40} height={40} />
          <div>
            <strong>King Fish · Livreur</strong>
            {me ? <span>{me.name} · {me.siteLabel}</span> : null}
          </div>
          {authed ? (
            <button type="button" className="lv-link" onClick={logout}>
              Quitter
            </button>
          ) : null}
        </header>

        {authed && me ? (
          <ol className="lv-stepper" aria-label="Progression">
            {[['Départ', 1], ['Signature', 2]].map(([label, n]) => {
              const cur = status === 'active' ? 2 : 1;
              return (
                <li key={n} className={n < cur ? 'is-done' : n === cur ? 'is-cur' : ''}>
                  <span>{n < cur ? '✓' : n}</span>
                  {label}
                </li>
              );
            })}
          </ol>
        ) : null}

        {error ? <p className="lv-msg lv-msg--err" role="alert">{error}</p> : null}
        {info ? <p className="lv-msg lv-msg--ok">{info}</p> : null}

        {!authed ? (
          <form onSubmit={login} className="lv-form">
            {scanToken ? <p className="lv-hint">Connectez-vous pour valider le QR scanné (valable 1 minute).</p> : null}
            <label>
              Livreur
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                <option value="">Choisir…</option>
                {livreurs.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </label>
            <label>
              Code PIN
              <input type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required />
            </label>
            <button className="lv-btn" disabled={busy || !employeeId || pin.length < 4}>Se connecter</button>
          </form>
        ) : !me ? (
          <p className="lv-hint">Chargement…</p>
        ) : status === 'active' ? (
          <>
            <div className="lv-form">
              <div className="lv-hero"><span className="lv-hero-ico" aria-hidden>📍</span><h2>Livraison en cours</h2></div>
              <Elapsed since={me.current.startedAt} offsetMs={offsetMs} />
              <p className="lv-hint">
                Départ à {fmtTime(me.current.startedAt)} (heure du serveur)
                {me.current.startPlace ? <><br />depuis <strong>{me.current.startPlace}</strong></> : null}
              </p>
              <label>
                N° de commande / référence
                <input value={ctx.orderRef} maxLength={80} onChange={(e) => setCtx({ ...ctx, orderRef: e.target.value })} />
              </label>
              <label>
                Note (destination…)
                <input value={ctx.note} maxLength={300} onChange={(e) => setCtx({ ...ctx, note: e.target.value })} />
              </label>
              <button type="button" className="lv-btn lv-btn--ghost" onClick={saveCtx}>Enregistrer</button>
            </div>
            <form onSubmit={finish} className="lv-form lv-finish">
              <h2>Terminer la livraison</h2>
              <p className="lv-hint">À l’arrivée, le client renseigne ses informations puis signe. Votre position sera enregistrée.</p>
              <label>
                Nom du client
                <input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} maxLength={120} autoComplete="off" required />
              </label>
              <label>
                Téléphone du client
                <input type="tel" inputMode="tel" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} maxLength={20} autoComplete="off" required />
              </label>
              <p className="lv-label">Signature du client</p>
              <SignaturePad ref={padRef} />
              <button className="lv-btn" disabled={busy}>{busy ? 'Envoi…' : 'Émarger et terminer la livraison'}</button>
            </form>
          </>
        ) : me.qrToday ? (
          <div className="lv-form">
            <div className="lv-hero"><span className="lv-hero-ico" aria-hidden>🛵</span><h2>Nouvelle livraison</h2></div>
            <p className="lv-hint">Votre journée est lancée. Appuyez pour démarrer la livraison suivante : votre position actuelle est relevée, sans nouveau QR.</p>
            <button type="button" className="lv-btn" disabled={busy} onClick={startNext}>{busy ? 'Localisation…' : 'Démarrer une livraison'}</button>
            <p className="lv-hint">Livraisons aujourd’hui : <strong>{me.todayCount}</strong></p>
            {me.recent?.length ? (
              <ul className="lv-recent">
                {me.recent.slice(0, 5).map((d) => (
                  <li key={d.id}>{fmtTime(d.startedAt)} → {fmtTime(d.signedAt)} · {fmtDur(d.durationSeconds)} · {d.clientName}{d.endPlace ? ` · ${d.endPlace}` : ''}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="lv-form">
            <div className="lv-hero"><span className="lv-hero-ico" aria-hidden>🛵</span><h2>Début de journée</h2></div>
            <p className="lv-hint">Pointez d’abord votre arrivée avec le QR de présence (selfie). Pour votre première livraison, scannez le QR « Livraison » affiché sur l’écran du site : les suivantes se feront depuis cet espace.</p>
            <button type="button" className="lv-btn" disabled={busy} onClick={() => setScanning(true)}>Scanner le QR de livraison</button>
          </div>
        )}

        {scanning ? <InAppScanner onToken={submitScan} onClose={() => setScanning(false)} /> : null}
      </div>
    </div>
  );
}
