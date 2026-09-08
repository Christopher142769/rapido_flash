import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import './StaffPresenceActivePage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const POLL_MS = 45_000;

function normalizeKindParam(raw) {
  const k = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (k === 'exit' || k === 'sortie') return 'sortie';
  if (k === 'arrival' || k === 'arrivee' || k === 'entree') return 'arrivee';
  return null;
}

function kindLabelFr(kind) {
  return kind === 'sortie' ? 'Sortie' : 'Arrivée';
}

export default function StaffPresenceActivePage() {
  const { siteId, kind: kindParam } = useParams();
  const kindPath = normalizeKindParam(kindParam);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!siteId || !kindPath) {
      setError('Lien invalide');
      return;
    }
    try {
      const res = await axios.get(
        `${API_URL}/staff-presence/public-active/${encodeURIComponent(siteId)}/${kindPath}`
      );
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Impossible de charger le QR');
    }
  }, [siteId, kindPath]);

  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    if (!data?.expiresAt) return undefined;
    const expiresMs = new Date(data.expiresAt).getTime();
    const delay = Math.max(5_000, expiresMs - Date.now() + 1_500);
    const t = setTimeout(() => {
      load();
    }, delay);
    return () => clearTimeout(t);
  }, [data?.expiresAt, data?.code, load]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

  if (!kindPath) {
    return (
      <div className="sp-actif sp-actif--error">
        <p>Lien invalide — utilisez /présence-actif/site/arrivée ou /sortie</p>
      </div>
    );
  }

  return (
    <div className={`sp-actif sp-actif--${kindPath}`}>
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

      <main className="sp-actif-main">
        <p className="sp-actif-kind">{kindLabelFr(kindPath)}</p>
        <p className="sp-actif-hint">Scannez ce QR pour pointer — il change chaque jour</p>

        {error ? (
          <div className="sp-actif-error">{error}</div>
        ) : data?.publicUrl ? (
          <div className="sp-actif-qr-wrap">
            <QRCodeSVG value={data.publicUrl} size={280} level="M" includeMargin />
          </div>
        ) : (
          <div className="sp-actif-loading">Chargement du QR…</div>
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
