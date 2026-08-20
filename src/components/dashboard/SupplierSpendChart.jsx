import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSupplierSpend } from '../../hooks/useSupplierSpend';
import { formatINR } from '../../utils/formatUtils';
import WidgetSkeleton from './WidgetSkeleton';
import ErrorCard from './ErrorCard';

export default function SupplierSpendChart() {
  const { data: spendData, isLoading, isError } = useSupplierSpend();

  if (isLoading) return <WidgetSkeleton height="400px" />;
  if (isError) return <ErrorCard message="Failed to load supplier data." height="400px" />;

  // Take top 5 for charting
  const chartData = (spendData || []).slice(0, 5).map(s => ({
    name: s.supplierName.length > 15 ? s.supplierName.substring(0, 15) + '...' : s.supplierName,
    fullName: s.supplierName,
    value: Number(s.totalSpend)
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: 'var(--text-primary)' }}>{payload[0].payload.fullName}</p>
          <p style={{ margin: 0, color: '#8b5cf6' }}>
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
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Supplier Concentration</h3>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {chartData.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
            No purchase order history available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-light)" />
              <XAxis 
                type="number" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
