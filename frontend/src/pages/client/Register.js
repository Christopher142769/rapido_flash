import React, { useState, useContext } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, loginWithGoogle, loginWithToken } = useContext(AuthContext);
  const rawNext = searchParams.get('next') || '';
  const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';
  const afterAuthPath = safeNext || '/home';

  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    password: '',
    confirmPassword: '',
    telephone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dashboard2FA, setDashboard2FA] = useState({ challengeToken: '', code: '', email: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    const result = await register({
      nom: formData.nom,
      email: formData.email,
      password: formData.password,
      telephone: formData.telephone
    });

    setLoading(false);

    if (result.success) {
      navigate(afterAuthPath);
    } else {
      setError(result.message);
    }
  };

  const handleGoogleCredential = async (credential) => {
    if (!credential) return;
    setError('');
    setLoading(true);
    const result = await loginWithGoogle(credential);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    if (result.requiresTwoFactor) {
      setDashboard2FA({
        challengeToken: result.challengeToken,
        code: '',
        email: result.user?.email || '',
      });
    }
  };

  const handleVerifyDashboard2FA = async (e) => {
    e.preventDefault();
    setError('');
    const code = String(dashboard2FA.code || '').replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setError('Veuillez entrer un code à 6 chiffres');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/verify-dashboard-2fa`, {
        challengeToken: dashboard2FA.challengeToken,
        code,
      });
      loginWithToken(res.data.token, res.data.user);
      navigate(afterAuthPath);
    } catch (err) {
      setError(err.response?.data?.message || 'Code invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <img src="/images/logo.png" alt="Rapido Logo" className="auth-logo-image" />
          <h1>Créer un compte</h1>
          <p>Rejoignez-nous pour commander vos plats préférés</p>
        </div>

        {!dashboard2FA.challengeToken ? (
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />
          <div className="auth-divider">ou</div>

          <div className="form-group">
            <label>Nom complet</label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              required
              placeholder="Votre nom"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="votre@email.com"
            />
          </div>

          <div className="form-group">
            <label>Téléphone</label>
            <input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Minimum 6 caractères"
                className="password-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirmer le mot de passe</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Répétez le mot de passe"
                className="password-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Inscription...' : 'S\'inscrire'}
          </button>
        </form>
        ) : (
          <form onSubmit={handleVerifyDashboard2FA} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            <div className="success-message">Un code de vérification a été envoyé par email.</div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={dashboard2FA.email} readOnly className="input-readonly" />
            </div>
            <div className="form-group">
              <label>Code de sécurité (6 chiffres)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={dashboard2FA.code}
                onChange={(e) => setDashboard2FA((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Vérification...' : 'Confirmer et se connecter'}
            </button>
            <button
              type="button"
              className="btn btn-secondary-auth"
              onClick={() => {
                setDashboard2FA({ challengeToken: '', code: '', email: '' });
                setError('');
              }}
            >
              Revenir à l'inscription
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>Vous avez déjà un compte ? <Link to={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : '/login'}>Se connecter</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
