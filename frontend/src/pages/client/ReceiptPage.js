import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import LanguageContext from '../../context/LanguageContext';
import { useModal } from '../../context/ModalContext';
import TopNavbar from '../../components/TopNavbar';
import BottomNavbar from '../../components/BottomNavbar';
import PageLoader from '../../components/PageLoader';
import { exportElementToPdf } from '../../utils/receiptPdf';
import './ReceiptPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const ReceiptPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useContext(LanguageContext);
  const { showError } = useModal();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const autoDownloadDone = useRef(false);

  useEffect(() => {
    autoDownloadDone.current = false;
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get(`${API_URL}/commandes/${id}/receipt`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const downloadPdf = useCallback(async () => {
    const el = document.getElementById('receipt-print-area');
    if (!el) return;
    setPdfBusy(true);
    try {
      await exportElementToPdf(el, `recu-rapido-${id}.pdf`);
    } catch (e) {
      console.error(e);
      showError(t('receipt', 'pdfError'), t('common', 'error'));
    } finally {
      setPdfBusy(false);
    }
  }, [id, t, showError]);

  const autoDownloadFlag = Boolean(location.state?.autoDownload);

  useEffect(() => {
    if (!data || !autoDownloadFlag || autoDownloadDone.current) return;
    const timer = setTimeout(() => {
      const el = document.getElementById('receipt-print-area');
      if (!el) return;
      autoDownloadDone.current = true;
      downloadPdf().finally(() => {
        navigate(location.pathname, { replace: true, state: {} });
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [data, autoDownloadFlag, downloadPdf, navigate, location.pathname]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <PageLoader message={t('receipt', 'title')} />;
  }

  if (error || !data) {
    return (
      <div className="receipt-page-error">
        <TopNavbar />
        <p>{error || 'Erreur'}</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/factures')}>
          {t('invoices', 'title')}
        </button>
        <BottomNavbar />
      </div>
    );
  }

  const { commande, expired, qrPayload, clientNom } = data;
  const r = commande.restaurant;
  const dateStr = new Date(commande.createdAt).toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <div className="receipt-page">
      <TopNavbar />
      <div className="receipt-actions no-print">
        <button
          type="button"
          className="receipt-btn-pdf"
          onClick={downloadPdf}
          disabled={pdfBusy}
        >
          {pdfBusy ? '…' : t('receipt', 'download')}
        </button>
        <button type="button" className="receipt-btn-print" onClick={handlePrint}>
          {t('receipt', 'print')}
        </button>
        <button type="button" className="receipt-btn-back" onClick={() => navigate('/factures')}>
          ← {t('invoices', 'title')}
        </button>
      </div>

      <div className={`receipt-sheet ${expired ? 'receipt-sheet-expired' : ''}`} id="receipt-print-area">
        <div className="receipt-logos">
          <div className="receipt-logo-wrap">
            {r?.logo && (
              <img
                src={String(r.logo).startsWith('http') ? r.logo : `${BASE_URL}${r.logo}`}
                alt=""
                className="receipt-logo-structure"
              />
            )}
            <span className="receipt-logo-label">{r?.nom}</span>
          </div>
          <div className="receipt-logo-wrap rapido">
            <img src="/images/logo.png" alt="Rapido" className="receipt-logo-rapido" onError={(e) => { e.target.style.display = 'none'; }} />
            <span className="receipt-logo-label">Rapido Flash</span>
          </div>
        </div>

        <h1 className="receipt-title">{t('receipt', 'title')}</h1>
        {expired && <p className="receipt-expired-banner">{t('receipt', 'expiredMessage')}</p>}

        <dl className="receipt-dl">
          <dt>{t('receipt', 'orderRef')}</dt>
          <dd>{String(commande._id)}</dd>
          <dt>{t('receipt', 'date')}</dt>
          <dd>{dateStr}</dd>
          <dt>{t('receipt', 'client')}</dt>
          <dd>{clientNom}</dd>
          <dt>{t('receipt', 'structure')}</dt>
          <dd>{r?.nom}</dd>
          <dt>{t('receipt', 'amount')}</dt>
          <dd className="receipt-amount">{Number(commande.total).toFixed(0)} FCFA</dd>
        </dl>

        <p className="receipt-paid-line">{t('receipt', 'paidOnline')}</p>

        {qrPayload && !expired && (
          <div className="receipt-qr-block">
            <QRCodeSVG value={qrPayload} size={140} level="M" includeMargin />
            <p className="receipt-qr-hint">Scan : montant &amp; référence</p>
          </div>
        )}
        {expired && (
          <p className="receipt-qr-disabled">QR désactivé — reçu expiré</p>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
};

export default ReceiptPage;
