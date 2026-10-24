import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';

/**
 * Orders | Returns, at the top of both pages. Returns used to be its own entry in the side menu;
 * since 24 Oct it lives under Orders, where people look for "the customer brought it back".
 * Each tab shows only for those who may open it; with one tab there is nothing to switch, so none show.
 */
export default function OrdersTabs() {
  const { can } = usePermission();
  const tabs = [
    can('sales_order:view') && { to: '/orders', label: 'Orders' },
    can('return:view') && { to: '/returns', label: 'Returns' }
  ].filter(Boolean);
  if (tabs.length < 2) return null;
  return (
    <nav className="orders-tabs" aria-label="Orders and returns">
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end={false} className={({ isActive }) => (isActive ? 'active' : '')}>{t.label}</NavLink>
      ))}
    </nav>
  );
}
