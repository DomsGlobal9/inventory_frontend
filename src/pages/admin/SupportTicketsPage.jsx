import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, Building2, ArrowLeft, Send, Loader2, Clock } from 'lucide-react';
import {
  useAdminSupportTickets, useAdminSupportTicket, useAdminReplySupportTicket, useAdminUpdateTicketStatus
} from '../../hooks/admin/useAdminConsole';
import PageGuide from '../../components/admin/PageGuide';
import Select from '../../components/common/Select';


const STATUS_STYLE = {
  OPEN: { label: 'Open', color: 'var(--accent-danger)', bg: 'rgba(239, 68, 68, 0.1)' },
  IN_PROGRESS: { label: 'In Progress', color: 'var(--accent-gold)', bg: 'rgba(226, 193, 113, 0.1)' },
  RESOLVED: { label: 'Resolved', color: 'var(--accent-success)', bg: 'rgba(16, 185, 129, 0.1)' },
  CLOSED: { label: 'Closed', color: 'var(--text-secondary)', bg: 'var(--bg-input)' },
};

const PRIORITY_COLOR = {
  URGENT: 'var(--accent-danger)', HIGH: 'var(--accent-gold)', NORMAL: 'var(--text-secondary)', LOW: 'var(--text-muted)'
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.OPEN;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', background: s.bg, color: s.color, borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

function TicketDetail({ ticketId, onBack }) {
  const { data: ticket, isLoading } = useAdminSupportTicket(ticketId);
  const [reply, setReply] = useState('');
  const replyMutation = useAdminReplySupportTicket();
  const statusMutation = useAdminUpdateTicketStatus();
  const navigate = useNavigate();

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await replyMutation.mutateAsync({ ticketId, body: reply });
    setReply('');
  };

  if (isLoading || !ticket) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px' }}>
        <Loader2 size={32} className="animate-spin" color="var(--accent-gold)" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: '16px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {ticket.subject}
              <StatusBadge status={statusMutation.isPending && statusMutation.variables?.status ? statusMutation.variables.status : ticket.status} />
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: PRIORITY_COLOR[ticket.priority] }}>{ticket.priority} Priority</span>
              <span>&bull;</span>
              <span>Category: {ticket.category.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'nowrap' }}>
          <div
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-light)', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Building2 size={14} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.clientId}</span>
          </div>

          <Select
            value={statusMutation.isPending && statusMutation.variables?.status ? statusMutation.variables.status : ticket.status}
            onChange={(e) => statusMutation.mutate({ ticketId, status: e.target.value })}
            disabled={statusMutation.isPending}
            className="input-field"
            style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', cursor: statusMutation.isPending ? 'not-allowed' : 'pointer', opacity: statusMutation.isPending ? 0.7 : 1 }}
          >
            {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>Set as {STATUS_STYLE[s].label}</option>)}
          </Select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-dark)' }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', background: 'var(--bg-card)', padding: '4px 12px', borderRadius: '12px', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
                Ticket Opened • {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
            </div>

            {ticket.messages.map(m => (
              <div key={m.id} style={{
                alignSelf: m.authorType === 'PLATFORM_ADMIN' ? 'flex-end' : 'flex-start',
                maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  alignSelf: m.authorType === 'PLATFORM_ADMIN' ? 'flex-end' : 'flex-start',
                  padding: '0 4px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: m.authorType === 'PLATFORM_ADMIN' ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                    {m.authorName}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div style={{
                  background: m.authorType === 'PLATFORM_ADMIN' ? 'var(--accent-gold)' : 'var(--bg-input)',
                  color: m.authorType === 'PLATFORM_ADMIN' ? '#000' : 'var(--text-primary)',
                  borderRadius: '16px', 
                  borderTopLeftRadius: m.authorType === 'PLATFORM_ADMIN' ? '16px' : '4px',
                  borderTopRightRadius: m.authorType === 'PLATFORM_ADMIN' ? '4px' : '16px',
                  padding: '12px 16px', border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{m.body}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-light)' }}>
            <form onSubmit={handleReply} style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="text" 
                className="input-field" 
                style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }} 
                value={reply} 
                onChange={e => setReply(e.target.value)} 
                placeholder="Type your reply to the client..." 
                onFocus={e => e.target.style.borderColor = 'var(--accent-gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
              />
              <button 
                type="submit" 
                disabled={replyMutation.isPending || !reply.trim()} 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: reply.trim() ? 'var(--accent-gold)' : 'var(--bg-input)', color: reply.trim() ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: '12px', cursor: reply.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
              >
                {replyMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} style={{ transform: 'translateX(-2px) translateY(2px)' }} />}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', margin: 0 }}>Client Reporter</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Name</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{ticket.createdByName}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{ticket.createdByEmail}</div>
              </div>
            </div>
          </div>
          
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', margin: 0 }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => navigate(`/platformconsole/clients/${ticket.clientId}`)} 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
              >
                <Building2 size={16} color="var(--accent-gold)" />
                View Client Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupportTicketsPage() {
  const { data: tickets, isLoading } = useAdminSupportTickets();
  const [selectedId, setSelectedId] = useState(null);

  if (selectedId) {
    return <TicketDetail ticketId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <LifeBuoy size={22} color="var(--accent-gold)" /> Support Tickets
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Every issue and question raised by any client, across every tenant. Refreshes automatically.
      </p>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="animate-spin" color="var(--accent-gold)" />
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-card)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                {['Subject', 'Client', 'Priority', 'Status', 'Updated'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets?.map(t => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  style={{ borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{t.subject}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', fontSize: '12px' }}>{t.clientId}</td>
                  <td style={{ padding: '10px 16px', color: PRIORITY_COLOR[t.priority], fontWeight: 600, fontSize: '12px' }}>{t.priority}</td>
                  <td style={{ padding: '10px 16px' }}><StatusBadge status={t.status} /></td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(t.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {(!tickets || tickets.length === 0) && (
                <tr><td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <LifeBuoy size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '15px', fontWeight: 500 }}>No support tickets.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <PageGuide title="About Support Tickets">
        <p>This tab centralizes all help requests and issues raised by boutique clients.</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
          <li><strong>Respond to Clients:</strong> Click on any ticket to open the chat interface and reply directly to the client.</li>
          <li><strong>Status Management:</strong> Keep clients informed by updating the ticket status (e.g., Open, In Progress, Resolved).</li>
          <li><strong>Impersonate:</strong> Use the "View Client Dashboard" button in the ticket sidebar to jump directly into their environment and investigate the issue.</li>
        </ul>
      </PageGuide>
    </div>
  );
}
