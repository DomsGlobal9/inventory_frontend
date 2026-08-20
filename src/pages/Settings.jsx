import React, { useState } from 'react';
import { Settings as SettingsIcon, Tag, Palette, Scissors, Layers, Hexagon, Grid, ShoppingBag, Store, Users, CreditCard, Key } from 'lucide-react';
import CatalogManager from '../components/CatalogManager';

const SETTINGS_DOMAINS = [
  { id: 'GENERAL', label: 'General Info', icon: Store },
  { id: 'CATALOG', label: 'Catalog Configuration', icon: Grid },
  { id: 'USERS', label: 'Team & Users', icon: Users },
  { id: 'BILLING', label: 'Billing & Subscriptions', icon: CreditCard },
  { id: 'API', label: 'API Credentials', icon: Key },
];

const CATALOG_TABS = [
  { id: 'SIZE', label: 'Sizes', icon: Scissors, description: 'Manage available sizes across your products' },
  { id: 'COLOR', label: 'Colors', icon: Palette, description: 'Define the color palette used in your boutique' },
  { id: 'DRESS_TYPE', label: 'Dress Types', icon: Tag, description: 'Manage dress styles (e.g., Saree, Gown)' },
  { id: 'MATERIAL', label: 'Materials', icon: Layers, description: 'List the fabrics and materials you offer' },
  { id: 'DESIGN_TYPE', label: 'Design Types', icon: Hexagon, description: 'Manage design styles and patterns' },
  { id: 'CATEGORY', label: 'Categories', icon: Grid, description: 'High-level product categories (e.g., WOMEN)' },
  { id: 'PRODUCT_TYPE', label: 'Product Types', icon: ShoppingBag, description: 'Types of products (e.g., READY_TO_WEAR)' },
];

export default function Settings() {
  const [activeDomain, setActiveDomain] = useState('CATALOG');
  const [activeCatalogTab, setActiveCatalogTab] = useState('SIZE');
  
  const activeCatalogInfo = CATALOG_TABS.find(t => t.id === activeCatalogTab);

  return (
    <div className="mobile-no-scroll" style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '32px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SettingsIcon size={32} />
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your boutique configuration, team, and billing.</p>
      </header>

      <div className="mobile-col" style={{ display: 'flex', gap: '32px', flex: 1, minHeight: 0 }}>
        
        {/* Left Sidebar: Domains */}
        <div className="settings-sidebar" style={{ 
          flexShrink: 0,
          background: 'var(--bg-surface)', 
          borderRadius: '16px', 
          border: '1px solid var(--border-light)',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <style>{`
            .settings-sidebar { width: 280px; }
            @media (max-width: 768px) {
              .settings-sidebar { width: 100%; }
            }
          `}</style>
          <div style={{ padding: '0 24px 12px 24px', borderBottom: '1px solid var(--border-light)', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Configuration
            </h3>
          </div>
          
          {SETTINGS_DOMAINS.map(domain => {
            const Icon = domain.icon;
            const isActive = activeDomain === domain.id;
            return (
              <button
                key={domain.id}
                onClick={() => setActiveDomain(domain.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 24px',
                  background: isActive ? 'rgba(0,0,0,0.03)' : 'transparent',
                  border: 'none',
                  borderLeft: `4px solid ${isActive ? 'var(--primary-color)' : 'transparent'}`,
                  color: isActive ? 'var(--primary-color)' : 'var(--text-primary)',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={18} />
                {domain.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingBottom: '64px', paddingRight: '8px' }}>
          
          {activeDomain === 'CATALOG' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Horizontal Tabs for Catalog */}
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap',
                gap: '8px', 
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border-light)'
              }}>
                {CATALOG_TABS.map(tab => {
                  const isActive = activeCatalogTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCatalogTab(tab.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 16px', border: 'none',
                        background: isActive ? 'var(--primary-color)' : 'var(--bg-surface)',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        borderRadius: '24px', cursor: 'pointer',
                        fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease',
                        border: isActive ? '1px solid transparent' : '1px solid var(--border-light)'
                      }}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Catalog Manager Instance */}
              <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>{activeCatalogInfo?.label}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>{activeCatalogInfo?.description}</p>
                </div>
                
                <CatalogManager type={activeCatalogTab} />
              </div>

            </div>
          )}

          {activeDomain !== 'CATALOG' && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '48px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {(() => {
                  const Icon = SETTINGS_DOMAINS.find(d => d.id === activeDomain)?.icon;
                  return Icon ? <Icon size={48} opacity={0.5} /> : null;
                })()}
              </div>
              <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                {SETTINGS_DOMAINS.find(d => d.id === activeDomain)?.label}
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                This section is under construction. Future configuration options will be available here.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
