import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageLoader from '../../components/PageLoader';
import ChampionMissionMiniMap from '../../components/champion/ChampionMissionMiniMap';
import {
  acceptMission,
  advanceMissionStep,
  cancelMission,
  completeMission,
  fetchActiveMission,
  fetchAvailableMissions,
  fetchChampionWallet,
  fetchMissionHistory,
  fetchMyChampionReviews,
  formatCfa,
  MISSION_STEP_BUTTONS,
  setChampionOnline,
  telLink,
  updateChampionLocation,
  updateChampionProfile,
  VEHICLE_LABELS,
  MOMO_LABELS,
  whatsAppLink,
  withdrawChampionWallet,
} from '../../utils/championApi';
import { playChampionNewMissionSound } from '../../utils/championSounds';
import './champion.css';

const TABS = [
  { id: 'available', label: 'Dispo' },
  { id: 'active', label: 'En cours' },
  { id: 'history', label: 'Historique' },
  { id: 'wallet', label: 'Gains' },
  { id: 'profile', label: 'Profil' },
];

export default function ChampionApp() {
  const { champion, reloadChampion } = useOutletContext();
  const [tab, setTab] = useState('available');
  const [online, setOnline] = useState(!!champion?.isOnline);
  const [missions, setMissions] = useState([]);
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [profileForm, setProfileForm] = useState({
    whatsApp: champion?.whatsApp || '',
    momoNumber: champion?.momoNumber || '',
    momoAccountName: champion?.momoAccountName || '',
    momoNetwork: champion?.momoNetwork || 'mtn',
  });
  const [reviewsData, setReviewsData] = useState({ reviews: [], ratingAvg: 0, ratingCount: 0 });
  const knownMissionIdsRef = useRef(new Set());
  const missionsPrimedRef = useRef(false);

  const refreshMissions = useCallback(async () => {
    const [avail, act, hist] = await Promise.all([
      fetchAvailableMissions(),
      fetchActiveMission(),
      fetchMissionHistory(),
    ]);
    setMissions(avail);
    setActive(act);
    setHistory(hist);
  }, []);

  const refreshWallet = useCallback(async () => {
    const w = await fetchChampionWallet();
    setWallet(w);
  }, []);

  const refreshReviews = useCallback(async () => {
    const data = await fetchMyChampionReviews();
    setReviewsData(data);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([refreshMissions(), refreshWallet()]);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [refreshMissions, refreshWallet]);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (online) refreshMissions().catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [load, online, refreshMissions]);

  useEffect(() => {
    if (!online) {
      missionsPrimedRef.current = false;
      knownMissionIdsRef.current = new Set();
      return;
    }

    const currentIds = missions.map((m) => m._id);
    const newOnes = currentIds.filter((id) => !knownMissionIdsRef.current.has(id));

    if (missionsPrimedRef.current && newOnes.length > 0) {
      playChampionNewMissionSound();
    }

    knownMissionIdsRef.current = new Set(currentIds);
    if (currentIds.length > 0 || missionsPrimedRef.current) {
      missionsPrimedRef.current = true;
    }
  }, [missions, online]);

  useEffect(() => {
    if (tab === 'profile') {
      refreshReviews().catch(() => {});
    }
  }, [tab, refreshReviews]);

  useEffect(() => {
    if (!online || !navigator.geolocation) return undefined;

    const tick = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateChampionLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
    };
    tick();
    const id = setInterval(tick, 45000);
    return () => clearInterval(id);
  }, [online]);

  const toggleOnline = async () => {
    setBusy(true);
    try {
      const next = !online;
      await setChampionOnline(next);
      setOnline(next);
      await reloadChampion();
      if (next) await refreshMissions();
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de changer le statut');
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async (id) => {
    setBusy(true);
    setError('');
    try {
      const m = await acceptMission(id);
      setActive(m);
      setTab('active');
      await refreshMissions();
    } catch (e) {
      setError(e.response?.data?.message || 'Course indisponible');
    } finally {
      setBusy(false);
    }
  };

  const handleStep = async () => {
    if (!active) return;
    if (active.status === 'arrived') {
      setTab('active');
      return;
    }
    setBusy(true);
    try {
      const m = await advanceMissionStep(active._id);
      setActive(m);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await completeMission(active._id, { deliveryCode, proofPhoto: proofFile });
      setDeliveryCode('');
      setProofFile(null);
      setActive(null);
      setTab('history');
      await Promise.all([refreshMissions(), refreshWallet(), reloadChampion()]);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!active || !cancelReason.trim()) return;
    setBusy(true);
    try {
      await cancelMission(active._id, cancelReason.trim());
      setActive(null);
      setShowCancel(false);
      setCancelReason('');
      await refreshMissions();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = Math.round(Number(withdrawAmount) || 0);
    if (!amount) return;
    setBusy(true);
    try {
      await withdrawChampionWallet(amount);
      setWithdrawAmount('');
      await refreshWallet();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleProfileSave = async () => {
    setBusy(true);
    try {
      await updateChampionProfile(profileForm);
      await reloadChampion();
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const today = champion?.todayStats || {};
  const name = [champion?.firstName, champion?.lastName].filter(Boolean).join(' ');

  const activeButtonLabel = useMemo(() => {
    if (!active) return '';
    if (active.status === 'arrived') return 'Valider la livraison';
    return MISSION_STEP_BUTTONS[active.status] || 'Continuer';
  }, [active]);

  if (loading && !missions.length) return <PageLoader />;

  return (
    <div className="champion-shell champion-shell--app champion-shell--centered">
      <header className="champion-topbar">
        <div className="champion-header-profile">
          {champion?.profilePhotoUrl ? (
            <img src={champion.profilePhotoUrl} alt="" />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eadfce' }} />
          )}
          <div>
            <strong>{name}</strong>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>
              ⭐ {(champion?.ratingAvg || 0).toFixed(1)} · {champion?.workZone}
            </div>
          </div>
        </div>
        <div className="champion-online-toggle">
          <span>{online ? 'En ligne' : 'Hors ligne'}</span>
          <button
            type="button"
            className={`champion-switch${online ? ' is-on' : ''}`}
            disabled={busy}
            onClick={toggleOnline}
            aria-label="En ligne"
          />
        </div>
      </header>

      <div className="champion-kpi-row">
        <div className="champion-kpi">
          <span>Courses</span>
          <strong>{today.deliveries || 0}</strong>
        </div>
        <div className="champion-kpi">
          <span>Gains jour</span>
          <strong>{formatCfa(today.earnings || 0)}</strong>
        </div>
        <div className="champion-kpi">
          <span>Distance</span>
          <strong>{(today.distanceKm || 0).toFixed(1)} km</strong>
        </div>
      </div>

      {error ? <div className="champion-card champion-error">{error}</div> : null}

      {tab === 'available' && (
        <>
          {!online ? (
            <div className="champion-list-empty">Passez en ligne pour voir les courses disponibles.</div>
          ) : missions.length === 0 ? (
            <div className="champion-list-empty">Aucune course pour le moment dans votre zone.</div>
          ) : (
            missions.map((m) => (
              <div key={m._id} className="champion-card champion-mission-card">
                <div style={{ fontSize: '0.8rem', color: '#888' }}>
                  ~{m.estimatedMinutes} min · {m.distanceKm} km
                </div>
                <p style={{ margin: '8px 0 4px' }}>
                  <strong>Retrait :</strong> {m.pickupLabel}
                  <br />
                  <span style={{ color: '#555' }}>{m.pickupAddress}</span>
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Livraison :</strong> {m.deliveryLabel}
                  <br />
                  <span style={{ color: '#555' }}>{m.deliveryAddress}</span>
                </p>
                <div className="champion-earnings">{formatCfa(m.earnings)}</div>
                <div style={{ fontSize: '0.82rem', color: '#666', marginTop: 4 }}>
                  Paiement : {m.paymentMode === 'cash_on_delivery' ? 'À la livraison' : m.paymentMode}
                </div>
                <ChampionMissionMiniMap mission={m} championLocation={champion?.location} />
                <button
                  type="button"
                  className="champion-btn champion-btn--primary"
                  style={{ marginTop: 12 }}
                  disabled={busy}
                  onClick={() => handleAccept(m._id)}
                >
                  Accepter
                </button>
              </div>
            ))
          )}
        </>
      )}

      {tab === 'active' && (
        <>
          {!active ? (
            <div className="champion-list-empty">Aucune course en cours.</div>
          ) : (
            <div className="champion-card">
              <p>
                <strong>Statut :</strong> {active.status}
              </p>
              <p>
                <strong>Retrait :</strong> {active.pickupAddress}
              </p>
              <p>
                <strong>Client :</strong> {active.deliveryAddress}
              </p>
              <ChampionMissionMiniMap mission={active} championLocation={champion?.location} height={180} />
              <div className="champion-mission-actions">
                {active.pickupPhone ? (
                  <>
                    <a href={telLink(active.pickupPhone)}>Appeler</a>
                    <a href={whatsAppLink(active.pickupPhone)} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </>
                ) : null}
              </div>
              {['en_route', 'arrived', 'picked_up'].includes(active.status) && (
                <div className="champion-mission-actions" style={{ marginTop: 8 }}>
                  {active.deliveryPhone ? (
                    <>
                      <a href={telLink(active.deliveryPhone)}>Client</a>
                      <a href={whatsAppLink(active.deliveryPhone)} target="_blank" rel="noreferrer">
                        WhatsApp client
                      </a>
                    </>
                  ) : null}
                </div>
              )}

              {active.status === 'arrived' ? (
                <>
                  <div className="champion-form-field" style={{ marginTop: 16 }}>
                    <label>Code de livraison (4 chiffres)</label>
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      value={deliveryCode}
                      onChange={(e) => setDeliveryCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="champion-form-field">
                    <label>Ou photo de preuve</label>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                  </div>
                  <button type="button" className="champion-btn champion-btn--primary" disabled={busy} onClick={handleComplete}>
                    Marquer comme livrée
                  </button>
                </>
              ) : (
                <button type="button" className="champion-btn champion-btn--primary" style={{ marginTop: 16 }} disabled={busy} onClick={handleStep}>
                  {activeButtonLabel}
                </button>
              )}

              {!showCancel ? (
                <button
                  type="button"
                  className="champion-btn champion-btn--danger"
                  style={{ marginTop: 10 }}
                  onClick={() => setShowCancel(true)}
                >
                  Annuler
                </button>
              ) : (
                <>
                  <div className="champion-form-field" style={{ marginTop: 10 }}>
                    <label>Motif d’annulation</label>
                    <textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                  </div>
                  <button type="button" className="champion-btn champion-btn--danger" disabled={busy} onClick={handleCancel}>
                    Confirmer l’annulation
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {history.length === 0 ? (
            <div className="champion-list-empty">Pas encore de courses terminées.</div>
          ) : (
            history.map((m) => (
              <div key={m._id} className="champion-card">
                <div style={{ fontSize: '0.82rem', color: '#888' }}>
                  {m.deliveredAt ? new Date(m.deliveredAt).toLocaleString('fr-FR') : ''}
                </div>
                <p style={{ margin: '6px 0' }}>
                  {m.pickupLabel} → {m.deliveryLabel}
                </p>
                <strong style={{ color: '#15803d' }}>{formatCfa(m.earnings)}</strong>
                {m.clientReview ? (
                  <div style={{ fontSize: '0.82rem', color: '#888', marginTop: 4 }}>
                    Avis client : {'★'.repeat(m.clientReview.rating)}
                    {m.clientReview.comment ? ` — ${m.clientReview.comment}` : ''}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </>
      )}

      {tab === 'wallet' && wallet && (
        <div className="champion-card">
          <p>
            <strong>Solde disponible</strong>
            <div className="champion-earnings">{formatCfa(wallet.walletBalance)}</div>
          </p>
          <p style={{ color: '#666' }}>En attente : {formatCfa(wallet.pendingBalance)}</p>
          <div className="champion-form-field">
            <label>Montant à retirer (MoMo)</label>
            <input
              inputMode="numeric"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
          </div>
          <button type="button" className="champion-btn champion-btn--primary" disabled={busy} onClick={handleWithdraw}>
            Retirer
          </button>
          <h3 style={{ marginTop: 20, fontSize: '1rem' }}>Historique</h3>
          {(wallet.transactions || []).map((t) => (
            <div key={t._id} style={{ padding: '8px 0', borderBottom: '1px solid #f0e8df', fontSize: '0.88rem' }}>
              {t.type === 'earning' ? '+' : '−'}
              {formatCfa(t.amount)} — {t.status} — {new Date(t.createdAt).toLocaleDateString('fr-FR')}
            </div>
          ))}
        </div>
      )}

      {tab === 'profile' && (
        <div className="champion-card">
          <p>
            <strong>Note moyenne :</strong> ⭐ {(reviewsData.ratingAvg ?? champion?.ratingAvg ?? 0).toFixed(1)} (
            {reviewsData.ratingCount ?? champion?.ratingCount ?? 0} avis)
          </p>
          {(reviewsData.reviews || []).length > 0 ? (
            <div className="champion-reviews-list">
              {reviewsData.reviews.map((r) => (
                <div key={r._id} className="champion-review-item">
                  <div className="champion-review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  {r.comment ? <p>{r.comment}</p> : null}
                  <span className="champion-review-meta">
                    {r.clientName || 'Client'} — {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>Pas encore d’avis clients.</p>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #eadfce', margin: '16px 0' }} />

          <p>
            <strong>Véhicule :</strong> {VEHICLE_LABELS[champion?.vehicleType] || '—'}
          </p>
          <p>
            <strong>Zone :</strong> {champion?.workZone}
          </p>
          <p>
            <strong>CNI :</strong> {champion?.idCardNumber || '—'}
          </p>
          <div className="champion-form-field">
            <label>WhatsApp</label>
            <input value={profileForm.whatsApp} onChange={(e) => setProfileForm({ ...profileForm, whatsApp: e.target.value })} />
          </div>
          <div className="champion-form-field">
            <label>Réseau MoMo</label>
            <select value={profileForm.momoNetwork} onChange={(e) => setProfileForm({ ...profileForm, momoNetwork: e.target.value })}>
              {Object.entries(MOMO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="champion-form-field">
            <label>Numéro MoMo</label>
            <input value={profileForm.momoNumber} onChange={(e) => setProfileForm({ ...profileForm, momoNumber: e.target.value })} />
          </div>
          <div className="champion-form-field">
            <label>Titulaire MoMo</label>
            <input value={profileForm.momoAccountName} onChange={(e) => setProfileForm({ ...profileForm, momoAccountName: e.target.value })} />
          </div>
          <button type="button" className="champion-btn champion-btn--primary" disabled={busy} onClick={handleProfileSave}>
            Enregistrer
          </button>
        </div>
      )}

      <nav className="champion-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`champion-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
