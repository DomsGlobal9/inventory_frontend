import React from 'react';
import { motion } from 'framer-motion';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import PageLoader from '../components/PageLoader';
import SummaryCards from '../components/dashboard/SummaryCards';
import SetUpShelvesCard from '../components/shelves/SetUpShelvesCard';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import LowStockWidget from '../components/dashboard/LowStockWidget';
import WaitingWidget from '../components/dashboard/WaitingWidget';
import DeadStockWidget from '../components/dashboard/DeadStockWidget';
import SupplierSpendWidget from '../components/dashboard/SupplierSpendWidget';
import InventoryTrendChart from '../components/dashboard/InventoryTrendChart';
import SupplierSpendChart from '../components/dashboard/SupplierSpendChart';
import StockMovementChart from '../components/dashboard/StockMovementChart';
import { Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';
import { usePermission } from '../hooks/usePermission';

export default function Dashboard() {
  const { can } = usePermission();
  // The five tiles are the shop's money. Asked for only by somebody allowed to see them.
  const canSeeMoney = can('report:financial');
  const { data, isLoading, isError, error } = useDashboardSummary(canSeeMoney);
  const navigate = useNavigate();
  const { resumePath } = useProduct();
  const [searchParams, setSearchParams] = useSearchParams();
  
  /*
   * Each widget only for somebody allowed its data, and a tab only when it has one.
   *
   * A salesperson was shown "Not part of your role" for the stock reports and, right under it,
   * "All stock levels are healthy" -- the low-stock widget's query was switched off for them, so
   * it read an empty answer as good news while three items were low. A widget that cannot load
   * must not speak at all.
   */
  const canStock = can('inventory:view');
  const canReports = can('report:view');
  const widgets = {
    overview: [canReports && 'recent', canStock && 'lowStock'].filter(Boolean),
    inventory: [canStock && 'lowStock', canSeeMoney && 'deadStock'].filter(Boolean),
    analytics: [canSeeMoney && 'trend', canReports && 'movement', canSeeMoney && 'spendChart', canSeeMoney && 'spend'].filter(Boolean)
  };
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'analytics', label: 'Analytics' }
  ].filter(t => widgets[t.id].length > 0);

  const asked = searchParams.get('tab') || 'overview';
  const activeTab = tabs.some(t => t.id === asked) ? asked : tabs[0]?.id;
  const shows = (w) => activeTab && widgets[activeTab].includes(w);

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

  // Arrow keys move between tabs, as a screen reader announces a tab list to work.
  const onTabKey = (e, index) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const jump = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (!step && jump === null) return;
    e.preventDefault();
    const next = jump ?? (index + step + tabs.length) % tabs.length;
    handleTabChange(tabs[next].id);
    document.getElementById(`dash-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto', paddingBottom: '32px' }}>
      
      {/* Header */}
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px', color: 'var(--text-primary)' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Overview of your operations and analytics.</p>
        </div>
      </div>

      {/* A shop that has not set up its shelves would never find the feature otherwise. It hides
          itself once the work is done, and for good if they say they do not use shelves. */}
      <SetUpShelvesCard />

      {/* Global Section: KPIs & Quick Actions */}
      <motion.div variants={item}>
        <SummaryCards data={data} isLoading={isLoading} isError={isError} error={error} noAccess={!canSeeMoney} />
      </motion.div>

      {/* Only the shortcuts this person can actually walk through.
          Offering "+ Purchase Order" to somebody who cannot raise one is worse than offering
          nothing: they press it, and land on a wall they had no way to predict. */}
      <motion.div variants={item} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {can('product:create') && (
          <button className="btn btn-primary" onClick={() => navigate(resumePath())} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
            <Plus size={16} /> Product
          </button>
        )}
        {can('inventory:receive') && (
          <button className="btn btn-secondary" onClick={() => navigate('/inventory')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
            <Plus size={16} /> Stock In
          </button>
        )}
        {can('purchase_order:create') && (
          <button className="btn btn-secondary" onClick={() => navigate('/inventory/purchase-orders/new')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
            <Plus size={16} /> Purchase Order
          </button>
        )}
        {can('supplier:view') && (
          <button className="btn btn-secondary" onClick={() => navigate('/inventory/suppliers')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
            <Plus size={16} /> Supplier
          </button>
        )}
      </motion.div>

      {/* Tabs. Real tabs: buttons in a tab list, reachable and switchable from the keyboard and
          announced as tabs -- they were bare divs, so mouse-only and silent to a screen reader. */}
      {tabs.length > 0 && (
        <div role="tablist" aria-label="Dashboard sections" style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border-light)', marginTop: '8px', marginBottom: '8px', overflowX: 'auto' }}>
          {tabs.map((tab, index) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`dash-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="dash-tab-panel"
                tabIndex={selected ? 0 : -1}
                className="dash-focus"
                onClick={() => handleTabChange(tab.id)}
                onKeyDown={(e) => onTabKey(e, index)}
                style={{
                  padding: '12px 0',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  font: 'inherit',
                  fontWeight: selected ? '600' : '400',
                  color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderBottom: selected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  marginBottom: '-1px',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {activeTab && (
        <motion.div
          key={activeTab}
          id="dash-tab-panel"
          role="tabpanel"
          aria-labelledby={`dash-tab-${activeTab}`}
          variants={container}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -10, transition: { duration: 0.1 } }}
          style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
        >
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Customers who wanted something that had sold out. First, because it is the only
                  thing on this screen that goes stale -- somebody waiting a week has bought it
                  somewhere else. It renders nothing at all when nobody is waiting, so it costs a
                  shop with none of them no space and no attention. */}
              <motion.div variants={item}><WaitingWidget /></motion.div>
              {shows('recent') && (
                <motion.div variants={item}>
                  <RecentTransactions />
                </motion.div>
              )}
              {shows('lowStock') && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '24px' }}>
                  <motion.div variants={item}>
                    <LowStockWidget />
                  </motion.div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: '24px' }}>
              {shows('lowStock') && <motion.div variants={item}><LowStockWidget /></motion.div>}
              {shows('deadStock') && <motion.div variants={item}><DeadStockWidget /></motion.div>}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: '24px' }}>
              {shows('trend') && <motion.div variants={item}><InventoryTrendChart /></motion.div>}
              {shows('movement') && <motion.div variants={item}><StockMovementChart /></motion.div>}
              {shows('spendChart') && <motion.div variants={item}><SupplierSpendChart /></motion.div>}
              {shows('spend') && <motion.div variants={item}><SupplierSpendWidget /></motion.div>}
            </div>
          )}
        </motion.div>
      )}
      <style>{`.dash-focus:focus-visible { outline: 2px solid var(--accent-primary, #3b82f6); outline-offset: 3px; border-radius: 6px; }`}</style>
    </div>
  );
}
