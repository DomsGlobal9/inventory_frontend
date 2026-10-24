import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Printer, CheckCircle2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { usePermission } from '../../hooks/usePermission';
import { useDialog } from '../../hooks/useDialog';
import ConfirmModal from '../ConfirmModal';

/**
 * What can be done to the orders ticked on the Orders page: print their parcel labels (one per
 * parcel sent, on a label printer or four to an A4 sheet) and mark their parcels delivered.
 * Server: POST /shipping/labels (via pages/sales/ParcelLabels) and POST /shipping/delivered.
 */
export default function OrdersBulkBar({ ticked, onClear }) {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const [printing, setPrinting] = useState(false);
  const [paper, setPaper] = useState('label');
  const [confirming, setConfirming] = useState(false);
  const closePrint = () => setPrinting(false);
  const printRef = useDialog(printing, { onClose: closePrint });
  const n = ticked.length;

  const deliver = useMutation({
    mutationFn: async () => (await api.post('/shipping/delivered', { orderIds: ticked })).data,
    onSuccess: (r) => {
      const said = r.parcels ? `${r.parcels} ${r.parcels === 1 ? 'parcel' : 'parcels'} marked delivered.` : 'Nothing new to mark delivered.';
      // Counted by reason, a few order numbers each: ticking a whole page listed forty orders one by one.
      const by = {};
      for (const s of r.skipped ?? []) (by[s.why] ??= []).push(s.orderNumber);
      const WHY = { 'not sent yet': 'not sent yet', 'no courier on its parcel': 'handed over without a courier' };
      const parts = Object.entries(by).map(([why, nums]) =>
        `${nums.length} ${WHY[why] ?? why} (${nums.slice(0, 3).join(', ')}${nums.length > 3 ? ` and ${nums.length - 3} more` : ''})`);
      const skippedN = r.skipped?.length ?? 0;
      const left = skippedN ? ` ${skippedN} ${skippedN === 1 ? 'order' : 'orders'} not marked: ${parts.join('; ')}.` : '';
      (skippedN ? toast : toast.success)(said + left, { duration: skippedN ? 8000 : 4000 });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      onClear();
    },
    onError: (e) => toast.error(e?.message || 'They could not be marked delivered. Try again.')
  });

  if (!n) return null;
  const print = () => {
    window.open(`/labels/print?orders=${ticked.join(',')}&paper=${paper}&print=1`, '_blank', 'noopener');
    setPrinting(false);
  };

  return (
    <>
      <div className="orders-bulk" role="region" aria-label="Ticked orders">
        <span><b>{n}</b> {n === 1 ? 'order' : 'orders'} ticked</span>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={() => setPrinting(true)}><Printer size={14} /> Print labels</button>
          {can('dispatch:create') && (
            <button type="button" className="btn-secondary" onClick={() => setConfirming(true)} disabled={deliver.isPending}><CheckCircle2 size={14} /> Mark delivered</button>
          )}
          <button type="button" onClick={onClear} aria-label="Clear the ticks" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}><X size={14} /> Clear</button>
        </span>
      </div>

      {printing && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) closePrint(); }}>
          <div ref={printRef} role="dialog" aria-modal="true" aria-labelledby="bulk-print-title" tabIndex={-1} className="card" style={{ width: 400, maxWidth: '100%', padding: 24 }}>
            <h3 id="bulk-print-title" style={{ margin: '0 0 6px', fontSize: 18 }}>Print labels for {n} {n === 1 ? 'order' : 'orders'}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>One label for each parcel sent. Orders not sent yet are named on the next page and get no label.</p>
            <div role="radiogroup" aria-label="Paper" style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
              {[
                { v: 'label', t: 'Label printer, 4 × 6 in', d: 'One label per sticker' },
                { v: 'a4', t: 'A4 sheet, 4 labels per page', d: 'Ordinary printer: cut along the lines' }
              ].map(o => (
                <label key={o.v} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name="bulk-paper" value={o.v} checked={paper === o.v} onChange={() => setPaper(o.v)} style={{ marginTop: 3 }} />
                  <span><span style={{ fontWeight: 500 }}>{o.t}</span><br /><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{o.d}</span></span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={closePrint}>Cancel</button>
              <button type="button" className="btn-primary" onClick={print} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Printer size={15} /> Print</button>
            </div>
          </div>
        </div>, document.body)}

      <ConfirmModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { setConfirming(false); deliver.mutate(); }}
        title={`Mark ${n} ${n === 1 ? 'order' : 'orders'} delivered?`}
        message="Every parcel of these orders that went with a courier is marked delivered today. Orders not sent yet, or handed over without a courier, are left as they are. Each can be undone on its order."
        confirmText="Mark delivered"
      />
    </>
  );
}
