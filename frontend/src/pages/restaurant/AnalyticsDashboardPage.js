import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FaArrowUp, FaChartPie, FaExternalLinkAlt, FaMousePointer } from 'react-icons/fa';
import PageLoader from '../../components/PageLoader';
import './AnalyticsDashboardPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const BROWN = '#8B4513';
const AMBER = '#c76d2e';
const GOLD = '#e8b54a';
const SAND = '#d4c4b0';
const CREAM = '#fff8f0';

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo' }).format(new Date());
}

function addDaysISO(iso, delta) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-FR');
}

function fmtPct(n) {
  return `${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

function fmtXof(n) {
  return `${fmt(n)} F`;
}

const CHANNEL_OPTIONS = [
  { id: 'all', label: 'Toute la plateforme' },
  { id: 'shop', label: 'Shop' },
  { id: 'repas', label: 'Repas' },
  { id: 'platform', label: 'Plateforme' },
  { id: 'recrutement', label: 'Recrutement' },
];

const CHANNEL_LABELS = {
  shop: 'Shop',
  repas: 'Repas',
  platform: 'Plateforme',
  recrutement: 'Recrutement',
  other: 'Autre',
};

const CHANNEL_COLORS = {
  shop: BROWN,
  repas: AMBER,
  platform: GOLD,
  recrutement: '#a85a24',
  other: SAND,
};

function KpiCard({ title, value, hint, featured, Icon }) {
  return (
    <article className={`rf-an2-kpi${featured ? ' rf-an2-kpi--featured' : ''}`}>
      <div className="rf-an2-kpi-top">
        <p>{title}</p>
        <span className="rf-an2-kpi-icon" aria-hidden>
          {Icon ? <Icon /> : <FaArrowUp style={{ transform: 'rotate(45deg)' }} />}
        </span>
      </div>
      <strong>{value}</strong>
      {hint ? <span className="rf-an2-kpi-hint">{hint}</span> : null}
    </article>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rf-an2-tooltip">
      <p>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey}>
          {p.name}: <b>{fmt(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const today = useMemo(() => todayKey(), []);
  const [from, setFrom] = useState(() => addDaysISO(today, -6));
  const [to, setTo] = useState(today);
  const [draftFrom, setDraftFrom] = useState(() => addDaysISO(today, -6));
  const [draftTo, setDraftTo] = useState(today);
  const [channel, setChannel] = useState('all');
  const [urlInput, setUrlInput] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [preset, setPreset] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [pathDetail, setPathDetail] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [productKey, setProductKey] = useState(''); // "" | "shop:id" | "repas:id"

  const selectedProduct = useMemo(() => {
    if (!productKey) return null;
    return catalog.find((p) => p.key === productKey) || null;
  }, [catalog, productKey]);

  const load = useCallback(async (f, tEnd, ch, path, product) => {
    setLoading(true);
    setError('');
    try {
      const params = { from: f, to: tEnd, channel: ch };
      if (path) params.path = path;
      if (product?.id) {
        params.productId = product.id;
        params.productSlug = product.slug || '';
        params.productKind = product.kind || 'shop';
      }
      const res = await axios.get(`${API_URL}/analytics/overview`, {
        ...authHeaders(),
        params,
      });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Erreur de chargement');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      axios.get(`${API_URL}/shop-products`, authHeaders()).catch(() => ({ data: [] })),
      axios.get(`${API_URL}/meal-products`, authHeaders()).catch(() => ({ data: [] })),
    ]).then(([shopRes, mealRes]) => {
      if (cancelled) return;
      const shop = (Array.isArray(shopRes.data) ? shopRes.data : []).map((p) => ({
        key: `shop:${p._id}`,
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        kind: 'shop',
        quantityUnit: p.quantityUnit || 'unit',
      }));
      const repas = (Array.isArray(mealRes.data) ? mealRes.data : []).map((p) => ({
        key: `repas:${p._id}`,
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        kind: 'repas',
        quantityUnit: 'unit',
      }));
      setCatalog([...shop, ...repas].sort((a, b) => String(a.name).localeCompare(String(b.name), 'fr')));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load(from, to, channel, pathFilter, selectedProduct);
  }, [load, from, to, channel, pathFilter, selectedProduct]);

  const applyPreset = (key) => {
    setPreset(key);
    let f = today;
    const tEnd = today;
    if (key === '7d') f = addDaysISO(today, -6);
    if (key === '30d') f = addDaysISO(today, -29);
    setFrom(f);
    setTo(tEnd);
    setDraftFrom(f);
    setDraftTo(tEnd);
  };

  const applyCustom = () => {
    setPreset('custom');
    setFrom(draftFrom);
    setTo(draftTo);
  };

  const applyUrl = async () => {
    const q = String(urlInput || '').trim();
    // Si l’URL pointe un produit shop/repas, bascule aussi le sélecteur produit
    const shopMatch = q.match(/\/shop\/([^/?#]+)/i);
    const mealMatch = q.match(/\/repas\/(?:commandes\/)?([^/?#]+)/i);
    if (shopMatch) {
      const slug = decodeURIComponent(shopMatch[1]).toLowerCase();
      const hit = catalog.find((p) => p.kind === 'shop' && p.slug === slug);
      if (hit) {
        setProductKey(hit.key);
        setPathFilter('');
        setPathDetail(null);
        return;
      }
    } else if (mealMatch) {
      const slug = decodeURIComponent(mealMatch[1]).toLowerCase();
      if (!['panier', 'commande', 'commandes'].includes(slug)) {
        const hit = catalog.find((p) => p.kind === 'repas' && p.slug === slug);
        if (hit) {
          setProductKey(hit.key);
          setPathFilter('');
          setPathDetail(null);
          return;
        }
      }
    }

    setProductKey('');
    setPathFilter(q);
    if (!q) {
      setPathDetail(null);
      return;
    }
    setPathLoading(true);
    try {
      const res = await axios.get(`${API_URL}/analytics/path`, {
        ...authHeaders(),
        params: { from, to, path: q },
      });
      setPathDetail(res.data);
    } catch (e) {
      setPathDetail(null);
      setError(e.response?.data?.message || e.message);
    } finally {
      setPathLoading(false);
    }
  };

  const kpis = data?.kpis || {};
  const funnel = data?.funnel || {};
  const conversions = data?.conversions || {};

  const dailyBars = useMemo(() => {
    const rows = data?.daily || [];
    return rows.map((d) => ({
      ...d,
      label: String(d.date || '').slice(5) || d.date,
    }));
  }, [data?.daily]);

  const channelPie = useMemo(() => {
    return ['shop', 'repas', 'platform', 'recrutement']
      .map((ch) => ({
        name: CHANNEL_LABELS[ch],
        key: ch,
        value: Number(conversions[ch]?.orders || conversions[ch]?.purchases || 0),
        color: CHANNEL_COLORS[ch],
      }))
      .filter((x) => x.value > 0);
  }, [conversions]);

  const funnelPie = useMemo(() => {
    const views = Number(funnel.pageViews || 0);
    const ctas = Number(funnel.ctaClicks || 0);
    const orders = Number(funnel.orders || 0);
    const rest = Math.max(0, views - ctas);
    const mid = Math.max(0, ctas - orders);
    return [
      { name: 'Commandes', value: orders || 0, color: BROWN },
      { name: 'CTA sans achat', value: mid, color: AMBER },
      { name: 'Vues sans CTA', value: rest, color: SAND },
    ].filter((x) => x.value > 0);
  }, [funnel]);

  const conversionGauge = Number(kpis.conversionRate || 0);
  const gaugeData = [
    { name: 'done', value: Math.min(100, Math.max(0, conversionGauge)), fill: BROWN },
    { name: 'rest', value: Math.max(0, 100 - conversionGauge), fill: '#efe6da' },
  ];

  const topActions = useMemo(() => {
    const pages = (data?.topPages || []).slice(0, 5).map((p) => ({
      title: p.path || '/',
      meta: `${fmt(p.views)} vues`,
      kind: 'page',
    }));
    const ctas = (data?.topCtas || []).slice(0, 4).map((c) => ({
      title: c.label || 'CTA',
      meta: `${fmt(c.clicks)} clics · ${CHANNEL_LABELS[c.channel] || c.channel}`,
      kind: 'cta',
    }));
    return [...ctas, ...pages].slice(0, 6);
  }, [data?.topPages, data?.topCtas]);

  if (loading && !data) return <PageLoader message="Analyse…" />;

  return (
    <div className="rf-an2">
      <div className="rf-an2-toolbar">
        <div className="rf-an2-presets">
          {[
            ['today', 'Aujourd’hui'],
            ['7d', '7 jours'],
            ['30d', '30 jours'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`rf-an2-chip${preset === key ? ' is-active' : ''}`}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rf-an2-dates">
          <input type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
          <span>→</span>
          <input type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
          <button type="button" className="rf-an2-btn" onClick={applyCustom}>
            Appliquer
          </button>
        </div>
        <div className="rf-an2-channels">
          {CHANNEL_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`rf-an2-chip${channel === c.id ? ' is-active' : ''}`}
              onClick={() => setChannel(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="rf-an2-product-select">
          <label htmlFor="rf-an2-product">Produit</label>
          <select
            id="rf-an2-product"
            value={productKey}
            onChange={(e) => {
              const key = e.target.value;
              setProductKey(key);
              const p = catalog.find((x) => x.key === key);
              if (p?.slug) {
                const nextPath = p.kind === 'repas' ? `/repas/commandes/${p.slug}` : `/shop/${p.slug}`;
                setUrlInput(nextPath);
                setPathFilter('');
                setPathDetail(null);
              } else {
                setUrlInput('');
                setPathFilter('');
                setPathDetail(null);
              }
            }}
          >
            <option value="">Tous les produits</option>
            {catalog.map((p) => (
              <option key={p.key} value={p.key}>
                {p.kind === 'repas' ? 'Repas · ' : 'Shop · '}
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rf-an2-url">
        <FaExternalLinkAlt aria-hidden />
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Analyser une URL : https://rapido.online/shop/… ou /repas/…"
        />
        <button type="button" className="rf-an2-btn rf-an2-btn--primary" onClick={applyUrl}>
          Analyser
        </button>
        {pathFilter ? (
          <button
            type="button"
            className="rf-an2-btn"
            onClick={() => {
              setUrlInput('');
              setPathFilter('');
              setPathDetail(null);
            }}
          >
            Effacer
          </button>
        ) : null}
      </div>

      {error ? <p className="rf-an2-error">{error}</p> : null}

      {data?.product ? (
        <section className="rf-an2-product-banner">
          <div>
            <p className="rf-an2-product-banner-kicker">
              Analyse produit · {data.product.kind === 'repas' ? 'Repas' : 'Shop'}
            </p>
            <h2>{data.product.name}</h2>
            <p>
              /{data.product.kind === 'repas' ? 'repas/commandes' : 'shop'}/{data.product.slug}
            </p>
          </div>
          <button
            type="button"
            className="rf-an2-btn"
            onClick={() => {
              setProductKey('');
              setUrlInput('');
              setPathFilter('');
              setPathDetail(null);
            }}
          >
            Voir tous les produits
          </button>
        </section>
      ) : null}

      <section className="rf-an2-kpi-row">
        <KpiCard
          featured
          title={kpis.scopedToProduct ? 'Commandes produit' : 'Sessions'}
          value={fmt(kpis.scopedToProduct ? kpis.orders : kpis.sessions)}
          hint={
            kpis.scopedToProduct
              ? `${fmt(kpis.totalQuantity)} ${kpis.quantityUnit || ''} commandés`
              : 'Visiteurs uniques trackés'
          }
        />
        <KpiCard
          title={kpis.scopedToProduct ? 'Panier moyen' : 'Pages vues'}
          value={kpis.scopedToProduct ? fmtXof(kpis.panierMoyen) : fmt(kpis.pageViews)}
          hint={
            kpis.scopedToProduct
              ? `Qté moy. ${fmt(kpis.quantiteMoyenne)} ${kpis.quantityUnit || ''}`
              : 'Trafic total période'
          }
        />
        <KpiCard
          title={kpis.scopedToProduct ? 'CA produit' : 'Clics CTA'}
          value={kpis.scopedToProduct ? fmtXof(kpis.revenue) : fmt(kpis.ctaClicks)}
          hint={
            kpis.scopedToProduct
              ? `${fmt(kpis.ctaClicks)} CTA · ${fmtPct(kpis.ctaRate)}`
              : `${fmtPct(kpis.ctaRate)} des vues`
          }
          Icon={FaMousePointer}
        />
        <KpiCard
          title={kpis.scopedToProduct ? 'Conversion' : 'Commandes'}
          value={kpis.scopedToProduct ? fmtPct(kpis.conversionRate) : fmt(kpis.orders)}
          hint={
            kpis.scopedToProduct
              ? `${fmt(kpis.pageViews)} vues fiche`
              : `Conv. ${fmtPct(kpis.conversionRate)} · panier moy. ${fmtXof(kpis.panierMoyen)}`
          }
          Icon={FaChartPie}
        />
      </section>

      {!kpis.scopedToProduct ? (
        <section className="rf-an2-kpi-row rf-an2-kpi-row--compact">
          <KpiCard title="Panier moyen Shop" value={fmtXof(kpis.panierMoyen)} hint="CA / commandes Shop" />
          <KpiCard
            title="Quantité Shop"
            value={fmt(kpis.totalQuantity)}
            hint={`Moy. ${fmt(kpis.quantiteMoyenne)} / commande`}
          />
          <KpiCard title="CA Shop" value={fmtXof(kpis.revenue)} hint="Hors hors-plateforme" />
          <KpiCard
            title="Shop / Repas / App"
            value={`${fmt(kpis.ordersByChannel?.shop)} / ${fmt(kpis.ordersByChannel?.repas)} / ${fmt(kpis.ordersByChannel?.platform)}`}
            hint="Répartition des commandes"
          />
        </section>
      ) : null}

      <section className="rf-an2-mid">
        <article className="rf-an2-card rf-an2-card--chart">
          <div className="rf-an2-card-head">
            <h2>Analytics trafic</h2>
            <p>Vues · CTA · Achats par jour</p>
          </div>
          <div className="rf-an2-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyBars} barCategoryGap="28%" barGap={4}>
                <CartesianGrid vertical={false} stroke="rgba(139,69,19,0.08)" />
                <XAxis dataKey="label" tick={{ fill: '#7a6558', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7a6558', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(199,109,46,0.06)' }} />
                <Bar dataKey="pageViews" name="Vues" fill={GOLD} radius={[999, 999, 999, 999]} maxBarSize={14} />
                <Bar dataKey="ctaClicks" name="CTA" fill={AMBER} radius={[999, 999, 999, 999]} maxBarSize={14} />
                <Bar dataKey="purchases" name="Achats" fill={BROWN} radius={[999, 999, 999, 999]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rf-an2-card rf-an2-card--reminder">
          <div className="rf-an2-card-head">
            <h2>Focus conversion</h2>
            <p>Entonnoir période</p>
          </div>
          <ul className="rf-an2-funnel-list">
            <li>
              <span>Pages vues</span>
              <strong>{fmt(funnel.pageViews)}</strong>
            </li>
            <li>
              <span>Clics produits</span>
              <strong>{fmt(funnel.productClicks)}</strong>
            </li>
            <li>
              <span>Clics CTA</span>
              <strong>{fmt(funnel.ctaClicks)}</strong>
            </li>
            <li>
              <span>Checkout</span>
              <strong>{fmt(funnel.beginCheckout)}</strong>
            </li>
            <li>
              <span>Pages merci</span>
              <strong>{fmt(funnel.thankYouViews)}</strong>
            </li>
            <li className="is-final">
              <span>Commandes</span>
              <strong>{fmt(funnel.orders)}</strong>
            </li>
          </ul>
          <button
            type="button"
            className="rf-an2-cta"
            onClick={() => {
              setChannel('shop');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Filtrer sur Shop
          </button>
        </article>

        <article className="rf-an2-card rf-an2-card--list">
          <div className="rf-an2-card-head">
            <h2>Top actions</h2>
            <p>CTA & pages chaudes</p>
          </div>
          <ul className="rf-an2-action-list">
            {topActions.map((item, i) => (
              <li key={`${item.title}-${i}`}>
                <span className={`rf-an2-dot${item.kind === 'cta' ? ' is-cta' : ''}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.meta}</p>
                </div>
              </li>
            ))}
            {!topActions.length ? <li className="rf-an2-empty">Pas encore de données.</li> : null}
          </ul>
        </article>
      </section>

      <section className="rf-an2-bottom">
        <article className="rf-an2-card">
          <div className="rf-an2-card-head">
            <h2>Conversion par canal</h2>
            <p>Shop · Repas · Plateforme</p>
          </div>
          <ul className="rf-an2-channel-list">
            {['shop', 'repas', 'platform', 'recrutement'].map((ch) => {
              const row = conversions[ch] || {};
              const rate = Number(row.viewToPurchase || 0);
              const status =
                rate >= 5 ? 'Completed' : rate >= 1 ? 'In Progress' : 'Pending';
              return (
                <li key={ch}>
                  <div className="rf-an2-channel-main">
                    <span className="rf-an2-avatar" style={{ background: CHANNEL_COLORS[ch] }}>
                      {CHANNEL_LABELS[ch].slice(0, 1)}
                    </span>
                    <div>
                      <strong>{CHANNEL_LABELS[ch]}</strong>
                      <p>
                        {fmt(row.pageViews)} vues · {fmt(row.ctaClicks)} CTA · {fmt(row.orders)} commandes
                      </p>
                    </div>
                  </div>
                  <span className={`rf-an2-status rf-an2-status--${status.replace(/\s/g, '').toLowerCase()}`}>
                    {status === 'Completed'
                      ? 'Fort'
                      : status === 'In Progress'
                        ? 'Moyen'
                        : 'Faible'}
                  </span>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="rf-an2-card rf-an2-card--gauge">
          <div className="rf-an2-card-head">
            <h2>Taux de conversion</h2>
            <p>Vues → commandes</p>
          </div>
          <div className="rf-an2-gauge-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  dataKey="value"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={68}
                  outerRadius={92}
                  cx="50%"
                  cy="90%"
                  stroke="none"
                  paddingAngle={2}
                >
                  {gaugeData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="rf-an2-gauge-label">
              <strong>{fmtPct(conversionGauge)}</strong>
              <span>Conversion</span>
            </div>
          </div>
          <div className="rf-an2-legend">
            <span>
              <i style={{ background: BROWN }} /> Commandes {fmt(kpis.orders)}
            </span>
            <span>
              <i style={{ background: AMBER }} /> Merci {fmt(kpis.thankYouViews)}
            </span>
            <span>
              <i style={{ background: SAND }} /> Vues {fmt(kpis.pageViews)}
            </span>
          </div>
        </article>

        <article className="rf-an2-card rf-an2-card--dark">
          <div className="rf-an2-card-head">
            <h2>Courbe d’activité</h2>
            <p>Tendance quotidienne</p>
          </div>
          <div className="rf-an2-chart rf-an2-chart--dark">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dailyBars}>
                <defs>
                  <linearGradient id="an2Area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="pageViews"
                  name="Vues"
                  stroke={GOLD}
                  fill="url(#an2Area)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="purchases"
                  name="Achats"
                  stroke="#fff"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="rf-an2-dark-stats">
            <div>
              <p>Valeur trackée</p>
              <strong>{fmtXof(kpis.purchaseValue)}</strong>
            </div>
            <div>
              <p>Produits cliqués</p>
              <strong>{fmt(kpis.productClicks)}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="rf-an2-pies">
        <article className="rf-an2-card">
          <div className="rf-an2-card-head">
            <h2>Répartition commandes</h2>
            <p>Diagramme circulaire par canal</p>
          </div>
          <div className="rf-an2-pie-row">
            <ResponsiveContainer width="48%" height={220}>
              <PieChart>
                <Pie data={channelPie} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {channelPie.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <ul className="rf-an2-pie-legend">
              {channelPie.map((c) => (
                <li key={c.key}>
                  <i style={{ background: c.color }} />
                  {c.name}
                  <b>{fmt(c.value)}</b>
                </li>
              ))}
              {!channelPie.length ? <li className="rf-an2-empty">Aucune commande.</li> : null}
            </ul>
          </div>
        </article>

        <article className="rf-an2-card">
          <div className="rf-an2-card-head">
            <h2>Répartition entonnoir</h2>
            <p>Vues vs CTA vs commandes</p>
          </div>
          <div className="rf-an2-pie-row">
            <ResponsiveContainer width="48%" height={220}>
              <PieChart>
                <Pie data={funnelPie} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {funnelPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <ul className="rf-an2-pie-legend">
              {funnelPie.map((c) => (
                <li key={c.name}>
                  <i style={{ background: c.color }} />
                  {c.name}
                  <b>{fmt(c.value)}</b>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <section className="rf-an2-card">
        <div className="rf-an2-card-head">
          <h2>Sources & campagnes UTM</h2>
          <p>Attribution pubs / community</p>
        </div>
        <div className="rf-an2-split-tables">
          <div className="rf-an2-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Events</th>
                  <th>Achats</th>
                  <th>Conv.</th>
                </tr>
              </thead>
              <tbody>
                {(data?.utmSources || []).map((u) => (
                  <tr key={u.source}>
                    <td>{u.source}</td>
                    <td>{fmt(u.events)}</td>
                    <td>{fmt(u.purchases)}</td>
                    <td>{fmtPct(u.conversionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.utmSources?.length ? (
              <p className="rf-an2-empty">Ajoutez ?utm_source=… sur vos liens pubs.</p>
            ) : null}
          </div>
          <div className="rf-an2-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th>Events</th>
                  <th>Achats</th>
                  <th>Conv.</th>
                </tr>
              </thead>
              <tbody>
                {(data?.utmCampaigns || []).map((u) => (
                  <tr key={u.campaign}>
                    <td>{u.campaign}</td>
                    <td>{fmt(u.events)}</td>
                    <td>{fmt(u.purchases)}</td>
                    <td>{fmtPct(u.conversionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.utmCampaigns?.length ? (
              <p className="rf-an2-empty">Aucune campagne UTM détectée.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rf-an2-card">
        <div className="rf-an2-card-head">
          <h2>{kpis.scopedToProduct ? 'Produit sélectionné' : 'Panier moyen par produit Shop'}</h2>
          <p>
            {kpis.scopedToProduct
              ? 'Détail commandes, quantité et panier moyen'
              : 'Cliquez un produit pour l’analyse détaillée'}
          </p>
        </div>
        <div className="rf-an2-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Commandes</th>
                <th>Quantité</th>
                <th>Qté moy.</th>
                <th>Panier moyen</th>
                <th>CA</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {kpis.scopedToProduct && data?.product ? (
                <tr>
                  <td>{data.product.name}</td>
                  <td>{fmt(data.product.orders)}</td>
                  <td>
                    {fmt(data.product.totalQuantity)} {data.product.quantityUnit || ''}
                  </td>
                  <td>
                    {fmt(data.product.quantiteMoyenne)} {data.product.quantityUnit || ''}
                  </td>
                  <td>{fmtXof(data.product.panierMoyen)}</td>
                  <td>{fmtXof(data.product.revenue)}</td>
                  <td />
                </tr>
              ) : (
                (data?.productsBreakdown || []).map((p) => (
                  <tr key={p.productId || p.slug}>
                    <td>{p.name}</td>
                    <td>{fmt(p.orders)}</td>
                    <td>
                      {fmt(p.totalQuantity)} {p.quantityUnit || ''}
                    </td>
                    <td>
                      {fmt(p.quantiteMoyenne)} {p.quantityUnit || ''}
                    </td>
                    <td>{fmtXof(p.panierMoyen)}</td>
                    <td>{fmtXof(p.revenue)}</td>
                    <td>
                      {p.productId ? (
                        <button
                          type="button"
                          className="rf-an2-btn"
                          onClick={() => {
                            const key = `shop:${p.productId}`;
                            setProductKey(key);
                            if (p.slug) {
                              setUrlInput(`/shop/${p.slug}`);
                              setPathFilter('');
                              setPathDetail(null);
                            }
                          }}
                        >
                          Analyser
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!kpis.scopedToProduct && !data?.productsBreakdown?.length ? (
            <p className="rf-an2-empty">Aucune commande Shop sur la période.</p>
          ) : null}
        </div>
      </section>

      <section className="rf-an2-card">
        <div className="rf-an2-card-head">
          <h2>Top produits (trafic)</h2>
          <p>Vues fiche & clics trackés</p>
        </div>
        <div className="rf-an2-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Canal</th>
                <th>Vues</th>
                <th>Clics</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topProducts || []).map((p, i) => (
                <tr key={`${p.productId || p.slug}-${i}`}>
                  <td>{p.name || p.slug || p.productId || '—'}</td>
                  <td>{CHANNEL_LABELS[p.channel] || p.channel}</td>
                  <td>{fmt(p.views)}</td>
                  <td>{fmt(p.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.topProducts?.length ? <p className="rf-an2-empty">Pas encore d’interactions produits.</p> : null}
        </div>
      </section>

      {pathLoading ? <p className="rf-an2-empty">Chargement détail URL…</p> : null}
      {pathDetail ? (
        <section className="rf-an2-card rf-an2-card--detail">
          <div className="rf-an2-card-head">
            <h2>Détail URL</h2>
            <p>{pathDetail.path}</p>
          </div>
          <div className="rf-an2-kpi-row rf-an2-kpi-row--compact">
            <KpiCard title="Sessions" value={fmt(pathDetail.sessions)} />
            <KpiCard title="Vues" value={fmt(pathDetail.kpis?.pageViews)} />
            <KpiCard
              title="Commandes"
              value={fmt(pathDetail.kpis?.orders ?? pathDetail.kpis?.purchases)}
              hint={
                pathDetail.kpis?.totalQuantity
                  ? `Qté ${fmt(pathDetail.kpis.totalQuantity)}`
                  : undefined
              }
            />
            <KpiCard
              featured
              title="Panier moyen"
              value={fmtXof(pathDetail.kpis?.panierMoyen)}
              hint={`Conv. ${fmtPct(pathDetail.kpis?.conversionRate)}`}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
