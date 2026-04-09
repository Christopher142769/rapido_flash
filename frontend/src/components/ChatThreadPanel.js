import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import LanguageContext from '../context/LanguageContext';
import { FaArrowLeft, FaImage, FaPaperPlane, FaPhoneAlt, FaStore } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { pickLocalized } from '../utils/i18nContent';
import '../pages/client/ChatThread.css';

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

/**
 * Fil de discussion (sans navbar app) — utilisé dans le widget support ou pages plein écran.
 */
const ChatThreadPanel = ({
  restaurantId,
  productId = null,
  onBack,
  onCloseWidget,
  compact = false,
}) => {
  const { user } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);

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
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (mode === 'force' || stickBottomRef.current || nearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, []);

  const onMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    stickBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
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
      await axios.post(`${API_URL}/conversations/${conv._id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadMessages(conv._id);
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
      await axios.post(`${API_URL}/conversations/${conv._id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setText('');
      await loadMessages(conv._id);
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
      await axios.post(`${API_URL}/conversations/${conv._id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadMessages(conv._id);
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

  return (
    <div className={`chat-thread-panel-embed ${compact ? 'chat-thread-panel-embed--compact' : ''}`}>
      <header className="chat-thread-header chat-thread-header--panel">
        <button type="button" className="chat-thread-back" onClick={onBack} aria-label={t('chat', 'backToList')}>
          <FaArrowLeft />
        </button>
        <div className="chat-thread-head-main">
          <div className="chat-thread-avatar" aria-hidden>
            {logoUrl ? <img src={logoUrl} alt="" className="chat-thread-avatar-img" /> : <FaStore className="chat-thread-avatar-icon" />}
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
        {typeof onCloseWidget === 'function' ? (
          <button type="button" className="chat-thread-widget-close" onClick={onCloseWidget} aria-label={t('supportWidget', 'close')}>
            <IoClose size={22} aria-hidden />
          </button>
        ) : (
          <span className="chat-thread-header-spacer" aria-hidden />
        )}
      </header>

      <div className="chat-thread-body chat-thread-body--panel">
        <div className={`chat-thread-layout ${compact ? 'chat-thread-layout--compact' : ''}`}>
          {!compact ? (
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
          ) : null}

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
              </div>
            ) : null}

            <div ref={messagesScrollRef} className="chat-thread-messages" onScroll={onMessagesScroll}>
              {!loading && !loadError && messages.length === 0 ? (
                <div className="chat-thread-empty-thread">
                  <p>{t('chat', 'emptyThread')}</p>
                </div>
              ) : null}
              {messages.map((m) => {
                const isAssistant = m.senderRole === 'assistant';
                const mine = !isAssistant && String(m.sender?._id || m.sender) === String(user?.id);
                const imgSrc = m.imageUrl ? resolveMediaUrl(m.imageUrl) : '';
                return (
                  <div
                    key={m._id}
                    className={`chat-msg ${mine ? 'chat-msg--mine' : 'chat-msg--them'} ${isAssistant ? 'chat-msg--assistant' : ''}`}
                  >
                    <div className={`chat-bubble ${mine ? 'chat-bubble--mine' : 'chat-bubble--them'} ${isAssistant ? 'chat-bubble--assistant' : ''}`}>
                      {isAssistant ? <span className="chat-bubble-assistant-label">{t('supportWidget', 'assistantLabel')}</span> : null}
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

            {compact && catalog.length > 0 ? (
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
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ChatThreadPanel;
