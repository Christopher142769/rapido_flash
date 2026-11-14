import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import PageLoader from '../../components/PageLoader';
import { formatStaffPerson } from '../../utils/staffPresenceFormat';
import './StaffPresencePage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const STEPS = ['selfie', 'employee', 'done'];

function formatWorked(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r} min`;
  return `${h} h ${String(r).padStart(2, '0')}`;
}

export default function StaffPresencePage() {
  const { code } = useParams();
  const encodedCode = useMemo(() => String(code || '').trim(), [code]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [kind, setKind] = useState('arrival');
  const [siteLabel, setSiteLabel] = useState('');
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState('selfie');
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const isExit = kind === 'exit';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setValid(false);
    setResult(null);
    setStep('selfie');
    setSelfieBlob(null);
    setSelfiePreview('');
    setEmployeeId('');
    setKind('arrival');

    (async () => {
      try {
        if (!encodedCode) throw new Error('Code manquant');
        const res = await axios.get(
          `${API_URL}/staff-presence/public/${encodeURIComponent(encodedCode)}`
        );
        if (cancelled) return;
        setValid(true);
        setKind(res.data?.kind === 'exit' ? 'exit' : 'arrival');
        setSiteLabel(res.data?.siteLabel || '');
        setEmployees(Array.isArray(res.data?.employees) ? res.data.employees : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'QR invalide');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [encodedCode]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [selfiePreview]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const startCamera = async () => {
    setError('');
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setError('Autorisez la caméra avant pour prendre votre selfie.');
    }
  };

  const captureSelfie = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError('Caméra non prête');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) {
      setError('Impossible de capturer la photo');
      return;
    }
    stopCamera();
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    setSelfieBlob(blob);
    setSelfiePreview(URL.createObjectURL(blob));
    setStep('employee');
  };

  const hasSelfie = !!(selfieBlob && selfieBlob.size > 0);

  // Selfie obligatoire : impossible d'atteindre l'étape suivante sans photo.
  useEffect(() => {
    if (!hasSelfie && step === 'employee') setStep('selfie');
  }, [hasSelfie, step]);

  const formatCheckedAt = (d) => {
    try {
      if (!d) return '';
      return new Date(d).toLocaleString('fr-FR', {
        timeZone: 'Africa/Porto-Novo',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return '';
    }
  };

  const handleSubmit = async () => {
    if (submitting || !employeeId) return;
    if (!hasSelfie) {
      setError('Le selfie est obligatoire : prenez une photo avant de continuer.');
      setStep('selfie');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('selfie', selfieBlob, 'selfie.jpg');
      fd.append('employeeId', employeeId);
      const res = await axios.post(
        `${API_URL}/staff-presence/public/${encodeURIComponent(encodedCode)}/check`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setResult(res.data);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Impossible d’enregistrer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="staff-presence-page">
        <PageLoader message="Chargement…" />
      </div>
    );
  }

  const title = isExit ? 'Sortie' : 'Arrivée';
  const tag = isExit ? 'Fin de service' : 'Début de service';
  const cta = isExit ? 'Confirmer ma sortie' : 'Confirmer ma présence';
  const successNew = isExit ? 'Sortie enregistrée' : 'Arrivée enregistrée';

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className={`staff-presence-page${isExit ? ' staff-presence-page--exit' : ''}`}>
      <div className="staff-presence-shell">
        <header className="staff-presence-brand">
          <div className="staff-presence-logo-wrap">
            <img
              src="/images/logo.png"
              alt="Rapido Flash"
              className="staff-presence-logo"
              width={78}
              height={78}
            />
          </div>
          <p className="staff-presence-brand-name">King Fish</p>
          <p className="staff-presence-brand-tag">
            {siteLabel ? `${siteLabel} · ${tag}` : tag}
          </p>
        </header>

        <div className="staff-presence-panel">
          <h1>{title}</h1>

          {!result ? (
            <div className="staff-presence-steps" aria-label="Étapes">
              {['Selfie', 'Personnel', 'OK'].map((label, i) => (
                <span
                  key={label}
                  className={`staff-presence-step${i <= stepIndex ? ' is-active' : ''}${
                    i === stepIndex ? ' is-current' : ''
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          {error ? <p className="staff-presence-error">{error}</p> : null}

          {!valid && !result ? (
            <p className="staff-presence-error">Ce QR code n’est pas valide.</p>
          ) : null}

          {result ? (
            <div className="staff-presence-success" role="status">
              <div className="staff-presence-success-icon" aria-hidden>
                ✓
              </div>
              <strong>{successNew}</strong>
              <p>{formatStaffPerson(result)}</p>
              {isExit && result.arrivalAt ? (
                <p className="staff-presence-time">Arrivée : {formatCheckedAt(result.arrivalAt)}</p>
              ) : null}
              <p className="staff-presence-time">
                {isExit ? 'Sortie' : 'Arrivée'} : {formatCheckedAt(result.checkedAt)}
              </p>
              {isExit && result.workedMinutes != null ? (
                <p className="staff-presence-time">Durée : {formatWorked(result.workedMinutes)}</p>
              ) : null}
            </div>
          ) : null}

          {valid && !result && step === 'selfie' ? (
            <div className="staff-presence-selfie">
              <p className="staff-presence-lead">
                Selfie obligatoire : prenez une photo avec la caméra avant pour confirmer votre identité.
              </p>
              {!selfiePreview ? (
                <>
                  <div className="staff-presence-camera-wrap">
                    <video ref={videoRef} className="staff-presence-video" playsInline muted />
                    {!cameraOn ? (
                      <button type="button" className="staff-presence-cta" onClick={startCamera}>
                        Activer la caméra
                      </button>
                    ) : (
                      <button type="button" className="staff-presence-cta" onClick={captureSelfie}>
                        Prendre la photo
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <img src={selfiePreview} alt="Votre selfie" className="staff-presence-preview" />
                  <button
                    type="button"
                    className="staff-presence-cta staff-presence-cta--ghost"
                    onClick={() => {
                      setSelfieBlob(null);
                      setSelfiePreview('');
                      setStep('selfie');
                      startCamera();
                    }}
                  >
                    Reprendre la photo
                  </button>
                  <button
                    type="button"
                    className="staff-presence-cta"
                    disabled={!hasSelfie}
                    onClick={() => setStep('employee')}
                  >
                    Continuer
                  </button>
                </>
              )}
            </div>
          ) : null}

          {valid && !result && step === 'employee' ? (
            <div className="staff-presence-form">
              <p className="staff-presence-lead">Sélectionnez votre nom dans la liste.</p>
              {selfiePreview ? (
                <img src={selfiePreview} alt="" className="staff-presence-preview staff-presence-preview--sm" />
              ) : null}
              <label>
                Personnel
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                >
                  <option value="">— Choisir —</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {formatStaffPerson(e)}
                    </option>
                  ))}
                </select>
              </label>
              {!employees.length ? (
                <p className="staff-presence-error">
                  Aucun employé enregistré pour ce site. Contactez votre responsable.
                </p>
              ) : null}
              <div className="staff-presence-actions">
                <button type="button" className="staff-presence-cta staff-presence-cta--ghost" onClick={() => setStep('selfie')}>
                  Retour
                </button>
                <button
                  type="button"
                  className="staff-presence-cta"
                  disabled={submitting || !employeeId || !hasSelfie}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Enregistrement…' : cta}
                </button>
              </div>
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
