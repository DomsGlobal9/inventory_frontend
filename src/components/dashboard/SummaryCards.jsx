import React from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, FileText, AlertTriangle, Package, Box } from 'lucide-react';
import SummaryCard from './SummaryCard';
import { formatINR, formatNumber } from '../../utils/formatUtils';
import WidgetSkeleton from './WidgetSkeleton';
import { useNavigate } from 'react-router-dom';

export default function SummaryCards({ data, isLoading, isError }) {
  const navigate = useNavigate();
  if (isLoading) {
    return (
      <div className="dashboard-grid">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="stat-card" style={{ height: '122px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <motion.div style={{ width: '100px', height: '16px', backgroundColor: 'var(--bg-hover)', borderRadius: '4px' }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <motion.div style={{ width: '32px', height: '32px', backgroundColor: 'var(--bg-hover)', borderRadius: '8px' }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
            </div>
            <motion.div style={{ width: '140px', height: '28px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px', marginTop: 'auto' }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: '32px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: '12px', textAlign: 'center' }}>
        Failed to load dashboard metrics.
      </div>
    );
  }

  const safeData = data || {
    inventoryValue: 0,
    openPoValue: 0,
    lowStockCount: 0,
    deadStockValue: 0,
    activeProducts: 0
  };

  const cards = [
    {
      title: "Inventory Value",
      value: formatINR(safeData?.inventoryValue),
      icon: IndianRupee,
      colorClass: '#3b82f6',
      bgColorClass: 'rgba(59, 130, 246, 0.1)',
      onClick: () => navigate('/inventory')
    },
    {
      title: "Open PO Value",
      value: formatINR(safeData?.openPoValue),
      icon: FileText,
      colorClass: 'var(--accent-gold)',
      bgColorClass: 'rgba(245, 158, 11, 0.1)',
      onClick: () => navigate('/purchase-orders?filter=open')
    },
    {
      title: "Low Stock Count",
      value: formatNumber(safeData?.lowStockCount),
      icon: AlertTriangle,
      colorClass: safeData?.lowStockCount > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)',
      bgColorClass: safeData?.lowStockCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      onClick: () => navigate('/inventory?filter=low_stock')
    },
    {
      title: "Dead Stock Value",
      value: formatINR(safeData?.deadStockValue),
      icon: Box,
      colorClass: safeData?.deadStockValue > 0 ? 'var(--accent-warning)' : 'var(--text-secondary)',
      bgColorClass: safeData?.deadStockValue > 0 ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      onClick: () => navigate('/inventory?filter=dead_stock')
    },
    {
      title: "Active Products",
      value: formatNumber(safeData?.activeProducts),
      icon: Package,
      colorClass: 'var(--accent-success)',
      bgColorClass: 'rgba(16, 185, 129, 0.1)',
      onClick: () => navigate('/products')
    }
  ];

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={itemVariants} className="dashboard-grid">
      {cards.map((card, index) => (
        <div key={index} onClick={card.onClick} style={{ cursor: 'pointer' }}>
          <SummaryCard 
            title={card.title}
            value={card.value}
            icon={card.icon}
            colorClass={card.colorClass}
            bgColorClass={card.bgColorClass}
          />
        </div>
      ))}
    </motion.div>
  );
}
