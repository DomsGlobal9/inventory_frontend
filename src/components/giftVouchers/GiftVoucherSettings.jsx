import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Gift } from 'lucide-react';
import { useGiftVoucherSettings, useSaveGiftVoucherSettings } from '../../hooks/useGiftVouchers';
import { usePermission } from '../../hooks/usePermission';
import PageLoader from '../PageLoader';

/**
 * Settings → Gift vouchers: on or off, how long a voucher lasts, and the smallest and largest.
 * Vouchers are sold and spent at the POS till; Inventory holds every balance.
 */
export default function GiftVoucherSettings() {
  const { data, isLoading } = useGiftVoucherSettings();
  const save = useSaveGiftVoucherSettings();
  const { can } = usePermission();
  const mayChange = can('voucher:manage');
  const [f, setF] = useState(null);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    if (data && !f) setF({ enabled: data.enabled, validMonths: String(data.validMonths), min: String(data.minPaise / 100), max: String(data.maxPaise / 100) });
  }, [data, f]);
  if (isLoading || !f) return <PageLoader text="LOADING..." />;
  const set = (k) => (v) => { setF(p => ({ ...p, [k]: v })); setProblem(null); };

  const submit = async (e) => {
    e.preventDefault();
    const months = Number(f.validMonths), min = Math.round(Number(f.min) * 100), max = Math.round(Number(f.max) * 100);
    if (!Number.isInteger(months) || months < 1 || months > 60) return setProblem('Vouchers can be valid for 1 to 60 months.');
    if (!(min >= 100)) return setProblem('The smallest voucher is at least ₹1.');
    if (!(max >= min)) return setProblem('The largest voucher cannot be smaller than the smallest.');
    try {
      await save.mutateAsync({ enabled: f.enabled, validMonths: months, minPaise: min, maxPaise: max });
      toast.success('Gift voucher settings saved');
    } catch (err) { setProblem(err?.message || 'That did not save. Try again.'); }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: '20px', maxWidth: '640px' }}>
      <div>
        <h2 style={{ fontSize: '22px', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}><Gift size={20} /> Gift vouchers</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
          Sold and used at your POS tills. One balance for every till. No GST when sold: GST is charged on the goods when a voucher is used.
        </p>
      </div>
      <label htmlFor="gv-on" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: mayChange ? 'pointer' : 'default' }}>
        <input id="gv-on" type="checkbox" checked={f.enabled} disabled={!mayChange} onChange={e => set('enabled')(e.target.checked)} style={{ marginTop: '3px', width: '18px', height: '18px' }} />
        <span>
          <span style={{ fontWeight: 500 }}>Sell gift vouchers at the till</span>
          <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)' }}>Vouchers already sold can always be used, even if this is switched off.</span>
        </span>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        <div>
          <label htmlFor="gv-months" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Valid for (months)</label>
          <input id="gv-months" className="input-field" type="number" inputMode="numeric" min={1} max={60} value={f.validMonths} disabled={!mayChange} onChange={e => set('validMonths')(e.target.value)} />
        </div>
        <div>
          <label htmlFor="gv-min" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Smallest voucher (₹)</label>
          <input id="gv-min" className="input-field" type="number" inputMode="decimal" min={1} value={f.min} disabled={!mayChange} onChange={e => set('min')(e.target.value)} />
        </div>
        <div>
          <label htmlFor="gv-max" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Largest voucher (₹)</label>
          <input id="gv-max" className="input-field" type="number" inputMode="decimal" min={1} value={f.max} disabled={!mayChange} onChange={e => set('max')(e.target.value)} />
        </div>
      </div>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
        A voucher still unused when it expires stays with the shop. Staff can extend one before it expires on the{' '}
        <Link to="/customers/gift-vouchers">Gift vouchers</Link> page. Cash of ₹2,00,000 or more for one voucher is always refused (section 269ST).
      </p>
      {problem && <p role="alert" style={{ margin: 0, color: 'var(--accent-danger)', fontSize: '13px' }}>{problem}</p>}
      {mayChange && (
        <div><button type="submit" className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button></div>
      )}
    </form>
  );
}
