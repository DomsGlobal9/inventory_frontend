import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Tag, Palette, Scissors, Layers, Hexagon, Grid, ShoppingBag, Store, Users, CreditCard, Key, User as UserIcon, Mail, Shield, MapPin, Edit2, Save, X, LifeBuoy, Loader2 } from 'lucide-react';
import CatalogManager from '../components/CatalogManager';
import StockLocationsPage from './settings/StockLocationsPage';
import SupportPanel from '../components/SupportPanel';
import TeamManager from '../components/TeamManager';
import { useAuth } from '../context/AuthContext';
import { useUpdateMyProfile } from '../hooks/useTeam';

const SETTINGS_DOMAINS = [
  { id: 'GENERAL', label: 'General Info', icon: Store },
  { id: 'CATALOG', label: 'Catalog Configuration', icon: Grid },
  { id: 'LOCATIONS', label: 'Stock Locations', icon: MapPin },
  { id: 'USERS', label: 'Team & Users', icon: Users },
  { id: 'SUPPORT', label: 'Help & Support', icon: LifeBuoy },
  // BILLING and API were shipped as navigable tabs whose only content was "This section is
  // under construction", which reads to a paying customer as an unfinished product. Neither
  // has an implementation behind it, and billing belongs to the platform tier rather than
  // this module, so the entries are withdrawn until there is something real to show --
  // restore them here alongside a body in the switch below.
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
                <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'var(--bg-input)' }}>
                  
                  {!isEditingProfile && (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      title="Edit Profile"
                      style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <Edit2 size={16} />
                    </button>
                  )}

                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-dark)' }}>
                    <UserIcon size={24} />
                  </div>
                  
                  {isEditingProfile ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Name</label>
                        <input type="text" className="input-field" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                        Your password is set by a Super Admin or Admin and can't be changed here -- ask them if you need it updated.
                      </p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="btn-primary" disabled={updateProfileMutation.isPending} onClick={handleSaveProfile} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
                          {updateProfileMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                        </button>
                        <button className="btn-secondary" onClick={() => { setIsEditingProfile(false); setProfileForm({ name: user?.name || '' }); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
                          <X size={16} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{user?.name || 'Unknown User'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                        <Mail size={14} /> {user?.email || 'No email provided'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <Shield size={14} color="var(--primary-color)" />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(user?.roles || ['USER']).map(role => (
                            <span key={role} className="badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '11px', padding: '2px 8px' }}>
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeDomain === 'LOCATIONS' && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '32px' }}>
               <StockLocationsPage />
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

          {activeDomain !== 'CATALOG' && activeDomain !== 'GENERAL' && activeDomain !== 'LOCATIONS' && activeDomain !== 'SUPPORT' && activeDomain !== 'USERS' && (
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
