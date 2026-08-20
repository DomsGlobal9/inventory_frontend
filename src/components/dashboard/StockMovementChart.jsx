import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStockMovement } from '../../hooks/useStockMovement';
import WidgetSkeleton from './WidgetSkeleton';
import ErrorCard from './ErrorCard';

const COLORS = {
  'PURCHASE_RECEIPT': '#10b981', // green
  'RETURN_RESTOCK': '#34d399', // light green
  'SALES_DISPATCH': '#ef4444', // red
  'DAMAGE_WRITE_OFF': '#f87171', // light red
  'CYCLE_COUNT_UP': '#3b82f6', // blue
  'CYCLE_COUNT_DOWN': '#60a5fa', // light blue
  'MANUAL_ADJUSTMENT': '#8b5cf6' // purple
};

export default function StockMovementChart() {
  const { data: movementData, isLoading, isError } = useStockMovement();

  if (isLoading) return <WidgetSkeleton height="400px" />;
  if (isError) return <ErrorCard message="Failed to load stock movement data." height="400px" />;

  const chartData = (movementData || []).map(m => ({
    name: m.type.replace(/_/g, ' '),
    value: Math.abs(Number(m.totalQuantity)), // use absolute volume
    originalType: m.type
  })).filter(m => m.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: 'var(--text-primary)' }}>{payload[0].name}</p>
          <p style={{ margin: 0, color: payload[0].payload.fill }}>
            Volume: {payload[0].value} units
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="stat-card" style={{ gap: '24px', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Stock Movement (30 Days)</h3>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {chartData.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
            No stock movements recorded.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="var(--bg-card)"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.originalType] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={72} 
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
