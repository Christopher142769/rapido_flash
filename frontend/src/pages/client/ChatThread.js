import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import TopNavbar from '../../components/TopNavbar';
import BottomNavbar from '../../components/BottomNavbar';
import { FaArrowLeft, FaImage, FaPaperPlane, FaPhoneAlt } from 'react-icons/fa';
import { pickLocalized } from '../../utils/i18nContent';
import './ChatThread.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const ChatThread = () => {
  const { restaurantId } = useParams();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('produit');
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);

  const [locationAddress, setLocationAddress] = useState('');
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);
  const bottomRef = useRef(null);

  const scrollBottom = () => {
    window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const loadMessages = useCallback(
    async (conversationId) => {
      const res = await axios.get(`${API_URL}/conversations/${conversationId}/messages?limit=80`);
      setMessages(res.data || []);
      scrollBottom();
    },
    []
  );

  useEffect(() => {
    const updateLocationAddress = () => {
      const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
      setLocationAddress(
        userLocation.adresse ||
          `${userLocation.latitude?.toFixed(4) || '--'}, ${userLocation.longitude?.toFixed(4) || '--'}`
      );
    };
    updateLocationAddress();
    window.addEventListener('locationUpdated', updateLocationAddress);
    return () => window.removeEventListener('locationUpdated', updateLocationAddress);
  }, []);

  useEffect(() => {
    if (user?.role && user.role !== 'client') {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const openRes = await axios.post(`${API_URL}/conversations/open`, {
          restaurantId,
          productId: productId || undefined,
        });
        if (cancelled) return;
        setConv(openRes.data);
        await loadMessages(openRes.data._id);
        await axios.post(`${API_URL}/conversations/${openRes.data._id}/read`, { side: 'client' });
        const catRes = await axios.get(`${API_URL}/produits?restaurantId=${restaurantId}`);
        if (!cancelled) setCatalog(catRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, productId, loadMessages]);

  useEffect(() => {
    if (!conv?._id) return;
    pollRef.current = setInterval(() => {
      loadMessages(conv._id).catch(() => {});
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [conv?._id, loadMessages]);

  const sendProductLine = async (pid) => {
    if (!conv?._id || !pid) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('body', '');
      fd.append('productId', pid);
      const res = await axios.post(`${API_URL}/conversations/${conv._id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages((prev) => [...prev, res.data]);
      scrollBottom();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!conv?._id || sending) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('body', trimmed);
      const res = await axios.post(`${API_URL}/conversations/${conv._id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setText('');
      setMessages((prev) => [...prev, res.data]);
      scrollBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !conv?._id || sending) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('body', '');
      const res = await axios.post(`${API_URL}/conversations/${conv._id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages((prev) => [...prev, res.data]);
      scrollBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const tel = String(conv?.restaurant?.telephone || '').trim();
  const shopName = conv?.restaurant ? pickLocalized(language, conv.restaurant, 'nom') : '';

  const report = async (target) => {
    if (!conv?._id) return;
    const reason = window.prompt(t('chat', 'reason'));
    if (reason == null) return;
    try {
      await axios.post(`${API_URL}/conversations/${conv._id}/report`, { target, reason });
      alert(t('chat', 'submit'));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="chat-thread-page">
      <TopNavbar
        locationAddress={locationAddress}
        onLocationClick={() => navigate('/home')}
        searchTerm=""
        onSearchChange={() => {}}
        sectionLinks={[]}
      />
      <header className="chat-thread-header">
        <button type="button" className="chat-thread-back" onClick={() => navigate(-1)} aria-label="Back">
          <FaArrowLeft />
        </button>
        <div className="chat-thread-head-text">
          <h1 className="chat-thread-title">{shopName || t('chat', 'threadTitle')}</h1>
          {tel ? (
            <a href={`tel:${tel}`} className="chat-thread-call">
              <FaPhoneAlt size={14} /> {t('chat', 'call')}
            </a>
          ) : null}
        </div>
      </header>

      <div className="chat-thread-layout">
        <aside className="chat-thread-catalog" aria-label={t('chat', 'catalog')}>
          <h2 className="chat-thread-catalog-title">{t('chat', 'catalog')}</h2>
          <ul className="chat-thread-catalog-list">
            {catalog.map((p) => (
              <li key={p._id}>
                <button type="button" className="chat-thread-catalog-item" onClick={() => sendProductLine(p._id)} disabled={sending || loading}>
                  <span className="chat-thread-catalog-name">{pickLocalized(language, p, 'nom')}</span>
                  <span className="chat-thread-catalog-price">{Number(p.prix || 0).toFixed(0)} FCFA</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="chat-thread-main">
          {loading ? <p className="chat-thread-loading">{t('chat', 'loading')}</p> : null}
          <div className="chat-thread-messages">
            {messages.map((m) => {
              const mine = String(m.sender?._id || m.sender) === String(user?.id);
              return (
                <div key={m._id} className={`chat-bubble ${mine ? 'chat-bubble--mine' : 'chat-bubble--them'}`}>
                  {m.imageUrl ? (
                    <a href={m.imageUrl} target="_blank" rel="noopener noreferrer" className="chat-bubble-img-link">
                      <img src={m.imageUrl} alt="" className="chat-bubble-img" />
                    </a>
                  ) : null}
                  {m.product ? (
                    <div className="chat-product-ref">
                      <strong>{pickLocalized(language, m.product, 'nom')}</strong>
                      <span>{Number(m.product.prix || 0).toFixed(0)} FCFA</span>
                    </div>
                  ) : null}
                  {m.body ? <p className="chat-bubble-text">{m.body}</p> : null}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form className="chat-thread-input-row" onSubmit={sendMessage}>
            <label className="chat-thread-attach">
              <FaImage />
              <input type="file" accept="image/*" onChange={onPickImage} disabled={sending || loading} />
            </label>
            <input
              className="chat-thread-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('chat', 'placeholder')}
              disabled={sending || loading}
            />
            <button type="submit" className="chat-thread-send" disabled={sending || loading}>
              <FaPaperPlane />
            </button>
          </form>

          <div className="chat-thread-report">
            <button type="button" className="chat-report-btn" onClick={() => report('restaurant')}>
              {t('chat', 'reportRestaurant')}
            </button>
          </div>
        </main>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default ChatThread;
