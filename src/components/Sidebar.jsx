import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Box, Users, Settings, Package, Truck, FileText } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';

// permission: null/undefined means "visible to any authenticated user" —
// today that's true for routes the backend doesn't yet permission-gate
// (products, suppliers, purchase orders, settings). Only list a permission
// here once the matching backend route actually enforces it.
const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: null },
  { name: 'Products', path: '/products', icon: Package, permission: null },
  { name: 'Orders', path: '/orders', icon: ShoppingBag, permission: 'sales_order:view' },
  { name: 'Returns', path: '/returns', icon: Truck, permission: 'return:view' },
  { name: 'Inventory', path: '/inventory', icon: Box, permission: 'inventory:view' },
  { name: 'Suppliers', path: '/inventory/suppliers', icon: Truck, permission: null },
  { name: 'Purchase Orders', path: '/inventory/purchase-orders', icon: FileText, permission: null },
  { name: 'Customers', path: '/customers', icon: Users, permission: 'customer:view' },
  { name: 'Settings', path: '/settings', icon: Settings, permission: null },
];

export default function Sidebar({ isOpen }) {
  const location = useLocation();
  const { can } = usePermission();

  const navItems = NAV_ITEMS.filter((item) => can(item.permission));

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <h1 style={{ fontSize: '28px', margin: 0, color: 'var(--text-primary)', textAlign: 'center' }}>
          Scaleezy
        </h1>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
      <div style={{ padding: '24px', borderTop: '1px solid var(--border-light)' }}>
         <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
           v1.0.0
         </div>
      </div>
    </aside>
  );
}
