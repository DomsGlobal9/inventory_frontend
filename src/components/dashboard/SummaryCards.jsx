import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Box } from 'lucide-react';
import SummaryCard from './SummaryCard';
import { formatINR, formatNumber } from '../../utils/formatUtils';
import WidgetSkeleton from './WidgetSkeleton';
import { Link } from 'react-router-dom';
import NoAccess from '../NoAccess';
import { isPermissionError } from '../../lib/access';

export default function SummaryCards({ data, isLoading, isError, error }) {

  // Only mounted for somebody allowed the figures (Dashboard checks report:financial). The 403
  // path below is for a role changed while the page was open: the app then re-reads permissions
  // (AuthContext) and this panel goes away.
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

  // These five tiles are the shop's money -- stock value, open orders, dead stock. A role
  // without report:financial is not meant to see them, and saying so plainly is right. Saying
  // "Failed to load dashboard metrics" in red is not: it is neither a failure nor a metric
  // problem, and it sends the person to look for a bug that is not there.
  if (isPermissionError(error)) {
    return <NoAccess error={error} height="122px" />;
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

  // Inventory value and the low-stock count are on the Dashboard's Stock on hand and Running low
  // cards now (Overview), with the value's notes, so they are not repeated here. The active-products
  // count went too: the Products page shows it, and it asked nothing of anybody.
  const cards = [
    {
      title: "Open PO Value",
      value: formatINR(safeData?.openPoValue),
      icon: FileText,
      colorClass: 'var(--accent-gold)',
      bgColorClass: 'rgba(245, 158, 11, 0.1)',
      // /purchase-orders does not exist and fell through to the dashboard; the list reads ?filter=open.
      to: '/inventory/purchase-orders?filter=open'
    },
    {
      title: "Dead Stock Value",
      value: formatINR(safeData?.deadStockValue),
      icon: Box,
      colorClass: safeData?.deadStockValue > 0 ? 'var(--accent-warning)' : 'var(--text-secondary)',
      bgColorClass: safeData?.deadStockValue > 0 ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      to: '/inventory?filter=dead_stock'
    },
  ];

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={itemVariants} className="dashboard-grid">
      {/* Links, because each tile opens a list: reachable with Tab, opened with Enter, and read
          out as a link with its figure. They were bare divs with a click handler -- mouse only. */}
      {cards.map((card, index) => (
        <Link key={index} to={card.to} className="dash-focus" style={{ display: 'block', color: 'inherit', textDecoration: 'none', borderRadius: '12px' }}>
          <SummaryCard
            title={card.title}
            value={card.value}
            note={card.note}
            secondaryNote={card.secondaryNote}
            icon={card.icon}
            colorClass={card.colorClass}
            bgColorClass={card.bgColorClass}
            clickable
          />
        </Link>
      ))}
    </motion.div>
  );
}
