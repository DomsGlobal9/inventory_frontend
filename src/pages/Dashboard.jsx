import React from 'react';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import SetUpShelvesCard from '../components/shelves/SetUpShelvesCard';
import WaitingWidget from '../components/dashboard/WaitingWidget';
import Overview from '../components/dashboard/Overview';
import LowerHalf from '../components/dashboard/LowerHalf';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProduct } from '../context/ProductContext';
import { usePermission } from '../hooks/usePermission';

export default function Dashboard() {
  const { can } = usePermission();
  // The shop's money (the Stock value notes): asked for only by somebody allowed to see it.
  const canSeeMoney = can('report:financial');
  // Only the valuation notes under the Stock value card come from here now (Overview).
  const { data } = useDashboardSummary(canSeeMoney);
  const navigate = useNavigate();
  const { resumePath } = useProduct();

  return (
    // dash-page: every section keeps its height. This column scrolls, and a flex column shrinks any child
    // with its own overflow (the tab bar scrolls sideways) when the page is taller than the screen --
    // the taller top half squashed the tab bar to one pixel, invisible and unclickable.
    <div className="dash-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto', paddingBottom: '32px' }}>
      
      {/* The welcome band, the live cards, the sales chart, top sellers and the latest orders -- each
          part only when this person may see it (the server leaves the rest out). The buttons are only
          the shortcuts this person can actually walk through: offering "+ Purchase Order" to somebody
          who cannot raise one is worse than nothing -- they press it and land on a wall. */}
      <Overview summary={canSeeMoney ? data : null} actions={<>
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
        {can('supplier:create') && (
          <button className="btn btn-secondary" onClick={() => navigate('/inventory/suppliers')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
            <Plus size={16} /> Supplier
          </button>
        )}
        {/* The same rule the server uses for a counter return: return:counter, or create AND complete. */}
        {(can('return:counter') || (can('return:create') && can('return:complete'))) && (
          <button className="btn btn-secondary" onClick={() => navigate('/returns/new')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
            <Plus size={16} /> Take a return
          </button>
        )}
        {can('customer:create') && (
          <button className="btn btn-secondary" onClick={() => navigate('/customers')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
            <Plus size={16} /> Customer
          </button>
        )}
      </>} />

      {/* A shop that has not set up its shelves would never find the feature otherwise. It hides
          itself once the work is done, and for good if they say they do not use shelves. */}
      <SetUpShelvesCard />

      {/* Customers who wanted something that had sold out: the one thing here that goes stale, so
          first. It renders nothing when nobody is waiting. */}
      <WaitingWidget />

      {/* Waiting on you, money tied up, stock moves and what to restock, in the same cards as the
          top half. They replaced six tiles (four mostly reading 0) and two tabs on 23 Oct; the old
          Open PO tile summed whole orders across the shop, this says what is still to arrive here. */}
      <LowerHalf canMoves={can('report:view')} canOrder={can('purchase_order:create')} />
      <style>{`.dash-focus:focus-visible { outline: 2px solid var(--accent-primary, #3b82f6); outline-offset: 3px; border-radius: 6px; }`}</style>
    </div>
  );
}
