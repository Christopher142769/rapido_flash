import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import {
  clearChampionDraftId,
  fetchChampionZones,
  getChampionDraftId,
  onboardingStep1,
  saveChampionDraftId,
  sendChampionOtp,
  submitChampionApplication,
  updateChampionContacts,
  updateChampionIdDocument,
  updateChampionPayment,
  updateChampionVehicle,
  verifyChampionOtp,
  MOMO_LABELS,
  VEHICLE_LABELS,
} from '../../utils/championApi';
import './champion.css';

const TOTAL_STEPS = 7;

export default function ChampionOnboarding() {
  const navigate = useNavigate();
  const { loginWithToken } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [championId, setChampionId] = useState(getChampionDraftId());
  const [zones, setZones] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [identity, setIdentity] = useState({ firstName: '', lastName: '', photoFile: null, photoPreview: '' });
  const [emailStep, setEmailStep] = useState({ email: '', code: '', password: '' });
  const [contacts, setContacts] = useState({ phone: '', whatsApp: '', same: true });
  const [idDoc, setIdDoc] = useState({ front: null, back: null, number: '', frontPreview: '', backPreview: '' });
  const [vehicle, setVehicle] = useState({ type: '', zone: '' });
  const [payment, setPayment] = useState({ network: 'mtn', momoNumber: '', accountName: '' });
  const [terms, setTerms] = useState(false);

  useEffect(() => {
    fetchChampionZones().then((d) => setZones(d.zones || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const capturePhoto = (setter, field) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setter((prev) => ({
      ...prev,
      [field]: file,
      [`${field}Preview`]: URL.createObjectURL(file),
    }));
  };

  const handleStep1 = async () => {
    setError('');
    if (!identity.firstName.trim() || !identity.lastName.trim()) {
      setError('Prénom et nom requis');
      return;
    }
    if (!identity.photoFile) {
      setError('Prenez une photo avec la caméra');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('firstName', identity.firstName.trim());
      fd.append('lastName', identity.lastName.trim());
      fd.append('profilePhoto', identity.photoFile);
      const res = await onboardingStep1(fd);
      setChampionId(res.championId);
      saveChampionDraftId(res.championId);
      setStep(2);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    if (!emailStep.email.includes('@')) {
      setError('Email invalide');
      return;
    }
    setBusy(true);
    try {
      await sendChampionOtp(championId, emailStep.email.trim());
      setOtpSent(true);
      setResendIn(60);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (emailStep.code.length !== 6 || emailStep.password.length < 6) {
      setError('Code à 6 chiffres et mot de passe (6 car. min) requis');
      return;
    }
    setBusy(true);
    try {
      const res = await verifyChampionOtp(championId, emailStep.code, emailStep.password);
      loginWithToken(res.token, res.user);
      setStep(3);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleContacts = async () => {
    setError('');
    setBusy(true);
    try {
      await updateChampionContacts(championId, {
        phone: contacts.phone,
        whatsApp: contacts.same ? contacts.phone : contacts.whatsApp,
        whatsAppSameAsPhone: contacts.same,
      });
      setStep(4);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleIdDoc = async () => {
    setError('');
    if (!idDoc.front) {
      setError('Photo recto requise');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('idCardFront', idDoc.front);
      if (idDoc.back) fd.append('idCardBack', idDoc.back);
      fd.append('idCardNumber', idDoc.number);
      await updateChampionIdDocument(championId, fd);
      setStep(5);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVehicle = async () => {
    setError('');
    if (!vehicle.type || !vehicle.zone) {
      setError('Choisissez véhicule et zone');
      return;
    }
    setBusy(true);
    try {
      await updateChampionVehicle(championId, { vehicleType: vehicle.type, workZone: vehicle.zone });
      setPayment((p) => ({ ...p, momoNumber: p.momoNumber || contacts.phone }));
      setStep(6);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePayment = async () => {
    setError('');
    setBusy(true);
    try {
      await updateChampionPayment(championId, {
        momoNetwork: payment.network,
        momoNumber: payment.momoNumber,
        momoAccountName: payment.accountName,
      });
      setStep(7);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!terms) {
      setError('Acceptez les conditions');
      return;
    }
    setBusy(true);
    try {
      await submitChampionApplication(championId);
      clearChampionDraftId();
      navigate('/champion/en-attente');
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const renderDots = () => (
    <div className="champion-step-dots">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className={`champion-step-dot${step === i + 1 ? ' is-active' : ''}`} />
      ))}
    </div>
  );

  return (
    <div className="champion-shell champion-shell--centered">
      <div className="champion-topbar">
        <Link to="/champion" className="champion-brand">
          <img src="/images/logo.png" alt="" />
          Inscription
        </Link>
        <span style={{ fontSize: '0.85rem', color: '#888' }}>
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      {renderDots()}

      <div className="champion-card">
        {error ? <div className="champion-error">{error}</div> : null}

        {step === 1 && (
          <>
            <h2 style={{ marginTop: 0 }}>Identité</h2>
            <div className="champion-form-row">
              <div className="champion-form-field">
                <label>Prénom</label>
                <input value={identity.firstName} onChange={(e) => setIdentity({ ...identity, firstName: e.target.value })} />
              </div>
              <div className="champion-form-field">
                <label>Nom</label>
                <input value={identity.lastName} onChange={(e) => setIdentity({ ...identity, lastName: e.target.value })} />
              </div>
            </div>
            <div className="champion-camera-box">
              {identity.photoPreview ? (
                <img src={identity.photoPreview} alt="Profil" />
              ) : (
                <p style={{ margin: '0 0 10px', color: '#888' }}>Photo de profil (caméra)</p>
              )}
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIdentity({ ...identity, photoFile: file, photoPreview: URL.createObjectURL(file) });
                }}
              />
            </div>
            <button type="button" className="champion-btn champion-btn--primary" disabled={busy} onClick={handleStep1}>
              Continuer
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ marginTop: 0 }}>Email & vérification</h2>
            <div className="champion-form-field">
              <label>Email</label>
              <input
                type="email"
                value={emailStep.email}
                onChange={(e) => setEmailStep({ ...emailStep, email: e.target.value })}
              />
            </div>
            {!otpSent ? (
              <button type="button" className="champion-btn champion-btn--primary" disabled={busy} onClick={handleSendOtp}>
                Envoyer le code
              </button>
            ) : (
              <>
                <div className="champion-form-field">
                  <label>Code à 6 chiffres</label>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={emailStep.code}
                    onChange={(e) => setEmailStep({ ...emailStep, code: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div className="champion-form-field">
                  <label>Mot de passe (connexion future)</label>
                  <input
                    type="password"
                    minLength={6}
                    value={emailStep.password}
                    onChange={(e) => setEmailStep({ ...emailStep, password: e.target.value })}
                  />
                </div>
                <button type="button" className="champion-btn champion-btn--primary" disabled={busy} onClick={handleVerifyOtp}>
                  Vérifier et continuer
                </button>
                <button
                  type="button"
                  className="champion-btn champion-btn--secondary"
                  style={{ marginTop: 10 }}
                  disabled={busy || resendIn > 0}
                  onClick={handleSendOtp}
                >
                  {resendIn > 0 ? `Renvoyer (${resendIn}s)` : 'Renvoyer le code'}
                </button>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ marginTop: 0 }}>Contacts</h2>
            <div className="champion-form-field">
              <label>Téléphone (+229)</label>
              <input
                inputMode="tel"
                placeholder="97123456"
                value={contacts.phone}
                onChange={(e) => setContacts({ ...contacts, phone: e.target.value })}
              />
            </div>
            <label className="champion-check">
              <input
                type="checkbox"
                checked={contacts.same}
                onChange={(e) => setContacts({ ...contacts, same: e.target.checked })}
              />
              Même numéro pour WhatsApp
            </label>
            {!contacts.same && (
              <div className="champion-form-field">
                <label>WhatsApp</label>
                <input
                  inputMode="tel"
                  value={contacts.whatsApp}
                  onChange={(e) => setContacts({ ...contacts, whatsApp: e.target.value })}
                />
              </div>
            )}
            <button type="button" className="champion-btn champion-btn--primary" disabled={busy} onClick={handleContacts}>
              Continuer
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <h2 style={{ marginTop: 0 }}>Pièce d’identité</h2>
            <div className="champion-form-field">
              <label>Recto CNI (caméra)</label>
              <input type="file" accept="image/*" capture="environment" onChange={capturePhoto(setIdDoc, 'front')} />
              {idDoc.frontPreview ? <img src={idDoc.frontPreview} alt="" style={{ maxWidth: '100%', marginTop: 8, borderRadius: 12 }} /> : null}
            </div>
            <div className="champion-form-field">
              <label>Verso (optionnel)</label>
              <input type="file" accept="image/*" capture="environment" onChange={capturePhoto(setIdDoc, 'back')} />
            </div>
            <div className="champion-form-field">
              <label>Numéro de la pièce</label>
              <input value={idDoc.number} onChange={(e) => setIdDoc({ ...idDoc, number: e.target.value })} />
            </div>
            <button type="button" className="champion-btn champion-btn--primary" disabled={busy} onClick={handleIdDoc}>
              Continuer
            </button>
          </>
        )}

        {step === 5 && (
          <>
            <h2 style={{ marginTop: 0 }}>Véhicule & zone</h2>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>Type de véhicule</p>
            <div className="champion-choice-grid" style={{ marginBottom: 14 }}>
              {Object.entries(VEHICLE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`champion-choice${vehicle.type === key ? ' is-selected' : ''}`}
                  onClick={() => setVehicle({ ...vehicle, type: key })}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="champion-form-field">
              <label>Zone principale</label>
              <select value={vehicle.zone} onChange={(e) => setVehicle({ ...vehicle, zone: e.target.value })}>
                <option value="">Choisir…</option>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="champion-btn champion-btn--primary" disabled={busy} onClick={handleVehicle}>
              Continuer
            </button>
          </>
        )}

        {step === 6 && (
          <>
            <h2 style={{ marginTop: 0 }}>Paiement MoMo</h2>
            <div className="champion-choice-grid" style={{ marginBottom: 14 }}>
              {Object.entries(MOMO_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`champion-choice${payment.network === key ? ' is-selected' : ''}`}
                  onClick={() => setPayment({ ...payment, network: key })}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="champion-form-field">
              <label>Numéro MoMo</label>
              <input
                inputMode="tel"
                value={payment.momoNumber}
                onChange={(e) => setPayment({ ...payment, momoNumber: e.target.value })}
              />
            </div>
            <div className="champion-form-field">
              <label>Nom du titulaire du compte</label>
              <input
                value={payment.accountName}
                onChange={(e) => setPayment({ ...payment, accountName: e.target.value })}
              />
            </div>
            <button type="button" className="champion-btn champion-btn--primary" disabled={busy} onClick={handlePayment}>
              Continuer
            </button>
          </>
        )}

        {step === 7 && (
          <>
            <h2 style={{ marginTop: 0 }}>Conditions</h2>
            <label className="champion-check">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              J’accepte les règles Champion : respect des clients, preuve de livraison obligatoire, annulations
              surveillées.
            </label>
            <button
              type="button"
              className="champion-btn champion-btn--primary"
              style={{ marginTop: 16 }}
              disabled={busy}
              onClick={handleSubmit}
            >
              Soumettre ma candidature
            </button>
          </>
        )}
      </div>
    </div>
  );
}
