import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import PageLoader from '../../components/PageLoader';
import MediaPickerModal from '../../components/MediaPickerModal';
import { getImageUrl } from '../../utils/imagePlaceholder';
import './RestaurantPlats.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');
const STORAGE_CURRENT_RESTAURANT = 'dashboardCurrentRestaurantId';

const RestaurantPlats = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurantId, setCurrentRestaurantIdState] = useState('');
  const [produits, setProduits] = useState([]);
  const [categoriesProduit, setCategoriesProduit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduit, setEditingProduit] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    nomEn: '',
    nomAfficheAccueil: '',
    nomAfficheAccueilEn: '',
    description: '',
    descriptionEn: '',
    prix: '',
    categorieProduitId: '',
    disponible: true,
  });
  const [imagePreview, setImagePreview] = useState(null);
  /** Image galerie produit (chemin /uploads/...) */
  const [galleryImagePath, setGalleryImagePath] = useState(null);
  /** Chemins serveur issus de la médiathèque (ou existants) */
  const [cartePath, setCartePath] = useState(null);
  const [previewCarteHome, setPreviewCarteHome] = useState(null);
  const [bannierePath, setBannierePath] = useState(null);
  const [previewBanniere, setPreviewBanniere] = useState(null);
  const [pickerField, setPickerField] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    axios.get(`${API_URL}/restaurants/my/restaurants`, config).then((res) => {
      const list = res.data || [];
      setRestaurants(list);
      const stored = localStorage.getItem(STORAGE_CURRENT_RESTAURANT);
      const id = stored && list.some((r) => r._id === stored) ? stored : list[0]?._id || '';
      setCurrentRestaurantIdState(id);
      if (id) localStorage.setItem(STORAGE_CURRENT_RESTAURANT, id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentRestaurantId) {
      setProduits([]);
      setCategoriesProduit([]);
      setLoading(false);
      return;
    }
    fetchData();
  }, [currentRestaurantId]);

  const fetchData = async () => {
    if (!currentRestaurantId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/produits/dashboard/${currentRestaurantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/categories-produit?restaurantId=${currentRestaurantId}`),
      ]);
      setProduits(prodRes.data || []);
      setCategoriesProduit(catRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentRestaurantId = (id) => {
    setCurrentRestaurantIdState(id || '');
    if (id) localStorage.setItem(STORAGE_CURRENT_RESTAURANT, id);
  };

  const resetMediaPreviews = () => {
    setImagePreview(null);
    setGalleryImagePath(null);
    setCartePath(null);
    setPreviewCarteHome(null);
    setBannierePath(null);
    setPreviewBanniere(null);
    setPickerField(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentRestaurantId) {
      alert('Sélectionnez une entreprise.');
      return;
    }
    const wasEditing = !!editingProduit;
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      data.append('nom', formData.nom.trim());
      data.append('nomEn', (formData.nomEn || '').trim());
      data.append('nomAfficheAccueil', (formData.nomAfficheAccueil || '').trim());
      data.append('nomAfficheAccueilEn', (formData.nomAfficheAccueilEn || '').trim());
      data.append('description', (formData.description || '').trim());
      data.append('descriptionEn', (formData.descriptionEn || '').trim());
      data.append('prix', String(formData.prix));
      if (formData.categorieProduitId) data.append('categorieProduitId', formData.categorieProduitId);
      data.append('disponible', formData.disponible);
      data.append('restaurantId', currentRestaurantId);
      if (galleryImagePath) data.append('galleryImagePath', galleryImagePath);
      if (editingProduit) {
        data.append('imageCarteHome', cartePath || '');
        data.append('banniereProduit', bannierePath || '');
      } else {
        if (cartePath) data.append('imageCarteHome', cartePath);
        if (bannierePath) data.append('banniereProduit', bannierePath);
      }
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingProduit) {
        await axios.put(`${API_URL}/produits/${editingProduit._id}`, data, config);
      } else {
        await axios.post(`${API_URL}/produits`, data, config);
      }
      setShowForm(false);
      setEditingProduit(null);
      setFormData({
        nom: '',
        nomEn: '',
        nomAfficheAccueil: '',
        nomAfficheAccueilEn: '',
        description: '',
        descriptionEn: '',
        prix: '',
        categorieProduitId: '',
        disponible: true,
      });
      resetMediaPreviews();
      await fetchData();
      alert(wasEditing ? 'Produit modifié.' : 'Produit créé.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleEdit = (p) => {
    setEditingProduit(p);
    setFormData({
      nom: p.nom,
      nomEn: p.nomEn || '',
      nomAfficheAccueil: p.nomAfficheAccueil || '',
      nomAfficheAccueilEn: p.nomAfficheAccueilEn || '',
      description: p.description || '',
      descriptionEn: p.descriptionEn || '',
      prix: p.prix,
      categorieProduitId: (p.categorieProduit && p.categorieProduit._id) || '',
      disponible: p.disponible !== false,
    });
    const firstImg = (p.images && p.images[0]) ? (String(p.images[0]).startsWith('http') ? p.images[0] : `${BASE_URL}${p.images[0]}`) : null;
    setImagePreview(firstImg);
    setGalleryImagePath(null);
    setCartePath(p.imageCarteHome || null);
    setPreviewCarteHome(p.imageCarteHome ? (String(p.imageCarteHome).startsWith('http') ? p.imageCarteHome : `${BASE_URL}${p.imageCarteHome}`) : null);
    setBannierePath(p.banniereProduit || null);
    setPreviewBanniere(p.banniereProduit ? (String(p.banniereProduit).startsWith('http') ? p.banniereProduit : `${BASE_URL}${p.banniereProduit}`) : null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/produits/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchData();
      alert('Produit supprimé.');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const onMediaPicked = (path) => {
    if (pickerField === 'carte') {
      setCartePath(path);
      setPreviewCarteHome(String(path).startsWith('http') ? path : `${BASE_URL}${path}`);
    } else if (pickerField === 'banniere') {
      setBannierePath(path);
      setPreviewBanniere(String(path).startsWith('http') ? path : `${BASE_URL}${path}`);
    } else if (pickerField === 'galerie') {
      setGalleryImagePath(path);
      setImagePreview(String(path).startsWith('http') ? path : `${BASE_URL}${path}`);
    }
    setPickerField(null);
  };

  if (loading) return <PageLoader message="Chargement des produits..." />;

  return (
    <div className="dashboard-page">
      <DashboardSidebar onLogout={logout} />
      <div className="dashboard-main">
        <div className="plats-content">
          <div className="plats-header">
            <div>
              <h1>Gestion des produits</h1>
              <p className="plats-subhint">
                Toutes les images viennent de la <strong>Galerie d’images</strong> (menu) : importez-y vos photos une fois, puis choisissez-les ici.
                La page <strong>Vitrine accueil</strong> permet aussi de régler les visuels par produit.
              </p>
            </div>
            {restaurants.length > 1 && (
              <div className="form-group" style={{ marginTop: '8px', marginBottom: '12px', maxWidth: '320px' }}>
                <label>Entreprise</label>
                <select
                  value={currentRestaurantId || ''}
                  onChange={(e) => setCurrentRestaurantId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }}
                >
                  <option value="">— Choisir —</option>
                  {restaurants.map((r) => (
                    <option key={r._id} value={r._id}>{r.nom}</option>
                  ))}
                </select>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => {
              setShowForm(true);
              setEditingProduit(null);
              setFormData({
                nom: '',
                nomEn: '',
                nomAfficheAccueil: '',
                nomAfficheAccueilEn: '',
                description: '',
                descriptionEn: '',
                prix: '',
                categorieProduitId: '',
                disponible: true,
              });
              resetMediaPreviews();
            }} disabled={!currentRestaurantId}>
              + Ajouter un produit
            </button>
          </div>

          {showForm && (
            <div className="plat-form-modal">
              <div className="modal-content modal-content-produit-form">
                <h2>{editingProduit ? 'Modifier le produit' : 'Nouveau produit'}</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>{t('i18n', 'productNameEn')}</label>
                    <span className="label-hint">{t('i18n', 'nameEnHint')}</span>
                    <input
                      type="text"
                      value={formData.nomEn}
                      onChange={(e) => setFormData({ ...formData, nomEn: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Nom affiché sur l’accueil (optionnel)
                      <span className="label-hint">Si vide, le nom du produit est utilisé sur les cartes d’accueil.</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nomAfficheAccueil}
                      onChange={(e) => setFormData({ ...formData, nomAfficheAccueil: e.target.value })}
                      placeholder="Ex. Menu du jour"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('i18n', 'homeCardNameEn')}</label>
                    <span className="label-hint">{t('i18n', 'nameEnHint')}</span>
                    <input
                      type="text"
                      value={formData.nomAfficheAccueilEn}
                      onChange={(e) => setFormData({ ...formData, nomAfficheAccueilEn: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="3" />
                  </div>
                  <div className="form-group">
                    <label>{t('i18n', 'productDescEn')}</label>
                    <span className="label-hint">{t('i18n', 'nameEnHint')}</span>
                    <textarea value={formData.descriptionEn} onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })} rows="2" />
                  </div>
                  <div className="form-group">
                    <label>Prix (FCFA) *</label>
                    <input type="number" min="0" step="1" value={formData.prix} onChange={(e) => setFormData({ ...formData, prix: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Catégorie produit</label>
                    <select value={formData.categorieProduitId || ''} onChange={(e) => setFormData({ ...formData, categorieProduitId: e.target.value })}>
                      <option value="">— Aucune —</option>
                      {categoriesProduit.map((c) => (
                        <option key={c._id} value={c._id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      Image galerie (fiche produit, panier)
                      <span className="label-hint">Uniquement depuis votre galerie d’images.</span>
                    </label>
                    <div className="file-upload-container" style={{ minHeight: 100 }}>
                      {imagePreview ? (
                        <div className="file-upload-label" style={{ cursor: 'default' }}>
                          <img src={imagePreview} alt="Aperçu galerie" className="image-preview" />
                        </div>
                      ) : (
                        <div className="file-upload-placeholder">
                          <span>📷</span>
                          <span>Choisir une image dans la galerie</span>
                        </div>
                      )}
                    </div>
                    <div className="produit-visuel-actions" style={{ marginTop: 8 }}>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => setPickerField('galerie')}>
                        Ouvrir la galerie
                      </button>
                      <button type="button" className="btn btn-outline btn-small" onClick={() => navigate('/dashboard/medias')}>
                        Importer des images
                      </button>
                      {(imagePreview || galleryImagePath) && (
                        <button
                          type="button"
                          className="btn btn-outline btn-small"
                          onClick={() => {
                            setGalleryImagePath(null);
                            setImagePreview(null);
                          }}
                        >
                          Retirer l’image galerie
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="produit-media-uploads">
                    <div className="form-group produit-visuel-block">
                      <label>
                        Photo carte — page d’accueil
                        <span className="label-hint">Image choisie dans la galerie.</span>
                      </label>
                      {previewCarteHome && <img src={previewCarteHome} alt="" className="produit-visuel-preview" />}
                      <div className="produit-visuel-actions">
                        <button type="button" className="btn btn-secondary btn-small" onClick={() => setPickerField('carte')}>
                          Ouvrir la galerie
                        </button>
                        <button type="button" className="btn btn-outline btn-small" onClick={() => navigate('/dashboard/medias')}>
                          Importer des images
                        </button>
                        {cartePath && (
                          <button type="button" className="btn btn-outline btn-small" onClick={() => { setCartePath(null); setPreviewCarteHome(null); }}>
                            Retirer
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="form-group produit-visuel-block">
                      <label>
                        Bannière — clic sur le produit
                        <span className="label-hint">Grande image au zoom / ouverture.</span>
                      </label>
                      {previewBanniere && <img src={previewBanniere} alt="" className="produit-visuel-preview" />}
                      <div className="produit-visuel-actions">
                        <button type="button" className="btn btn-secondary btn-small" onClick={() => setPickerField('banniere')}>
                          Ouvrir la galerie
                        </button>
                        <button type="button" className="btn btn-outline btn-small" onClick={() => navigate('/dashboard/medias')}>
                          Importer des images
                        </button>
                        {bannierePath && (
                          <button type="button" className="btn btn-outline btn-small" onClick={() => { setBannierePath(null); setPreviewBanniere(null); }}>
                            Retirer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" checked={formData.disponible} onChange={(e) => setFormData({ ...formData, disponible: e.target.checked })} />
                      Disponible
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditingProduit(null); resetMediaPreviews(); }}>Annuler</button>
                    <button type="submit" className="btn btn-primary">{editingProduit ? 'Modifier' : 'Créer'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <MediaPickerModal
            open={!!pickerField}
            onClose={() => setPickerField(null)}
            onSelect={onMediaPicked}
            title={
              pickerField === 'banniere'
                ? 'Bannière au clic'
                : pickerField === 'galerie'
                  ? 'Image galerie produit'
                  : 'Photo carte — accueil'
            }
          />

          <div className="plats-grid">
            {produits.map((p) => {
              const imgSrc =
                (p.imageCarteHome &&
                  (String(p.imageCarteHome).startsWith('http') ? p.imageCarteHome : `${BASE_URL}${p.imageCarteHome}`)) ||
                (p.images && p.images[0] &&
                  (String(p.images[0]).startsWith('http') ? p.images[0] : `${BASE_URL}${p.images[0]}`)) ||
                getImageUrl(null, { nom: p.nom }, BASE_URL);
              return (
                <div key={p._id} className="plat-card-admin">
                  <img src={imgSrc} alt={p.nom} className="plat-image-admin" onError={(e) => { e.target.src = getImageUrl(null, { nom: p.nom }, BASE_URL); }} />
                  <div className="plat-info-admin">
                    <h3>{p.nom}</h3>
                    {p.nomAfficheAccueil && <p className="plat-nom-accueil">Accueil : {p.nomAfficheAccueil}</p>}
                    {p.description && <p>{p.description}</p>}
                    <div className="plat-details">
                      <span className="plat-prix-admin">{Number(p.prix).toFixed(0)} FCFA</span>
                      {p.categorieProduit && <span className="plat-categorie">{p.categorieProduit.nom}</span>}
                    </div>
                    <div className="plat-actions">
                      <button className="btn btn-secondary btn-small" onClick={() => handleEdit(p)}>Modifier</button>
                      <button className="btn btn-outline btn-small" onClick={() => handleDelete(p._id)}>Supprimer</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPlats;
