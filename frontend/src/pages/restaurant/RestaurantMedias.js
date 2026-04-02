import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import PageLoader from '../../components/PageLoader';
import './RestaurantMedias.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const RestaurantMedias = () => {
  const { logout } = useContext(AuthContext);
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const fetchMedias = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/medias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMedias(res.data || []);
    } catch (e) {
      console.error(e);
      setMedias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedias();
  }, []);

  const uploadFileList = async (files) => {
    const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
    const list = files
      ? Array.from(files).filter((f) => {
          const mimeOk = f.type && f.type.startsWith('image/');
          const lowerName = String(f.name || '').toLowerCase();
          const extOk = allowedExt.some((ext) => lowerName.endsWith(ext));
          return mimeOk || extOk;
        })
      : [];
    if (!list.length) return;
    const token = localStorage.getItem('token');
    setUploading(true);
    try {
      const fd = new FormData();
      list.forEach((f) => fd.append('files', f));
      await axios.post(`${API_URL}/medias`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchMedias();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de l’import dans la galerie');
    } finally {
      setUploading(false);
    }
  };

  const openFilePicker = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleInputChange = async (e) => {
    const { files } = e.target;
    if (files?.length) await uploadFileList(files);
    e.target.value = '';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading) return;
    const { files } = e.dataTransfer;
    if (files?.length) await uploadFileList(files);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Retirer cette image de la galerie ?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/medias/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchMedias();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  return (
    <div className="dashboard-page medias-page">
      <DashboardSidebar onLogout={logout} />
      <div className="dashboard-main">
        <div className="medias-content">
          <header className="medias-header">
            <div>
              <h1>Galerie d’images</h1>
              <p className="medias-intro">
                <strong>Une seule galerie pour votre compte</strong> : importez vos photos ici. Elles sont disponibles pour{' '}
                <strong>toutes vos entreprises</strong> et tous les écrans (produits, logo, bannières, vitrine…). Aucun choix
                d’entreprise n’est nécessaire.
              </p>
            </div>
          </header>

          <h2 className="medias-section-title">Importer dans la galerie</h2>
          <p className="medias-section-sub">
            Glissez-déposez des images ou utilisez le bouton. Elles sont enregistrées sur votre compte.
          </p>

          <div
            className={`medias-drop-zone ${dragActive ? 'medias-drop-zone-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.avif"
              multiple
              id="medias-batch-upload"
              className="medias-file-input-visually-hidden"
              onChange={handleInputChange}
              disabled={uploading}
              aria-label="Importer des images dans la galerie"
            />
            <div className="medias-drop-inner">
              <span className="medias-drop-icon" aria-hidden="true">🖼️</span>
              <p className="medias-drop-text">
                {uploading
                  ? 'Import en cours…'
                  : 'Déposez vos images dans cette zone ou utilisez le bouton.'}
              </p>
              <button
                type="button"
                className="medias-upload-button"
                onClick={openFilePicker}
                disabled={uploading}
              >
                Importer depuis l’appareil
              </button>
            </div>
          </div>

          <h2 className="medias-section-title medias-library-title">Votre bibliothèque</h2>

          {loading ? (
            <PageLoader message="Chargement de la galerie…" />
          ) : medias.length === 0 ? (
            <p className="medias-empty">Aucune image pour l’instant. Importez-en avec la zone ci-dessus.</p>
          ) : (
            <div className="medias-grid">
              {medias.map((m) => (
                <div key={m._id} className="medias-card">
                  <div className="medias-thumb-wrap">
                    <img
                      src={String(m.path).startsWith('http') ? m.path : `${BASE_URL}${m.path}`}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                  <p className="medias-filename" title={m.originalName || m.filename}>
                    {m.originalName || m.filename}
                  </p>
                  <code className="medias-path">{m.path}</code>
                  <button type="button" className="btn btn-outline btn-small" onClick={() => handleDelete(m._id)}>
                    Retirer de la galerie
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantMedias;
