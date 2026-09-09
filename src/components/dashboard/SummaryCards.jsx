import React from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, FileText, AlertTriangle, Package, Box } from 'lucide-react';
import SummaryCard from './SummaryCard';
import { formatINR, formatNumber } from '../../utils/formatUtils';
import WidgetSkeleton from './WidgetSkeleton';
import { useNavigate } from 'react-router-dom';
import { useLocationContext } from '../../contexts/LocationContext';

export default function SummaryCards({ data, isLoading, isError }) {
  const navigate = useNavigate();
  const { currentLocation } = useLocationContext();
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
      // Named for what it covers, not just "Inventory Value".
      //
      // The figure is scoped to the location chosen at the top of the screen, which is right
      // for someone standing in that shop -- but the title said "Inventory Value", so it read
      // as the whole business. A shop with two locations saw 20,73,986 here while the platform
      // console showed 41,47,972, and both were correct. That is the worst kind of
      // disagreement: nothing is broken, so there is nothing to find, and the merchant is left
      // believing one of their screens is lying.
      title: currentLocation && safeData?.companyWideValue != null
        ? `Inventory Value · ${currentLocation.name}`
        : "Inventory Value",
      value: formatINR(safeData?.inventoryValue),
      // Two different ways this number can mislead, and the shopkeeper is told which applies.
      // Nothing known at all means the stock counts as ₹0 and a full shelf looks like an empty
      // one; only a price known means it is valued at what it sells for, which is higher than
      // what it is worth by the margin. An unexplained figure is the thing to avoid, in
      // either direction.
      note: safeData?.unitsWithoutCost > 0
        ? `${formatNumber(safeData.unitsWithoutCost)} units have no cost or price recorded and count as ₹0. ` +
          `Add a unit cost when you stock in, or a price on the product.`
        : safeData?.unitsValuedAtPrice > 0
          ? `${formatNumber(safeData.unitsValuedAtPrice)} units are valued at their selling price ` +
            `because no cost was recorded. Add a unit cost when you stock in for a truer figure.`
          : null,
      // Shown only when it says something the headline does not: a location is selected and
      // the shop has more than one. Without it there is nowhere in the merchant's own app that
      // their whole business's stock value appears.
      secondaryNote: safeData?.companyWideValue != null
        ? `${formatINR(safeData.companyWideValue)} across all locations`
        : null,
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
            note={card.note}
            secondaryNote={card.secondaryNote}
            icon={card.icon}
            colorClass={card.colorClass}
            bgColorClass={card.bgColorClass}
          />
        </div>
      ))}
    </motion.div>
  );
}
