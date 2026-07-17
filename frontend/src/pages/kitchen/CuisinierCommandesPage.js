import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaSyncAlt, FaThLarge, FaList } from 'react-icons/fa';
import PageLoader from '../../components/PageLoader';
import { useModal } from '../../context/ModalContext';
import { formatDeliveryDateShort } from '../../utils/shopDeliveryDate';
import { fetchMealOrders, formatPrice, updateMealOrderStatut } from '../../utils/kitchenApi';
import './CuisinierCommandesPage.css';

const SHOP_ORDER_TZ = 'Africa/Porto-Novo';
const REFRESH_MS = 30000;

const STATUT_LABELS = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

const STATUT_COLORS = {
  en_attente: '#ffb84d',
  confirmee: '#6ec6ff',
  en_preparation: '#d4a5ff',
  en_livraison: '#7ddea8',
  livree: '#5cb85c',
  annulee: '#e85d5d',
};

const BOARD_COLUMNS = [
  { key: 'en_attente', title: 'À traiter', className: 'kitchen-column--attente' },
  { key: 'confirmee', title: 'Confirmées', className: 'kitchen-column--confirmee' },
  { key: 'en_preparation', title: 'En cuisine', className: 'kitchen-column--prep' },
  { key: 'en_livraison', title: 'Prêtes / livraison', className: 'kitchen-column--livraison' },
];

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

function orderDayKey(order) {
  const raw = order.orderDate || order.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_ORDER_TZ }).format(d);
}

function formatOrderTime(order) {
  const raw = order.orderDate || order.createdAt;
  if (!raw) return '—';
  return new Date(raw).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function filterOrders(orders, { dateFrom, dateTo, statut, city } = {}) {
  return (orders || []).filter((o) => {
    if (statut && o.statut !== statut) return false;
    if (city && o.customer?.city !== city) return false;
    const key = orderDayKey(o);
    if (!key) return false;
    if (dateFrom && key < dateFrom) return false;
    if (dateTo && key > dateTo) return false;
    return true;
  });
}

function resolveImageUrl(item) {
  const img = item.mealProduct?.mainImage;
  if (!img) return null;
  if (typeof img === 'string') return img;
  return img.url || img.secure_url || null;
}

function OrderItems({ items }) {
  return (
    <div className="kitchen-order-card__items">
      <h4>Plats commandés</h4>
      {(items || []).map((it, idx) => (
        <div key={it._id || idx} className="kitchen-item">
          {resolveImageUrl(it) ? (
            <img src={resolveImageUrl(it)} alt="" className="kitchen-item__img" />
          ) : (
            <div className="kitchen-item__img" aria-hidden />
          )}
          <div className="kitchen-item__body">
            <div className="kitchen-item__name">
              <span className="kitchen-item__qty">×{it.quantity}</span>
              {it.productName}
            </div>
            {(it.accompagnements || []).length > 0 ? (
              <div className="kitchen-item__acc">
                {(it.accompagnements || []).map((a, i) => (
                  <span key={`${a.name}-${i}`}>
                    {a.name} ×{a.quantity}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderCard({ order, busy, onAction }) {
  const name = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ');
  const addressLine = [order.customer?.city, order.customer?.addressDescription]
    .filter(Boolean)
    .join(' — ');
  const specs = String(order.clientSpecifications || '').trim();
  const deliveryDate = order.requestedDeliveryAt
    ? formatDeliveryDateShort(order.requestedDeliveryAt)
    : null;
  const phone = order.customer?.phone?.trim();

  return (
    <article className="kitchen-order-card">
      <div className="kitchen-order-card__top">
        <div>
          <p className="kitchen-order-card__num">#{order.orderNumber || order._id.slice(-6)}</p>
          <p className="kitchen-order-card__time">{formatOrderTime(order)}</p>
        </div>
        <span
          className="kitchen-order-card__badge"
          style={{
            backgroundColor: `${STATUT_COLORS[order.statut] || '#888'}22`,
            color: STATUT_COLORS[order.statut] || '#ccc',
          }}
        >
          {STATUT_LABELS[order.statut] || order.statut}
        </span>
      </div>

      <div className="kitchen-order-card__client">
        <strong>{name || 'Client'}</strong>
        {phone ? (
          <span>
            {' '}
            ·{' '}
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="kitchen-phone-link">
              {phone}
            </a>
          </span>
        ) : null}
      </div>

      <OrderItems items={order.items} />

      {specs ? <div className="kitchen-order-card__specs">{specs}</div> : null}

      <div className="kitchen-order-card__delivery">
        <strong>Livraison</strong>
        {deliveryDate ? ` · ${deliveryDate}` : ''}
        <br />
        {addressLine || '—'}
      </div>

      <div className="kitchen-order-card__total">
        <span>{order.customer?.city || '—'}</span>
        <strong>{formatPrice(order.totalPrice)}</strong>
      </div>

      <div className="kitchen-order-card__actions">
        {order.statut === 'en_attente' ? (
          <button
            type="button"
            className="kitchen-btn kitchen-btn--amber"
            disabled={busy}
            onClick={() => onAction(order, 'confirmee')}
          >
            Accepter
          </button>
        ) : null}
        {order.statut === 'confirmee' ? (
          <button
            type="button"
            className="kitchen-btn kitchen-btn--purple"
            disabled={busy}
            onClick={() => onAction(order, 'en_preparation')}
          >
            Lancer en cuisine
          </button>
        ) : null}
        {order.statut === 'en_preparation' ? (
          <button
            type="button"
            className="kitchen-btn kitchen-btn--success"
            disabled={busy}
            onClick={() => onAction(order, 'en_livraison')}
          >
            Plat prêt
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ListOrderCard({ order, busy, onAction }) {
  const name = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ');
  const specs = String(order.clientSpecifications || '').trim();
  const deliveryDate = order.requestedDeliveryAt
    ? formatDeliveryDateShort(order.requestedDeliveryAt)
    : null;

  return (
    <article className="kitchen-list-card">
      <div className="kitchen-list-card__grid">
        <div className="kitchen-list-card__side">
          <p className="kitchen-order-card__num">#{order.orderNumber || order._id.slice(-6)}</p>
          <p className="kitchen-order-card__time">{formatOrderTime(order)}</p>
          <span
            className="kitchen-order-card__badge"
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              backgroundColor: `${STATUT_COLORS[order.statut] || '#888'}22`,
              color: STATUT_COLORS[order.statut] || '#ccc',
            }}
          >
            {STATUT_LABELS[order.statut] || order.statut}
          </span>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
            <strong>{name}</strong>
            <br />
            <span style={{ color: 'var(--kitchen-muted)' }}>{order.customer?.phone}</span>
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: 'var(--kitchen-muted)' }}>
            {order.customer?.city} — {order.customer?.addressDescription}
            {deliveryDate ? <><br />Livraison : {deliveryDate}</> : null}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontWeight: 700, color: 'var(--kitchen-amber)' }}>
            {formatPrice(order.totalPrice)}
          </p>
        </div>
        <div>
          <OrderItems items={order.items} />
          {specs ? <div className="kitchen-order-card__specs">{specs}</div> : null}
        </div>
        <div className="kitchen-order-card__actions" style={{ padding: '1rem', alignContent: 'center' }}>
          {order.statut === 'en_attente' ? (
            <button
              type="button"
              className="kitchen-btn kitchen-btn--amber"
              disabled={busy}
              onClick={() => onAction(order, 'confirmee')}
            >
              Accepter
            </button>
          ) : null}
          {order.statut === 'confirmee' ? (
            <button
              type="button"
              className="kitchen-btn kitchen-btn--purple"
              disabled={busy}
              onClick={() => onAction(order, 'en_preparation')}
            >
              Lancer en cuisine
            </button>
          ) : null}
          {order.statut === 'en_preparation' ? (
            <button
              type="button"
              className="kitchen-btn kitchen-btn--success"
              disabled={busy}
              onClick={() => onAction(order, 'en_livraison')}
            >
              Plat prêt
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function CuisinierCommandesPage() {
  const { showSuccess, showError } = useModal();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('board');
  const [statutFilter, setStatutFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(() => defaultDateRange().dateFrom);
  const [dateTo, setDateTo] = useState(() => defaultDateRange().dateTo);
  const [lastRefresh, setLastRefresh] = useState(() => new Date());

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchMealOrders();
      setOrders(data);
      setLastRefresh(new Date());
    } catch (e) {
      if (!silent) showError(e.response?.data?.message || e.message || 'Erreur de chargement');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const filteredOrders = useMemo(
    () =>
      filterOrders(orders, {
        dateFrom,
        dateTo,
        statut: statutFilter || undefined,
        city: cityFilter || undefined,
      }).sort(
        (a, b) =>
          new Date(a.orderDate || a.createdAt).getTime() -
          new Date(b.orderDate || b.createdAt).getTime()
      ),
    [orders, dateFrom, dateTo, statutFilter, cityFilter]
  );

  const stats = useMemo(() => {
    const active = filteredOrders.filter((o) => !['livree', 'annulee'].includes(o.statut));
    return {
      total: filteredOrders.length,
      attente: active.filter((o) => o.statut === 'en_attente').length,
      confirmee: active.filter((o) => o.statut === 'confirmee').length,
      prep: active.filter((o) => o.statut === 'en_preparation').length,
      livraison: active.filter((o) => o.statut === 'en_livraison').length,
    };
  }, [filteredOrders]);

  const ordersByColumn = useMemo(() => {
    const map = {};
    for (const col of BOARD_COLUMNS) {
      map[col.key] = filteredOrders.filter((o) => o.statut === col.key);
    }
    return map;
  }, [filteredOrders]);

  const handleAction = async (order, statut) => {
    setBusy(true);
    try {
      await updateMealOrderStatut(order._id, { statut });
      showSuccess('Commande mise à jour');
      await load(true);
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <PageLoader message="Chargement du tableau cuisine..." />;
  }

  return (
    <div className="kitchen-dashboard">
      <header className="kitchen-header">
        <div>
          <h1 className="kitchen-header__title">Tableau Cuisine</h1>
          <p className="kitchen-header__sub">
            Toutes les commandes repas — détails complets pour la préparation
          </p>
        </div>
        <div className="kitchen-header__actions">
          <span className="kitchen-live">
            <span className="kitchen-live__dot" aria-hidden />
            Actualisé {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            type="button"
            className="kitchen-btn kitchen-btn--ghost"
            onClick={() => load()}
            disabled={busy}
          >
            <FaSyncAlt aria-hidden /> Actualiser
          </button>
        </div>
      </header>

      <div className="kitchen-stats">
        <div className="kitchen-stat">
          <div className="kitchen-stat__value">{stats.attente}</div>
          <div className="kitchen-stat__label">À traiter</div>
        </div>
        <div className="kitchen-stat">
          <div className="kitchen-stat__value">{stats.confirmee}</div>
          <div className="kitchen-stat__label">Confirmées</div>
        </div>
        <div className="kitchen-stat">
          <div className="kitchen-stat__value">{stats.prep}</div>
          <div className="kitchen-stat__label">En cuisine</div>
        </div>
        <div className="kitchen-stat">
          <div className="kitchen-stat__value">{stats.livraison}</div>
          <div className="kitchen-stat__label">Prêtes</div>
        </div>
        <div className="kitchen-stat">
          <div className="kitchen-stat__value">{stats.total}</div>
          <div className="kitchen-stat__label">Total période</div>
        </div>
      </div>

      <div className="kitchen-filters">
        <label>
          Du
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          Au
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <label>
          Statut
          <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(STATUT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ville
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option value="">Toutes</option>
            <option value="Cotonou">Cotonou</option>
            <option value="Calavi">Calavi</option>
          </select>
        </label>
        <div className="kitchen-view-toggle">
          <button
            type="button"
            className={view === 'board' ? 'is-active' : ''}
            onClick={() => setView('board')}
            aria-pressed={view === 'board'}
          >
            <FaThLarge aria-hidden /> Board
          </button>
          <button
            type="button"
            className={view === 'list' ? 'is-active' : ''}
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
          >
            <FaList aria-hidden /> Liste
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="kitchen-empty">
          <p>Aucune commande repas pour cette période.</p>
        </div>
      ) : view === 'board' ? (
        <div className="kitchen-board">
          {BOARD_COLUMNS.map((col) => (
            <section key={col.key} className={`kitchen-column ${col.className}`}>
              <div className="kitchen-column__head">
                <h2 className="kitchen-column__title">{col.title}</h2>
                <span className="kitchen-column__count">{ordersByColumn[col.key]?.length || 0}</span>
              </div>
              <div className="kitchen-column__body">
                {(ordersByColumn[col.key] || []).map((order) => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    busy={busy}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="kitchen-list">
          {filteredOrders.map((order) => (
            <ListOrderCard key={order._id} order={order} busy={busy} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}
