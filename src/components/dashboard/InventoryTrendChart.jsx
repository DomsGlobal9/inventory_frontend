import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSnapshots } from '../../hooks/useSnapshots';
import { formatINR } from '../../utils/formatUtils';
import WidgetSkeleton from './WidgetSkeleton';
import ErrorCard from './ErrorCard';

export default function InventoryTrendChart() {
  const { data: snapshots, isLoading, isError } = useSnapshots(30);

  if (isLoading) return <WidgetSkeleton height="400px" />;
  if (isError) return <ErrorCard message="Failed to load trend data." height="400px" />;

  const chartData = (snapshots || []).map(snap => ({
    date: new Date(snap.snapshotDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: Number(snap.totalValue)
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: 'var(--text-primary)' }}>{label}</p>
          <p style={{ margin: 0, color: 'var(--accent-gold)' }}>
            {formatINR(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="stat-card" style={{ gap: '24px', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Inventory Value Trend</h3>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {chartData.length < 2 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
            No trend data available yet. Check back tomorrow.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
