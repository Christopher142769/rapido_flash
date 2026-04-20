import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import LanguageContext from '../../context/LanguageContext';
import PageLoader from '../../components/PageLoader';
import { FaStar, FaRegStar } from 'react-icons/fa';
import './RestaurantAvis.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const STORAGE_CURRENT_RESTAURANT = 'dashboardCurrentRestaurantId';

function StarsRow({ note }) {
  const n = Math.min(5, Math.max(0, Math.round(Number(note) || 0)));
  return (
    <span className="avis-dash-stars">
      {[1, 2, 3, 4, 5].map((i) =>
        i <= n ? <FaStar key={i} className="avis-dash-star on" size={16} /> : <FaRegStar key={i} className="avis-dash-star" size={16} />
      )}
    </span>
  );
}

const RestaurantAvis = () => {
  const { t } = useContext(LanguageContext);
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurantId, setCurrentRestaurantIdState] = useState('');
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initDone, setInitDone] = useState(false);

  const fetchAvis = useCallback(async (rid) => {
    if (!rid) {
      setAvis([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/avis-produit/dashboard/${rid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvis(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setAvis([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get(`${API_URL}/restaurants/my/restaurants`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const list = res.data || [];
        setRestaurants(list);
        const stored = localStorage.getItem(STORAGE_CURRENT_RESTAURANT);
        const id = stored && list.some((r) => r._id === stored) ? stored : list[0]?._id || '';
        setCurrentRestaurantIdState(id);
        if (id) localStorage.setItem(STORAGE_CURRENT_RESTAURANT, id);
      })
      .catch(() => {})
      .finally(() => setInitDone(true));
  }, []);

  useEffect(() => {
    if (!initDone) return;
    fetchAvis(currentRestaurantId);
  }, [initDone, currentRestaurantId, fetchAvis]);

  const setCurrentRestaurantId = (id) => {
    setCurrentRestaurantIdState(id || '');
    if (id) localStorage.setItem(STORAGE_CURRENT_RESTAURANT, id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('reviews', 'deleteConfirm'))) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/avis-produit/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchAvis(currentRestaurantId);
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur');
    }
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return '—';
    }
  };

  if (!initDone) {
    return <PageLoader message="Chargement…" />;
  }

  return (
      <div className="dashboard-main">
        <div className="avis-dash-page">
          <header className="avis-dash-header">
            <h1>{t('reviews', 'dashboardTitle')}</h1>
            {restaurants.length > 1 && (
              <select
                className="avis-dash-select"
                value={currentRestaurantId || ''}
                onChange={(e) => setCurrentRestaurantId(e.target.value)}
              >
                <option value="">—</option>
                {restaurants.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.nom}
                  </option>
                ))}
              </select>
            )}
          </header>

          {loading ? (
            <PageLoader message={t('reviews', 'loading')} />
          ) : avis.length === 0 ? (
            <p className="avis-dash-empty">{t('reviews', 'noReviewsDashboard')}</p>
          ) : (
            <div className="avis-dash-table-wrap">
              <table className="avis-dash-table">
                <thead>
                  <tr>
                    <th>{t('reviews', 'colDate')}</th>
                    <th>{t('reviews', 'colProduct')}</th>
                    <th>{t('reviews', 'colClient')}</th>
                    <th>{t('reviews', 'colNote')}</th>
                    <th>{t('reviews', 'colComment')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {avis.map((a) => (
                    <tr key={a._id}>
                      <td className="avis-dash-cell-muted">{formatDate(a.createdAt)}</td>
                      <td>{a.produit?.nom || '—'}</td>
                      <td>
                        <div>{a.client?.nom || '—'}</div>
                        {a.client?.email ? <div className="avis-dash-cell-muted">{a.client.email}</div> : null}
                      </td>
                      <td>
                        <StarsRow note={a.note} />
                      </td>
                      <td className="avis-dash-comment">{a.commentaire || '—'}</td>
                      <td>
                        <button type="button" className="avis-dash-delete" onClick={() => handleDelete(a._id)}>
                          {t('reviews', 'delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  );
};

export default RestaurantAvis;
