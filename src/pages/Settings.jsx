import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Tag, Palette, Scissors, Layers, Hexagon, Grid, ShoppingBag, Store, Users, CreditCard, Key, User as UserIcon, Mail, Shield, MapPin, Edit2, Save, X, LifeBuoy, Loader2, BookOpen, Globe } from 'lucide-react';
import CatalogManager from '../components/CatalogManager';
import StockLocationsPage from './settings/StockLocationsPage';
import DayBook from './DayBook';
import StorefrontManager from '../components/StorefrontManager';
import ChangeOwnPassword from '../components/ChangeOwnPassword';
import SupportPanel from '../components/SupportPanel';
import TeamManager from '../components/TeamManager';
import { useAuth } from '../context/AuthContext';
import { useUpdateMyProfile } from '../hooks/useTeam';

const SETTINGS_DOMAINS = [
  { id: 'GENERAL', label: 'General Info', icon: Store },
  { id: 'CATALOG', label: 'Catalog Configuration', icon: Grid },
  { id: 'LOCATIONS', label: 'Stock Locations', icon: MapPin },
  { id: 'DAYBOOK', label: 'Day Book', icon: BookOpen },
  { id: 'STOREFRONT', label: 'Storefront', icon: Globe },
  { id: 'USERS', label: 'Team & Users', icon: Users },
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
const IMPLEMENTED_DOMAINS = new Set(['GENERAL', 'CATALOG', 'LOCATIONS', 'DAYBOOK', 'STOREFRONT', 'USERS', 'SUPPORT']);

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
  const { user, refreshUser } = useAuth();
  const [activeDomain, setActiveDomain] = useState('GENERAL');
  const [activeCatalogTab, setActiveCatalogTab] = useState('SIZE');
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const updateProfileMutation = useUpdateMyProfile();

  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
  // Passwords are set once by a Super Admin/Admin and stay permanent -- nobody edits their
  // own, so Team & Users is the only place a password is ever touched, and only these two
  // roles can reach it (a Super Admin still outranks an Admin there -- see team.service.ts).
  const canManageTeam = isSuperAdmin || user?.roles?.includes('ADMIN');

  const handleSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync({ name: profileForm.name });
      // The save succeeded server-side, but `user` in AuthContext is still the copy read
      // at login -- so without this the header, the avatar initials and this very field
      // all kept showing the old name behind a "Profile updated" toast until a reload.
      await refreshUser();
      toast.success('Profile updated');
      setIsEditingProfile(false);
    } catch {
      // Toasted by the hook.
    }
  };
  
  const activeCatalogInfo = CATALOG_TABS.find(t => t.id === activeCatalogTab);

  return (
    <div className="mobile-no-scroll" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '32px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            .settings-sidebar { width: 280px; }
            @media (max-width: 768px) {
              .settings-sidebar { width: 100%; padding: 8px !important; margin-bottom: 0 !important; }
              .settings-sidebar h3 { display: none; }
              .settings-sidebar button { border-left: none !important; border-bottom: 4px solid transparent; border-radius: 8px; padding: 8px 12px !important; }
              .settings-sidebar button.active { border-bottom: 4px solid var(--primary-color) !important; background: var(--bg-hover) !important; }
            }
          `}</style>
          <div style={{ padding: '0 24px 12px 24px', borderBottom: '1px solid var(--border-light)', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Configuration
            </h3>
          </div>
          
          {SETTINGS_DOMAINS.map(domain => {
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
              <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>{activeCatalogInfo?.label}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>{activeCatalogInfo?.description}</p>
                </div>
                
                <CatalogManager type={activeCatalogTab} />
              </div>

            </div>
          )}

          {activeDomain === 'GENERAL' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>Profile Information</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Manage your personal account details and access level.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
                <div style={{ position: 'relative', border: '1px solid var(--border-light)', borderRadius: '16px', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                  {/* Banner Header */}
                  <div style={{ height: '72px', background: 'linear-gradient(135deg, rgba(226, 193, 113, 0.2) 0%, rgba(226, 193, 113, 0.05) 100%)', borderBottom: '1px solid var(--border-light)' }}></div>
                  
                  <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Avatar & Edit Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-36px' }}>
                      <div style={{
                        width: '72px', height: '72px', borderRadius: '50%',
                        backgroundColor: 'var(--bg-card)', padding: '4px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, var(--bg-input) 0%, var(--bg-dark) 100%)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 600, color: 'var(--accent-gold)'
                        }}>
                          {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={28} />}
                        </div>
                      </div>
                      
                      {!isEditingProfile && (
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', minHeight: '36px', height: '36px', fontSize: '13px' }}
                        >
                          <Edit2 size={14} /> Edit Profile
                        </button>
                      )}
                    </div>

                    {isEditingProfile ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Full Name</label>
                          <input type="text" className="input-field" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} style={{ width: '100%' }} />
                        </div>
                        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <Shield size={16} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>Your password and role are managed by administrators. Please contact a Super Admin if you need to update sensitive credentials.</span>
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                          <button className="btn-primary" disabled={updateProfileMutation.isPending} onClick={handleSaveProfile} style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '40px' }}>
                            {updateProfileMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                          </button>
                          <button className="btn-secondary" onClick={() => { setIsEditingProfile(false); setProfileForm({ name: user?.name || '' }); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '40px' }}>
                            <X size={16} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '4px' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                          {user?.name || 'Unknown User'}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                          <Mail size={16} /> {user?.email || 'No email provided'}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access Level</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(user?.roles || ['USER']).map(role => (
                              <div key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(226, 193, 113, 0.1)', color: 'var(--accent-gold)', border: '1px solid rgba(226, 193, 113, 0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                                <Shield size={14} />
                                {role}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Only the Super Admin. Everyone else's password is set for them and stays
                    permanent -- staff who change their own leave nobody able to help them back
                    in. The owner is the exception because there is nobody above them. */}
                {isSuperAdmin && <ChangeOwnPassword />}
              </div>
            </div>
          )}

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
