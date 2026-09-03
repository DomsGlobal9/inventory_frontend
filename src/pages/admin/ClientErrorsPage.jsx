import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Bug, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAdminClientErrors } from '../../hooks/admin/useAdminConsole';
import PageGuide from '../../components/admin/PageGuide';

const SOURCE_STYLE = {
  BACKEND: { color: 'var(--accent-danger)', bg: 'rgba(239, 68, 68, 0.1)' },
  FRONTEND: { color: 'var(--accent-gold)', bg: 'rgba(226, 193, 113, 0.1)' },
};

export default function ClientErrorsPage() {
  const { data, isLoading } = useAdminClientErrors();
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Bug size={22} color="var(--accent-gold)" /> Errors
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Backend crashes and uncaught frontend errors across every client, newest first. Refreshes automatically.
      </p>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading data...</div>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-card)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                {['', 'Time', 'Client', 'Source', 'Message', 'Route', 'User'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.map(err => {
                const style = SOURCE_STYLE[err.source] || SOURCE_STYLE.FRONTEND;
                const isExpanded = expandedId === err.id;
                return (
                  <React.Fragment key={err.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : err.id)}
                      style={{ borderTop: '1px solid var(--border-light)', cursor: err.stack ? 'pointer' : 'default' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', color: 'var(--text-muted)', width: '20px' }}>
                        {err.stack && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(err.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {err.clientId ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/platformconsole/clients/${err.clientId}`); }}
                            title={`View ${err.clientId} overview`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', background: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border-light)', cursor: 'pointer' }}
                          >
                            <Building2 size={12} color="var(--accent-gold)" />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{err.clientId}</span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unknown</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', background: style.bg, color: style.color, borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                          {err.source}{err.statusCode ? ` ${err.statusCode}` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-primary)', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={err.message}>
                        {err.message}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {err.route || '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {err.userEmail || '—'}
                      </td>
                    </tr>
                    {isExpanded && err.stack && (
                      <tr style={{ borderTop: '1px solid var(--border-light)' }}>
                        <td colSpan={7} style={{ padding: '12px 16px', background: 'var(--bg-input)' }}>
                          <pre style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono)' }}>{err.stack}</pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {(!data || data.length === 0) && (
                <tr><td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Bug size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '15px', fontWeight: 500 }}>No errors recorded.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <PageGuide title="About Client Errors">
        <p>This tab provides a unified log of system crashes and errors across all client environments.</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
          <li><strong>Frontend Errors:</strong> Uncaught exceptions happening in the client's browser (e.g. React crashes).</li>
          <li><strong>Backend Errors:</strong> Server-side crashes (HTTP 500s) indicating a bug or infrastructure issue.</li>
          <li><strong>Stack Traces:</strong> Click on any row with a chevron to expand and view the full technical stack trace.</li>
        </ul>
      </PageGuide>
    </div>
  );
}
