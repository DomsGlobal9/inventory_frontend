import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2, Users, Package, AlertTriangle, IndianRupee, ChevronRight, ShieldCheck, Mail } from 'lucide-react';
import { useAdminClients } from '../../hooks/admin/useAdminConsole';
import PageGuide from '../../components/admin/PageGuide';

const ONBOARDING_STYLE = {
  NOT_STARTED: { label: 'Not Started', color: 'var(--text-secondary)', bg: 'var(--bg-input)' },
  IN_PROGRESS: { label: 'In Progress', color: 'var(--accent-gold)', bg: 'rgba(226, 193, 113, 0.1)' },
  ACTIVE: { label: 'Active', color: 'var(--accent-success)', bg: 'rgba(16, 185, 129, 0.1)' },
};

export default function ClientsPage() {
  const { data, isLoading } = useAdminClients();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: '8px', display: 'flex', color: 'var(--accent-gold)' }}>
            <Building2 size={20} />
          </div>
          Clients
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px' }}>
          Every tenant configured in the system. Monitor overall health, onboarding status, and critical alerts across all client environments.
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading data...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {data?.map(client => {
            const onboarding = ONBOARDING_STYLE[client.onboardingStatus] || ONBOARDING_STYLE.NOT_STARTED;
            
            return (
              <div
                key={client.clientId}
                onClick={() => navigate(`/platformconsole/clients/${client.clientId}`)}
                className="admin-client-card"
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 12px -2px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.transform = 'translateY(-2px)'; 
                  e.currentTarget.style.boxShadow = '0 6px 20px -4px rgba(0, 0, 0, 0.1)'; 
                  e.currentTarget.style.borderColor = 'var(--accent-gold)'; 
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.transform = 'translateY(0)'; 
                  e.currentTarget.style.boxShadow = '0 2px 12px -2px rgba(0, 0, 0, 0.05)'; 
                  e.currentTarget.style.borderColor = 'var(--border-light)'; 
                }}
              >
                {/* Card Header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={16} color="var(--accent-gold)" />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '-0.02em' }}>
                        {client.clientId}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Login: {client.lastLoginAt ? new Date(client.lastLoginAt).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', color: onboarding.color, background: onboarding.bg, border: `1px solid ${onboarding.color}20`, whiteSpace: 'nowrap' }}>
                    {onboarding.label}
                  </span>
                </div>

                {/* Admin Details */}
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-card)', flex: 1 }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>Primary Contact</div>
                  {client.adminName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldCheck size={14} color="var(--text-secondary)" />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.adminName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Mail size={12} /> {client.adminEmail}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No admin assigned</div>
                  )}
                </div>

                {/* Footer action */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)' }}>
                   <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {client.userCount} user{client.userCount !== 1 ? 's' : ''}
                   </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    View details <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <PageGuide title="About Clients">
        <p>This tab lists every tenant (boutique) configured in the ScaleEzy platform.</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
          <li><strong>View Status:</strong> Check if a client is actively using the system or still setting up.</li>
          <li><strong>Impersonate:</strong> Click on any client to jump into their specific dashboard as if you were them.</li>
        </ul>
      </PageGuide>
    </div>
  );
}
