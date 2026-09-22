import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Gift, MessageCircle, Cake, Heart, Plus, Minus, Ban } from 'lucide-react';
import { useCustomerPoints, useAdjustPoints, useOffersConsent, useSetOffersConsent } from '../../hooks/useCampaigns';
import { useUpdateCustomer } from '../../hooks/useCustomers';
import { usePermission } from '../../hooks/usePermission';

/**
 * Two cards on a customer's page: whether they hear about offers on WhatsApp (and their birthday
 * and anniversary, for the automatic wishes), and their loyalty points with every change.
 */

const card = { padding: '24px' };
const h3 = { margin: '0 0 12px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' };
const dateOf = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayWords = (md) => (md ? `${Number(md.slice(3))} ${MONTHS[Number(md.slice(0, 2)) - 1]}` : null);

/** A month-and-day picker: a year would mean asking a customer their age. */
function DayPicker({ id, value, onChange, disabled }) {
  const [m, d] = value ? [Number(value.slice(0, 2)), Number(value.slice(3))] : ['', ''];
  const days = m ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] : 31;
  const emit = (mm, dd) => onChange(mm && dd ? `${String(mm).padStart(2, '0')}-${String(Math.min(dd, [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mm - 1])).padStart(2, '0')}` : null);
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <select id={id} className="input-field" aria-label="Day" value={d} disabled={disabled} onChange={(e) => emit(m || 1, Number(e.target.value))} style={{ width: '72px' }}>
        <option value="">Day</option>
        {Array.from({ length: days }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
      </select>
      <select className="input-field" aria-label="Month" value={m} disabled={disabled} onChange={(e) => emit(Number(e.target.value), d || 1)} style={{ width: '90px' }}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
      </select>
    </div>
  );
}

export function CustomerOffersCard({ customer }) {
  const { can } = usePermission();
  const edit = can('customer:update');
  const { data } = useOffersConsent(customer.id);
  const setConsent = useSetOffersConsent(customer.id);
  const update = useUpdateCustomer();
  const qc = useQueryClient();
  const [days, setDays] = useState(null);   // { birthday, anniversary } while being changed

  if (!data) return null;
  const saveDays = async () => {
    try {
      await update.mutateAsync({ id: customer.id, data: { birthday: days.birthday, anniversary: days.anniversary } });
      // The dates are read back with the offers answer, so that is what must be asked again.
      await qc.invalidateQueries({ queryKey: ['campaigns', 'consent', customer.id] });
      setDays(null);
      toast.success('Saved.');
    } catch (e) { toast.error(e?.message || 'Could not save the dates.'); }
  };

  return (
    <div className="card" style={card}>
      <h3 style={h3}><MessageCircle size={16} /> Offers on WhatsApp</h3>
      {data.stoppedAt ? (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
          <Ban size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>Replied STOP on {dateOf(data.stoppedAt)}. ScaleEzy sends them nothing more from your WhatsApp number, not even a bill. Use Share on WhatsApp from your own phone if they ask for one.</span>
        </p>
      ) : (
        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: edit ? 'pointer' : 'default' }}>
          <input type="checkbox" aria-label="Agrees to offers on WhatsApp" checked={data.agreed} disabled={!edit || setConsent.isPending || !customer.phone}
            onChange={async (e) => {
              try { await setConsent.mutateAsync(e.target.checked); } catch (err) { toast.error(err?.message || 'Could not save.'); }
            }} style={{ width: '18px', height: '18px', marginTop: '2px' }} />
          <span style={{ fontSize: '14px' }}>
            Agrees to offers on WhatsApp
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {!customer.phone ? 'Add a phone number first.'
                : data.changedAt ? `${data.agreed ? 'Agreed' : 'Changed'} ${dateOf(data.changedAt)}${data.changedBy ? `, recorded by ${data.changedBy}` : ''}.`
                : 'Tick only if the customer said yes.'}
            </span>
          </span>
        </label>
      )}

      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
        {days ? (
          <>
            <div><div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}><Cake size={13} style={{ verticalAlign: '-2px' }} /> Birthday</div>
              <DayPicker id="c-bday" value={days.birthday} onChange={(v) => setDays(p => ({ ...p, birthday: v }))} /></div>
            <div><div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}><Heart size={13} style={{ verticalAlign: '-2px' }} /> Anniversary</div>
              <DayPicker id="c-anniv" value={days.anniversary} onChange={(v) => setDays(p => ({ ...p, anniversary: v }))} /></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" onClick={saveDays} disabled={update.isPending} style={{ padding: '6px 14px' }}>Save</button>
              <button className="btn-secondary" onClick={() => setDays(null)} style={{ padding: '6px 14px' }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}><Cake size={15} /> {dayWords(data.birthday) ?? 'No birthday'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}><Heart size={15} /> {dayWords(data.anniversary) ?? 'No anniversary'}</div>
            {edit && <button className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: '13px' }}
              onClick={() => setDays({ birthday: data.birthday, anniversary: data.anniversary })}>Change dates</button>}
          </>
        )}
      </div>
    </div>
  );
}

export function CustomerPointsCard({ customerId }) {
  const { can } = usePermission();
  const { data } = useCustomerPoints(customerId);
  const adjust = useAdjustPoints(customerId);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ sign: 1, points: '', reason: '', nonce: '' });
  const [all, setAll] = useState(false);

  if (!data) return null;
  if (!data.enabled && data.points === 0 && data.entries.length === 0) return null;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await adjust.mutateAsync({ points: f.sign * Number(f.points), reason: f.reason, nonce: f.nonce });
      setOpen(false);
      toast.success('Points changed.');
    } catch (err) { toast.error(err?.message || 'Could not change the points.'); }
  };
  const shown = all ? data.entries : data.entries.slice(0, 5);

  return (
    <div className="card" style={card}>
      <h3 style={h3}><Gift size={16} /> Loyalty points</h3>
      <div style={{ fontSize: '28px', fontWeight: 600, color: data.points < 0 ? 'rgb(185,28,28)' : 'var(--text-primary)' }}>{data.points.toLocaleString('en-IN')}</div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        points, worth ₹{data.value.toLocaleString('en-IN')}{data.lapsesOn ? ` · lapse ${dateOf(data.lapsesOn)} unless they visit` : ''}
      </div>
      {!data.enabled && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0' }}>Loyalty points are switched off for the shop.</p>}

      {shown.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {shown.map(e => (
            <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px' }}>
              <span style={{ minWidth: 0 }}>
                {e.label}
                {e.orderNumber && <> · <Link to={`/orders/${e.orderId}`}>{e.orderNumber}</Link></>}
                <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>{dateOf(e.at)}{e.note ? ` · ${e.note}` : ''}</span>
              </span>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: e.points < 0 ? 'rgb(185,28,28)' : 'rgb(21,128,61)' }}>{e.points > 0 ? '+' : ''}{e.points.toLocaleString('en-IN')}</span>
            </li>
          ))}
        </ul>
      )}
      {data.entries.length > 5 && <button className="btn-secondary" style={{ marginTop: '10px', padding: '4px 12px', fontSize: '13px' }} onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${data.entries.length}`}</button>}

      {can('loyalty:manage') && !open && (
        <button className="btn-secondary" style={{ marginTop: '12px', padding: '4px 12px', fontSize: '13px', display: 'block' }}
          onClick={() => { setF({ sign: 1, points: '', reason: '', nonce: crypto.randomUUID() }); setOpen(true); }}>Change points</button>
      )}
      {open && (
        <form onSubmit={submit} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" aria-pressed={f.sign === 1} className={f.sign === 1 ? 'btn-primary' : 'btn-secondary'} onClick={() => setF(p => ({ ...p, sign: 1 }))} style={{ padding: '6px 10px' }} aria-label="Add points"><Plus size={14} /></button>
            <button type="button" aria-pressed={f.sign === -1} className={f.sign === -1 ? 'btn-primary' : 'btn-secondary'} onClick={() => setF(p => ({ ...p, sign: -1 }))} style={{ padding: '6px 10px' }} aria-label="Take points away"><Minus size={14} /></button>
            <input className="input-field" type="number" min="1" inputMode="numeric" placeholder="Points" aria-label="Points" value={f.points} onChange={(e) => setF(p => ({ ...p, points: e.target.value }))} style={{ width: '100px' }} />
          </div>
          <input className="input-field" placeholder="Why (the customer sees nothing; the shop does)" aria-label="Reason" maxLength={200} value={f.reason} onChange={(e) => setF(p => ({ ...p, reason: e.target.value }))} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn-primary" disabled={adjust.isPending || !(Number(f.points) > 0) || f.reason.trim().length < 3} style={{ padding: '6px 14px' }}>{adjust.isPending ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)} style={{ padding: '6px 14px' }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
