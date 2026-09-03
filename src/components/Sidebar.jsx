import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Box, Users, Settings, Package, Truck, FileText, ArrowLeftRight, MapPin, LogOut, User } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../context/AuthContext';

// permission: null/undefined means "visible to any authenticated user". Every entry
// below is now gated by the same permission key the matching backend route enforces.
const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard:view' },
  { name: 'Products', path: '/products', icon: Package, permission: 'product:view' },
  { name: 'Orders', path: '/orders', icon: ShoppingBag, permission: 'sales_order:view' },
  { name: 'Returns', path: '/returns', icon: Truck, permission: 'return:view' },
  { name: 'Inventory', path: '/inventory', icon: Box, permission: 'inventory:view' },
  { name: 'Transfers', path: '/inventory/transfers', icon: ArrowLeftRight, permission: 'inventory:transfer' },
  { name: 'Purchase Orders', path: '/inventory/purchase-orders', icon: FileText, permission: 'purchase_order:view' },
  { name: 'Customers', path: '/customers', icon: Users, permission: 'customer:view' },
  { name: 'Settings', path: '/settings', icon: Settings, permission: null },
];

export default function Sidebar({ isOpen }) {
  const location = useLocation();
  const { can } = usePermission();
  const { user, logout } = useAuth();

  const navItems = NAV_ITEMS.filter((item) => can(item.permission));

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1 style={{ fontSize: '28px', margin: 0, color: 'var(--text-primary)', textAlign: 'center', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'} onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
            Scaleezy
          </h1>
        </Link>
      </div>

      {/* Navigation */}
      {/* minHeight: 0 overrides the flex-item default of min-height: auto, which
          otherwise refuses to let this shrink below its content's natural height --
          without it, on a short viewport this pushes the footer chip below down past
          the last nav items instead of scrolling internally, crowding the two together. */}
      <nav style={{ flex: 1, minHeight: 0, padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / User short info */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-light)', flexShrink: 0 }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '10px', 
          padding: '8px', borderRadius: '12px',
          backgroundColor: 'var(--bg-body)', 
          border: '1px solid var(--border-light)',
          transition: 'all 0.2s'
        }}>
           <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: 'var(--primary-color)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--bg-dark)'
           }}>
             <User size={18} />
           </div>
           
           <div style={{ flex: 1, overflow: 'hidden' }}>
             <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
               {user?.name || 'User'}
             </div>
             <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
               {user?.email || ''}
             </div>
           </div>

           <button
             onClick={logout}
             title="Sign out"
             style={{
               width: '32px', height: '32px', borderRadius: '8px', border: 'none',
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)',
               flexShrink: 0, transition: 'all 0.2s'
             }}
             onMouseOver={(e) => {
               e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
               e.currentTarget.style.color = '#ef4444';
             }}
             onMouseOut={(e) => {
               e.currentTarget.style.backgroundColor = 'transparent';
               e.currentTarget.style.color = 'var(--text-secondary)';
             }}
           >
             <LogOut size={16} />
           </button>
        </div>
      </div>
    </aside>
  );
}
