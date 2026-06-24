import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { submitChampionReview, fetchMissionReviewInfo } from '../../utils/championApi';
import './champion.css';

export default function ChampionReviewPage() {
  const { missionId } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ deliveryCode: '', rating: 5, comment: '', clientName: '' });

  useEffect(() => {
    fetchMissionReviewInfo(missionId)
      .then((data) => {
        setInfo(data);
        if (data.clientName) setForm((f) => ({ ...f, clientName: data.clientName }));
      })
      .catch((e) => setError(e.response?.data?.message || 'Course introuvable'))
      .finally(() => setLoading(false));
  }, [missionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await submitChampionReview({
        missionId,
        deliveryCode: form.deliveryCode,
        rating: form.rating,
        comment: form.comment,
        clientName: form.clientName,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="champion-shell champion-status-page">
        <p>Chargement…</p>
      </div>
    );
  }

  return (
    <div className="champion-shell champion-shell--centered">
      <div className="champion-topbar">
        <Link to="/champion" className="champion-brand">
          <img src="/images/logo.png" alt="" />
          Avis livreur
        </Link>
      </div>

      <div className="champion-card">
        {success ? (
          <div className="champion-status-page" style={{ padding: '20px 0' }}>
            <div className="champion-status-icon">⭐</div>
            <h2 style={{ marginTop: 0 }}>Merci pour votre avis !</h2>
            <p style={{ color: '#666' }}>Votre retour aide à améliorer le service Rapido Flash.</p>
          </div>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Noter votre livreur</h2>
            {info?.productSummary ? (
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Course : {info.productSummary}</p>
            ) : null}
            {info?.championName ? (
              <p>
                <strong>Livreur :</strong> {info.championName}
              </p>
            ) : null}

            {error ? <div className="champion-error">{error}</div> : null}

            {!info?.canReview ? (
              <p style={{ color: '#888' }}>
                Cette course n’est pas encore livrée ou n’est pas éligible à un avis.
              </p>
            ) : info?.alreadyReviewed ? (
              <p style={{ color: '#15803d' }}>Un avis a déjà été enregistré pour cette livraison.</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="champion-form-field">
                  <label>Code de livraison (4 chiffres reçu par email)</label>
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    value={form.deliveryCode}
                    onChange={(e) => setForm({ ...form, deliveryCode: e.target.value.replace(/\D/g, '') })}
                    required
                  />
                </div>
                <div className="champion-form-field">
                  <label>Note</label>
                  <div className="champion-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`champion-star${form.rating >= n ? ' is-on' : ''}`}
                        onClick={() => setForm({ ...form, rating: n })}
                        aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="champion-form-field">
                  <label>Commentaire (optionnel)</label>
                  <textarea
                    rows={3}
                    value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    maxLength={500}
                  />
                </div>
                <button type="submit" className="champion-btn champion-btn--primary" disabled={busy}>
                  Envoyer mon avis
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
