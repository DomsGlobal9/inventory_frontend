import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tag, Palette, Scissors, Layers, Hexagon, Grid, ShoppingBag, Store, Users, Key, Shield, MapPin, LifeBuoy, BookOpen, Globe, MessageCircle, Gift, Undo2, CreditCard, Monitor, ArrowLeft } from 'lucide-react';
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
import ShopPayments from '../components/settings/ShopPayments';
import PosTills from '../components/settings/PosTills';
import SettingsHub, { groupOf } from '../components/settings/SettingsHub';
import ReturnRulesPanel from '../components/sales/ReturnRulesPanel';
import { holdsEverything } from '../lib/authority';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';

const SETTINGS_DOMAINS = [
  { id: 'GENERAL', label: 'Profile and shop details', icon: Store },
  { id: 'CATALOG', label: 'Catalogue', icon: Grid, permission: 'admin:catalog' },
  { id: 'LOCATIONS', label: 'Stock locations', icon: MapPin, permission: 'admin:locations' },
  { id: 'DAYBOOK', label: 'Day Book', icon: BookOpen, permission: 'report:financial' },
  { id: 'STOREFRONT', label: 'Connected websites', icon: Globe, permission: 'admin:locations' },
  { id: 'ONLINE_SHOP', label: 'Online shop', icon: Globe, permission: 'admin:online_shop' },
  // Its own place: the shop's Razorpay account, what has been paid online and money back. The
  // server guards all of it with admin:online_shop, so the menu does too.
  { id: 'PAYMENTS', label: 'Payments', icon: CreditCard, permission: 'admin:online_shop' },
  // The till's key. Same guard as Connected websites on the server (admin:locations).
  { id: 'POS', label: 'POS (billing counter)', icon: Monitor, permission: 'admin:locations' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, permission: 'whatsapp:manage' },
  { id: 'LOYALTY', label: 'Loyalty and wishes', icon: Gift, permission: 'loyalty:manage' },
  { id: 'RETURNS', label: 'Returns and exchanges', icon: Undo2, permission: 'return:complete' },
  { id: 'SERVICES', label: 'APIs and services', icon: Key, permission: 'admin:users' },
  { id: 'USERS', label: 'Team members', icon: Users, permission: 'admin:users' },
  { id: 'ROLES', label: 'Roles and permissions', icon: Shield, permission: 'admin:users' },
  { id: 'SUPPORT', label: 'Help and support', icon: LifeBuoy },
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
const IMPLEMENTED_DOMAINS = new Set(['GENERAL', 'CATALOG', 'LOCATIONS', 'DAYBOOK', 'STOREFRONT', 'ONLINE_SHOP', 'PAYMENTS', 'POS', 'WHATSAPP', 'LOYALTY', 'RETURNS', 'SERVICES', 'USERS', 'ROLES', 'SUPPORT']);

const CATALOG_TABS = [
  { id: 'SIZE', label: 'Sizes', icon: Scissors, description: 'Manage available sizes across your products' },
  { id: 'COLOR', label: 'Colours', icon: Palette, description: 'Define the colour palette used in your boutique' },
  { id: 'DRESS_TYPE', label: 'Dress types', icon: Tag, description: 'Manage dress styles (e.g., Saree, Gown)' },
  { id: 'MATERIAL', label: 'Materials', icon: Layers, description: 'List the fabrics and materials you offer' },
  { id: 'DESIGN_TYPE', label: 'Design types', icon: Hexagon, description: 'Manage design styles and patterns' },
  { id: 'CATEGORY', label: 'Categories', icon: Grid, description: 'High-level product categories (e.g., WOMEN)' },
  { id: 'PRODUCT_TYPE', label: 'Product types', icon: ShoppingBag, description: 'Types of products (e.g., READY_TO_WEAR)' },
];

export default function Settings() {
  const { user } = useAuth();
  const { can } = usePermission();
  /*
   * The address is the state. No ?section → the front page (SettingsHub: profile, then cards of
   * links). ?section=X → that section alone, full width, with a way back. ?part=Y → the element
   * inside it to scroll to (or, for the catalogue, the tab to open). Links from elsewhere
   * (?section=WHATSAPP from the Send buttons, Online shop ↔ Payments) work unchanged, and the
   * browser's Back button walks back to the cards, because every move is a real navigation.
   *
   * Only a section this person's role can use; anything else shows the front page. GENERAL and
   * SUPPORT carry no permission: they hold a person's own profile and password, so everybody
   * keeps somewhere to be.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get('section');
  const part = searchParams.get('part');
  const canOpen = (id) => { const d = SETTINGS_DOMAINS.find(x => x.id === id); return !!d && can(d.permission); };
  const activeDomain = asked && canOpen(asked) ? asked : null;
  const open = (section, nextPart) => setSearchParams(nextPart ? { section, part: nextPart } : { section });
  const back = () => setSearchParams({});

  const activeCatalogTab = activeDomain === 'CATALOG' && CATALOG_TABS.some(t => t.id === part) ? part : 'SIZE';

  // Land on the part asked for. Sections fetch before they draw, so the element may not exist yet:
  // look for it for a few seconds, then stop looking.
  useEffect(() => {
    if (!activeDomain || !part || activeDomain === 'CATALOG') return undefined;
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.getElementById(part);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); clearInterval(timer); }
      else if (++tries > 25) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [activeDomain, part]);
  const group = activeDomain ? groupOf(activeDomain) : null;
  // "Catalogue / Colours", not "Catalogue / Catalog Configuration".
  const domainLabel = activeDomain === 'CATALOG'
    ? CATALOG_TABS.find(t => t.id === activeCatalogTab)?.label
    : SETTINGS_DOMAINS.find(d => d.id === activeDomain)?.label;

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
      <style>{`
        @media (max-width: 768px) {
          .settings-header { margin-bottom: 16px !important; }
        }
        .settings-crumb { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; padding: 0; font: inherit; font-size: 14px; color: var(--brand-ink); cursor: pointer; }
        .settings-crumb:hover { text-decoration: underline; }
        /* Scrolls, without showing a bar for it. */
        .settings-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .settings-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      {/* The front page needs no heading of its own -- the sidebar already says Settings, and its first
          words are "Your profile". An open section gets the way back instead: Settings / Money /
          Payments. Back is a real navigation, so the browser's own Back button does the same thing. */}
      {activeDomain && (
        <header className="settings-header" style={{ marginBottom: '20px', flexShrink: 0 }}>
          <nav aria-label="Where you are" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <button type="button" className="settings-crumb" onClick={back}><ArrowLeft size={16} /> Settings</button>
            {group && <><span aria-hidden="true">/</span><span>{group.label}</span></>}
            <span aria-hidden="true">/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{domainLabel}</span>
          </nav>
        </header>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Main Content Area */}
        <div className="settings-scroll" style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingBottom: '96px' }}>

          {!activeDomain && <SettingsHub open={open} canOpen={canOpen} />}

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
                      onClick={() => open('CATALOG', tab.id)}
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

          {activeDomain === 'PAYMENTS' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <ShopPayments />
            </div>
          )}

          {activeDomain === 'POS' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <PosTills />
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
                <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>Team members</h2>
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
                <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>Help and support</h2>
              </div>
              <SupportPanel />
            </div>
          )}

          {activeDomain && !IMPLEMENTED_DOMAINS.has(activeDomain) && (
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
