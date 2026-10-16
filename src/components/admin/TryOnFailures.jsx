import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import LoadFailed from '../LoadFailed';
import { useAdminTryOnFailures } from '../../hooks/admin/useAdminConsole';
import Select from '../common/Select';

/**
 * Platform Console → Errors → Try-on.
 *
 * Shops only ever see a friendly sentence when a try-on fails. This is the far end's real reason,
 * next to what the shop was told -- so "the photo studio could not be reached" turns out to be
 * "429 monthly spending cap" here, not in a server log that has already rolled away.
 */

const SERVICE = { CATALOG_TRYON: 'Four-view photos', SHOPPER_TRYON: 'Customer try-on' };
const PLACE = { PHOTO_JOB: 'Photo job', CATALOG_STREAM: 'Four-view (live)', SHOP_PAGE: 'Online shop', COUNTER: 'Counter', STOREFRONT: 'Website' };
const when = (at) => new Date(at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const cell = { padding: '10px 14px', verticalAlign: 'top' };

export default function TryOnFailures() {
  // A shop's console page links here with ?shop=&service= already chosen.
  const [params] = useSearchParams();
  const [service, setService] = useState(params.get('service') ?? '');
  const [clientId, setClientId] = useState(params.get('shop') ?? '');
  const [days, setDays] = useState([1, 7, 30, 90].includes(Number(params.get('days'))) ? Number(params.get('days')) : 7);
  const [open, setOpen] = useState(null);
  const { data, isLoading, isError, error, refetch } = useAdminTryOnFailures({ service: service || undefined, clientId: clientId.trim() || undefined, days });
  const rows = data?.rows ?? [];
  const day = data?.lastDay;

  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 16px' }}>
        Every try-on that failed, with the real reason from the photo studio and what the shop was told. Kept 90 days. Refreshes automatically.
      </p>

      {data?.outage && (
        <div role="alert" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.10)', color: 'var(--accent-danger)', fontSize: '13px', marginBottom: '16px' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>
            <b>{data.outage.failures} failures in the last hour</b> across {data.outage.shops} shop{data.outage.shops === 1 ? '' : 's'}
            {data.outage.topReason ? <>, mostly <code>{data.outage.topReason}</code></> : null}. The photo studio itself may be down or out of allowance.
          </span>
        </div>
      )}

      {day && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', display: 'grid', gap: '4px' }}>
          <div><b style={{ color: 'var(--text-primary)' }}>Last 24 h:</b> {day.total} failure{day.total === 1 ? '' : 's'} · Four-view photos {day.byService.CATALOG_TRYON} · Customer try-on {day.byService.SHOPPER_TRYON}</div>
          {day.topReasons.length > 0 && (
            <div><b style={{ color: 'var(--text-primary)' }}>Top reasons:</b> {day.topReasons.map(r => `${r.reason} (${r.count})`).join(' · ')}</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <Select className="input-field" aria-label="Service" value={service} onChange={e => setService(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All services</option>
          <option value="CATALOG_TRYON">Four-view photos</option>
          <option value="SHOPPER_TRYON">Customer try-on</option>
        </Select>
        <input className="input-field" aria-label="Shop id" placeholder="Shop id (all shops)" value={clientId} onChange={e => setClientId(e.target.value)} style={{ width: '220px' }} />
        <Select className="input-field" aria-label="Period" value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: 'auto' }}>
          {[1, 7, 30, 90].map(d => <option key={d} value={d}>{d === 1 ? 'Last 24 hours' : `Last ${d} days`}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: 'var(--text-muted)' }}><Loader2 size={28} className="animate-spin" /></div>
      ) : isError ? (
        <LoadFailed what="try-on failures" error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '24px 0' }}>No try-on failed in this period. Failures are recorded from 15 Oct 2026; earlier ones were not kept.</p>
      ) : (
        <div className="table-container" style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'auto hidden', background: 'var(--bg-card)' }}>
          <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                {['', 'When', 'Shop', 'Service', 'Where', 'Real error', 'Shop was told'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(f => {
                const isOpen = open === f.id;
                return (
                  <React.Fragment key={f.id}>
                    <tr style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td style={{ ...cell, width: '20px' }}>
                        <button type="button" aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} the full error`} onClick={() => setOpen(isOpen ? null : f.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td style={{ ...cell, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{when(f.createdAt)}</td>
                      <td style={{ ...cell, fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{f.clientId}</td>
                      <td style={cell}>{f.jobKind === 'COLOUR' ? 'Colour photos' : SERVICE[f.service] ?? f.service}</td>
                      <td style={{ ...cell, color: 'var(--text-secondary)' }}>{PLACE[f.place] ?? f.place}</td>
                      <td style={{ ...cell, maxWidth: '360px' }}>
                        {(f.httpStatus || f.code) && <span style={{ fontWeight: 600 }}>{[f.httpStatus, f.code].filter(Boolean).join(' · ')} </span>}
                        <span style={{ color: 'var(--text-secondary)' }}>{f.error.length > 140 && !isOpen ? `${f.error.slice(0, 140)}…` : (isOpen ? '' : f.error)}</span>
                      </td>
                      <td style={{ ...cell, color: 'var(--text-muted)', maxWidth: '260px' }}>{f.shownMessage || '—'}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} style={{ padding: '6px 14px 14px 34px', background: 'var(--bg-input)' }}>
                          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', margin: '0 0 8px', color: 'var(--text-primary)' }}>{f.error}</pre>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            {f.httpStatus && <span>HTTP {f.httpStatus}</span>}
                            {f.code && <span>Code {f.code}</span>}
                            {f.productId && <span>Product {f.productId}</span>}
                            {f.jobId && <span>Job {f.jobId}</span>}
                            {f.attempt && <span>Attempt {f.attempt}</span>}
                            <Link to={`/platformconsole/clients/${f.clientId}`} style={{ color: 'var(--accent-gold)' }}>Open this shop</Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
