import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import { useModal } from '../../context/ModalContext';
import './Dashboard.css';
import './Gestionnaires.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Gestionnaires = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { showSuccess, showError } = useModal();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [gestionnaires, setGestionnaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [form, setForm] = useState({
    nom: '',
    email: '',
    password: '',
    telephone: ''
  });

  const isAdmin = user?.role === 'restaurant';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchRestaurants();
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (selectedRestaurantId) fetchGestionnaires(selectedRestaurantId);
    else setGestionnaires([]);
  }, [selectedRestaurantId]);

  const fetchRestaurants = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/restaurants/my/restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data || [];
      setRestaurants(list);
      if (list.length > 0 && !selectedRestaurantId) setSelectedRestaurantId(list[0]._id);
    } catch (err) {
      console.error(err);
      showError('Impossible de charger les entreprises.', 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const fetchGestionnaires = async (restaurantId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/restaurants/${restaurantId}/gestionnaires`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGestionnaires(res.data || []);
    } catch (err) {
      console.error(err);
      setGestionnaires([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRestaurantId || !form.nom || !form.email || !form.password) {
      showError('Remplissez nom, email et mot de passe.', 'Champs requis');
      return;
    }
    setSubmitting(true);
    setCredentials(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/restaurants/${selectedRestaurantId}/gestionnaires`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { credentials: cred } = res.data;
      setCredentials(cred || { email: form.email, password: form.password });
      setForm({ nom: '', email: '', password: '', telephone: '' });
      setShowForm(false);
      fetchGestionnaires(selectedRestaurantId);
      showSuccess('Gestionnaire créé. Transmettez-lui les identifiants de connexion.', 'Créé');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Erreur';
      showError(msg, 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRestaurant = restaurants.find((r) => r._id === selectedRestaurantId);

  return (
    <div className="dashboard-page">
      <DashboardSidebar onLogout={logout} />
      <main className="dashboard-main">
        <div className="dashboard-content">
          <header className="dashboard-block-header">
            <h1>Gestionnaires</h1>
            <p className="dashboard-block-desc">Attribuez un gestionnaire à une entreprise. Il aura accès au dashboard uniquement pour cette entreprise.</p>
          </header>

          {loading ? (
            <div className="dashboard-loading-block"><span className="spinner" /></div>
          ) : restaurants.length === 0 ? (
            <div className="dashboard-empty">Aucune entreprise. Créez d’abord une entreprise depuis le dashboard.</div>
          ) : (
            <>
              <div className="gestionnaires-toolbar">
                <label className="gestionnaires-select-label">
                  Entreprise
                  <select
                    value={selectedRestaurantId}
                    onChange={(e) => setSelectedRestaurantId(e.target.value)}
                    className="gestionnaires-select"
                  >
                    {restaurants.map((r) => (
                      <option key={r._id} value={r._id}>{r.nom}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { setShowForm(true); setCredentials(null); }}
                >
                  Attribuer un gestionnaire
                </button>
              </div>

              {credentials && (
                <div className="gestionnaires-credentials-block">
                  <h3>Identifiants à transmettre au gestionnaire</h3>
                  <div className="gestionnaires-credentials">
                    <p><strong>Email :</strong> <code>{credentials.email}</code></p>
                    <p><strong>Mot de passe :</strong> <code>{credentials.password}</code></p>
                  </div>
                  <p className="gestionnaires-credentials-hint">Le gestionnaire pourra se connecter avec ces identifiants et accéder au dashboard de l’entreprise attribuée.</p>
                </div>
              )}

              {showForm && selectedRestaurant && (
                <div className="dashboard-card gestionnaires-form-card">
                  <h2>Nouveau gestionnaire – {selectedRestaurant.nom}</h2>
                  <form onSubmit={handleSubmit} className="gestionnaires-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nom *</label>
                        <input
                          type="text"
                          value={form.nom}
                          onChange={(e) => setForm({ ...form, nom: e.target.value })}
                          required
                          placeholder="Nom du gestionnaire"
                        />
                      </div>
                      <div className="form-group">
                        <label>Email *</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          required
                          placeholder="email@exemple.com"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Mot de passe *</label>
                        <input
                          type="text"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          required
                          placeholder="Mot de passe de connexion"
                        />
                      </div>
                      <div className="form-group">
                        <label>Téléphone</label>
                        <input
                          type="tel"
                          value={form.telephone}
                          onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                          placeholder="+229 ..."
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)} disabled={submitting}>
                        Annuler
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? (
                          <>
                            <span className="btn-spinner" /> Création…
                          </>
                        ) : (
                          'Créer le gestionnaire'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="dashboard-card">
                <h2>Gestionnaires de {selectedRestaurant?.nom || 'cette entreprise'}</h2>
                {gestionnaires.length === 0 ? (
                  <p className="dashboard-empty-inline">Aucun gestionnaire pour le moment.</p>
                ) : (
                  <ul className="gestionnaires-list">
                    {gestionnaires.map((g) => (
                      <li key={g._id} className="gestionnaires-list-item">
                        <span className="gestionnaires-list-nom">{g.nom}</span>
                        <span className="gestionnaires-list-email">{g.email}</span>
                        {g.telephone && <span className="gestionnaires-list-tel">{g.telephone}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Gestionnaires;
