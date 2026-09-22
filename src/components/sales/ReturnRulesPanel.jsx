import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useReturnRules, useSaveReturnRules } from '../../hooks/useCounterReturn';
import PageLoader from '../PageLoader';

/**
 * Settings → Returns & exchanges: how long after a sale the counter takes things back, and the most
 * a salesperson may pay back on one return. Beyond either, a manager takes the return.
 */
export default function ReturnRulesPanel() {
  const { data, isLoading } = useReturnRules();
  const save = useSaveReturnRules();
  const [f, setF] = useState(null);
  useEffect(() => {
    if (data && !f) setF({ days: data.returnWindowDays ?? '', max: data.counterReturnMax ?? '' });
  }, [data, f]);
  if (isLoading || !f) return <PageLoader text="LOADING..." />;

  const submit = async (e) => {
    e.preventDefault();
    try {
      const saved = await save.mutateAsync({
        returnWindowDays: f.days === '' ? null : Number(f.days),
        counterReturnMax: f.max === '' ? null : Number(f.max)
      });
      setF({ days: saved.returnWindowDays ?? '', max: saved.counterReturnMax ?? '' });
      toast.success('Saved.');
    } catch (err) { toast.error(err?.message || 'Could not save.'); }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
      <div>
        <h2 style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--text-primary)' }}>Returns & exchanges</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Salespeople take returns at the counter from <strong>Returns → Take a return</strong>. Past these limits, a manager takes the return instead. Leave a box empty for no limit.
        </p>
      </div>
      <div>
        <label htmlFor="rr-days" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Take returns within</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input id="rr-days" className="input-field" type="number" min="0" max="3650" inputMode="numeric" value={f.days}
            onChange={(e) => setF(p => ({ ...p, days: e.target.value }))} style={{ width: '100px' }} />
          <span style={{ color: 'var(--text-secondary)' }}>days of the sale</span>
        </div>
      </div>
      <div>
        <label htmlFor="rr-max" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>A salesperson may pay back up to</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>₹</span>
          <input id="rr-max" className="input-field" type="number" min="0" step="0.01" inputMode="decimal" value={f.max}
            onChange={(e) => setF(p => ({ ...p, max: e.target.value }))} style={{ width: '140px' }} />
          <span style={{ color: 'var(--text-secondary)' }}>on one return</span>
        </div>
      </div>
      <div><button type="submit" className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button></div>
    </form>
  );
}
