import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import PageLoader from '../components/PageLoader';
import SummaryCards from '../components/dashboard/SummaryCards';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import LowStockWidget from '../components/dashboard/LowStockWidget';
import DeadStockWidget from '../components/dashboard/DeadStockWidget';
import SupplierSpendWidget from '../components/dashboard/SupplierSpendWidget';
import InventoryTrendChart from '../components/dashboard/InventoryTrendChart';
import SupplierSpendChart from '../components/dashboard/SupplierSpendChart';
import StockMovementChart from '../components/dashboard/StockMovementChart';
import { Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboardSummary();
  const navigate = useNavigate();
  const { resetProductData } = useProduct();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = searchParams.get('tab') || 'overview';

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'analytics', label: 'Analytics' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto', paddingBottom: '32px' }}>
      
      {/* Header */}
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px', color: 'var(--text-primary)' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Overview of your operations and analytics.</p>
        </div>
      </div>

      {/* Global Section: KPIs & Quick Actions */}
      <motion.div variants={item}>
        <SummaryCards data={data} isLoading={isLoading} isError={isError} />
      </motion.div>

      <motion.div variants={item} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => { resetProductData(); navigate('/add/general'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
          <Plus size={16} /> Product
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/inventory')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
          <Plus size={16} /> Stock In
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/inventory/purchase-orders/new')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
          <Plus size={16} /> Purchase Order
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/inventory/suppliers')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
          <Plus size={16} /> Supplier
        </button>
      </motion.div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border-light)', marginTop: '8px', marginBottom: '8px' }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '12px 0',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '400',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              transition: 'all 0.2s ease',
              marginBottom: '-1px'
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          variants={container} 
          initial="hidden" 
          animate="show" 
          exit={{ opacity: 0, y: -10, transition: { duration: 0.1 } }}
          style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
        >
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <motion.div variants={item}>
                <RecentTransactions />
              </motion.div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                <motion.div variants={item}>
                  <LowStockWidget />
                </motion.div>
                {/* Space for future Open PO Widget */}
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              <motion.div variants={item}>
                <LowStockWidget />
              </motion.div>
              <motion.div variants={item}>
                <DeadStockWidget />
              </motion.div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              <motion.div variants={item}>
                <InventoryTrendChart />
              </motion.div>
              <motion.div variants={item}>
                <StockMovementChart />
              </motion.div>
              <motion.div variants={item}>
                <SupplierSpendChart />
              </motion.div>
              <motion.div variants={item}>
                <SupplierSpendWidget />
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
