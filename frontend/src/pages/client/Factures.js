import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LanguageContext from '../../context/LanguageContext';
import TopNavbar from '../../components/TopNavbar';
import BottomNavbar from '../../components/BottomNavbar';
import PageLoader from '../../components/PageLoader';
import { FaFileInvoice, FaChevronRight, FaDownload } from 'react-icons/fa';
import './Factures.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const isReceiptEligible = (commande) => {
  const mode = String(commande?.modePaiement || '');
  if (mode === 'momo_avant') return !!commande?.paiementEnLigneEffectue;
  if (mode === 'especes' || mode === 'momo_apres') return String(commande?.statut || '') === 'livree';
  return false;
};

const Factures = () => {
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get(`${API_URL}/commandes/my-commandes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then((res) => {
        const list = (res.data || []).filter((c) => isReceiptEligible(c));
        setCommandes(list);
      })
      .catch(() => setCommandes([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageLoader message={t('invoices', 'title')} />;
  }

  return (
    <div className="factures-page">
      <TopNavbar />
      <div className="factures-header">
        <h1>{t('invoices', 'title')}</h1>
        <p className="factures-subtitle">{t('invoices', 'subtitle')}</p>
      </div>

      <div className="factures-list">
        {commandes.length === 0 ? (
          <p className="factures-empty">{t('invoices', 'empty')}</p>
        ) : (
          commandes.map((c) => {
            const expired = c.receiptExpiresAt && new Date(c.receiptExpiresAt) < new Date();
            return (
              <div
                key={c._id}
                role="button"
                tabIndex={0}
                className={`factures-card ${expired ? 'factures-card-expired' : ''}`}
                onClick={() => navigate(`/facture/${c._id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/facture/${c._id}`);
                  }
                }}
              >
                <span className="factures-card-icon" aria-hidden>
                  <FaFileInvoice size={24} />
                </span>
                <span className="factures-card-body">
                  <span className="factures-card-title">{c.restaurant?.nom || '—'}</span>
                  <span className="factures-card-meta">
                    {new Date(c.createdAt).toLocaleString('fr-FR')} · {Number(c.total).toFixed(0)} FCFA
                  </span>
                  {expired && <span className="factures-badge-expired">{t('invoices', 'expired')}</span>}
                </span>
                <button
                  type="button"
                  className="factures-card-download"
                  title={t('invoices', 'downloadReceipt')}
                  aria-label={t('invoices', 'downloadReceipt')}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/facture/${c._id}`, { state: { autoDownload: true } });
                  }}
                >
                  <FaDownload size={18} aria-hidden />
                </button>
                <FaChevronRight className="factures-card-arrow" aria-hidden />
              </div>
            );
          })
        )}
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Factures;
