import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useOfferSettings, useSaveOfferSettings } from '../hooks/useOffers';

/**
 * How much a cashier may take off by hand.
 *
 * One number, because that is the whole rule: up to this much, anyone allowed to discount at the
 * till may; beyond it, only someone with "Take off more than the till limit" -- a manager. Empty
 * means no limit, which is how every shop starts, so nobody's counter changes until the owner
 * decides it should.
 */
export default function TillRulesDialog({ onClose, canEdit }) {
  const { data, isLoading } = useOfferSettings();
  const save = useSaveOfferSettings();
  const [value, setValue] = useState('');
  const loaded = useRef(false);

  useEffect(() => {
    if (data && !loaded.current) {
      loaded.current = true;
      setValue(data.manualDiscountMaxPercent == null ? '' : String(data.manualDiscountMaxPercent));
    }
  }, [data]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !save.isPending) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, save.isPending]);

  const n = Number(value);
  const invalid = value !== '' && (!Number.isFinite(n) || n <= 0 || n > 100);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={(e) => { if (e.target === e.currentTarget && !save.isPending) onClose(); }}>
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="till-rules-title" style={{ width: '440px', maxWidth: '100%', padding: 0 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="till-rules-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Discounts by hand</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <form style={{ padding: '20px 24px' }} onSubmit={async (e) => {
          e.preventDefault();
          if (invalid || !canEdit) return;
          try {
            await save.mutateAsync({ manualDiscountMaxPercent: value === '' ? null : n });
            onClose();
          } catch { /* shown by the mutation */ }
        }}>
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
            <>
              <label htmlFor="till-limit" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                The most a cashier may take off by hand
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input id="till-limit" className="input-field" type="number" min="0.01" max="100" step="0.01" inputMode="decimal"
                  value={value} onChange={e => setValue(e.target.value)} placeholder="No limit" disabled={!canEdit}
                  style={{ width: '120px' }} aria-invalid={invalid} />
                <span style={{ color: 'var(--text-secondary)' }}>% of the item or bill</span>
              </div>
              <p style={{ fontSize: '12px', color: invalid ? 'var(--accent-danger)' : 'var(--text-secondary)', margin: '8px 0 0', lineHeight: 1.5 }}>
                {invalid
                  ? 'Enter a percentage above 0 and up to 100, or leave it empty for no limit.'
                  : 'Anything more needs someone allowed to take off more than the till limit, usually a manager. Every discount by hand still needs a reason, and records who gave it.'}
              </p>
              {!canEdit && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '10px 0 0' }}>Only the shop owner can change this.</p>}
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</button>
            {canEdit && (
              <button type="submit" className="btn-primary" disabled={invalid || save.isPending || isLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {save.isPending && <Loader2 size={15} className="animate-spin" />} Save
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
