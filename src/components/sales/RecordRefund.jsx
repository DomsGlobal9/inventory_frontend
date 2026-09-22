import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useRecordRefund } from '../../hooks/useCounterReturn';
import { useLocationContext } from '../../contexts/LocationContext';
import { formatINRExact } from '../../utils/formatUtils';

/**
 * On a finished return that still owes money: say how it went back, so the bill, the customer and
 * the Day Book's cash all agree. Once recorded, it says how and when instead.
 */
const METHODS = [['CASH', 'Cash'], ['UPI', 'UPI'], ['CARD', 'Card'], ['CREDIT', 'Store credit']];
const WORD = { CASH: 'in cash', UPI: 'by UPI', CARD: 'by card', CREDIT: 'as store credit' };

export default function RecordRefund({ ret, canRecord }) {
  const { currentLocation } = useLocationContext();
  const record = useRecordRefund(ret.id);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  if (ret.refundStatus === 'REFUNDED' && ret.refundMethod) {
    return (
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Paid back {WORD[ret.refundMethod] ?? ret.refundMethod}{ret.refundedAt ? ` on ${new Date(ret.refundedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}{ret.atCounter ? ', at the counter' : ''}.
      </div>
    );
  }
  if (ret.status !== 'COMPLETED' || ret.refundStatus !== 'PENDING' || !canRecord) return null;

  const save = async () => {
    try {
      await record.mutateAsync({ method, reference: reference.trim() || undefined, locationId: currentLocation?.id });
      toast.success(`Recorded: ${formatINRExact(Number(ret.refundTotal))} paid back ${WORD[method]}.`);
    } catch (e) { toast.error(e?.message || 'Could not record the refund.'); }
  };

  return (
    <div style={{ display: 'grid', gap: '8px', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
      <div style={{ fontSize: '13px', fontWeight: 600 }}>How did the money go back?</div>
      <div role="radiogroup" aria-label="How the money went back" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {METHODS.map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={method === k} className={method === k ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '4px 10px', fontSize: '13px' }} onClick={() => setMethod(k)}>{label}</button>
        ))}
      </div>
      {(method === 'UPI' || method === 'CARD') && (
        <input className="input-field" aria-label="Reference" maxLength={40} value={reference} onChange={(e) => setReference(e.target.value)}
          placeholder={method === 'UPI' ? 'UPI reference (optional)' : 'Last 4 digits or approval code (optional)'} />
      )}
      <button type="button" className="btn-primary" onClick={save} disabled={record.isPending} style={{ justifySelf: 'start', padding: '6px 14px' }}>
        {record.isPending ? 'Saving…' : `Paid back ${formatINRExact(Number(ret.refundTotal))}`}
      </button>
    </div>
  );
}
