import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TriangleAlert, CheckCircle2, Loader2, ClipboardCheck } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { useShelfIssues, useResolveIssue, ISSUE_KINDS } from '../../hooks/useShelves';
import { ShelvesLayout, SpotChip, EmptyState, pieces } from '../../components/shelves/ShelfBits';

const FILTERS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ALL', label: 'All' }
];

const when = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Shelf issues: what the shelf rule could not do cleanly. Never corrected quietly -- someone looks,
 * checks the shelf, moves or recounts, and marks it resolved with a note.
 */
export default function ShelfIssues() {
  const { currentLocation } = useLocationContext();
  const { can } = usePermission();
  const [status, setStatus] = useState('OPEN');
  const [everywhere, setEverywhere] = useState(false);
  const [page, setPage] = useState(1);
  const issues = useShelfIssues(status, everywhere ? null : currentLocation?.id, page);
  const rows = issues.data?.issues ?? [];

  return (
    <ShelvesLayout title="Shelf issues" icon={TriangleAlert} needsLocation={false}
      subtitle="Where the shelves and the stock did not agree. Check the shelf, fix it with a move, then mark it resolved.">
      <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div role="tablist" className="sh-row" style={{ gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.value} role="tab" aria-selected={status === f.value} type="button"
              className={status === f.value ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 14px' }}
              onClick={() => { setStatus(f.value); setPage(1); }}>
              {f.label}{f.value === 'OPEN' && issues.data ? ` (${issues.data.open})` : ''}
            </button>
          ))}
        </div>
        <label className="sh-row sh-muted" style={{ gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={everywhere} onChange={(e) => { setEverywhere(e.target.checked); setPage(1); }} />
          Every location
        </label>
      </div>

      {issues.isLoading ? (
        <div className="sh-card sh-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <div className="sh-card">
          <EmptyState icon={status === 'OPEN' ? CheckCircle2 : ClipboardCheck}
            title={status === 'OPEN' ? 'Nothing needs a look' : 'No issues here'}
            text={status === 'OPEN' ? 'The shelves and the stock agree.' : 'Resolved issues will be listed here.'} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(issue => <IssueCard key={issue.id} issue={issue} canResolve={can('shelf:manage')} canMove={can('shelf:putaway')} />)}
          {(issues.data?.pages ?? 1) > 1 && (
            <div className="sh-row" style={{ justifyContent: 'space-between' }}>
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span className="sh-muted">Page {page} of {issues.data.pages}</span>
              <button className="btn-secondary" disabled={page >= issues.data.pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      )}
    </ShelvesLayout>
  );
}

function IssueCard({ issue, canResolve, canMove }) {
  const resolve = useResolveIssue();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const resolved = issue.status === 'RESOLVED';
  return (
    <article className="sh-card" style={{ display: 'grid', gap: 10, borderLeft: `4px solid ${resolved ? 'var(--accent-success)' : 'var(--accent-warning)'}` }}>
      <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span className="sh-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className={`sh-tag ${resolved ? 'floor' : 'back'}`}>{resolved ? 'Resolved' : ISSUE_KINDS[issue.kind] ?? issue.kind}</span>
            <span className="sh-muted">{issue.location?.name} · {when(issue.createdAt)}</span>
          </span>
          <strong>{issue.item.title} <span className="sh-muted" style={{ fontWeight: 400 }}>{[issue.item.colorName, issue.item.size, issue.item.sku].filter(Boolean).join(' · ')}</span></strong>
        </div>
        <span className="sh-row" style={{ gap: 8 }}>
          {issue.address && <SpotChip address={issue.address} showTag={false} />}
          <span className="sh-big-qty" style={{ fontSize: 18 }}>{pieces(issue.quantity)}</span>
        </span>
      </div>
      <p style={{ margin: 0, lineHeight: 1.5 }}>{issue.message}</p>
      {issue.spot && issue.spot.address !== issue.address && <span className="sh-muted">That shelf is now {issue.spot.address}.</span>}

      {resolved ? (
        <div className="sh-muted">Resolved {issue.resolvedAt ? when(issue.resolvedAt) : ''}{issue.resolutionNote ? ` — “${issue.resolutionNote}”` : ''}</div>
      ) : (
        <div className="sh-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {issue.spot && canMove && <Link to={`/shelves/move?spot=${issue.spot.id}&variant=${issue.item.variantId}`} className="btn-secondary" style={{ textDecoration: 'none', padding: '6px 12px' }}>Open the shelf</Link>}
          {canResolve && !open && <button type="button" className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setOpen(true)}>Mark resolved</button>}
          {canResolve && open && (
            <form style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260, flexWrap: 'wrap' }}
              onSubmit={(e) => { e.preventDefault(); resolve.mutate({ issueId: issue.id, note }); }}>
              <input className="input-field" autoFocus value={note} maxLength={500} onChange={(e) => setNote(e.target.value)}
                placeholder="What you found or did (optional)" style={{ flex: 1, minWidth: 180 }} aria-label="Resolution note" />
              <button type="submit" className="btn-primary" disabled={resolve.isPending}>{resolve.isPending ? 'Saving…' : 'Resolve'}</button>
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
