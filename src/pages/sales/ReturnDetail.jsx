import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, AlertTriangle, Box, Truck, Edit3, XCircle } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { usePermission } from '../../hooks/usePermission';
import { invalidateDerivedViews } from '../../lib/invalidate';
import Select from '../../components/common/Select';


import PageLoader from '../../components/PageLoader';
import { formatINRExact } from '../../utils/formatUtils';
import { PutAwayNotice } from '../../components/shelves/ShelfLinks';
import { RETURN_STATUS, RETURN_DISPOSITION, StatusPill, describe, returnReasonLabel } from '../../components/sales/labels';
import { useDialog } from '../../hooks/useDialog';
import WhatsAppSendButton from '../../components/whatsapp/WhatsAppSendButton';
import ReturnNotePDF from '../../components/ReturnNotePDF';
import { makePdf } from '../../components/pdf/downloadPdf';
import { logoAsPng } from '../../components/pdf/pdfLogo';
import { buildWhatsAppUrl } from '../../utils/whatsappUtils';

export default function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [inspectionData, setInspectionData] = useState({});
  const inspectDialogRef = useDialog(inspectModalOpen, { onClose: () => setInspectModalOpen(false) });

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

  /*
   * Turning a return down: booked in by mistake, twice, or the goods never came. The server has
   * always allowed it, but nothing on screen called it, so a return raised in error stayed on the
   * list for ever and kept its pieces from being returned properly.
   */
  const rejectMutation = useMutation({
    mutationFn: async () => api.post(`/returns/${id}/reject`),
    onSuccess: () => toast.success('Return turned down. Its pieces can be returned again if they do come back.'),
    onError: (error) => toast.error(error?.message || 'Could not turn down this return.'),
    onSettled: () => refreshReturn()
  });

  if (isLoading) {
    return <PageLoader text="LOADING RETURNS..." />;
  }

  const ret = returnData?.data;
  if (!ret) return <div style={{ padding: '24px' }}>Return not found.</div>;

  const getDispositionBadge = (disp) => {
    const { label, color } = describe(RETURN_DISPOSITION, disp || 'PENDING');
    return <span style={{ color: `rgb(${color})` }}>{label}</span>;
  };

  /*
   * Only what this return put back into stock can be waiting for a shelf: the Restock lines. The
   * notice used to be handed every line's item, and counted the store's whole unshelved stock for
   * any item that was not restocked -- so a return whose one saree was marked Damaged said "2 pieces
   * of this return are not on a shelf yet". No Restock line, no notice.
   */
  const restocked = (ret?.items || []).filter(i => i.disposition === 'RESTOCK').reduce((m, i) => {
    const v = i.dispatchItem?.salesOrderItem?.variantId;
    if (v) m[v] = (m[v] ?? 0) + (Number(i.quantity) || 0);
    return m;
  }, {});

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
            <StatusPill map={RETURN_STATUS} value={ret.status} size="large" />
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Order {ret.salesOrder?.orderNumber} • Customer: {ret.salesOrder?.customer?.name}
          </p>
          {ret.status === 'COMPLETED' && Object.keys(restocked).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <PutAwayNotice locationId={ret.salesOrder?.locationId} what="this return"
                variantIds={Object.keys(restocked)} quantities={restocked} />
            </div>
          )}
        </div>
        
        <ConfirmModal
          isOpen={confirmReject}
          onClose={() => setConfirmReject(false)}
          onConfirm={() => rejectMutation.mutateAsync()}
          title="Turn down this return?"
          message="Nothing goes back on the shelf and nothing is owed. Use this for a return booked by mistake, or goods that never came back."
          confirmText="Turn down"
          confirmStyle="danger"
        />
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* The finished return, for the customer: straight to them from the shop's WhatsApp. */}
          {ret.status === 'COMPLETED' && (
            <WhatsAppSendButton
              kind="RETURN_NOTE"
              id={ret.id}
              permission="return:view"
              fileName={`Return-${ret.returnNumber}.pdf`}
              recipientLabel={ret.salesOrder?.customer?.name}
              buildPdf={async () => {
                const shop = await api.get('/branding').then(r => r.data).catch(() => ({})) || {};
                const logo = await logoAsPng(shop.logoUrl);
                return makePdf(<ReturnNotePDF ret={ret} shop={shop} logo={logo} />);
              }}
              fallbackHref={buildWhatsAppUrl(ret.salesOrder?.customer?.phone,
                `Hello${ret.salesOrder?.customer?.name ? ` ${ret.salesOrder.customer.name}` : ''}, your return ${ret.returnNumber} against order ${ret.salesOrder?.orderNumber || ''} is complete.`)}
            />
          )}
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
                // Only real decisions carry over. PENDING is "not decided yet"; pre-filling it
                // counted as a choice, so Save was enabled with nothing chosen and sent PENDING,
                // which the server refuses.
                ret.items.forEach(i => { if (i.disposition && i.disposition !== 'PENDING') initialData[i.id] = i.disposition; });
                setInspectionData(initialData);
                setInspectModalOpen(true);
              }}
            >
              <Edit3 size={16} style={{ marginRight: '8px' }} />
              Inspect Items
            </button>
          )}

          {['REQUESTED', 'RECEIVED', 'INSPECTED'].includes(ret.status) && can('return:complete') && (
            <button
              className="btn-secondary"
              onClick={() => setConfirmReject(true)}
              disabled={rejectMutation.isPending}
              style={{ color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}
            >
              <XCircle size={16} style={{ marginRight: '8px' }} />
              Turn down
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

      {/* mobile-stack-grid: a fixed 300px column beside a flexible one squeezed the items table to
          nothing on a phone -- the same trap the order page fell into. */}
      <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        <div className="card" style={{ padding: '0', minWidth: 0 }}>
          <div className="table-container" style={{ padding: '20px', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Returned Items</h3>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left', backgroundColor: 'var(--bg-card)' }}>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 500 }}>Product</th>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 500 }}>Qty</th>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 500 }}>Disposition</th>
                <th style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Refund</th>
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
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 500 }}>
                    {formatINRExact(Number(item.refundAmount || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Return Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/*
                * What is owed back, as PAID -- the price after any offer or till discount, never the
                * tag. A return that showed no money left the person at the counter to work it out
                * from the tag, which is exactly how a saree bought for 8,000 gets 10,000 refunded.
                */}
              {ret.status !== 'REJECTED' && Number(ret.refundTotal || 0) > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {ret.refundStatus === 'REFUNDED' ? 'Refunded through Shopify' : 'Refund owed to the customer'}
                  </div>
                  {/* While open, the money part only: what went on points goes back as points, so the
                      person at the counter must never hand it over in cash as well. */}
                  <div style={{ fontWeight: 600, fontSize: '20px' }}>{formatINRExact(ret.pointsPreview ? ret.pointsPreview.money : Number(ret.refundTotal))}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {ret.pointsBack > 0 || ret.pointsPreview?.pointsBack > 0 ? 'What they paid in money for these items, after discounts.' : 'What they paid for these items, after discounts.'}
                  </div>
                </div>
              )}
              {ret.pointsPreview && !['COMPLETED', 'REJECTED'].includes(ret.status) && (
                <div role="note" style={{ fontSize: '13px', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-hover)' }}>
                  {ret.pointsPreview.pointsBack > 0 && <>Part of this bill was paid with loyalty points: <strong>{ret.pointsPreview.pointsBack.toLocaleString('en-IN')} points ({formatINRExact(ret.pointsPreview.pointsBackValue)})</strong> go back to the customer's points when this return is completed. Do not pay that part in money. </>}
                  {ret.pointsPreview.pointsTakenBack > 0 ? `${ret.pointsPreview.pointsTakenBack.toLocaleString('en-IN')} points earned on these items are taken back.` : ''}
                </div>
              )}
              {/* Loyalty points on the bill: the part paid with points went back as points, and points
                  earned on these goods were taken back. Set when the return was completed. */}
              {ret.status === 'COMPLETED' && (ret.pointsBack > 0 || ret.pointsTakenBack > 0) && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Loyalty points</div>
                  {ret.pointsBack > 0 && <div style={{ fontWeight: 500 }}>{ret.pointsBack.toLocaleString('en-IN')} points ({formatINRExact(Number(ret.pointsBackValue))}) given back, for the part paid with points</div>}
                  {ret.pointsTakenBack > 0 && <div style={{ fontWeight: 500, marginTop: '2px' }}>{ret.pointsTakenBack.toLocaleString('en-IN')} points earned on these items taken back</div>}
                </div>
              )}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Reason</div>
                <div style={{ fontWeight: 500 }}>{returnReasonLabel(ret.reason)}</div>
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
          <div ref={inspectDialogRef} role="dialog" aria-modal="true" aria-labelledby="inspect-items-title" tabIndex={-1}
            className="card" style={{ width: '500px', maxWidth: '90vw', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}>
            <h2 id="inspect-items-title" style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Inspect Items</h2>
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
                    aria-label={`What to do with ${item.dispatchItem?.salesOrderItem?.variant?.sku || 'this item'}`}
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
