import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import PageLoader from '../../components/PageLoader';
import './StaffPresencePage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const STEPS = ['selfie', 'employee', 'shift', 'done'];

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
  const [shifts, setShifts] = useState([]);
  const [suggestedShift, setSuggestedShift] = useState('morning');
  const [error, setError] = useState('');
  const [step, setStep] = useState('selfie');
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [shift, setShift] = useState('morning');
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
        setShifts(Array.isArray(res.data?.shifts) ? res.data.shifts : []);
        const sug = res.data?.suggestedShift || 'morning';
        setSuggestedShift(sug);
        setShift(sug);
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

  const selectedEmployee = employees.find((e) => String(e._id) === String(employeeId));

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
    if (submitting || !selfieBlob || !employeeId || !shift) return;
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('selfie', selfieBlob, 'selfie.jpg');
      fd.append('employeeId', employeeId);
      fd.append('shift', shift);
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
  const successAlready = isExit
    ? 'Sortie déjà enregistrée pour cette plage'
    : 'Arrivée déjà enregistrée pour cette plage';

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
              {['Selfie', 'Personnel', 'Plage', 'OK'].map((label, i) => (
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
              <strong>{result.alreadyPresent ? successAlready : successNew}</strong>
              <p>
                {result.firstName} {result.lastName}
              </p>
              {result.shiftLabel ? (
                <p className="staff-presence-time">Plage : {result.shiftLabel}</p>
              ) : null}
              <p className="staff-presence-time">
                {isExit ? 'Parti à' : 'Arrivé à'} {formatCheckedAt(result.checkedAt)}
              </p>
              {result.overtimeMinutes > 0 ? (
                <p className="staff-presence-overtime">
                  Heures sup. : {result.overtimeLabel || `${result.overtimeMinutes} min`}
                </p>
              ) : null}
            </div>
          ) : null}

          {valid && !result && step === 'selfie' ? (
            <div className="staff-presence-selfie">
              <p className="staff-presence-lead">
                Prenez un selfie avec la caméra avant pour confirmer votre identité.
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
                      {e.firstName} {e.lastName}
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
                  disabled={!employeeId}
                  onClick={() => setStep('shift')}
                >
                  Continuer
                </button>
              </div>
            </div>
          ) : null}

          {valid && !result && step === 'shift' ? (
            <div className="staff-presence-form">
              <p className="staff-presence-lead">
                {selectedEmployee
                  ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} — choisissez votre plage horaire.`
                  : 'Choisissez votre plage horaire.'}
              </p>
              <div className="staff-presence-shifts">
                {(shifts.length ? shifts : [{ id: 'morning', label: '08h – 16h' }]).map((s) => (
                  <label key={s.id} className={`staff-presence-shift${shift === s.id ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="shift"
                      value={s.id}
                      checked={shift === s.id}
                      onChange={() => setShift(s.id)}
                    />
                    <span>{s.label}</span>
                    {s.id === suggestedShift ? <small>Suggéré</small> : null}
                  </label>
                ))}
              </div>
              <div className="staff-presence-actions">
                <button type="button" className="staff-presence-cta staff-presence-cta--ghost" onClick={() => setStep('employee')}>
                  Retour
                </button>
                <button
                  type="button"
                  className="staff-presence-cta"
                  disabled={submitting || !shift}
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
