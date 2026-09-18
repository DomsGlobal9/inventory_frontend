import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, CheckCircle, Search, AlertTriangle, XCircle } from 'lucide-react';
import { useStockCount, useStartStockCount, useUpdateStockCountItem, useCompleteStockCount, useCancelStockCount } from '../hooks/useStockCounts';
import PageLoader from '../components/PageLoader';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { holdsEverything } from '../lib/authority';
import StatusPill from '../components/StockCountStatus';

export default function ActiveAudit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useStockCount(id);
  const startMutation = useStartStockCount();
  const updateMutation = useUpdateStockCountItem();
  const completeMutation = useCompleteStockCount();
  const cancelMutation = useCancelStockCount();
  // Cancelling is the shop's super admin's alone -- the server enforces it; this only avoids
  // offering a button that would be refused.
  const canCancel = holdsEverything(user);

  const [searchQuery, setSearchQuery] = useState('');
  // One <input> per audit row, so a scan can drop the cursor straight into the count box.
  const countInputRefs = useRef({});
  const [localCounts, setLocalCounts] = useState({});
  // What the SERVER last confirmed for each row, kept beside what is on screen.
  //
  // Without this the two were indistinguishable, and that hid a bad failure: each row saves
  // on blur, fire and forget, while completing the audit applies the numbers the SERVER
  // holds. So a save that failed left the counted figure sitting on screen looking counted,
  // the audit completed against the old number, and the stock adjustment was silently wrong
  // -- with a toast that had long since disappeared as the only warning.
  const [serverCounts, setServerCounts] = useState({});
  // 'saving' | 'error' per row, so a row can say for itself where it got to.
  const [saveState, setSaveState] = useState({});
  // Why a row was not saved, when trying again cannot help: a count that is not a whole number
  // of pieces, or a count the server refused. Such a row used to show "not saved - retry" for
  // ever -- -3 was sent, refused, and offered again, with nothing to say why.
  const [rowProblem, setRowProblem] = useState({});
  const [confirmState, setConfirmState] = useState({ isOpen: false });

  // A ref alongside the state so the merge below can read the PREVIOUS server values without
  // listing them as a dependency, which would re-run the effect against its own output.
  const serverCountsRef = useRef({});

  useEffect(() => {
    if (!data?.items) return;

    const fromServer = {};
    data.items.forEach(item => { fromServer[item.id] = item.countedQty ?? ''; });

    // Merge, do not overwrite.
    //
    // This used to assign the server's numbers straight over localCounts on every change to
    // `data`. Any refetch during a count -- and this list does refetch -- wiped whatever had
    // been typed and not yet saved. Somebody halfway down a stockroom shelf would look up and
    // find their figures replaced by the old ones, with nothing said about it.
    //
    // Now a row only takes the server's value when the person is not mid-edit on it.
    setLocalCounts(prev => {
      const next = { ...fromServer };
      Object.keys(prev).forEach(itemId => {
        const wasDirty = prev[itemId] !== undefined
          && String(prev[itemId]) !== String(serverCountsRef.current[itemId] ?? '');
        if (wasDirty) next[itemId] = prev[itemId];
      });
      return next;
    });

    serverCountsRef.current = fromServer;
    setServerCounts(fromServer);
  }, [data]);

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync(id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCountChange = (itemId, value) => {
    setLocalCounts(prev => ({
      ...prev,
      [itemId]: value
    }));
    // Typing again clears a previous failure marker -- the row is being worked on, not stuck.
    setSaveState(prev => (prev[itemId] ? { ...prev, [itemId]: undefined } : prev));
    setRowProblem(prev => (prev[itemId] ? { ...prev, [itemId]: undefined } : prev));
  };

  // A row is unsaved when what is in the box differs from what the server confirmed.
  const isRowUnsaved = (itemId) =>
    String(localCounts[itemId] ?? '') !== String(serverCounts[itemId] ?? '');

  const unsavedRows = () =>
    (data?.items || []).filter(i => isRowUnsaved(i.id) || saveState[i.id] === 'error' || rowProblem[i.id]);

  const handleSaveItem = async (itemId) => {
    const value = localCounts[itemId];
    const original = data?.items?.find(i => i.id === itemId)?.countedQty ?? '';
    if (value === original) return; // unchanged -- don't fire a needless save

    // Clearing a count is a real, meaningful action -- it puts the item back to "not
    // yet counted" (countedQty: null on the server, which completeCount already treats
    // specially). Previously this just returned here with nothing saved, leaving the
    // input showing blank while the server still held the old count.
    const countedQty = value === '' ? null : Number(value);
    // Refused here, in the box, and never sent: the server would refuse it too, and no retry
    // can change that. Zero is a real count -- nothing left on the shelf.
    const problem = countedQty === null ? null
      : !Number.isFinite(countedQty) ? 'Type how many pieces you counted, as a number.'
      : countedQty < 0 ? 'A count cannot be less than 0. Type 0 if there are none.'
      : !Number.isInteger(countedQty) ? 'Count whole pieces, for example 3, not 2.5.'
      : null;
    if (problem) {
      setRowProblem(prev => ({ ...prev, [itemId]: problem }));
      setSaveState(prev => ({ ...prev, [itemId]: undefined }));
      return;
    }
    setRowProblem(prev => (prev[itemId] ? { ...prev, [itemId]: undefined } : prev));
    setSaveState(prev => ({ ...prev, [itemId]: 'saving' }));
    try {
      await updateMutation.mutateAsync({ countId: id, itemId, countedQty });
      // Record what the server now holds, so the row reads as saved rather than merely typed.
      setServerCounts(prev => ({ ...prev, [itemId]: value }));
      serverCountsRef.current = { ...serverCountsRef.current, [itemId]: value };
      setSaveState(prev => ({ ...prev, [itemId]: undefined }));
    } catch (error) {
      // Keep the number the person counted -- it is the only copy of it -- but mark the row so
      // it is obvious the figure has not reached the server, and stop the audit being
      // completed against numbers that were never stored.
      //
      // Retry is offered only where a retry can work: no answer at all, or the server failing.
      // A refusal (a closed count, a number it will not take) says why instead.
      const status = error?.statusCode;
      const retryable = !status || status >= 500 || status === 429;
      setSaveState(prev => ({ ...prev, [itemId]: retryable ? 'error' : undefined }));
      if (!retryable) setRowProblem(prev => ({ ...prev, [itemId]: error?.message || 'This count was not saved.' }));
      console.error(error);
    }
  };

  const handleComplete = async () => {
    // Completing applies the SERVER's numbers. If a row's count never got there, completing now
    // would adjust stock to a figure nobody counted while the screen went on showing the one
    // they did. Name the rows rather than refusing in general terms.
    const stuck = unsavedRows();
    if (stuck.length > 0) {
      const names = stuck.slice(0, 3).map(i => i.sku).join(', ');
      toast.error(
        stuck.length === 1
          ? stuck[0].sku + ' has not been saved yet. Click into its count box and press Tab to save it, then complete the audit.'
          : stuck.length + ' counts have not been saved yet (' + names + (stuck.length > 3 ? ', ...' : '') + '). Save them before completing the audit.',
        { duration: 8000 }
      );
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Complete Audit',
      message: 'Are you sure you want to complete this audit? This will generate automatic inventory adjustments for any discrepancies and cannot be undone.',
      confirmText: 'Complete Audit',
      // Not caught here on purpose. The mutation already toasts what went wrong, and letting
      // the rejection reach the modal is what keeps it open so the person can read the message
      // and try again -- swallowing it closed the modal as though the audit had completed.
      onConfirm: async () => {
        await completeMutation.mutateAsync({ id, completedBy: user?.name || user?.id });
        navigate('/inventory/audits');
      }
    });
  };

  const handleCancel = () => {
    setConfirmState({
      isOpen: true,
      title: 'Cancel this count?',
      message: 'The count is closed and nobody can type into it again. No stock is changed, and what was already counted stays on it for reference. This cannot be undone.',
      confirmText: 'Cancel count',
      confirmStyle: 'danger',
      // Rejection reaches the modal on purpose, as for Complete: it stays open with the reason.
      onConfirm: async () => {
        await cancelMutation.mutateAsync(id);
      }
    });
  };

  if (isLoading) return <PageLoader text="Loading Audit..." />;

  const audit = data;
  if (!audit) return <div style={{ padding: '32px' }}>Audit not found</div>;

  const filteredItems = audit.items?.filter(item => 
    item.variant.product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Hardware scanners type the code and then send Enter. Without handling that Enter the
  // scanned code stayed in the box, so the NEXT scan appended to it -- producing a
  // concatenated string that matched nothing and silently stalled the whole count.
  // On Enter: if the scan narrowed to exactly one row, clear the box and put the cursor
  // in that row's count field, ready for the quantity. That is the whole scan-count loop.
  const handleScanKey = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const scanned = searchQuery.trim();
    if (!scanned) return;

    if (filteredItems.length === 1) {
      const match = filteredItems[0];
      setSearchQuery('');
      // The row re-renders unfiltered, so wait a tick before reaching for its input.
      setTimeout(() => countInputRefs.current[match.id]?.focus(), 0);
    } else if (filteredItems.length === 0) {
      toast.error(`No item in this audit matches "${scanned}".`);
    } else {
      toast(`${filteredItems.length} items match "${scanned}" — pick one below.`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0 }}>
      {/* Header */}
      {/* Wraps on a phone: the buttons drop under the name instead of squeezing it to one word a line. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-secondary" onClick={() => navigate('/inventory/audits')} style={{ padding: '8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>{audit.name}</h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
              <StatusPill status={audit.status} small />
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                {audit.status === 'CANCELLED' ? `${audit.totalItems || 0} items` : `${audit.items?.length || 0} items to count`}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canCancel && (audit.status === 'DRAFT' || audit.status === 'IN_PROGRESS') && (
            <button
              className="btn-secondary"
              onClick={handleCancel}
              disabled={cancelMutation.isPending || completeMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-danger)' }}
              title="Close this count without changing any stock"
            >
              <XCircle size={16} /> Cancel count
            </button>
          )}
          {audit.status === 'DRAFT' && (
            <button className="btn-primary" onClick={handleStart} disabled={startMutation.isLoading}>
              Start Counting
            </button>
          )}
          {audit.status === 'IN_PROGRESS' && (
            <button 
              className="btn-primary" 
              onClick={handleComplete}
              disabled={completeMutation.isLoading}
              style={{ backgroundColor: 'var(--accent-success)', borderColor: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <CheckCircle size={16} /> Complete Audit
            </button>
          )}
        </div>
      </div>

      {audit.status === 'CANCELLED' && (
        <div role="status" style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <XCircle size={20} color="var(--accent-danger)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
            This count was cancelled{audit.completedBy ? ` by ${audit.completedBy}` : ''}{audit.completedAt ? ` on ${new Date(audit.completedAt).toLocaleDateString()}` : ''}. No stock was changed. What was counted before then is kept below, for reference. To count again, start a new count from the list.
          </span>
        </div>
      )}

      {/* Warning Banner */}
      {audit.status === 'IN_PROGRESS' && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AlertTriangle size={20} color="var(--accent-gold)" />
          <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
            Active stock movements during a count may cause reconciliation inaccuracies. It is recommended to pause order fulfillment while auditing.
          </span>
        </div>
      )}

      {/* Table Area. A cancelled count keeps its lines, shown read-only (every box is locked
          outside IN_PROGRESS), so what was counted before the cancel can still be checked. */}
      <div className="glass-panel mobile-no-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        
        {/* Toolbar */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '16px' }}>
          <div className="search-bar" style={{ maxWidth: '400px' }}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Scan barcode or search SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleScanKey}
              disabled={audit.status !== 'IN_PROGRESS'}
            />
          </div>
        </div>

        {/* List */}
        <div className="table-container mobile-no-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Product & Identifiers</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Expected</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Counted</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                // Defaulted to '' because localCounts is empty on the very first render, before
                // the effect fills it -- so this input started life uncontrolled and became
                // controlled a tick later, which React warns about and which loses a keystroke
                // typed into that gap.
                const counted = localCounts[item.id] ?? '';
                const expected = item.expectedQty;
                // A refused count has no difference to show: -3 against 13 is not "-16".
                const hasValue = counted !== '' && counted !== undefined && counted !== null && !rowProblem[item.id];
                const diff = hasValue ? Number(counted) - expected : null;
                const concurrentChange = audit.status === 'IN_PROGRESS' && item.variant.quantity !== expected;
                
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td>
                      <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.variant.product.title}</div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.sku}</span>
                        {item.barcode && <span style={{ color: 'var(--text-muted)' }}>{item.barcode}</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          {expected}
                        </span>
                        {concurrentChange && (
                          <span 
                            title={`Inventory changed to ${item.variant.quantity} after audit started.`}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--accent-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}
                          >
                            <AlertTriangle size={10} /> Changed to {item.variant.quantity}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {(() => {
                        const rowState = saveState[item.id];
                        const unsaved = isRowUnsaved(item.id);
                        // Red when the save failed, amber while it is unsaved, normal once the
                        // server has it. A counted number that exists only on screen should not
                        // look identical to one that is safely stored.
                        const problem = rowProblem[item.id];
                        const borderColor = (rowState === 'error' || problem)
                          ? 'var(--accent-danger, #ef4444)'
                          : (unsaved ? 'var(--accent-gold, #f59e0b)' : 'var(--border-light)');
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              aria-invalid={problem ? true : undefined}
                              ref={(el) => { countInputRefs.current[item.id] = el; }}
                              value={counted}
                              onChange={(e) => handleCountChange(item.id, e.target.value)}
                              onBlur={() => handleSaveItem(item.id)}
                              disabled={audit.status !== 'IN_PROGRESS'}
                              style={{
                                width: '80px', padding: '8px', textAlign: 'center',
                                borderRadius: '6px', border: `1px solid ${borderColor}`,
                                backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
                                fontWeight: '600', fontSize: '16px'
                              }}
                            />
                            {problem ? (
                              <span role="alert" style={{ fontSize: '11px', lineHeight: 1.3, color: 'var(--accent-danger, #ef4444)', maxWidth: '160px' }}>{problem}</span>
                            ) : rowState === 'error' ? (
                              <button
                                onClick={() => handleSaveItem(item.id)}
                                style={{ fontSize: '10px', color: 'var(--accent-danger, #ef4444)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                title="This count did not reach the server. Click to try again."
                              >
                                not saved - retry
                              </button>
                            ) : rowState === 'saving' ? (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>saving...</span>
                            ) : unsaved ? (
                              <span style={{ fontSize: '10px', color: 'var(--accent-gold, #f59e0b)' }}>unsaved</span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {hasValue ? (
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          backgroundColor: diff === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: diff === 0 ? 'var(--accent-success)' : 'var(--accent-danger)'
                        }}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmStyle={confirmState.confirmStyle}
      />
    </motion.div>
  );
}
