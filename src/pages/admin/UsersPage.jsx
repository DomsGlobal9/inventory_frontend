import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminUsers } from '../../hooks/admin/useAdminConsole';
import { Loader2, Search, Users as UsersIcon, Mail, Shield, Clock, Building2 } from 'lucide-react';
import PageGuide from '../../components/admin/PageGuide';

export default function UsersPage() {
  const { data, isLoading } = useAdminUsers();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = (data || []).filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.clientId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: '8px', display: 'flex', color: 'var(--primary-color)' }}>
              <UsersIcon size={20} />
            </div>
            Platform Users
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px' }}>
            Every user across every client, most recently active first. 
            Monitor access and system usage at a glance.
          </p>
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: '400px' }}>
        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
          <Search size={16} />
        </div>
        <input
          type="text" 
          placeholder="Search by name, email, or client..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="input-field"
          style={{ paddingLeft: '36px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading data...</div>
        </div>
      ) : (
        <div style={{ borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden', background: 'var(--bg-card)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Details</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client Scope</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roles</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px', fontSize: '15px' }}>{u.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      <Mail size={12} /> {u.email}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button
                      onClick={() => navigate(`/platformconsole/clients/${u.clientId}`)}
                      title={`View ${u.clientId} overview`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border-light)', cursor: 'pointer' }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                    >
                      <Building2 size={14} color="var(--accent-gold)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.clientId}</span>
                    </button>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {u.roles.map(r => (
                        <span key={r.role.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: 'var(--bg-input)', color: 'var(--text-secondary)', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                          <Shield size={10} /> {r.role.name.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', padding: '4px 10px', 
                      background: u.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                      color: u.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--accent-danger)', 
                      borderRadius: '6px', fontSize: '12px', fontWeight: 600 
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', marginRight: '6px' }}></span>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <Clock size={12} />
                      {(() => {
                        // lastActiveAt (bumped on every authenticated request) is the real
                        // "latest activity" signal; lastLoginAt covers users active before
                        // that tracking existed, so it never regresses an existing account.
                        const activity = u.lastActiveAt || u.lastLoginAt;
                        return activity ? new Date(activity).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <UsersIcon size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '15px', fontWeight: 500 }}>No users found</p>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your search criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <PageGuide title="About Platform Users">
        <p>This tab displays every individual user account across all clients on the platform.</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
          <li><strong>Monitor Access:</strong> See who belongs to which client environment and their assigned roles.</li>
          <li><strong>Track Activity:</strong> Check when a user was last active in the system.</li>
        </ul>
      </PageGuide>
    </div>
  );
}
