import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './AccountDeletion.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || 'support@rapido.bj';

const AccountDeletion = () => {
  const { user, isAuthenticated } = useContext(AuthContext);

  const [choice, setChoice] = useState(null);

  const [form, setForm] = useState({
    nom: user?.nom || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
    subject: '',
    message: '',
    confirmDeletion: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const resetFlow = () => {
    setChoice(null);
    setSuccess('');
    setError('');
    setForm({
      nom: user?.nom || '',
      email: user?.email || '',
      telephone: user?.telephone || '',
      subject: '',
      message: '',
      confirmDeletion: false,
    });
  };

  const submit = async (type) => {
    setError('');
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError('Adresse email invalide.');
      return;
    }
    if (type === 'deletion' && !form.confirmDeletion) {
      setError('Veuillez confirmer que vous voulez supprimer votre compte.');
      return;
    }
    if (type === 'support' && !form.message.trim()) {
      setError('Veuillez écrire votre message.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/account-requests`, {
        type,
        email: form.email.trim(),
        nom: form.nom.trim(),
        telephone: form.telephone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSuccess(res.data?.message || 'Votre demande a bien été enregistrée.');
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'envoyer votre demande. Réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-deletion-page">
      <div className="account-deletion-container">
        <header className="account-deletion-header">
          <img src="/images/logo.png" alt="Rapido" className="account-deletion-logo" />
          <h1>Suppression de compte et contact</h1>
          <p className="lead">
            Choisissez ci-dessous l'action que vous souhaitez effectuer. Toutes les
            demandes sont reçues par notre équipe Rapido, qui les traite manuellement
            sous 7 jours et vous tient informé(e) par email.
          </p>
        </header>

        <section className="account-deletion-info">
          <h2>Ce qui sera supprimé sur demande</h2>
          <ul>
            <li>Votre profil (nom, email, téléphone, photo)</li>
            <li>Vos identifiants de connexion et préférences</li>
            <li>Votre adresse de livraison enregistrée</li>
          </ul>
          <h2>Ce qui peut être conservé</h2>
          <ul>
            <li>Enregistrements de commandes et factures, sous forme anonymisée, pour des raisons légales et comptables.</li>
            <li>Journaux techniques nécessaires à la sécurité, pour une durée limitée.</li>
          </ul>
        </section>

        {success ? (
          <div className="account-deletion-success">
            <h2>Demande envoyée</h2>
            <p>{success}</p>
            <button type="button" className="btn btn-outline" onClick={resetFlow}>
              Envoyer une autre demande
            </button>
            <Link to="/home" className="btn btn-primary">Retour à l'accueil</Link>
          </div>
        ) : !choice ? (
          <div className="account-deletion-choices">
            <button
              type="button"
              className="choice-card choice-danger"
              onClick={() => setChoice('deletion')}
            >
              <div className="choice-title">Supprimer mon compte</div>
              <div className="choice-desc">
                Demander la suppression définitive de mon compte Rapido et des données personnelles associées.
              </div>
            </button>

            <button
              type="button"
              className="choice-card choice-primary"
              onClick={() => setChoice('support')}
            >
              <div className="choice-title">Écrire au service Rapido</div>
              <div className="choice-desc">
                Poser une question, signaler un problème ou faire une autre demande à notre équipe.
              </div>
            </button>
          </div>
        ) : (
          <form
            className="account-deletion-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit(choice);
            }}
          >
            <h2>
              {choice === 'deletion' ? 'Demande de suppression de compte' : 'Message au service Rapido'}
            </h2>

            {error && <div className="error-message">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label>Nom complet</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => updateField('nom', e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
              <div className="form-group">
                <label>Téléphone (facultatif)</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => updateField('telephone', e.target.value)}
                  placeholder="+229 ..."
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email du compte *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="votre@email.com"
                required
                readOnly={isAuthenticated && !!user?.email}
              />
              {isAuthenticated && user?.email && (
                <p className="muted small">Vous êtes connecté(e). L'email du compte est utilisé automatiquement.</p>
              )}
            </div>

            {choice === 'support' && (
              <div className="form-group">
                <label>Sujet (facultatif)</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="Objet de votre message"
                />
              </div>
            )}

            <div className="form-group">
              <label>
                {choice === 'deletion'
                  ? 'Raison de la suppression (facultatif)'
                  : 'Votre message *'}
              </label>
              <textarea
                rows={5}
                value={form.message}
                onChange={(e) => updateField('message', e.target.value)}
                placeholder={
                  choice === 'deletion'
                    ? 'Vous pouvez nous expliquer brièvement pourquoi (non obligatoire).'
                    : 'Décrivez votre demande...'
                }
                required={choice === 'support'}
              />
            </div>

            {choice === 'deletion' && (
              <label className="confirm-deletion">
                <input
                  type="checkbox"
                  checked={form.confirmDeletion}
                  onChange={(e) => updateField('confirmDeletion', e.target.checked)}
                />
                <span>
                  Je confirme vouloir demander la suppression définitive de mon compte Rapido et des données associées.
                </span>
              </label>
            )}

            <div className="actions-row">
              <button type="button" className="btn btn-outline" onClick={resetFlow} disabled={loading}>
                Annuler
              </button>
              <button
                type="submit"
                className={`btn ${choice === 'deletion' ? 'btn-danger' : 'btn-primary'}`}
                disabled={loading}
              >
                {loading
                  ? 'Envoi...'
                  : choice === 'deletion'
                  ? 'Envoyer ma demande de suppression'
                  : 'Envoyer mon message'}
              </button>
            </div>
          </form>
        )}

        <footer className="account-deletion-footer">
          <p>
            Besoin d'aide directement ? Contactez-nous à <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
          <p>
            <Link to="/home">Retour à l'accueil</Link>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AccountDeletion;
