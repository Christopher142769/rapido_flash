import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithToken, user, isAuthenticated } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Mode "connexion par code" (type Yelo)
  const [codeMode, setCodeMode] = useState(false);
  const [codeStep, setCodeStep] = useState(1);
  const [codeEmail, setCodeEmail] = useState('');
  const [codeForm, setCodeForm] = useState({ code: '', newPassword: '' });
  const [codeSentMessage, setCodeSentMessage] = useState('');

  const rawNext = searchParams.get('next') || '';
  const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';
  const afterAuthPath = safeNext || '/home';

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'restaurant' || user.role === 'gestionnaire') {
        navigate('/dashboard');
      } else {
        navigate(afterAuthPath);
      }
    }
  }, [isAuthenticated, user, navigate, afterAuthPath]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);
    if (!result.success) setError(result.message);
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setCodeSentMessage('');
    const email = (codeEmail || formData.email).trim();
    if (!email) {
      setError('Indiquez votre email');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/send-login-code`, { email });
      setCodeEmail(email);
      setCodeStep(2);
      setCodeSentMessage('Code envoyé à votre boîte mail.');
      setCodeForm({ code: '', newPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible d\'envoyer le code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    const email = codeEmail.trim();
    if (!email || !codeForm.code.trim() || !codeForm.newPassword) {
      setError('Renseignez le code reçu et votre nouveau mot de passe');
      return;
    }
    if (codeForm.newPassword.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/verify-login-code`, {
        email,
        code: codeForm.code.trim(),
        newPassword: codeForm.newPassword
      });
      loginWithToken(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Code invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  const backToPasswordLogin = () => {
    setCodeMode(false);
    setCodeStep(1);
    setCodeEmail('');
    setCodeForm({ code: '', newPassword: '' });
    setCodeSentMessage('');
    setError('');
  };

  const backToCodeStep1 = () => {
    setCodeStep(1);
    setCodeSentMessage('');
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <img src="/images/logo.png" alt="Rapido Logo" className="auth-logo-image" />
          <h1>Connexion</h1>
          <p>Connectez-vous pour continuer</p>
        </div>

        {!codeMode ? (
          <>
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="error-message">{error}</div>}

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
                <label>Mot de passe</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Votre mot de passe"
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

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="auth-footer">
              <button
                type="button"
                className="auth-link-button"
                onClick={() => setCodeMode(true)}
              >
                Mot de passe oublié
              </button>
              <p>Vous n'avez pas de compte ? <Link to={safeNext ? `/register?next=${encodeURIComponent(safeNext)}` : '/register'}>S'inscrire</Link></p>
            </div>
          </>
        ) : (
          <>
            {codeStep === 1 ? (
              <form onSubmit={handleSendCode} className="auth-form">
                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={codeEmail || formData.email}
                    onChange={(e) => setCodeEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                  />
                </div>
                <p className="auth-code-hint">Un code à 6 chiffres sera envoyé à cette adresse. Vous pourrez ensuite définir un nouveau mot de passe et vous connecter.</p>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Envoi...' : 'Envoyer le code'}
                </button>
                <button type="button" className="btn btn-secondary-auth" onClick={backToPasswordLogin}>
                  Retour à la connexion par mot de passe
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="auth-form">
                {error && <div className="error-message">{error}</div>}
                {codeSentMessage && <div className="success-message">{codeSentMessage}</div>}
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={codeEmail} readOnly className="input-readonly" />
                </div>
                <div className="form-group">
                  <label>Code reçu par email</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={codeForm.code}
                    onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div className="form-group">
                  <label>Nouveau mot de passe (min. 6 caractères)</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre nouveau mot de passe"
                    value={codeForm.newPassword}
                    onChange={(e) => setCodeForm({ ...codeForm, newPassword: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Vérification...' : 'Valider et se connecter'}
                </button>
                <button type="button" className="btn btn-secondary-auth" onClick={backToCodeStep1}>
                  Changer d'email
                </button>
                <button type="button" className="btn btn-secondary-auth" onClick={backToPasswordLogin}>
                  Retour à la connexion par mot de passe
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
