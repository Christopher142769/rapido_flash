import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import PageLoader from '../../components/PageLoader';
import { FaTrash, FaUserSlash, FaEnvelope, FaCheck, FaTimes, FaSyncAlt } from 'react-icons/fa';
import './AccountRequestsDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const STATUS_LABELS = {
  pending: 'En attente',
  in_progress: 'En cours',
  resolved: 'Résolue',
  rejected: 'Rejetée',
};

const TYPE_LABELS = {
  deletion: 'Suppression de compte',
  support: 'Message support',
};

const AccountRequestsDashboard = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { showSuccess, showError, showModal, closeModal } = useModal();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [editingId, setEditingId] = useState(null);
  const [adminNoteDraft, setAdminNoteDraft] = useState('');

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      const res = await axios.get(`${API_URL}/account-requests`, {
        params,
        headers: authHeaders,
      });
      setItems(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      showError(err.response?.data?.message || 'Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, authHeaders, showError]);

  useEffect(() => {
    if (user?.canManageMaintenance) {
      void fetchItems();
    }
  }, [user?.canManageMaintenance, fetchItems]);

  if (authLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.canManageMaintenance) return <Navigate to="/dashboard" replace />;

  const updateStatus = async (id, status) => {
    try {
      const res = await axios.patch(
        `${API_URL}/account-requests/${id}`,
        { status },
        { headers: authHeaders }
      );
      setItems((prev) => prev.map((it) => (it._id === id ? { ...it, ...res.data } : it)));
      showSuccess('Statut mis à jour');
    } catch (err) {
      showError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const saveNote = async (id) => {
    try {
      const res = await axios.patch(
        `${API_URL}/account-requests/${id}`,
        { adminNote: adminNoteDraft },
        { headers: authHeaders }
      );
      setItems((prev) => prev.map((it) => (it._id === id ? { ...it, ...res.data } : it)));
      setEditingId(null);
      showSuccess('Note enregistrée');
    } catch (err) {
      showError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const confirmAction = (title, message, primaryLabel, handler) => {
    showModal({
      type: 'warning',
      title,
      message,
      primaryLabel,
      secondaryLabel: 'Annuler',
      onPrimary: () => {
        closeModal();
        void handler();
      },
      onSecondary: () => closeModal(),
    });
  };

  const processDeletion = (item) => {
    confirmAction(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer définitivement le compte ${item.email} ? Cette action est irréversible.`,
      'Supprimer le compte',
      async () => {
        try {
          const res = await axios.post(
            `${API_URL}/account-requests/${item._id}/process-deletion`,
            {},
            { headers: authHeaders }
          );
          setItems((prev) => prev.map((it) => (it._id === item._id ? { ...it, ...res.data.request } : it)));
          showSuccess(
            res.data?.userDeleted
              ? `Compte ${item.email} supprimé et demande clôturée.`
              : `Aucun compte trouvé pour ${item.email}. La demande a été marquée résolue.`
          );
        } catch (err) {
          showError(err.response?.data?.message || 'Erreur lors de la suppression');
        }
      }
    );
  };

  const removeRequest = (item) => {
    confirmAction(
      'Retirer la demande',
      'Supprimer cette demande du registre ?',
      'Retirer',
      async () => {
        try {
          await axios.delete(`${API_URL}/account-requests/${item._id}`, { headers: authHeaders });
          setItems((prev) => prev.filter((it) => it._id !== item._id));
          showSuccess('Demande supprimée du registre');
        } catch (err) {
          showError(err.response?.data?.message || 'Erreur lors de la suppression');
        }
      }
    );
  };

  return (
    <div className="account-requests-dashboard">
      <header className="ar-header">
        <div>
          <h1>Demandes utilisateurs</h1>
          <p className="ar-subtitle">
            Demandes de suppression de compte et messages au service Rapido envoyés depuis la page publique.
          </p>
        </div>
        <button type="button" className="ar-icon-btn" onClick={fetchItems} aria-label="Rafraîchir">
          <FaSyncAlt />
        </button>
      </header>

      <div className="ar-filters">
        <label>
          Type
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Tous</option>
            <option value="deletion">Suppression de compte</option>
            <option value="support">Message support</option>
          </select>
        </label>
        <label>
          Statut
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="resolved">Résolue</option>
            <option value="rejected">Rejetée</option>
          </select>
        </label>
        <div className="ar-total">{total} demande(s)</div>
      </div>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <div className="ar-empty">
          <p>Aucune demande pour ces filtres.</p>
        </div>
      ) : (
        <ul className="ar-list">
          {items.map((item) => {
            const isEditing = editingId === item._id;
            return (
              <li key={item._id} className={`ar-card ar-type-${item.type} ar-status-${item.status}`}>
                <div className="ar-card-head">
                  <div className="ar-card-title">
                    <span className={`ar-badge ar-badge-${item.type}`}>{TYPE_LABELS[item.type]}</span>
                    <span className={`ar-badge ar-badge-status-${item.status}`}>{STATUS_LABELS[item.status]}</span>
                    {item.accountDeleted && <span className="ar-badge ar-badge-deleted">Compte supprimé</span>}
                  </div>
                  <div className="ar-card-date">{new Date(item.createdAt).toLocaleString('fr-FR')}</div>
                </div>

                <div className="ar-card-body">
                  <div className="ar-line">
                    <strong>Email :</strong>{' '}
                    <a href={`mailto:${item.email}`}>{item.email}</a>
                  </div>
                  {item.nom && (
                    <div className="ar-line"><strong>Nom :</strong> {item.nom}</div>
                  )}
                  {item.telephone && (
                    <div className="ar-line"><strong>Téléphone :</strong> {item.telephone}</div>
                  )}
                  {item.user && (
                    <div className="ar-line">
                      <strong>Compte :</strong> {item.user.nom || '—'} ({item.user.role})
                    </div>
                  )}
                  {!item.user && (
                    <div className="ar-line muted">Aucun compte actuellement associé à cet email.</div>
                  )}
                  {item.subject && (
                    <div className="ar-line"><strong>Sujet :</strong> {item.subject}</div>
                  )}
                  {item.message && (
                    <div className="ar-message">
                      <strong>Message :</strong>
                      <p>{item.message}</p>
                    </div>
                  )}

                  <div className="ar-note">
                    <strong>Note interne :</strong>
                    {isEditing ? (
                      <>
                        <textarea
                          rows={3}
                          value={adminNoteDraft}
                          onChange={(e) => setAdminNoteDraft(e.target.value)}
                          maxLength={4000}
                        />
                        <div className="ar-note-actions">
                          <button type="button" className="ar-btn ar-btn-outline" onClick={() => setEditingId(null)}>
                            Annuler
                          </button>
                          <button type="button" className="ar-btn ar-btn-primary" onClick={() => saveNote(item._id)}>
                            Enregistrer
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="ar-note-display">
                        <p>{item.adminNote ? item.adminNote : <span className="muted">Aucune note</span>}</p>
                        <button
                          type="button"
                          className="ar-btn ar-btn-outline"
                          onClick={() => {
                            setEditingId(item._id);
                            setAdminNoteDraft(item.adminNote || '');
                          }}
                        >
                          Modifier la note
                        </button>
                      </div>
                    )}
                  </div>

                  {item.processedAt && (
                    <div className="ar-line muted small">
                      Traitée le {new Date(item.processedAt).toLocaleString('fr-FR')}
                      {item.processedBy && ` par ${item.processedBy.email || item.processedBy.nom || ''}`}
                    </div>
                  )}
                </div>

                <div className="ar-card-actions">
                  <a className="ar-btn ar-btn-outline" href={`mailto:${item.email}?subject=${encodeURIComponent('Rapido - ' + (item.subject || (item.type === 'deletion' ? 'Votre demande de suppression de compte' : 'Votre demande au service Rapido')))}`}>
                    <FaEnvelope /> Répondre par email
                  </a>

                  {item.type === 'deletion' && !item.accountDeleted && (
                    <button type="button" className="ar-btn ar-btn-danger" onClick={() => processDeletion(item)}>
                      <FaUserSlash /> Supprimer le compte
                    </button>
                  )}

                  {item.status !== 'in_progress' && item.status !== 'resolved' && (
                    <button type="button" className="ar-btn ar-btn-outline" onClick={() => updateStatus(item._id, 'in_progress')}>
                      Marquer en cours
                    </button>
                  )}
                  {item.status !== 'resolved' && (
                    <button type="button" className="ar-btn ar-btn-success" onClick={() => updateStatus(item._id, 'resolved')}>
                      <FaCheck /> Résolue
                    </button>
                  )}
                  {item.status !== 'rejected' && (
                    <button type="button" className="ar-btn ar-btn-outline" onClick={() => updateStatus(item._id, 'rejected')}>
                      <FaTimes /> Rejeter
                    </button>
                  )}

                  <button type="button" className="ar-btn ar-btn-outline" onClick={() => removeRequest(item)}>
                    <FaTrash /> Retirer du registre
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AccountRequestsDashboard;
