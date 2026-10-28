import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trash2, Loader2, X, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { holdsEverything } from '../../lib/authority';

/**
 * Delete a customer -- the shop owner only (29 Oct). The server decides how (services/customer-delete):
 *   no money history -> removed for good;
 *   bills            -> personal details erased, bills kept (the tax record), they leave every list.
 * Refused while store credit is owed or an order is still to go out. Confirmed by typing the last 4
 * digits of their number (or their name, when they have none).
 */
export default function DeleteCustomer({ customer }) {
  const user = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState(null);
  const preview = useQuery({
    queryKey: ['customer-delete-preview', customer.id],
    queryFn: async () => (await api.get(`/customers/${customer.id}/delete-preview`)).data,
    enabled: open,
    staleTime: 0,
    meta: { quiet: true }
  });
  if (!holdsEverything(user)) return null;

  const p = preview.data;
  const asks = p?.phoneLast4 ? 'the last 4 digits of their number' : 'their name';
  const go = async () => {
    setBusy(true); setSaid(null);
    try {
      const r = (await api.delete(`/customers/${customer.id}`, { data: { confirm: typed } })).data;
      toast.success(r.mode === 'REMOVE' ? `${r.name} was deleted.` : `${r.name}'s details were erased. Their bills are kept.`);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers', { replace: true });
    } catch (e) {
      setSaid(e?.message || 'That did not work. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ border: '1px solid rgba(239,68,68,0.35)', borderRadius: '14px', padding: '16px' }} aria-label="Delete customer">
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Delete customer</div>
      <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-secondary)' }}>Removes this customer. Bills are never deleted; a customer with bills has their personal details erased instead.</p>
      <button type="button" className="btn-secondary" onClick={() => { setOpen(true); setTyped(''); setSaid(null); }}
        style={{ color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <Trash2 size={15} /> Delete customer
      </button>

      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="del-cust-title" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget && !busy) setOpen(false); }}>
          {/* width 100% + maxWidth: a grid/auto-sized parent would let a fixed 440px spill off a phone. */}
          <div className="card" style={{ width: '100%', maxWidth: '440px', boxSizing: 'border-box', padding: '22px', borderRadius: '16px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 id="del-cust-title" style={{ margin: 0, fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={18} color="var(--accent-danger)" /> Delete {customer.name}?</h3>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} disabled={busy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            {preview.isLoading ? (
              <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}><Loader2 size={16} className="animate-spin" /> Checking their bills…</p>
            ) : preview.isError ? (
              <p role="alert" style={{ color: 'var(--accent-danger)' }}>{preview.error?.message || 'That could not be checked. Try again.'}</p>
            ) : p?.blocked ? (
              <p role="alert" style={{ color: 'var(--accent-danger)', fontSize: '14px', lineHeight: 1.5 }}>{p.blocked}</p>
            ) : p && (
              <>
                {p.mode === 'REMOVE' ? (
                  <p style={{ fontSize: '14px', lineHeight: 1.55, margin: '0 0 12px' }}>
                    They have no bills, so they are <b>deleted for good</b>: their details, notes, addresses, and what they looked at and tried on. This cannot be undone.
                  </p>
                ) : (
                  <p style={{ fontSize: '14px', lineHeight: 1.55, margin: '0 0 12px' }}>
                    They have <b>{p.bills} bill{p.bills === 1 ? '' : 's'}</b>, which the law says you keep. So their <b>personal details are erased</b> (name, phone, email, addresses, birthday, notes, groups), what they looked at and tried on is removed, and they leave every list. The bills stay as they were printed.
                    {p.loyaltyPoints > 0 && <> Their {p.loyaltyPoints.toLocaleString('en-IN')} points go with them.</>} This cannot be undone.
                  </p>
                )}
                <label style={{ display: 'grid', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Type {asks} to confirm
                  <input className="input-field" value={typed} onChange={e => { setTyped(e.target.value); setSaid(null); }} autoFocus
                    inputMode={p.phoneLast4 ? 'numeric' : 'text'} maxLength={p.phoneLast4 ? 4 : 80} aria-label={`Type ${asks}`} />
                </label>
                {said && <p role="alert" style={{ color: 'var(--accent-danger)', fontSize: '13px', margin: '8px 0 0' }}>{said}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>Keep them</button>
                  <button type="button" onClick={go} disabled={busy || !typed.trim()}
                    style={{ background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 16px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: busy || !typed.trim() ? 0.6 : 1 }}>
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} {p.mode === 'REMOVE' ? 'Delete for good' : 'Erase their details'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
