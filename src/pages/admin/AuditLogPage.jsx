import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ScrollText, ShieldCheck, Activity, Building2, Info, Clock, User } from 'lucide-react';
import { useAdminAuditLog } from '../../hooks/admin/useAdminConsole';
import PageGuide from '../../components/admin/PageGuide';

export default function AuditLogPage() {
  const { data, isLoading } = useAdminAuditLog();
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <header style={{ flexShrink: 0, marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ScrollText size={28} color="var(--accent-gold)" /> Platform Audit Log
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '800px' }}>
          A unified, real-time timeline of all activity across the ScaleEzy platform. Monitors both client-side mutations and platform admin impersonation sessions.
        </p>
      </header>

      <div style={{ display: 'flex', gap: '32px', flex: 1, minHeight: 0, alignItems: 'stretch' }}>
        
        {/* Main Timeline Feed */}
        <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0, padding: '24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-input)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Activity Timeline</h2>
          </div>

          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px', color: 'var(--text-muted)' }}>
                <Loader2 size={40} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
                <div style={{ fontSize: '15px', fontWeight: 500 }}>Syncing global activity...</div>
              </div>
            ) : (!data || data.length === 0) ? (
              <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <ScrollText size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <div style={{ fontSize: '16px', fontWeight: 500 }}>No activity recorded yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.map((event, i) => {
                  const isSession = event.type === 'ADMIN_SESSION';
                  
                  return (
                    <div
                      key={event.id}
                      style={{
                        display: 'flex', gap: '16px', padding: '12px 16px',
                        background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '12px',
                        transition: 'transform 0.2s', position: 'relative'
                      }}
                      onMouseOver={e => e.currentTarget.style.borderColor = isSession ? 'var(--accent-gold)' : 'rgba(255,255,255,0.15)'}
                      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isSession ? 'rgba(226, 193, 113, 0.15)' : 'var(--bg-dark)',
                        border: `1px solid ${isSession ? 'rgba(226, 193, 113, 0.3)' : 'var(--border-light)'}`
                      }}>
                        {isSession ? <ShieldCheck size={18} color="var(--accent-gold)" /> : <Activity size={18} color="var(--text-secondary)" />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', color: isSession ? 'var(--accent-gold)' : 'var(--text-primary)', fontWeight: 600 }}>
                            {event.title}
                          </span>
                          {isSession && !event.endedAt && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', background: 'var(--accent-success)', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.05em' }}>ACTIVE</span>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={14} /> {event.actorName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} /> {new Date(event.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                          {!isSession && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ padding: '2px 8px', background: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {event.action}
                              </span>
                              <span style={{ padding: '2px 8px', background: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {event.entityType}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          onClick={() => navigate(`/platformconsole/clients/${event.clientId}`)}
                          title={`View ${event.clientId} overview`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-light)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                        >
                          <Building2 size={14} color="var(--accent-gold)" />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{event.clientId}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <PageGuide title="How the Audit Log works">
        <p style={{ margin: 0 }}>
          This unified feed merges two distinct data streams into one chronological timeline:
        </p>
        
        <div style={{ padding: '16px', background: 'rgba(226, 193, 113, 0.1)', border: '1px solid rgba(226, 193, 113, 0.2)', borderRadius: '12px' }}>
          <strong style={{ color: 'var(--accent-gold)', display: 'block', marginBottom: '4px' }}>Admin Sessions</strong>
          Logged when a platform admin (like you) enters a client's environment via the Impersonate button.
        </div>
        
        <div style={{ padding: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>User Activity</strong>
          Logged when a real user performs a mutation (Create, Update, Delete) inside their inventory.
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', paddingLeft: '12px', borderLeft: '2px solid var(--border-light)' }}>
          <strong>Note:</strong> Read-only actions (like viewing a dashboard) are not logged to prevent database bloat. Each client retains only their most recent 30 activity events via an automatic rolling cleanup.
        </div>
      </PageGuide>
    </div>
  );
}
