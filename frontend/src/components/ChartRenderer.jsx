import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

const COLORS = ['#00f3ff', '#b026ff', '#00ff66', '#ff0055', '#fcee0a', '#ff9900'];

export function ComparisonChart({ extra }) {
  if (!extra || !extra.comparison_data || !extra.comparison_data.data) return null;
  const comp = extra.comparison_data;
  const rawData = comp.data;
  const chartDataMap = {};
  const tickers = Object.keys(rawData);

  tickers.forEach(ticker => {
    if (rawData[ticker]) {
      Object.entries(rawData[ticker]).forEach(([date, price]) => {
        if (!chartDataMap[date]) chartDataMap[date] = { date };
        chartDataMap[date][ticker] = price;
      });
    }
  });

  const finalData = Object.values(chartDataMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (finalData.length === 0) return null;

  return (
    <div className="chart-container" style={{ height: '300px', marginTop: '1rem' }}>
      <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TrendingUp size={18} color="var(--accent)" /> Stock Comparison
      </h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={finalData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" stroke="#8B949E" fontSize={12} tickFormatter={v => v.slice(5)} />
          <YAxis stroke="#8B949E" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #30363d', borderRadius: '8px' }} />
          <Legend />
          {tickers.map((t, i) =>
            rawData[t] && Object.keys(rawData[t]).length > 0 ? (
              <Line key={t} type="monotone" dataKey={t} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExpenseChart({ expenses }) {
  if (!expenses) return null;
  const data = Object.entries(expenses).map(([name, value]) => ({ name, value }));

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="var(--text-main)" fontSize="12" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {name} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <div className="chart-container" style={{ height: '350px', marginTop: '1rem', display: 'flex', flexDirection: 'column' }}>
      <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BarChart3 size={18} color="var(--accent)" /> Expense Distribution
      </h4>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={110}
            paddingAngle={2} dataKey="value"
            label={renderCustomizedLabel}
            labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={value => [`₹${value.toLocaleString()}`, 'Amount']}
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #30363d', borderRadius: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SentimentBadge({ data }) {
  if (!data || !data.sentiment) return null;

  const isBullish = data.sentiment.toLowerCase().includes('bullish');
  const isBearish = data.sentiment.toLowerCase().includes('bearish');

  let color = 'var(--text-muted)';
  let bg = 'rgba(255,255,255,0.05)';
  let icon = '😐';

  if (isBullish) {
    color = '#00ff66';
    bg = 'rgba(0, 255, 102, 0.1)';
    icon = '🐂';
  } else if (isBearish) {
    color = '#ff0055';
    bg = 'rgba(255, 0, 85, 0.1)';
    icon = '🐻';
  }

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}>
          📰 {data.ticker} News Sentiment
        </h4>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '20px',
          background: bg, color: color, fontWeight: 'bold', fontSize: '0.85rem',
          border: `1px solid ${color}33`,
          boxShadow: `0 0 10px ${bg}`
        }}>
          {icon} {data.sentiment.toUpperCase()}
        </div>
      </div>
      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.7' }}>
        {data.headlines.slice(0, 3).map((hl, i) => (
          <li key={i}>{hl}</li>
        ))}
      </ul>
    </div>
  );
}
