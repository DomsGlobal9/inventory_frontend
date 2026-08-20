import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Box, Users, Settings, Package, Truck, FileText } from 'lucide-react';

export default function Sidebar({ isOpen }) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Orders', path: '/orders', icon: ShoppingBag },
    { name: 'Returns', path: '/returns', icon: Truck },
    { name: 'Inventory', path: '/inventory', icon: Box },
    { name: 'Suppliers', path: '/inventory/suppliers', icon: Truck },
    { name: 'Purchase Orders', path: '/inventory/purchase-orders', icon: FileText },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

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
