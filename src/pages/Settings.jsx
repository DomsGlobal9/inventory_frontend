import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings as SettingsIcon, Tag, Palette, Scissors, Layers, Hexagon, Grid, ShoppingBag, Store, Users, Key, Shield, MapPin, LifeBuoy, BookOpen, Globe, MessageCircle, Gift, Undo2 } from 'lucide-react';
import CatalogManager from '../components/CatalogManager';
import StockLocationsPage from './settings/StockLocationsPage';
import DayBook from './DayBook';
import StorefrontManager from '../components/StorefrontManager';
import GeneralInfoPanel from '../components/GeneralInfoPanel';
import ServicesPanel from '../components/ServicesPanel';
import SupportPanel from '../components/SupportPanel';
import TeamManager from '../components/TeamManager';
import RoleManager from '../components/RoleManager';
import WhatsAppSettings from '../components/whatsapp/WhatsAppSettings';
import LoyaltySettings from '../components/loyalty/LoyaltySettings';
import OnlineShopSettings from '../components/settings/OnlineShopSettings';
import ReturnRulesPanel from '../components/sales/ReturnRulesPanel';
import { holdsEverything } from '../lib/authority';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';

const SETTINGS_DOMAINS = [
  { id: 'GENERAL', label: 'General Info', icon: Store },
  { id: 'CATALOG', label: 'Catalog Configuration', icon: Grid, permission: 'admin:catalog' },
  { id: 'LOCATIONS', label: 'Stock Locations', icon: MapPin, permission: 'admin:locations' },
  { id: 'DAYBOOK', label: 'Day Book', icon: BookOpen, permission: 'report:financial' },
  { id: 'STOREFRONT', label: 'Storefront', icon: Globe, permission: 'admin:locations' },
  { id: 'ONLINE_SHOP', label: 'Online shop', icon: Globe, permission: 'admin:online_shop' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, permission: 'whatsapp:manage' },
  { id: 'LOYALTY', label: 'Loyalty & wishes', icon: Gift, permission: 'loyalty:manage' },
  { id: 'RETURNS', label: 'Returns & exchanges', icon: Undo2, permission: 'return:complete' },
  { id: 'SERVICES', label: 'APIs & Services', icon: Key, permission: 'admin:users' },
  { id: 'USERS', label: 'Team & Users', icon: Users, permission: 'admin:users' },
  { id: 'ROLES', label: 'Roles & Permissions', icon: Shield, permission: 'admin:users' },
  { id: 'SUPPORT', label: 'Help & Support', icon: LifeBuoy },
  // BILLING and API were shipped as navigable tabs whose only content was "This section is
  // under construction", which reads to a paying customer as an unfinished product. Neither
  // has an implementation behind it, and billing belongs to the platform tier rather than
  // this module, so the entries are withdrawn until there is something real to show --
  // restore them here alongside a body in the switch below.
];

/**
 * Domains that have a body rendered below. The "under construction" card shows for anything
 * listed above but not here.
 *
 * It is a set rather than the chain of `activeDomain !== 'X' && ...` it replaces, because that
 * chain had to be extended by hand every time a domain gained content -- and when Day Book was
 * added it was not, so the page rendered the day book AND the placeholder underneath it.
 */
const IMPLEMENTED_DOMAINS = new Set(['GENERAL', 'CATALOG', 'LOCATIONS', 'DAYBOOK', 'STOREFRONT', 'ONLINE_SHOP', 'WHATSAPP', 'LOYALTY', 'RETURNS', 'SERVICES', 'USERS', 'ROLES', 'SUPPORT']);

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
  const { user } = useAuth();
  const { can } = usePermission();
  // ?section=WHATSAPP opens straight onto a section -- the Send buttons link here to "link your
  // shop's WhatsApp". Only a section this person can see; anything else falls back to General.
  const [searchParams] = useSearchParams();
  const asked = searchParams.get('section');
  const [activeDomain, setActiveDomain] = useState(() =>
    SETTINGS_DOMAINS.some(d => d.id === asked && can(d.permission)) ? asked : 'GENERAL');

  // Only the sections this person's role can actually use. Listing Day Book to somebody
  // without report:financial offers them a door that opens onto a refusal -- and they have no
  // way to know that before pressing it. GENERAL and SUPPORT carry no permission: they hold a
  // person's own profile and password, so everybody keeps somewhere to be.
  const visibleDomains = SETTINGS_DOMAINS.filter(d => can(d.permission));
  const [activeCatalogTab, setActiveCatalogTab] = useState('SIZE');
  
  const isSuperAdmin = holdsEverything(user);
  // Passwords are set once by a Super Admin/Admin and stay permanent -- nobody edits their
  // own, so Team & Users is the only place a password is ever touched, and only these two
  // roles can reach it (a Super Admin still outranks an Admin there -- see team.service.ts).
  // The permission, not the role name. A shop that composes its own "Floor manager" role with
  // admin:users should reach this screen; a shop that renames ADMIN should not lose it.
  const canManageTeam = isSuperAdmin || (user?.permissions || []).includes('admin:users');

  const activeCatalogInfo = CATALOG_TABS.find(t => t.id === activeCatalogTab);

  return (
    <div className="mobile-no-scroll" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header className="settings-header" style={{ marginBottom: '32px', flexShrink: 0 }}>
        <h1 className="settings-title" style={{ fontSize: '32px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SettingsIcon size={32} />
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your boutique configuration, team, and billing.</p>
      </header>

      <div className="mobile-col" style={{ display: 'flex', gap: '32px', flex: 1, minHeight: 0 }}>
        
        {/* Left Sidebar: Domains */}
        <div className="settings-sidebar mobile-tab-bar" style={{ 
          flexShrink: 0,
          background: 'var(--bg-card)', 
          borderRadius: '16px', 
          border: '1px solid var(--border-light)',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          position: 'sticky',
          top: '0',
          alignSelf: 'flex-start',
          zIndex: 10
        }}>
          <style>{`
            /* No taller than the space beside the page, and scrolls inside it. It grew past the bottom of
               a laptop screen, and the page itself does not scroll, so Help & Support and everything
               under it were cut off with no way to reach them. */
            .settings-sidebar { width: 280px; max-height: 100%; overflow-y: auto; overscroll-behavior: contain; }
            @media (max-width: 768px) {
              .settings-sidebar { width: 100%; padding: 8px !important; margin-bottom: 0 !important; max-height: none; overflow-y: visible; }
              /* The heading hid, but its padded, bordered box stayed -- an empty gap at the
                 start of the tab strip, before the first tab. */
              .settings-sidebar .settings-sidebar-title { display: none; }
              .settings-title { font-size: 24px !important; }
              .settings-title svg { width: 24px; height: 24px; }
              .settings-header { margin-bottom: 16px !important; }
              .settings-sidebar button { border-left: none !important; border-bottom: 4px solid transparent; border-radius: 8px; padding: 8px 12px !important; }
              .settings-sidebar button.active { border-bottom: 4px solid var(--primary-color) !important; background: var(--bg-hover) !important; }
            }
          `}</style>
          <div className="settings-sidebar-title" style={{ padding: '0 24px 12px 24px', borderBottom: '1px solid var(--border-light)', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Configuration
            </h3>
          </div>
          
          {visibleDomains.map(domain => {
            const Icon = domain.icon;
            const isActive = activeDomain === domain.id;
            return (
              <button
                key={domain.id}
                className={isActive ? 'active' : ''}
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
                  transition: 'all 0.2s ease',
                  flexShrink: 0
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
                        background: isActive ? 'var(--primary-color)' : 'var(--bg-card)',
                        // --primary-color is an alias for --text-primary, so it INVERTS:
                        // white in dark mode, near-black in light. '#fff' here made the
                        // selected tab white-on-white in dark mode -- the one tab you could
                        // not read was the one you were on. --bg-card inverts with it.
                        color: isActive ? 'var(--bg-card)' : 'var(--text-secondary)',
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
              <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>{activeCatalogInfo?.label}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>{activeCatalogInfo?.description}</p>
                </div>
                
                <CatalogManager type={activeCatalogTab} />
              </div>

            </div>
          )}

          {activeDomain === 'GENERAL' && <GeneralInfoPanel />}

          {activeDomain === 'LOCATIONS' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
               <StockLocationsPage />
            </div>
          )}

          {/* The day book brings its own panels and its own scrolling, so unlike the sections
              above it is not wrapped in a card -- doing so would box a full page inside a box. */}
          {activeDomain === 'DAYBOOK' && <DayBook />}

          {activeDomain === 'STOREFRONT' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <StorefrontManager />
            </div>
          )}

          {activeDomain === 'WHATSAPP' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>WhatsApp</h2>
              </div>
              <WhatsAppSettings />
            </div>
          )}

          {activeDomain === 'RETURNS' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <ReturnRulesPanel />
            </div>
          )}

          {activeDomain === 'ONLINE_SHOP' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <OnlineShopSettings />
            </div>
          )}

          {activeDomain === 'LOYALTY' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <LoyaltySettings />
            </div>
          )}

          {activeDomain === 'SERVICES' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <ServicesPanel />
            </div>
          )}

          {activeDomain === 'USERS' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>Team & Users</h2>
              </div>
              {canManageTeam ? (
                <TeamManager />
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  <Shield size={32} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
                  <p>Only a Super Admin or Admin can manage team members and roles.</p>
                </div>
              )}
            </div>
          )}

          {activeDomain === 'ROLES' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              {canManageTeam ? (
                <RoleManager />
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  <Shield size={32} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
                  <p>You need permission to manage the team before you can change what roles can do.</p>
                </div>
              )}
            </div>
          )}

          {activeDomain === 'SUPPORT' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>Help & Support</h2>
              </div>
              <SupportPanel />
            </div>
          )}

          {!IMPLEMENTED_DOMAINS.has(activeDomain) && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '48px', textAlign: 'center' }}>
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
