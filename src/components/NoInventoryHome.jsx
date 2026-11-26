import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * A client without the Inventory module signs in here too (26 Nov 2026, one-switch onboarding): the ScaleEzy login is
 * one for every app. Instead of Inventory's screens (closed for this shop), it shows the apps the shop has, with a way
 * into each, and Team members (the one place for the shop's people, every module's stand-in).
 */
const CRM_APP = String(import.meta.env.VITE_CRM_APP_URL ?? 'https://scaleezy-crm-frontend.vercel.app').trim().replace(/\/+$/, '');
const POS_APP = String(import.meta.env.VITE_POS_APP_URL ?? 'https://pos.scaleezy.com').trim().replace(/\/+$/, '');

const APPS = {
  pos: { name: 'ScaleEzy POS', line: 'Billing at the counter. Sign in with the POS login sent to you by email.', href: POS_APP },
  crm: { name: 'ScaleEzy CRM', line: 'Your customers, follow-ups and offers. Sign in with this same email and password.', href: CRM_APP },
  boutique: { name: 'Your Boutique app', line: 'Runs on ScaleEzy. Open it as you always do.', href: null }
};

export default function NoInventoryHome() {
  const { user, logout } = useAuth();
  const apps = (user?.modules ?? []).filter(m => APPS[m]);
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px 16px', background: 'var(--bg-main)' }} data-testid="no-inventory-home">
      <div style={{ width: 'min(560px, 100%)', display: 'grid', gap: 16 }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, color: 'var(--text-primary)' }}>Your ScaleEzy apps</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Your shop does not use ScaleEzy Inventory, so there is nothing to open here. Your apps are below.
          </p>
        </div>
        {apps.length ? apps.map(m => (
          <div key={m} style={{ border: '1px solid var(--border-light)', borderRadius: 14, padding: '14px 16px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{APPS[m].name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{APPS[m].line}</div>
            </div>
            {APPS[m].href && <a className="btn-primary" href={APPS[m].href} style={{ textDecoration: 'none' }}>Open</a>}
          </div>
        )) : (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No ScaleEzy app is switched on for your shop yet. Ask ScaleEzy support.</p>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn-secondary" to="/settings?section=USERS" style={{ textDecoration: 'none' }}>Team members</Link>
          <button type="button" className="btn-secondary" onClick={() => logout?.()}>Sign out</button>
        </div>
      </div>
    </main>
  );
}
