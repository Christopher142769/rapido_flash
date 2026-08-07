import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageLoader from '../../components/PageLoader';
import './AnalyticsDashboardPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
  { id: 'platform', label: 'Plateforme (app)' },
  { id: 'recrutement', label: 'Recrutement' },
];

const CHANNEL_LABELS = {
  shop: 'Shop',
  repas: 'Repas',
  platform: 'Plateforme',
  recrutement: 'Recrutement',
  other: 'Autre',
};

function FunnelStep({ label, value, rate, accent }) {
  return (
    <div className="rf-an-funnel-step">
      <div className="rf-an-funnel-bar" style={{ background: accent }}>
        <span>{fmt(value)}</span>
      </div>
      <p className="rf-an-funnel-label">{label}</p>
      {rate != null ? <p className="rf-an-funnel-rate">{fmtPct(rate)}</p> : null}
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

  const load = useCallback(
    async (f, tEnd, ch, path) => {
      setLoading(true);
      setError('');
      try {
        const params = { from: f, to: tEnd, channel: ch };
        if (path) params.path = path;
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
    },
    []
  );

  useEffect(() => {
    load(from, to, channel, pathFilter);
  }, [load, from, to, channel, pathFilter]);

  const applyPreset = (key) => {
    setPreset(key);
    let f = today;
    let tEnd = today;
    if (key === 'today') {
      f = today;
    } else if (key === '7d') {
      f = addDaysISO(today, -6);
    } else if (key === '30d') {
      f = addDaysISO(today, -29);
    }
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

  if (loading && !data) return <PageLoader message="Analyse…" />;

  return (
    <div className="rf-an-page">
      <header className="rf-an-header">
        <div>
          <p className="rf-an-eyebrow">Rapido Ads Manager</p>
          <h1>Analyse</h1>
          <p className="rf-an-lead">
            Tracking first-party sur tout le site : pages, CTA, produits, paniers et pages de
            remerciement — avec taux de conversion Shop, Repas et Plateforme.
          </p>
        </div>
      </header>

      <div className="rf-an-toolbar">
        <div className="rf-an-presets">
          {[
            ['today', 'Aujourd’hui'],
            ['7d', '7 jours'],
            ['30d', '30 jours'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`rf-an-chip${preset === key ? ' is-active' : ''}`}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rf-an-dates">
          <label>
            Du
            <input type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
          </label>
          <label>
            Au
            <input type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
          </label>
          <button type="button" className="rf-an-btn" onClick={applyCustom}>
            Appliquer
          </button>
        </div>
        <div className="rf-an-channels">
          {CHANNEL_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`rf-an-chip${channel === c.id ? ' is-active' : ''}`}
              onClick={() => setChannel(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rf-an-url-box">
        <label>
          Analyser une URL / page
          <div className="rf-an-url-row">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://rapido.online/shop/… ou /repas/…"
            />
            <button type="button" className="rf-an-btn rf-an-btn--primary" onClick={applyUrl}>
              Voir les détails
            </button>
            {pathFilter ? (
              <button
                type="button"
                className="rf-an-btn"
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
        </label>
        {pathFilter ? (
          <p className="rf-an-filter-hint">
            Filtre actif : <strong>{pathFilter}</strong>
          </p>
        ) : null}
      </div>

      {error ? <p className="rf-an-error">{error}</p> : null}

      <section className="rf-an-kpi-grid">
        <article className="rf-an-kpi rf-an-kpi--accent">
          <p>Sessions</p>
          <strong>{fmt(kpis.sessions)}</strong>
        </article>
        <article className="rf-an-kpi">
          <p>Pages vues</p>
          <strong>{fmt(kpis.pageViews)}</strong>
        </article>
        <article className="rf-an-kpi">
          <p>Clics CTA</p>
          <strong>{fmt(kpis.ctaClicks)}</strong>
          <span>{fmtPct(kpis.ctaRate)} des vues</span>
        </article>
        <article className="rf-an-kpi">
          <p>Clics produits</p>
          <strong>{fmt(kpis.productClicks)}</strong>
        </article>
        <article className="rf-an-kpi">
          <p>Pages remerciement</p>
          <strong>{fmt(kpis.thankYouViews)}</strong>
        </article>
        <article className="rf-an-kpi rf-an-kpi--accent">
          <p>Commandes finalisées</p>
          <strong>{fmt(kpis.orders)}</strong>
          <span>Conv. {fmtPct(kpis.conversionRate)}</span>
        </article>
        <article className="rf-an-kpi">
          <p>Valeur trackée</p>
          <strong>{fmtXof(kpis.purchaseValue)}</strong>
        </article>
        <article className="rf-an-kpi">
          <p>Leads / candidatures</p>
          <strong>{fmt((kpis.leads || 0) + (kpis.registrations || 0))}</strong>
        </article>
      </section>

      <section className="rf-an-card">
        <h2>Entonnoir de conversion</h2>
        <p className="rf-an-card-lead">
          Du premier affichage jusqu’à la commande — comme Meta Ads, mais first-party Rapido.
        </p>
        <div className="rf-an-funnel">
          <FunnelStep label="Pages vues" value={funnel.pageViews} accent="#8B4513" />
          <FunnelStep
            label="Clics produits"
            value={funnel.productClicks}
            rate={funnel.pageViews ? (funnel.productClicks / funnel.pageViews) * 100 : 0}
            accent="#c76d2e"
          />
          <FunnelStep
            label="Clics CTA"
            value={funnel.ctaClicks}
            rate={funnel.pageViews ? (funnel.ctaClicks / funnel.pageViews) * 100 : 0}
            accent="#e8b54a"
          />
          <FunnelStep
            label="Checkout démarré"
            value={funnel.beginCheckout}
            rate={funnel.ctaClicks ? (funnel.beginCheckout / funnel.ctaClicks) * 100 : 0}
            accent="#a85a24"
          />
          <FunnelStep
            label="Page merci"
            value={funnel.thankYouViews}
            rate={funnel.beginCheckout ? (funnel.thankYouViews / funnel.beginCheckout) * 100 : 0}
            accent="#5c3a1e"
          />
          <FunnelStep
            label="Commandes"
            value={funnel.orders}
            rate={funnel.pageViews ? (funnel.orders / funnel.pageViews) * 100 : 0}
            accent="#1a1411"
          />
        </div>
      </section>

      <section className="rf-an-card">
        <h2>Conversion par canal</h2>
        <div className="rf-an-table-wrap">
          <table className="rf-an-table">
            <thead>
              <tr>
                <th>Canal</th>
                <th>Vues</th>
                <th>CTA</th>
                <th>Produits</th>
                <th>Commandes</th>
                <th>Vue → CTA</th>
                <th>Vue → Achat</th>
                <th>CTA → Achat</th>
              </tr>
            </thead>
            <tbody>
              {['shop', 'repas', 'platform', 'recrutement'].map((ch) => {
                const row = conversions[ch] || {};
                return (
                  <tr key={ch}>
                    <td>{CHANNEL_LABELS[ch] || ch}</td>
                    <td>{fmt(row.pageViews)}</td>
                    <td>{fmt(row.ctaClicks)}</td>
                    <td>{fmt(row.productClicks)}</td>
                    <td>{fmt(row.orders)}</td>
                    <td>{fmtPct(row.viewToCta)}</td>
                    <td>{fmtPct(row.viewToPurchase)}</td>
                    <td>{fmtPct(row.ctaToPurchase)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="rf-an-orders-split">
          Commandes période — Shop {fmt(kpis.ordersByChannel?.shop)} · Repas{' '}
          {fmt(kpis.ordersByChannel?.repas)} · Plateforme {fmt(kpis.ordersByChannel?.platform)}
        </p>
      </section>

      <div className="rf-an-split">
        <section className="rf-an-card">
          <h2>Évolution quotidienne</h2>
          <div className="rf-an-chart">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data?.daily || []}>
                <defs>
                  <linearGradient id="anViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c76d2e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#c76d2e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,69,19,0.12)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="pageViews"
                  name="Vues"
                  stroke="#8B4513"
                  fill="url(#anViews)"
                />
                <Area
                  type="monotone"
                  dataKey="ctaClicks"
                  name="CTA"
                  stroke="#e8b54a"
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="purchases"
                  name="Achats"
                  stroke="#1a1411"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rf-an-card">
          <h2>Sources UTM</h2>
          <div className="rf-an-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.utmSources || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,69,19,0.12)" />
                <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="events" name="Événements" fill="#c76d2e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="purchases" name="Achats" fill="#8B4513" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!data?.utmSources?.length ? (
            <p className="rf-an-empty">Aucune UTM sur la période (ajoutez ?utm_source=… aux pubs).</p>
          ) : null}
        </section>
      </div>

      <div className="rf-an-split">
        <section className="rf-an-card">
          <h2>Top pages</h2>
          <div className="rf-an-table-wrap">
            <table className="rf-an-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Vues</th>
                  <th>Sessions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topPages || []).map((p) => (
                  <tr key={p.path}>
                    <td className="rf-an-mono">{p.path || '/'}</td>
                    <td>{fmt(p.views)}</td>
                    <td>{fmt(p.sessions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.topPages?.length ? (
              <p className="rf-an-empty">Pas encore de pages vues trackées.</p>
            ) : null}
          </div>
        </section>

        <section className="rf-an-card">
          <h2>Top CTA</h2>
          <div className="rf-an-table-wrap">
            <table className="rf-an-table">
              <thead>
                <tr>
                  <th>Bouton</th>
                  <th>Canal</th>
                  <th>Page</th>
                  <th>Clics</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topCtas || []).map((c, i) => (
                  <tr key={`${c.label}-${c.path}-${i}`}>
                    <td>{c.label}</td>
                    <td>{CHANNEL_LABELS[c.channel] || c.channel}</td>
                    <td className="rf-an-mono">{c.path}</td>
                    <td>{fmt(c.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.topCtas?.length ? (
              <p className="rf-an-empty">Pas encore de clics CTA.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rf-an-card">
        <h2>Top produits</h2>
        <div className="rf-an-table-wrap">
          <table className="rf-an-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Canal</th>
                <th>Vues fiche</th>
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
          {!data?.topProducts?.length ? (
            <p className="rf-an-empty">Pas encore d’interactions produits.</p>
          ) : null}
        </div>
      </section>

      <section className="rf-an-card">
        <h2>Campagnes UTM</h2>
        <div className="rf-an-table-wrap">
          <table className="rf-an-table">
            <thead>
              <tr>
                <th>Campagne</th>
                <th>Événements</th>
                <th>Achats</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {(data?.utmCampaigns || []).map((c) => (
                <tr key={c.campaign}>
                  <td>{c.campaign}</td>
                  <td>{fmt(c.events)}</td>
                  <td>{fmt(c.purchases)}</td>
                  <td>{fmtPct(c.conversionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.utmCampaigns?.length ? (
            <p className="rf-an-empty">Aucune campagne UTM détectée.</p>
          ) : null}
        </div>
      </section>

      {pathLoading ? <p className="rf-an-empty">Chargement détail URL…</p> : null}
      {pathDetail ? (
        <section className="rf-an-card rf-an-card--detail">
          <h2>Détail : {pathDetail.path}</h2>
          <div className="rf-an-kpi-grid rf-an-kpi-grid--compact">
            <article className="rf-an-kpi">
              <p>Sessions</p>
              <strong>{fmt(pathDetail.sessions)}</strong>
            </article>
            <article className="rf-an-kpi">
              <p>Vues</p>
              <strong>{fmt(pathDetail.kpis?.pageViews)}</strong>
            </article>
            <article className="rf-an-kpi">
              <p>CTA</p>
              <strong>{fmt(pathDetail.kpis?.ctaClicks)}</strong>
            </article>
            <article className="rf-an-kpi">
              <p>Achats / merci</p>
              <strong>{fmt(pathDetail.kpis?.purchases)}</strong>
            </article>
            <article className="rf-an-kpi rf-an-kpi--accent">
              <p>Conversion</p>
              <strong>{fmtPct(pathDetail.kpis?.conversionRate)}</strong>
            </article>
          </div>
          <h3>Événements récents</h3>
          <div className="rf-an-table-wrap">
            <table className="rf-an-table">
              <thead>
                <tr>
                  <th>Quand</th>
                  <th>Événement</th>
                  <th>CTA / Produit</th>
                  <th>UTM</th>
                </tr>
              </thead>
              <tbody>
                {(pathDetail.recent || []).map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.createdAt
                        ? new Date(e.createdAt).toLocaleString('fr-FR', {
                            timeZone: 'Africa/Porto-Novo',
                          })
                        : '—'}
                    </td>
                    <td>{e.event}</td>
                    <td>{e.ctaLabel || e.productName || '—'}</td>
                    <td className="rf-an-mono">
                      {[e.utmSource, e.utmCampaign].filter(Boolean).join(' / ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
