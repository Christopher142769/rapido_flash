import React, { useCallback, useEffect, useState } from 'react';
import PageLoader from '../../components/PageLoader';
import { useModal } from '../../context/ModalContext';
import {
  approveChampion,
  fetchChampionAdminDetail,
  fetchChampionApplications,
  formatCfa,
  reactivateChampion,
  rejectChampion,
  releaseChampionPending,
  STATUS_LABELS,
  suspendChampion,
  VEHICLE_LABELS,
  MOMO_LABELS,
} from '../../utils/championApi';
import '../commercial/commercial.css';

export default function ChampionsDashboard() {
  const { showSuccess, showError } = useModal();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('pending_validation');
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      setList(await fetchChampionApplications(filter));
    } catch (e) {
      showError(e.response?.data?.message || 'Accès réservé à l’administrateur');
    } finally {
      setLoading(false);
    }
  }, [filter, showError]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDetail = async (id) => {
    setSelectedId(id);
    try {
      setDetail(await fetchChampionAdminDetail(id));
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    }
  };

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      const updated = await fn();
      if (updated) setDetail(updated);
      showSuccess(msg);
      await loadList();
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !list.length) return <PageLoader />;

  return (
    <div className="commercial-page">
      <h1>Livreurs Champion</h1>
      <p className="commercial-lead">
        Examinez les candidatures, validez ou rejetez les dossiers, gérez les suspensions et libérez les gains en
        attente.
      </p>

      <div className="commercial-card" style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 600, marginRight: 8 }}>Filtrer :</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending_validation">En attente</option>
          <option value="active">Actifs</option>
          <option value="rejected">Rejetés</option>
          <option value="suspended">Suspendus</option>
          <option value="all">Tous</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', gap: '1rem' }}>
        <div className="commercial-card">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Candidatures ({list.length})</h2>
          {list.length === 0 ? (
            <p style={{ color: '#888' }}>Aucun dossier.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {list.map((c) => {
                const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
                return (
                  <li key={c._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                    <button
                      type="button"
                      onClick={() => openDetail(c._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        width: '100%',
                        fontWeight: selectedId === c._id ? 700 : 500,
                      }}
                    >
                      {name || c.email}
                      <div style={{ fontSize: '0.82rem', color: '#888' }}>
                        {STATUS_LABELS[c.accountStatus]} · {c.workZone || '—'}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="commercial-card">
          {!detail ? (
            <p style={{ color: '#888' }}>Sélectionnez un dossier pour voir le détail.</p>
          ) : (
            <>
              <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>
                {[detail.firstName, detail.lastName].filter(Boolean).join(' ')}
              </h2>
              <div className="champion-admin-detail">
                <div>
                  <strong>Statut :</strong> {STATUS_LABELS[detail.accountStatus]}
                </div>
                <div>
                  <strong>Email :</strong> {detail.email}
                </div>
                <div>
                  <strong>Tél. :</strong> +{detail.phone}
                </div>
                <div>
                  <strong>WhatsApp :</strong> +{detail.whatsApp}
                </div>
                <div>
                  <strong>Véhicule :</strong> {VEHICLE_LABELS[detail.vehicleType]}
                </div>
                <div>
                  <strong>Zone :</strong> {detail.workZone}
                </div>
                <div>
                  <strong>MoMo :</strong> {MOMO_LABELS[detail.momoNetwork]} +{detail.momoNumber} ({detail.momoAccountName})
                </div>
                <div>
                  <strong>CNI n° :</strong> {detail.idCardNumber || '—'}
                </div>
                <div>
                  <strong>Gains :</strong> {formatCfa(detail.walletBalance)} dispo · {formatCfa(detail.pendingBalance)} en attente
                </div>
                {detail.profilePhotoUrl ? <img src={detail.profilePhotoUrl} alt="Profil" /> : null}
                {detail.idCardFrontUrl ? <img src={detail.idCardFrontUrl} alt="CNI recto" /> : null}
                {detail.idCardBackUrl ? <img src={detail.idCardBackUrl} alt="CNI verso" /> : null}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                {detail.accountStatus === 'pending_validation' && (
                  <>
                    <button
                      type="button"
                      className="commercial-btn commercial-btn--primary"
                      disabled={busy}
                      onClick={() => run(() => approveChampion(detail._id), 'Livreur validé')}
                    >
                      Valider
                    </button>
                    <input
                      placeholder="Motif de refus"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={{ flex: 1, minWidth: 160 }}
                    />
                    <button
                      type="button"
                      className="commercial-btn"
                      disabled={busy || !rejectReason.trim()}
                      onClick={() =>
                        run(() => rejectChampion(detail._id, rejectReason), 'Candidature refusée')
                      }
                    >
                      Rejeter
                    </button>
                  </>
                )}
                {detail.accountStatus === 'active' && (
                  <button
                    type="button"
                    className="commercial-btn"
                    disabled={busy}
                    onClick={() =>
                      run(() => suspendChampion(detail._id, 'Suspension manuelle admin'), 'Compte suspendu')
                    }
                  >
                    Suspendre
                  </button>
                )}
                {detail.accountStatus === 'suspended' && (
                  <button
                    type="button"
                    className="commercial-btn commercial-btn--primary"
                    disabled={busy}
                    onClick={() => run(() => reactivateChampion(detail._id), 'Compte réactivé')}
                  >
                    Réactiver
                  </button>
                )}
                {Number(detail.pendingBalance) > 0 && (
                  <button
                    type="button"
                    className="commercial-btn commercial-btn--primary"
                    disabled={busy}
                    onClick={() =>
                      run(() => releaseChampionPending(detail._id), 'Gains libérés vers le portefeuille')
                    }
                  >
                    Libérer gains en attente
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
