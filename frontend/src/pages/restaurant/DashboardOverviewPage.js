import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FaArrowUp, FaBuilding, FaCheckCircle, FaRegEnvelope, FaShoppingBag } from 'react-icons/fa';
import LanguageContext from '../../context/LanguageContext';
import PageLoader from '../../components/PageLoader';
import './DashboardOverviewPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function utcTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso, delta) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const STATUS_KEYS = [
  'en_attente',
  'confirmee',
  'en_preparation',
  'en_livraison',
  'livree',
  'annulee',
];

const STATUS_ACCENT = {
  en_attente: '#94a3b8',
  confirmee: '#0ea5e9',
  en_preparation: '#f59e0b',
  en_livraison: '#8b5cf6',
  livree: '#22c55e',
  annulee: '#ef4444',
};

const BAR_FILLS = ['#14532d', '#22c55e', '#86efac'];

function KpiFeatured({ title, value, hint, Icon, delay, reduce }) {
  return (
    <motion.div
      className="rf-do-card rf-do-card--featured"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 280, damping: 26 }}
    >
      <span className="rf-do-card-icon" aria-hidden>
        <FaArrowUp style={{ transform: 'rotate(45deg)' }} />
      </span>
      <p className="rf-do-card-label">{title}</p>
      <p className="rf-do-card-value">{value}</p>
      {hint ? <p className="rf-do-card-hint">{hint}</p> : null}
      <Icon
        className="pointer-events-none absolute bottom-4 right-4 text-5xl opacity-[0.12]"
        style={{ color: '#fff' }}
        aria-hidden
      />
    </motion.div>
  );
}

function KpiStandard({ title, value, hint, delay, reduce, children }) {
  return (
    <motion.div
      className="rf-do-card"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 280, damping: 26 }}
    >
      <span className="rf-do-card-icon" aria-hidden>
        <FaArrowUp style={{ transform: 'rotate(45deg)', fontSize: '0.75rem' }} />
      </span>
      <p className="rf-do-card-label">{title}</p>
      <p className="rf-do-card-value">{value}</p>
      {hint ? <p className="rf-do-card-hint">{hint}</p> : null}
      {children}
    </motion.div>
  );
}

export default function DashboardOverviewPage() {
  const { t, language } = useContext(LanguageContext);
  const reduce = useReducedMotion();

  const today = useMemo(() => utcTodayISO(), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [draftFrom, setDraftFrom] = useState(today);
  const [draftTo, setDraftTo] = useState(today);
  const [activePreset, setActivePreset] = useState('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  const fetchStats = useCallback(
    async (f, tEnd, preset = 'custom') => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`${API_URL}/commandes/dashboard-stats`, {
          params: { from: f, to: tEnd },
        });
        setPayload(data);
        setFrom(data.from);
        setTo(data.to);
        setDraftFrom(data.from);
        setDraftTo(data.to);
        setActivePreset(preset);
      } catch (e) {
        setError(t('dashboardOverview', 'loadError'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    fetchStats(today, today, 'today');
  }, [today, fetchStats]);

  const applyRange = () => {
    fetchStats(draftFrom, draftTo, 'custom');
  };

  const setPreset = (kind) => {
    const end = utcTodayISO();
    if (kind === 'today') {
      fetchStats(end, end, 'today');
      return;
    }
    const days = kind === '7' ? 7 : 30;
    const start = addDaysISO(end, -(days - 1));
    fetchStats(start, end, kind);
  };

  const chartData = useMemo(() => {
    if (!payload?.series?.length) return [];
    if (payload.granularity === 'day') {
      const fmt = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'fr-FR', {
        day: '2-digit',
        month: 'short',
      });
      return payload.series.map((row) => {
        let label = row.label;
        if (/^\d{4}-\d{2}-\d{2}$/.test(row.label)) {
          const d = new Date(`${row.label}T12:00:00.000Z`);
          label = fmt.format(d);
        }
        return { ...row, label };
      });
    }
    return payload.series;
  }, [payload, language]);

  const pieData = useMemo(() => {
    if (!payload?.countsByStatus) return [];
    return STATUS_KEYS.map((key) => ({
      key,
      name: t('dashboardOverview', `status_${key}`),
      value: payload.countsByStatus[key] ?? 0,
    }));
  }, [payload, t]);

  const chartTitle =
    payload?.granularity === 'hour' ? t('dashboardOverview', 'chartTitleHour') : t('dashboardOverview', 'chartTitleDay');

  const rangeLabel = from === to ? from : `${from} → ${to}`;
  const kpiHint = t('dashboardOverview', 'kpiHint');

  const presets = [
    { key: 'today', label: t('dashboardOverview', 'periodToday') },
    { key: '7', label: t('dashboardOverview', 'period7') },
    { key: '30', label: t('dashboardOverview', 'period30') },
  ];

  if (loading && !payload && !error) {
    return <PageLoader />;
  }

  return (
    <div className="rf-dash-overview rf-dash-overview--forest dashboard-page">
      <div className="rf-do-inner">
        <header className="dashboard-header">
          <h1>{t('dashboardOverview', 'pageTitle')}</h1>
          <p className="rf-do-sub">{t('dashboardOverview', 'pageSubtitle')}</p>
        </header>

        <div className="rf-do-toolbar">
          <div className="rf-do-pill-group">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`rf-do-pill${activePreset === p.key ? ' rf-do-pill--active' : ''}`}
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="rf-do-dates">
            <label className="rf-do-field">
              <span>{t('dashboardOverview', 'labelFrom')}</span>
              <input
                type="date"
                className="rf-do-date-input"
                value={draftFrom}
                onChange={(e) => {
                  setDraftFrom(e.target.value);
                  setActivePreset('custom');
                }}
              />
            </label>
            <label className="rf-do-field">
              <span>{t('dashboardOverview', 'labelTo')}</span>
              <input
                type="date"
                className="rf-do-date-input"
                value={draftTo}
                onChange={(e) => {
                  setDraftTo(e.target.value);
                  setActivePreset('custom');
                }}
              />
            </label>
            <button type="button" className="rf-do-btn-primary" onClick={applyRange}>
              {t('dashboardOverview', 'refresh')}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rf-do-alert" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="rf-do-btn-primary"
              onClick={() =>
                payload ? fetchStats(from, to, activePreset) : fetchStats(draftFrom, draftTo, 'custom')
              }
            >
              {t('dashboardOverview', 'refresh')}
            </button>
          </div>
        ) : null}

        {payload ? (
          <div className={loading ? 'rf-do-loading-dim' : ''}>
            <div className="rf-do-range-badge">{rangeLabel}</div>

            <div className="rf-do-kpi-grid">
              <KpiFeatured
                title={t('dashboardOverview', 'totalOrders')}
                value={payload.totalCommandes}
                hint={kpiHint}
                Icon={FaShoppingBag}
                delay={0}
                reduce={reduce}
              />
              <KpiStandard title={t('dashboardOverview', 'kpiEntreprises')} value={payload.enterpriseCount} delay={0.04} reduce={reduce}>
                <FaBuilding className="pointer-events-none absolute bottom-3 right-3 text-3xl text-[#14532d] opacity-[0.12]" aria-hidden />
              </KpiStandard>
              <KpiStandard title={t('dashboardOverview', 'kpiMessages')} value={payload.unreadMessages} delay={0.08} reduce={reduce}>
                <FaRegEnvelope className="pointer-events-none absolute bottom-3 right-3 text-3xl text-[#14532d] opacity-[0.12]" aria-hidden />
              </KpiStandard>
              <KpiStandard
                title={t('dashboardOverview', 'status_livree')}
                value={payload.countsByStatus?.livree ?? 0}
                delay={0.12}
                reduce={reduce}
              >
                <FaCheckCircle className="pointer-events-none absolute bottom-3 right-3 text-3xl text-[#22c55e] opacity-[0.15]" aria-hidden />
              </KpiStandard>
            </div>

            <h2 className="rf-do-section-title">{t('dashboardOverview', 'statusCountsTitle')}</h2>

            <div className="rf-do-status-grid">
              {STATUS_KEYS.map((key, i) => (
                <motion.div
                  key={key}
                  className="rf-do-stat-mini"
                  style={{ boxShadow: `inset 0 3px 0 0 ${STATUS_ACCENT[key]}` }}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.025, type: 'spring', stiffness: 320, damping: 28 }}
                >
                  <div className="rf-do-stat-mini-num">{payload.countsByStatus?.[key] ?? 0}</div>
                  <div className="rf-do-stat-mini-label">{t('dashboardOverview', `status_${key}`)}</div>
                </motion.div>
              ))}
            </div>

            <div className="rf-do-analytics">
              <motion.section
                className="rf-do-panel"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              >
                <h3 className="rf-do-panel-title">{chartTitle}</h3>
                <p className="rf-do-panel-desc">{t('dashboardOverview', 'chartSubtitle')}</p>
                <div className="rf-do-chart-wrap">
                  {chartData.length && chartData.some((d) => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 12, right: 6, left: -18, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="4 10" vertical={false} stroke="rgba(20,83,45,0.08)" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: '#5c7268' }}
                          axisLine={false}
                          tickLine={false}
                          interval={payload.granularity === 'hour' ? 3 : 0}
                        />
                        <YAxis
                          allowDecimals={false}
                          width={34}
                          tick={{ fontSize: 11, fill: '#5c7268' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(20, 83, 45, 0.06)' }}
                          contentStyle={{
                            borderRadius: 14,
                            border: '1px solid rgba(20,83,45,0.1)',
                            boxShadow: '0 16px 40px -24px rgba(10,50,30,0.2)',
                          }}
                        />
                        <Bar dataKey="count" name={t('dashboardOverview', 'totalOrders')} radius={[16, 16, 0, 0]} maxBarSize={52}>
                          {chartData.map((_, i) => (
                            <Cell key={`c-${i}`} fill={BAR_FILLS[i % BAR_FILLS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="rf-do-empty">{t('dashboardOverview', 'emptyChart')}</div>
                  )}
                </div>
              </motion.section>

              <motion.section
                className="rf-do-panel"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, type: 'spring', stiffness: 260, damping: 26 }}
              >
                <h3 className="rf-do-panel-title">{t('dashboardOverview', 'statusDistribution')}</h3>
                <p className="rf-do-panel-desc">{kpiHint}</p>
                <div className="rf-do-donut-wrap">
                  {pieData.some((d) => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={92}
                          paddingAngle={2}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.key} fill={STATUS_ACCENT[entry.key]} stroke="#fff" strokeWidth={1} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: '1px solid rgba(20,83,45,0.1)',
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value) => <span style={{ color: '#4d6658', fontSize: 11 }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="rf-do-empty">{t('dashboardOverview', 'emptyChart')}</div>
                  )}
                </div>
              </motion.section>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
