import React, { useState } from 'react';
import { LifeBuoy, Plus, ArrowLeft, Send, Loader2, Clock } from 'lucide-react';
import { useSupportTickets, useSupportTicket, useCreateSupportTicket, useReplySupportTicket } from '../hooks/useSupportTickets';
import Select from './common/Select';


const STATUS_STYLE = {
  OPEN: { label: 'Open', color: 'var(--accent-danger)', bg: 'rgba(239, 68, 68, 0.1)' },
  IN_PROGRESS: { label: 'In Progress', color: 'var(--accent-gold)', bg: 'rgba(226, 193, 113, 0.1)' },
  RESOLVED: { label: 'Resolved', color: 'var(--accent-success)', bg: 'rgba(16, 185, 129, 0.1)' },
  CLOSED: { label: 'Closed', color: 'var(--text-secondary)', bg: 'var(--bg-input)' },
};

const CATEGORY_OPTIONS = [
  { value: 'BUG', label: 'Something is broken' },
  { value: 'QUESTION', label: 'How do I...' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'FEATURE_REQUEST', label: 'Feature request' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITY_OPTIONS = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.OPEN;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', background: s.bg, color: s.color, borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

function NewTicketForm({ onDone }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('QUESTION');
  const [priority, setPriority] = useState('NORMAL');
  const createMutation = useCreateSupportTicket();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    await createMutation.mutateAsync({ subject, description, category, priority });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '560px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Subject</label>
        <input type="text" className="input-field" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Short summary of the issue" required />
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Category</label>
          <Select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Priority</label>
          <Select className="input-field" value={priority} onChange={e => setPriority(e.target.value)}>
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Describe the issue</label>
        <textarea className="input-field" rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="What happened, what did you expect, and any steps to reproduce it" required style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" className="btn-primary" disabled={createMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
          {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Submit Ticket
        </button>
        <button type="button" className="btn-secondary" onClick={onDone} style={{ padding: '8px 16px' }}>Cancel</button>
      </div>
    </form>
  );
}

function TicketDetail({ ticketId, onBack }) {
  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  const [reply, setReply] = useState('');
  const replyMutation = useReplySupportTicket();

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await replyMutation.mutateAsync({ ticketId, body: reply });
    setReply('');
  };

  if (isLoading || !ticket) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: 'var(--text-muted)' }}>
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)', minHeight: '400px', maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', marginBottom: '16px', padding: 0 }}>
          <ArrowLeft size={14} /> Back to tickets
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{ticket.subject}</h3>
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 16px', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', background: 'var(--bg-card)', padding: '4px 12px', borderRadius: '12px', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
            Ticket Opened • {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
        </div>
        
        {ticket.messages.map(m => (
          <div key={m.id} style={{
            alignSelf: m.authorType === 'CLIENT' ? 'flex-end' : 'flex-start',
            maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '4px'
          }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              alignSelf: m.authorType === 'CLIENT' ? 'flex-end' : 'flex-start',
              padding: '0 4px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: m.authorType === 'CLIENT' ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                {m.authorType === 'CLIENT' ? m.authorName : `${m.authorName} · Scaleezy Support`}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div style={{
              background: m.authorType === 'CLIENT' ? 'var(--primary-color)' : 'var(--bg-input)',
              color: m.authorType === 'CLIENT' ? '#fff' : 'var(--text-primary)',
              borderRadius: '16px', 
              borderTopLeftRadius: m.authorType === 'CLIENT' ? '16px' : '4px',
              borderTopRightRadius: m.authorType === 'CLIENT' ? '4px' : '16px',
              padding: '10px 14px', border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{m.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Form */}
      {ticket.status !== 'CLOSED' && (
        <form onSubmit={handleReply} style={{ flexShrink: 0, display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            className="input-field" 
            style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '14px', outline: 'none' }} 
            value={reply} 
            onChange={e => setReply(e.target.value)} 
            placeholder="Type a reply..." 
            onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
          />
          <button 
            type="submit" 
            disabled={replyMutation.isPending || !reply.trim()} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: reply.trim() ? 'var(--primary-color)' : 'var(--bg-input)', color: reply.trim() ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '12px', cursor: reply.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
          >
            {replyMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} style={{ transform: 'translateX(-2px) translateY(2px)' }} />}
          </button>
        </form>
      )}
    </div>
  );
}

export default function SupportPanel() {
  const [view, setView] = useState('LIST'); // LIST | NEW | { ticketId }
  const { data: tickets, isLoading } = useSupportTickets();

  if (view === 'NEW') {
    return <NewTicketForm onDone={() => setView('LIST')} />;
  }
  if (view?.ticketId) {
    return <TicketDetail ticketId={view.ticketId} onBack={() => setView('LIST')} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '480px' }}>
          Raise an issue or question and hear back from Scaleezy support here.
        </p>
        <button onClick={() => setView('NEW')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', flexShrink: 0 }}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <LifeBuoy size={32} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontSize: '15px', fontWeight: 500 }}>No support tickets yet.</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Something not working right, or have a question? Raise a ticket above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tickets.map(t => (
            <button
              key={t.id}
              onClick={() => setView({ ticketId: t.id })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                padding: '14px 16px', background: 'var(--bg-input)', border: '1px solid var(--border-light)',
                borderRadius: '10px', cursor: 'pointer', textAlign: 'left', width: '100%'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {t._count?.messages ?? 1} message{(t._count?.messages ?? 1) === 1 ? '' : 's'} · updated {new Date(t.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <StatusBadge status={t.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
