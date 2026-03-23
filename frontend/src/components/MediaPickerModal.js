import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './MediaPickerModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

/**
 * Sélection d’une image de la galerie du compte connecté.
 * onSelect(path) reçoit le chemin relatif ex. /uploads/medias/xxx.jpg
 */
const MediaPickerModal = ({ open, onClose, onSelect, title }) => {
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem('token');
    setLoading(true);
    axios
      .get(`${API_URL}/medias`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setMedias(r.data || []))
      .catch(() => setMedias([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="media-picker-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Galerie d’images'}
      onClick={onClose}
    >
      <div className="media-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="media-picker-head">
          <h3>{title || 'Choisir dans la galerie'}</h3>
          <button type="button" className="media-picker-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <p className="media-picker-hint">
          Galerie <strong>générale</strong> de votre compte. Ajoutez des images dans le menu <strong>Galerie d’images</strong>, puis
          sélectionnez-les ici.
        </p>
        {loading ? (
          <p className="media-picker-loading">Chargement…</p>
        ) : medias.length === 0 ? (
          <p className="media-picker-empty">Aucune image dans votre galerie. Ouvrez « Galerie d’images » pour en importer.</p>
        ) : (
          <div className="media-picker-grid">
            {medias.map((m) => (
              <button
                key={m._id}
                type="button"
                className="media-picker-tile"
                onClick={() => {
                  onSelect(m.path);
                  onClose();
                }}
              >
                <img
                  src={String(m.path).startsWith('http') ? m.path : `${BASE_URL}${m.path}`}
                  alt=""
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPickerModal;
