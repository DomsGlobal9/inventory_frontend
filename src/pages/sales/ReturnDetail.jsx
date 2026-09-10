import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, AlertTriangle, Box, Truck, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { usePermission } from '../../hooks/usePermission';
import { invalidateDerivedViews } from '../../lib/invalidate';
import Select from '../../components/common/Select';


import PageLoader from '../../components/PageLoader';

export default function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectionData, setInspectionData] = useState({});

  const { data: returnData, isLoading } = useQuery({
    queryKey: ['return', id],
    queryFn: async () => {
      return api.get(`/returns/${id}`);
    }
  });

  // ReturnsList queries ['returns'] (plural) and a completed return restocks
  // inventory -- invalidating only ['return', id] left both stale.
  const refreshReturn = () => {
    queryClient.invalidateQueries({ queryKey: ['return', id] });
    queryClient.invalidateQueries({ queryKey: ['returns'] });
    invalidateDerivedViews(queryClient);
  };

  const RETURN_KEY = ['return', id];

  /**
   * Move the return on screen now, and hand back what to restore if the server disagrees.
   *
   * A return is walked through in three presses -- received, inspected, completed -- and each
   * one was measured at fifteen to twenty seconds before the screen changed, because each
   * waited for the round trip and then a refetch on top of it. Three presses, a minute of a
   * screen that looks like it ignored you, on the desk where somebody is working through a
   * pile of returned parcels.
   *
   * The status and the dispositions are the person's own decision being echoed back, so there
   * is nothing to guess. What a completed return does to STOCK is left to the server and
   * refetched: restocking is a real inventory movement and belongs to whoever does the
   * arithmetic, not to this screen.
   */
  const patchReturn = (patch) => {
    const previous = queryClient.getQueryData(RETURN_KEY);
    queryClient.setQueryData(RETURN_KEY, (old) => {
      if (!old?.data) return old;
      const next = typeof patch === 'function' ? patch(old.data) : patch;
      return { ...old, data: { ...old.data, ...next } };
    });
    return previous;
  };

  // None of these had an onError at all, so a refusal changed nothing on screen and said
  // nothing -- the only difference between "still saving" and "quietly failed" was patience.
  const undo = (previous, error, fallback) => {
    if (previous !== undefined) queryClient.setQueryData(RETURN_KEY, previous);
    toast.error(error?.message || fallback);
  };

  const receiveMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/returns/${id}/receive`);
    },
    onMutate: () => ({ previous: patchReturn({ status: 'RECEIVED' }) }),
    onError: (error, _v, context) => undo(context?.previous, error, 'Could not mark this return as received.'),
    onSettled: () => refreshReturn()
  });

  const inspectMutation = useMutation({
    mutationFn: async (dispositions) => {
      return api.post(`/returns/${id}/inspect`, { itemsDisposition: dispositions });
    },
    onMutate: (dispositions) => {
      const chosen = new Map((dispositions || []).map(d => [d.salesReturnItemId, d.disposition]));
      return {
        previous: patchReturn((ret) => ({
          status: 'INSPECTED',
          items: (ret.items || []).map(item =>
            chosen.has(item.id) ? { ...item, disposition: chosen.get(item.id) } : item
          )
        }))
      };
    },
    onError: (error, _v, context) => {
      undo(context?.previous, error, 'Could not save those decisions.');
      // Reopened so the decisions are still there to correct, rather than lost to a closed modal.
      setInspectModalOpen(true);
    },
    onSuccess: () => setInspectModalOpen(false),
    onSettled: () => refreshReturn()
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/returns/${id}/complete`);
    },
    onMutate: () => ({ previous: patchReturn({ status: 'COMPLETED', completedAt: new Date().toISOString() }) }),
    onError: (error, _v, context) => undo(context?.previous, error, 'Could not complete this return.'),
    onSettled: () => refreshReturn()
  });

  if (isLoading) {
    return <PageLoader text="LOADING RETURNS..." />;
  }

  const ret = returnData?.data;
  if (!ret) return <div style={{ padding: '24px' }}>Return not found.</div>;

  const getStatusColor = (status) => {
    switch(status) {
      case 'REQUESTED': return 'var(--accent-warning)';
      case 'RECEIVED': return 'var(--accent-primary)';
      case 'INSPECTED': return 'var(--primary-color)';
      case 'COMPLETED': return 'var(--accent-success)';
      case 'REJECTED': return 'var(--accent-danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const getDispositionBadge = (disp) => {
    switch(disp) {
      case 'RESTOCK': return <span style={{ color: 'var(--accent-success)' }}>Restock</span>;
      case 'DAMAGED': return <span style={{ color: 'var(--accent-danger)' }}>Damaged</span>;
      case 'SCRAP': return <span style={{ color: 'var(--text-secondary)' }}>Scrap</span>;
      default: return <span style={{ color: 'var(--accent-warning)' }}>Pending Inspection</span>;
    }
  };

  // Inspection is a one-shot decision: once it's saved the return moves to INSPECTED and
  // can't be re-inspected, so every line must be decided here. Sending only the rows the
  // user happened to touch left the rest PENDING, which completeReturn then refuses --
  // stranding the return with no way forward except rejecting it.
  const inspectableItems = ret.items || [];
  const allItemsDecided = inspectableItems.length > 0
    && inspectableItems.every(item => !!inspectionData[item.id]);

  const handleInspectSubmit = () => {
    if (!allItemsDecided) return;
    const dispositions = inspectableItems.map(item => ({
      salesReturnItemId: item.id,
      disposition: inspectionData[item.id]
    }));
    inspectMutation.mutate(dispositions);
  };

  const canComplete = ret.status === 'INSPECTED' && (ret.items || []).every(item => item.disposition !== 'PENDING');

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <button 
        onClick={() => navigate('/returns')}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '24px', padding: 0 }}
      >
        <ArrowLeft size={16} /> Back to Returns
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', margin: 0 }}>{ret.returnNumber}</h1>
            <span style={{
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: `${getStatusColor(ret.status)}15`,
              color: getStatusColor(ret.status)
            }}>
              {ret.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Order {ret.salesOrder?.orderNumber} • Customer: {ret.salesOrder?.customer?.name}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {ret.status === 'REQUESTED' && can('return:receive') && (
            <button
              className="btn-primary"
              onClick={() => receiveMutation.mutate()}
              disabled={receiveMutation.isPending}
            >
              <Truck size={16} style={{ marginRight: '8px' }} />
              Mark as Received
            </button>
          )}

          {(ret.status === 'RECEIVED' || ret.status === 'INSPECTED') && can('return:inspect') && (
            <button
              className="btn-secondary"
              onClick={() => {
                const initialData = {};
                ret.items.forEach(i => initialData[i.id] = i.disposition);
                setInspectionData(initialData);
                setInspectModalOpen(true);
              }}
            >
              <Edit3 size={16} style={{ marginRight: '8px' }} />
              Inspect Items
            </button>
          )}

          {ret.status === 'INSPECTED' && can('return:complete') && (
            <button
              className="btn-primary"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending || !canComplete}
              title={!canComplete ? "All items must be inspected first" : ""}
            >
              <CheckCircle size={16} style={{ marginRight: '8px' }} />
              Complete Return
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        <div className="card" style={{ padding: '0' }}>
          <div className="table-container" style={{ padding: '20px', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Returned Items</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left', backgroundColor: 'var(--bg-card)' }}>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 500 }}>Product</th>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 500 }}>Qty</th>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 500 }}>Disposition</th>
              </tr>
            </thead>
            <tbody>
              {ret.items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--border-light)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box size={20} color="var(--text-secondary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.dispatchItem?.salesOrderItem?.variant?.product?.title}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          SKU: {item.dispatchItem?.salesOrderItem?.variant?.sku}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 500 }}>{item.quantity}</td>
                  <td style={{ padding: '16px 20px' }}>{getDispositionBadge(item.disposition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Return Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Reason</div>
                <div style={{ fontWeight: 500 }}>{ret.reason.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Created Date</div>
                <div style={{ fontWeight: 500 }}>{new Date(ret.createdAt).toLocaleString()}</div>
              </div>
              {ret.completedAt && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Completed Date</div>
                  <div style={{ fontWeight: 500 }}>{new Date(ret.completedAt).toLocaleString()}</div>
                </div>
              )}
              {ret.notes && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notes</div>
                  <div style={{ fontSize: '14px', lineHeight: '1.5' }}>{ret.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {inspectModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxWidth: '90vw' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Inspect Items</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Select the disposition for each returned item.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {ret.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-light)', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.dispatchItem?.salesOrderItem?.variant?.sku}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Qty: {item.quantity}</div>
                  </div>
                  <Select 
                    className="input-field" 
                    style={{ width: '150px' }}
                    value={inspectionData[item.id] || ''}
                    onChange={(e) => setInspectionData({ ...inspectionData, [item.id]: e.target.value })}
                  >
                    {/* No "Pending" option: picking it saved a disposition the rest of the
                        workflow treats as undecided, permanently blocking completion. */}
                    <option value="" disabled>Choose…</option>
                    <option value="RESTOCK">Restock (Add to Inventory)</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="SCRAP">Scrap</option>
                  </Select>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setInspectModalOpen(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleInspectSubmit}
                disabled={inspectMutation.isPending || !allItemsDecided}
                title={allItemsDecided ? undefined : 'Choose a disposition for every returned item first'}
              >
                Save Dispositions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
