import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import SteppedCustomForm from '../../components/forms/SteppedCustomForm';
import { BASSINS_FORM_SLUG } from '../../data/bassinsFunnel';
import './RapidoFormTheme.css';
import './BassinsFormTheme.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const LOGO_SRC = '/recrutement/logo.png';

function isBassinsForm(slug) {
  return String(slug || '').toLowerCase().includes('bassin');
}

function FormShell({ children, minimal, bassins }) {
  const rootClass = [
    'rform-root',
    minimal ? 'rform-root--stepped' : '',
    bassins ? 'rform-root--bassins' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      <header className="rform-header">
        <nav className="rform-nav">
          <Link to={bassins ? '/bassins' : '/home'} className="rform-logo">
            <img src={LOGO_SRC} alt="RAPIDO Livraison Express" width="512" height="512" />
            <small>{bassins ? 'Bassins Rapido' : 'Formulaire'}</small>
          </Link>
        </nav>
      </header>
      {children}
      <footer className="rform-footer">
        <div className="rform-wrap">
          <Link to="/home" className="rform-logo">
            <img src={LOGO_SRC} alt="RAPIDO" width="512" height="512" />
          </Link>
          <p>
            {bassins
              ? 'Plateforme e-commerce et marketplace · Cotonou, Bénin · Rapido Flash'
              : 'Plateforme e-commerce &amp; marketplace · Cotonou, Bénin — Rapido Flash'}
          </p>
        </div>
      </footer>
    </div>
  );
}

function ThanksInline({ title, message }) {
  return (
    <section className="rform-hero rform-thanks">
      <div className="rform-hero-glow" />
      <div className="rform-hero-glow two" />
      <div className="rform-wrap">
        <svg className="rform-seal" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="ring" cx="60" cy="60" r="38" />
          <path className="check" d="M 44,61 L 55,72 L 78,49" />
        </svg>
        <span className="rform-eyebrow">Réponse enregistrée</span>
        <h1>
          Merci. Votre réponse est entre <span className="serif-i">nos mains</span>.
        </h1>
        <p className="rform-lead">
          {message ||
            (title ? (
              <>
                Votre formulaire <strong>{title}</strong> a bien été transmis. Notre équipe le traitera dans les
                meilleurs délais.
              </>
            ) : (
              <>Votre formulaire a bien été transmis. Notre équipe le traitera dans les meilleurs délais.</>
            ))}
        </p>
      </div>
    </section>
  );
}

export default function PublicCustomFormPage() {
  const { slug } = useParams();
  const bassins = isBassinsForm(slug) || slug === BASSINS_FORM_SLUG;
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [thanksMessage, setThanksMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/custom-forms/public/${encodeURIComponent(slug)}`);
      setForm(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Formulaire introuvable');
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <FormShell minimal bassins={bassins}>
        <div className="rform-wrap rform-stepped-loading">
          <p className="rform-lead">Chargement du formulaire…</p>
        </div>
      </FormShell>
    );
  }

  if (error && !form) {
    return (
      <FormShell bassins={bassins}>
        <div className="rform-wrap" style={{ padding: '80px 0' }}>
          <p className="rform-error">{error}</p>
        </div>
      </FormShell>
    );
  }

  if (done) {
    return (
      <FormShell bassins={bassins}>
        <ThanksInline title={form?.title} message={thanksMessage} />
      </FormShell>
    );
  }

  return (
    <FormShell minimal bassins={bassins}>
      <SteppedCustomForm
        form={form}
        slug={slug}
        trackingCategory={bassins ? 'Bassins' : 'Recrutement'}
        onDone={({ confirmationMessage }) => {
          if (confirmationMessage) setThanksMessage(confirmationMessage);
          setDone(true);
        }}
      />
    </FormShell>
  );
}
