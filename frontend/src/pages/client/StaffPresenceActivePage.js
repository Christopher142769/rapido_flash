import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import './StaffPresenceActivePage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const POLL_MS = 45_000;

/** Anciens liens /présence-actif/:site/arrivée|sortie → page site unique. */
function isLegacyKindSegment(raw) {
  const k = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return k === 'exit' || k === 'sortie' || k === 'arrival' || k === 'arrivee' || k === 'entree';
}

export default function StaffPresenceActivePage() {
  const { siteId, kind: kindParam } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!siteId || isLegacyKindSegment(siteId)) {
      setError('Lien invalide');
      return;
    }
    try {
      const res = await axios.get(
        `${API_URL}/staff-presence/public-active/${encodeURIComponent(siteId)}`
      );
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Impossible de charger les QR');
    }
  }, [siteId]);

  useEffect(() => {
    if (kindParam && isLegacyKindSegment(kindParam)) return undefined;
    load();
    const poll = setInterval(load, POLL_MS);
    return () => clearInterval(poll);
  }, [load, kindParam]);

  useEffect(() => {
    if (!data?.expiresAt) return undefined;
    const expiresMs = new Date(data.expiresAt).getTime();
    const delay = Math.max(5_000, expiresMs - Date.now() + 1_500);
    const t = setTimeout(() => load(), delay);
    return () => clearTimeout(t);
  }, [data?.expiresAt, data?.arrival?.code, data?.exit?.code, load]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (kindParam && isLegacyKindSegment(kindParam) && siteId) {
    return <Navigate to={`/présence-actif/${encodeURIComponent(siteId)}`} replace />;
  }

  const timeLabel = clock.toLocaleTimeString('fr-FR', {
    timeZone: 'Africa/Porto-Novo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateLabel = clock.toLocaleDateString('fr-FR', {
    timeZone: 'Africa/Porto-Novo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="sp-actif sp-actif--pair">
      <div className="sp-actif-bg" aria-hidden />
      <header className="sp-actif-top">
        <div>
          <p className="sp-actif-brand">King Fish · Présence</p>
          <h1>{data?.siteLabel || siteId}</h1>
        </div>
        <div className="sp-actif-clock">
          <strong>{timeLabel}</strong>
          <span>{dateLabel}</span>
        </div>
      </header>

      <main className="sp-actif-main sp-actif-main--pair">
        <p className="sp-actif-hint">
          Scannez le QR correspondant — les deux codes changent chaque jour
        </p>

        {error ? (
          <div className="sp-actif-error">{error}</div>
        ) : data?.arrival?.publicUrl && data?.exit?.publicUrl ? (
          <div className="sp-actif-pair">
            <section className="sp-actif-panel sp-actif-panel--arrivee">
              <h2>Arrivée</h2>
              <div className="sp-actif-qr-wrap">
                <QRCodeSVG value={data.arrival.publicUrl} size={220} level="M" includeMargin />
              </div>
            </section>
            <section className="sp-actif-panel sp-actif-panel--sortie">
              <h2>Sortie</h2>
              <div className="sp-actif-qr-wrap">
                <QRCodeSVG value={data.exit.publicUrl} size={220} level="M" includeMargin />
              </div>
            </section>
          </div>
        ) : (
          <div className="sp-actif-loading">Chargement des QR…</div>
        )}

        {data?.dateKey ? (
          <p className="sp-actif-day">
            Valide le <strong>{data.dateKey}</strong>
          </p>
        ) : null}
      </main>
    </div>
  );
}
