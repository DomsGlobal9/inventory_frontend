import React, { useState } from 'react';
import { Loader2, Inbox, Mail, Phone, Building2, Check, Copy, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminLeads, useUpdateLead, useConvertLead } from '../../hooks/admin/useAdminConsole';

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'REJECTED'];

const STATUS_STYLE = {
  NEW:       { color: 'var(--accent-gold)',    bg: 'rgba(226, 193, 113, 0.12)' },
  CONTACTED: { color: '#60a5fa',               bg: 'rgba(96, 165, 250, 0.12)' },
  QUALIFIED: { color: '#a78bfa',               bg: 'rgba(167, 139, 250, 0.12)' },
  CONVERTED: { color: 'var(--accent-success)', bg: 'rgba(16, 185, 129, 0.12)' },
  REJECTED:  { color: 'var(--text-muted)',     bg: 'rgba(255, 255, 255, 0.05)' }
};

// CONVERTED is absent on purpose: it is only ever set by the convert action, which also
// records which workspace the lead became. Offering it here would let an admin claim a
// workspace exists with nothing to point at, and the server refuses it anyway.
const MANUAL_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'REJECTED'];

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [credentials, setCredentials] = useState(null);

  const { data, isLoading } = useAdminLeads({ status: statusFilter || undefined, search: search || undefined, page });
  const updateLead = useUpdateLead();
  const convertLead = useConvertLead();

  const leads = data?.data || [];
  const counts = data?.meta?.countsByStatus || {};
  const totalPages = data?.meta?.totalPages || 1;
  const total = data?.meta?.total ?? 0;

  // Any change to what is being listed has to reset the page, or filtering while on page 3
  // of an unfiltered list asks for page 3 of a one-page result and shows nothing.
  const changeFilter = (next) => { setStatusFilter(next); setPage(1); };
  const changeSearch = (next) => { setSearch(next); setPage(1); };

  const handleConvert = (lead) => {
    // Converting provisions a real workspace and issues credentials -- not something to do
    // by mis-clicking a row, so it is confirmed explicitly.
    const ok = window.confirm(
      `Create a workspace for "${lead.companyName}" and generate login credentials for ${lead.email}?`
    );
    if (!ok) return;

    convertLead.mutate({ id: lead.id }, {
      onSuccess: (res) => {
        // `res` is already the payload: lib/api.ts's response interceptor returns
        // response.data (the {success, data} envelope) and the hook's mutationFn takes .data
        // off that. Reaching for res.data here again yielded undefined, and the panel
        // rendered with three empty fields instead of the credentials.
        //
        // Shown once, and only here. The password is recoverable later from
        // Clients -> this client -> view password, which the panel says.
        setCredentials({ ...res, companyName: lead.companyName });
        toast.success(`Workspace "${res.clientId}" created`);
      }
    });
  };

  const copyDetails = () => {
    if (!credentials) return;
    const text =
      `Workspace: ${credentials.clientId}\n` +
      `Email: ${credentials.adminEmail}\n` +
      `Temporary password: ${credentials.tempPassword}`;
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Credentials copied'))
      .catch(() => toast.error('Could not copy -- select the text instead'));
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Inbox size={22} color="var(--accent-gold)" /> Leads
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Signup enquiries from the public site. Nothing is provisioned until you convert one -- contact them first, then create their workspace here.
      </p>

      {credentials && (
        <div style={{
          border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.08)',
          borderRadius: '12px', padding: '20px', marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-success)', marginBottom: '12px' }}>
                Workspace created for {credentials.companyName}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Workspace ID</span>
                <code style={{ color: 'var(--text-primary)' }}>{credentials.clientId}</code>
                <span style={{ color: 'var(--text-secondary)' }}>Admin email</span>
                <code style={{ color: 'var(--text-primary)' }}>{credentials.adminEmail}</code>
                <span style={{ color: 'var(--text-secondary)' }}>Temp password</span>
                <code style={{ color: 'var(--text-primary)' }}>{credentials.tempPassword}</code>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '12px 0 0' }}>
                Share these with the client. You can view the password again later from Clients &rarr; this client.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button className="btn-secondary" onClick={copyDetails} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Copy size={14} /> Copy
              </button>
              <button className="btn-secondary" onClick={() => setCredentials(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input-field"
          placeholder="Search name, business, email or phone..."
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          style={{ flex: 1, minWidth: '260px' }}
        />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <FilterChip label={`All (${Object.values(counts).reduce((a, b) => a + b, 0)})`} active={!statusFilter} onClick={() => changeFilter('')} />
          {STATUSES.map(s => (
            <FilterChip
              key={s}
              label={`${s.charAt(0) + s.slice(1).toLowerCase()} (${counts[s] || 0})`}
              active={statusFilter === s}
              onClick={() => changeFilter(statusFilter === s ? '' : s)}
            />
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading leads...</div>
        </div>
      ) : leads.length === 0 ? (
        <div style={{
          border: '1px dashed var(--border-light)', borderRadius: '12px', padding: '64px 24px',
          textAlign: 'center', color: 'var(--text-muted)'
        }}>
          <Inbox size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <div style={{ fontSize: '14px' }}>
            {search || statusFilter ? 'No leads match this filter.' : 'No signup enquiries yet.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {leads.map(lead => {
            const style = STATUS_STYLE[lead.status] || STATUS_STYLE.NEW;
            const isOpen = expandedId === lead.id;
            const draft = noteDrafts[lead.id] !== undefined ? noteDrafts[lead.id] : (lead.notes || '');
            const notesDirty = draft !== (lead.notes || '');

            return (
              <div key={lead.id} style={{
                border: '1px solid var(--border-light)', borderRadius: '12px',
                background: 'var(--bg-card)', overflow: 'hidden'
              }}>
                <div
                  onClick={() => setExpandedId(isOpen ? null : lead.id)}
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={15} color="var(--text-muted)" />
                      {lead.companyName}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {lead.contactName}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', minWidth: '220px' }}>
                    <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
                       style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={13} /> {lead.email}
                    </a>
                    <a href={`tel:${lead.phone.replace(/\s/g, '')}`} onClick={e => e.stopPropagation()}
                       style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} /> {lead.phone}
                    </a>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '110px' }}>
                    {new Date(lead.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>

                  <span style={{
                    padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
                    letterSpacing: '0.04em', color: style.color, background: style.bg
                  }}>
                    {lead.status}
                  </span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border-light)', padding: '20px', background: 'var(--bg-input)' }}>
                    {lead.message && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Their message
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {lead.message}
                        </div>
                      </div>
                    )}

                    {lead.status === 'CONVERTED' ? (
                      <div style={{ fontSize: '13px', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={15} />
                        Converted to workspace <code>{lead.convertedClientId}</code>
                        {lead.convertedAt && ` on ${new Date(lead.convertedAt).toLocaleDateString()}`}
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Status
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {MANUAL_STATUSES.map(s => (
                              <FilterChip
                                key={s}
                                label={s.charAt(0) + s.slice(1).toLowerCase()}
                                active={lead.status === s}
                                disabled={updateLead.isPending}
                                onClick={() => {
                                  if (lead.status === s) return;
                                  updateLead.mutate({ id: lead.id, status: s });
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Notes
                          </div>
                          <textarea
                            className="input-field"
                            rows={3}
                            value={draft}
                            placeholder="What was discussed, what they need, when to follow up..."
                            onChange={(e) => setNoteDrafts(prev => ({ ...prev, [lead.id]: e.target.value }))}
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                          {notesDirty && (
                            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                              <button
                                className="btn-secondary"
                                disabled={updateLead.isPending}
                                onClick={() => updateLead.mutate(
                                  { id: lead.id, notes: draft },
                                  { onSuccess: () => { setNoteDrafts(prev => ({ ...prev, [lead.id]: undefined })); toast.success('Notes saved'); } }
                                )}
                              >
                                {updateLead.isPending ? 'Saving...' : 'Save notes'}
                              </button>
                              <button
                                className="btn-secondary"
                                onClick={() => setNoteDrafts(prev => ({ ...prev, [lead.id]: undefined }))}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          className="btn-primary"
                          disabled={convertLead.isPending}
                          onClick={() => handleConvert(lead)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          {convertLead.isPending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                          {convertLead.isPending ? 'Creating workspace...' : 'Convert to client'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)',
          flexWrap: 'wrap', gap: '12px'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing {(page - 1) * 25 + 1}&ndash;{Math.min(page * 25, total)} of {total}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'default' : 'pointer' }}
            >
              Previous
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '90px', textAlign: 'center' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'default' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        border: `1px solid ${active ? 'var(--accent-gold)' : 'var(--border-light)'}`,
        background: active ? 'rgba(226, 193, 113, 0.12)' : 'transparent',
        color: active ? 'var(--accent-gold)' : 'var(--text-secondary)',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease'
      }}
    >
      {label}
    </button>
  );
}
