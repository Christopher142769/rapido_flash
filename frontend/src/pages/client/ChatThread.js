import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import TopNavbar from '../../components/TopNavbar';
import BottomNavbar from '../../components/BottomNavbar';
import { FaArrowLeft, FaImage, FaPaperPlane, FaPhoneAlt, FaStore } from 'react-icons/fa';
import { pickLocalized } from '../../utils/i18nContent';
import './ChatThread.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = process.env.REACT_APP_BASE_URL || API_URL.replace(/\/api\/?$/, '');

function resolveMediaUrl(url) {
  if (!url) return '';
  const s = String(url).trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `${BASE_URL}${s.startsWith('/') ? '' : '/'}${s}`;
}

function formatMsgTime(iso, language) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const locale = language === 'en' ? 'en-GB' : 'fr-FR';
  return d.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

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
  const [loadError, setLoadError] = useState(false);

  const convIdRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const stickBottomRef = useRef(true);

  const scrollMessages = useCallback((mode) => {
    const el = messagesScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const nearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (mode === 'force' || stickBottomRef.current || nearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, []);

  const onMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const threshold = 100;
    stickBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  const loadMessages = useCallback(async (conversationId) => {
    const res = await axios.get(`${API_URL}/conversations/${conversationId}/messages?limit=80`);
    setMessages(res.data || []);
  }, []);

  const lastMessageKey = messages.length ? String(messages[messages.length - 1]._id) : '';

  useLayoutEffect(() => {
    scrollMessages('auto');
  }, [lastMessageKey, messages.length, scrollMessages]);

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
    convIdRef.current = conv?._id || null;
  }, [conv?._id]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setConv(null);
    setMessages([]);
    stickBottomRef.current = true;
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
        if (!cancelled) {
          setLoadError(true);
          setConv(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, productId, loadMessages]);

  useEffect(() => {
    if (!conv?._id) return undefined;
    const id = setInterval(() => {
      const cid = convIdRef.current;
      if (!cid) return;
      loadMessages(cid).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [conv?._id, loadMessages]);

  const sendProductLine = async (pid) => {
    if (!conv?._id || !pid) return;
    setSending(true);
    stickBottomRef.current = true;
    try {
      const fd = new FormData();
      fd.append('body', '');
      fd.append('productId', pid);
      const res = await axios.post(`${API_URL}/conversations/${conv._id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages((prev) => [...prev, res.data]);
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
    stickBottomRef.current = true;
    try {
      const fd = new FormData();
      fd.append('body', trimmed);
      const res = await axios.post(`${API_URL}/conversations/${conv._id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setText('');
      setMessages((prev) => [...prev, res.data]);
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
    stickBottomRef.current = true;
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('body', '');
      const res = await axios.post(`${API_URL}/conversations/${conv._id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const tel = String(conv?.restaurant?.telephone || '').trim();
  const shopName = conv?.restaurant ? pickLocalized(language, conv.restaurant, 'nom') : '';
  const logoRaw = conv?.restaurant?.logo;
  const logoUrl = logoRaw ? resolveMediaUrl(logoRaw) : '';

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

      <div className="chat-thread-body">
        <header className="chat-thread-header">
          <button
            type="button"
            className="chat-thread-back"
            onClick={() => navigate('/chats')}
            aria-label={t('chat', 'backToList')}
          >
            <FaArrowLeft />
          </button>
          <div className="chat-thread-head-main">
            <div className="chat-thread-avatar" aria-hidden>
              {logoUrl ? (
                <img src={logoUrl} alt="" className="chat-thread-avatar-img" />
              ) : (
                <FaStore className="chat-thread-avatar-icon" />
              )}
            </div>
            <div className="chat-thread-head-text">
              <h1 className="chat-thread-title">{shopName || t('chat', 'threadTitle')}</h1>
              {tel ? (
                <a href={`tel:${tel}`} className="chat-thread-call">
                  <FaPhoneAlt size={12} aria-hidden /> {t('chat', 'call')}
                </a>
              ) : (
                <span className="chat-thread-subtle">{t('chat', 'threadSubtitle')}</span>
              )}
            </div>
          </div>
        </header>

        <div className="chat-thread-layout">
          <aside className="chat-thread-catalog chat-thread-catalog--desktop" aria-label={t('chat', 'catalog')}>
            <h2 className="chat-thread-catalog-title">{t('chat', 'catalog')}</h2>
            {catalog.length === 0 ? (
              <p className="chat-thread-catalog-empty">{t('chat', 'catalogEmpty')}</p>
            ) : (
              <ul className="chat-thread-catalog-list">
                {catalog.map((p) => (
                  <li key={p._id}>
                    <button
                      type="button"
                      className="chat-thread-catalog-item"
                      onClick={() => sendProductLine(p._id)}
                      disabled={sending || loading || loadError}
                    >
                      <span className="chat-thread-catalog-name">{pickLocalized(language, p, 'nom')}</span>
                      <span className="chat-thread-catalog-price">{Number(p.prix || 0).toFixed(0)} FCFA</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <main className="chat-thread-main">
            {loading ? (
              <div className="chat-thread-loading" role="status">
                <span className="chat-thread-loading-dot" />
                <span className="chat-thread-loading-dot" />
                <span className="chat-thread-loading-dot" />
                <span className="chat-thread-loading-label">{t('chat', 'loading')}</span>
              </div>
            ) : null}

            {loadError ? (
              <div className="chat-thread-error">
                <p>{t('chat', 'errorThread')}</p>
                <button
                  type="button"
                  className="chat-thread-retry"
                  onClick={() => navigate(0)}
                >
                  {t('chat', 'retry')}
                </button>
              </div>
            ) : null}

            <div
              ref={messagesScrollRef}
              className="chat-thread-messages"
              onScroll={onMessagesScroll}
            >
              {!loading && !loadError && messages.length === 0 ? (
                <div className="chat-thread-empty-thread">
                  <p>{t('chat', 'emptyThread')}</p>
                </div>
              ) : null}
              {messages.map((m) => {
                const mine = String(m.sender?._id || m.sender) === String(user?.id);
                const imgSrc = m.imageUrl ? resolveMediaUrl(m.imageUrl) : '';
                return (
                  <div key={m._id} className={`chat-msg ${mine ? 'chat-msg--mine' : 'chat-msg--them'}`}>
                    <div className={`chat-bubble ${mine ? 'chat-bubble--mine' : 'chat-bubble--them'}`}>
                      {imgSrc ? (
                        <a href={imgSrc} target="_blank" rel="noopener noreferrer" className="chat-bubble-img-link">
                          <img src={imgSrc} alt="" className="chat-bubble-img" loading="lazy" />
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
                    <time className="chat-msg-time" dateTime={m.createdAt}>
                      {formatMsgTime(m.createdAt, language)}
                    </time>
                  </div>
                );
              })}
              <div className="chat-thread-messages-end" />
            </div>

            {catalog.length > 0 ? (
              <div className="chat-thread-catalog-chips" aria-label={t('chat', 'catalog')}>
                <div className="chat-thread-catalog-chips-label">{t('chat', 'attachProduct')}</div>
                <div className="chat-thread-catalog-chips-scroll">
                  {catalog.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      className="chat-thread-catalog-chip"
                      onClick={() => sendProductLine(p._id)}
                      disabled={sending || loading || loadError}
                    >
                      {pickLocalized(language, p, 'nom')}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="chat-thread-composer">
              <form className="chat-thread-input-row" onSubmit={sendMessage}>
                <label className="chat-thread-attach" aria-label={t('chat', 'photo')}>
                  <FaImage aria-hidden />
                  <input type="file" accept="image/*" onChange={onPickImage} disabled={sending || loading || loadError} />
                </label>
                <input
                  className="chat-thread-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('chat', 'placeholder')}
                  disabled={sending || loading || loadError}
                  autoComplete="off"
                />
                <button type="submit" className="chat-thread-send" disabled={sending || loading || loadError} aria-label={t('chat', 'send')}>
                  <FaPaperPlane />
                </button>
              </form>
              <button type="button" className="chat-thread-report-link" onClick={() => report('restaurant')}>
                {t('chat', 'reportRestaurant')}
              </button>
            </div>
          </main>
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default ChatThread;
