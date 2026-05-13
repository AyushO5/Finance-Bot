import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Activity, Target, TrendingUp, Calendar } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000';
const COLORS = ['#00f3ff', '#b026ff', '#00ff66', '#ff0055', '#fcee0a', '#ff9900'];

const RANGE_OPTIONS = [
  { key: 'week',  label: 'Last 7 Days',  icon: '📅' },
  { key: 'month', label: 'Last 30 Days', icon: '🗓️' },
  { key: 'year',  label: 'Last 12 Months', icon: '📆' },
];

export default function Dashboard({ goals = [] }) {
  const [data,       setData]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [range,      setRange]      = useState('month');
  const [insight,    setInsight]    = useState(null);
  const [insightLoading, setInsightLoading] = useState(true);

  const fetchExpenses = async (selectedRange) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/memory/expenses?range=${selectedRange}`);
      const raw = res.data.data;
      setData(raw);
      const cats = new Set();
      raw.forEach(item => Object.keys(item).forEach(k => { if (k !== 'name') cats.add(k); }));
      setCategories(Array.from(cats));
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/memory/expenses/summary`);
      setInsight(res.data.insight);
    } catch (err) {
      console.error('Failed to load insight:', err);
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(range); }, [range]);
  useEffect(() => { fetchInsight(); }, []);

  // Summary stats
  const totalSpend = data.reduce((sum, row) => {
    return sum + Object.entries(row)
      .filter(([k]) => k !== 'name')
      .reduce((s, [, v]) => s + v, 0);
  }, 0);

  const topCategory = (() => {
    const totals = {};
    data.forEach(row => {
      Object.entries(row).forEach(([k, v]) => {
        if (k !== 'name') totals[k] = (totals[k] || 0) + v;
      });
    });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0] : null;
  })();

  const latestMonth = data.length > 0 ? data[data.length - 1] : null;
  const pieData = latestMonth
    ? Object.keys(latestMonth).filter(k => k !== 'name').map(k => ({ name: k, value: latestMonth[k] }))
    : [];

  const rangeLabel = RANGE_OPTIONS.find(r => r.key === range)?.label || '';

  return (
    <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Activity color="var(--accent)" /> Financial Dashboard
        </h2>

        {/* Range Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px' }}>
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: range === opt.key ? 700 : 400,
                fontSize: '0.85rem',
                background: range === opt.key
                  ? 'linear-gradient(135deg, var(--accent-secondary), var(--accent))'
                  : 'transparent',
                color: range === opt.key ? '#0a0a12' : 'var(--text-muted)',
                transition: 'all 0.2s',
                boxShadow: range === opt.key ? '0 0 12px var(--accent-glow)' : 'none',
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: '2rem' }}>Loading expenses...</div>
      ) : data.length === 0 ? (
        <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
          <Calendar size={32} style={{ marginBottom: '1rem', color: 'var(--accent)' }} />
          <h3>No expense data for {rangeLabel}</h3>
          <p>Upload a CSV, PDF, or image receipt in the Chat to start tracking expenses.</p>
        </div>
      ) : (
        <>
          {/* AI Spending Insight Card */}
          {(insight || insightLoading) && (
            <div className="chart-container" style={{
              padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, rgba(0,243,255,0.05), rgba(176,38,255,0.05))',
              border: '1px solid rgba(0,243,255,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🤖</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' }}>AI Spending Insight</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>this month vs last month</span>
              </div>
              {insightLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Analyzing your spending patterns...</div>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>{insight}</p>
              )}
            </div>
          )}

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="chart-container" style={{ padding: '1.25rem', margin: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>TOTAL SPENT</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>₹{totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{rangeLabel}</div>
            </div>
            <div className="chart-container" style={{ padding: '1.25rem', margin: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>TOP CATEGORY</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b026ff' }}>{topCategory ? topCategory[0] : '—'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {topCategory ? `₹${topCategory[1].toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''}
              </div>
            </div>
            <div className="chart-container" style={{ padding: '1.25rem', margin: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>DATA POINTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#00ff66' }}>{data.length}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Time buckets</div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>

            {/* Pie Chart — breakdown of latest period */}
            <div className="chart-container" style={{ height: '380px', padding: '1.5rem', margin: 0 }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Category Breakdown ({latestMonth?.name})</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #30363d', borderRadius: '8px' }} formatter={v => `₹${v.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Goals Progress */}
            <div className="chart-container" style={{ height: '380px', padding: '1.5rem', margin: 0, overflowY: 'auto' }}>
              <h4 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--accent)" /> Active Goals Progress
              </h4>
              {goals.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No active goals. Add some from the sidebar!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {goals.map(goal => {
                    const percent = Math.min((goal.saved / goal.target) * 100, 100).toFixed(1);
                    return (
                      <div key={goal.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 500 }}>{goal.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{goal.currency}{goal.saved} / {goal.target}</span>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percent}%`, background: 'linear-gradient(90deg, var(--accent-secondary), var(--accent))', boxShadow: '0 0 10px var(--accent-glow)', transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{percent}% complete{goal.deadline ? ` · Due ${goal.deadline}` : ''}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Area / Bar Chart — trend over time */}
          <div className="chart-container" style={{ height: '360px', padding: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--accent)" /> Expense Trend — {rangeLabel}
            </h4>
            <ResponsiveContainer width="100%" height="100%">
              {range === 'year' ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="name" stroke="#8B949E" fontSize={12} />
                  <YAxis stroke="#8B949E" fontSize={12} tickFormatter={v => `₹${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #30363d', borderRadius: '8px' }} formatter={v => `₹${v.toLocaleString()}`} />
                  <Legend />
                  {categories.map((cat, i) => <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[i % COLORS.length]} />)}
                </BarChart>
              ) : (
                <AreaChart data={data}>
                  <defs>
                    {categories.map((cat, i) => (
                      <linearGradient key={cat} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="name" stroke="#8B949E" fontSize={12} />
                  <YAxis stroke="#8B949E" fontSize={12} tickFormatter={v => `₹${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #30363d', borderRadius: '8px' }} formatter={v => `₹${v.toLocaleString()}`} />
                  <Legend />
                  {categories.map((cat, i) => (
                    <Area key={cat} type="monotone" dataKey={cat} stroke={COLORS[i % COLORS.length]} fill={`url(#grad${i})`} strokeWidth={2} dot={false} />
                  ))}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
