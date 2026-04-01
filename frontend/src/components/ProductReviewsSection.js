import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import axios from 'axios';
import { FaStar, FaRegStar } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import LanguageContext from '../context/LanguageContext';
import './ProductReviewsSection.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function StarsDisplay({ note, size = 18 }) {
  const n = Math.min(5, Math.max(0, Math.round(Number(note) || 0)));
  return (
    <span className="product-reviews-stars" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) =>
        i <= n ? (
          <FaStar key={i} className="product-reviews-star product-reviews-star--on" size={size} />
        ) : (
          <FaRegStar key={i} className="product-reviews-star product-reviews-star--off" size={size} />
        )
      )}
    </span>
  );
}

function StarsInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="product-reviews-stars-input" role="group" aria-label="Note">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={`product-reviews-star-btn ${active >= i ? 'on' : ''}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          {active >= i ? <FaStar size={26} /> : <FaRegStar size={26} />}
        </button>
      ))}
    </div>
  );
}

const ProductReviewsSection = ({ produitId, openDefault = false, onStatsChange }) => {
  const { user } = useContext(AuthContext);
  const { t, language } = useContext(LanguageContext);
  const onStatsRef = useRef(onStatsChange);
  onStatsRef.current = onStatsChange;
  const [open, setOpen] = useState(openDefault);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [avis, setAvis] = useState([]);
  const [stats, setStats] = useState({ moyenne: null, nombre: 0, repartition: {} });
  const [monAvis, setMonAvis] = useState(null);
  const [noteForm, setNoteForm] = useState(0);
  const [commentForm, setCommentForm] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!produitId) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/avis-produit/produit/${produitId}`);
      setAvis(data.avis || []);
      const s = data.stats || { moyenne: null, nombre: 0 };
      setStats(s);
      setMonAvis(data.monAvis ?? null);
      if (typeof onStatsRef.current === 'function') onStatsRef.current(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [produitId]);

  useEffect(() => {
    load();
  }, [load]);

  const isClient = user?.role === 'client';

  useEffect(() => {
    if (monAvis) {
      setNoteForm(monAvis.note);
      setCommentForm(monAvis.commentaire || '');
    } else {
      setNoteForm(0);
      setCommentForm('');
    }
  }, [monAvis, produitId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isClient) {
      setError(t('reviews', 'loginToReview'));
      return;
    }
    if (noteForm < 1 || noteForm > 5) {
      setError(t('reviews', 'pickStars'));
      return;
    }
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/avis-produit`,
        { produitId, note: noteForm, commentaire: commentForm },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await load();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('reviews', 'submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    try {
      return new Intl.DateTimeFormat(String(language || '').toLowerCase().startsWith('en') ? 'en' : 'fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(d));
    } catch {
      return String(d);
    }
  };

  return (
    <details className="pdp-nike-details product-reviews-details" open={open} onToggle={(e) => setOpen(e.target.open)}>
      <summary className="pdp-nike-details-summary">{t('reviews', 'sectionTitle')}</summary>
      <div className="pdp-nike-details-body product-reviews-body">
        {loading ? (
          <p className="product-reviews-loading">{t('reviews', 'loading')}</p>
        ) : (
          <>
            <div className="product-reviews-summary">
              {stats.nombre > 0 ? (
                <>
                  <div className="product-reviews-summary-score">
                    <span className="product-reviews-average">{stats.moyenne}</span>
                    <StarsDisplay note={Math.round(stats.moyenne)} size={22} />
                  </div>
                  <p className="product-reviews-count">
                    {stats.nombre} {t('reviews', 'reviewCount')}
                  </p>
                </>
              ) : (
                <p className="product-reviews-empty-top">{t('reviews', 'noReviewsYet')}</p>
              )}
            </div>

            {isClient ? (
              <form className="product-reviews-form" onSubmit={handleSubmit}>
                <p className="product-reviews-form-title">{t('reviews', 'yourReview')}</p>
                <StarsInput value={noteForm} onChange={setNoteForm} />
                <label className="product-reviews-label" htmlFor="review-comment">
                  {t('reviews', 'commentLabel')}
                </label>
                <textarea
                  id="review-comment"
                  className="product-reviews-textarea"
                  rows={4}
                  maxLength={2000}
                  value={commentForm}
                  onChange={(e) => setCommentForm(e.target.value)}
                  placeholder={t('reviews', 'commentPlaceholder')}
                />
                {error ? <p className="product-reviews-error">{error}</p> : null}
                <button type="submit" className="product-reviews-submit" disabled={submitting}>
                  {submitting ? t('reviews', 'sending') : t('reviews', 'publish')}
                </button>
              </form>
            ) : (
              <p className="product-reviews-login-hint">{t('reviews', 'loginToReview')}</p>
            )}

            <ul className="product-reviews-list">
              {avis.map((a) => (
                <li key={a._id} className="product-reviews-item">
                  <div className="product-reviews-item-head">
                    <StarsDisplay note={a.note} size={16} />
                    <span className="product-reviews-item-author">{a.auteur}</span>
                    <span className="product-reviews-item-date">{formatDate(a.createdAt)}</span>
                  </div>
                  {a.commentaire ? <p className="product-reviews-item-text">{a.commentaire}</p> : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  );
};

export { StarsDisplay };
export default ProductReviewsSection;
