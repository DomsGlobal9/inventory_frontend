import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, LogIn, Users, Package, AlertTriangle, IndianRupee, Clock, ShieldCheck, Mail, Shield, KeyRound } from 'lucide-react';
import { useAdminClient, useAssumeClient } from '../../hooks/admin/useAdminConsole';
import UserPasswordManager from '../../components/admin/UserPasswordManager';

const ONBOARDING_STYLE = {
  NOT_STARTED: { label: 'Not Started', color: 'var(--text-secondary)', bg: 'var(--bg-input)' },
  IN_PROGRESS: { label: 'In Progress', color: 'var(--accent-gold)', bg: 'rgba(226, 193, 113, 0.1)' },
  ACTIVE: { label: 'Active', color: 'var(--accent-success)', bg: 'rgba(16, 185, 129, 0.1)' },
};

const STAT_CARD = { 
  background: 'var(--bg-card)', 
  border: '1px solid var(--border-light)', 
  borderRadius: '12px', 
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
};

export default function ClientOverviewPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useAdminClient(clientId);
  const assumeMutation = useAssumeClient();
  const [passwordTarget, setPasswordTarget] = useState(null);

  const handleAssume = async () => {
    try {
      const result = await assumeMutation.mutateAsync(clientId);
      localStorage.setItem('scaleezy_platform_admin_impersonation', JSON.stringify({ sessionId: result.sessionId, clientId: result.clientId }));
      // The backend returns assumedAsFullAccess: false when this client has no SUPER_ADMIN
      // and it had to fall back to their oldest active user -- possibly a STAFF account.
      // Ignoring it meant you were dropped into a low-privilege session and then bounced
      // to /unauthorized with no idea why.
      if (result.assumedAsFullAccess === false) {
        toast(`${clientId} has no Super Admin -- viewing as their oldest active user, so some screens may be blocked.`, { icon: '⚠️', duration: 7000 });
      } else {
        toast.success(`Now viewing ${clientId}`);
      }
      window.location.href = '/';
    } catch (error) {
      // handled by hook's onError
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading data...</div>
        </div>
    );
  }

  if (!data) {
    return <div style={{ color: 'var(--text-secondary)', padding: '24px' }}>Client not found.</div>;
  }

  const onboarding = ONBOARDING_STYLE[data.onboardingStatus] || ONBOARDING_STYLE.NOT_STARTED;
  // lastActiveAt (bumped on every authenticated request) is the real "what's happening in
  // this client's inventory right now" signal; lastLoginAt only covers accounts active
  // before that tracking existed, so it's a fallback, not the primary sort key.
  const recentActivity = [...(data.users || [])]
    .map(u => ({ ...u, activityAt: u.lastActiveAt || u.lastLoginAt }))
    .filter(u => u.activityAt)
    .sort((a, b) => new Date(b.activityAt) - new Date(a.activityAt))
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div>
        <button
          onClick={() => navigate('/platformconsole/clients')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', marginBottom: '24px', padding: '6px 12px', borderRadius: '6px', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ArrowLeft size={14} /> Back to Clients
        </button>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 0, letterSpacing: '-0.02em' }}>
                {data.clientId}
              </h1>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', color: onboarding.color, background: onboarding.bg, border: `1px solid ${onboarding.color}20` }}>
                {onboarding.label}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> {data.userCount} team member{data.userCount === 1 ? '' : 's'}</span>
              <span>&bull;</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Last activity {(data.lastActiveAt || data.lastLoginAt) ? new Date(data.lastActiveAt || data.lastLoginAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'never'}</span>
            </p>
          </div>

          <button
            onClick={handleAssume}
            disabled={assumeMutation.isPending}
            title="Open this client's real Inventory app, acting on their behalf"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', 
              background: 'var(--accent-gold)', border: 'none', borderRadius: '8px', 
              color: '#000', cursor: 'pointer', fontSize: '14px', fontWeight: 600, 
              flexShrink: 0, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(226, 193, 113, 0.3)' 
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(226, 193, 113, 0.4)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(226, 193, 113, 0.3)'; }}
          >
            <LogIn size={16} /> View Inventory Data
          </button>
        </div>
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={STAT_CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
            <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: '6px', color: 'var(--text-primary)' }}><Users size={16} /></div> 
            Registered Users
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{data.userCount}</div>
        </div>
        
        <div style={STAT_CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
            <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: '6px', color: 'var(--text-primary)' }}><Package size={16} /></div> 
            Active Products
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            {data.activeProductCount}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {data.productCount} total</span>
          </div>
        </div>
        
        <div style={STAT_CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
            <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: '6px', color: 'var(--accent-gold)' }}><IndianRupee size={16} /></div> 
            Total Inventory Value
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>₹{Number(data.inventoryValue).toLocaleString('en-IN')}</div>
        </div>
        
        <div style={STAT_CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
            <div style={{ background: 'var(--bg-input)', padding: '6px', borderRadius: '6px', color: data.activeAlertCount > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}><AlertTriangle size={16} /></div> 
            Active Alerts
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: data.activeAlertCount > 0 ? 'var(--accent-danger)' : 'var(--accent-success)', letterSpacing: '-0.02em' }}>{data.activeAlertCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Team / staff */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)' }}>
            <Users size={18} color="var(--accent-gold)" />
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px', margin: 0 }}>Team Members</h3>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Details</th>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roles</th>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}></th>
              </tr>
            </thead>
            <tbody>
              {data.users?.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px', fontSize: '14px' }}>{u.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      <Mail size={12} /> {u.email}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {u.roles.map(r => (
                        <span key={r.role.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: 'var(--bg-input)', color: 'var(--text-secondary)', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                          <Shield size={10} /> {r.role.name.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', padding: '4px 8px', 
                      background: u.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                      color: u.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--accent-danger)', 
                      borderRadius: '6px', fontSize: '11px', fontWeight: 600 
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', marginRight: '6px' }}></span>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => setPasswordTarget(u)}
                      title="View or set password"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)' }}
                    >
                      <KeyRound size={12} /> Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent logins */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)' }}>
            <Clock size={18} color="var(--accent-gold)" />
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px', margin: 0 }}>Recent Activity</h3>
          </div>

          <div style={{ padding: '8px 0' }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={24} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px' }}>No activity recorded yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentActivity.map((u, index) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: index < recentActivity.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ShieldCheck size={14} color="var(--text-secondary)" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{new Date(u.activityAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {passwordTarget && <UserPasswordManager user={passwordTarget} onClose={() => setPasswordTarget(null)} />}
    </div>
  );
}
