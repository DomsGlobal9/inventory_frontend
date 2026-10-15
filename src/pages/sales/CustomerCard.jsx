import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Loader2, ArrowLeft, Shirt, Palette, Tags, IndianRupee, MapPin, StickyNote, UserPlus, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { normalisePhone, typedPhone } from '../../utils/phone';
import { usePermission } from '../../hooks/usePermission';
import { useLocationContext } from '../../contexts/LocationContext';
import CustomerModal from '../../components/sales/CustomerModal';
import LoadFailed from '../../components/LoadFailed';

/**
 * Customer card: the salesperson types the number at the door and sees who this is, the sizes and
 * colours they buy, what they usually spend, and what in THIS store fits them -- before the customer
 * reaches the first rack. Built for a phone held in one hand.
 */

const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const ago = (at) => {
  if (!at) return 'No bills yet';
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000);
  const when = new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return days <= 0 ? 'Last visit today' : days === 1 ? 'Last visit yesterday' : `Last visit ${when} (${days} days ago)`;
};
const box = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '16px' };
const label = { fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' };

export default function CustomerCard() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const { currentLocation } = useLocationContext();
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState('');
  const [phone, setPhone] = useState(null);
  const [problem, setProblem] = useState(null);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');

  const card = useQuery({
    queryKey: ['customer-card', phone, currentLocation?.id],
    queryFn: async () => (await api.get('/customers/card', { params: { phone, locationId: currentLocation?.id } })).data,
    enabled: !!phone
  });
  const addNote = useMutation({
    mutationFn: async ({ id, text }) => (await api.post(`/customers/${id}/notes`, { note: text })).data,
    onSuccess: () => { setNote(''); toast.success('Note added'); queryClient.invalidateQueries({ queryKey: ['customer-card'] }); }
  });

  const lookUp = (e) => {
    e.preventDefault();
    // The box itself, not state: a number typed and Look up pressed at once can beat the re-render.
    const n = normalisePhone(e.currentTarget.elements.phone?.value ?? typed);
    if (!n.ok) { setProblem(n.reason); return; }
    setProblem(null);
    setPhone(n.value);
  };

  const d = card.data;
  const c = d?.customer;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', paddingTop: '24px', paddingBottom: '64px', width: '100%', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <button type="button" onClick={() => navigate('/customers')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
        <ArrowLeft size={16} /> Customers
      </button>
      <h1 style={{ fontSize: '28px', margin: '0 0 6px', color: 'var(--text-primary)' }}>Customer card</h1>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Type the number when they walk in. See their sizes, colours and what fits them in {currentLocation?.name ?? 'this store'} today.
      </p>

      <form onSubmit={lookUp} noValidate style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
        <input className="input-field" name="phone" aria-label="Customer's phone number" inputMode="tel" autoComplete="off" placeholder="98480 22338"
          value={typed} onChange={e => { setTyped(typedPhone(e.target.value)); setProblem(null); }} style={{ flex: 1, fontSize: '18px' }} autoFocus />
        <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {card.isFetching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Look up
        </button>
      </form>
      {problem && <p role="alert" style={{ color: 'var(--accent-danger)', fontSize: '13px', margin: '0 0 12px' }}>{problem}</p>}

      {card.isError && <LoadFailed what="the customer card" error={card.error} onRetry={card.refetch} />}

      {d && !c && (
        <div style={{ ...box, marginTop: '16px' }}>
          <p style={{ margin: '0 0 12px', color: 'var(--text-primary)', fontWeight: 600 }}>New customer</p>
          <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Nobody has this number yet. Ask what they are shopping for, and add them so the next visit has a card.
          </p>
          {can('customer:create') && (
            <button type="button" className="btn-primary" onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={16} /> Add customer
            </button>
          )}
        </div>
      )}

      {c && (
        <div style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
          <div style={box}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div aria-hidden="true" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {c.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {c.name}
                  {c.groups.map(g => <span key={g} style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'var(--accent-gold)', color: '#1a1a1a' }}>{g}</span>)}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {ago(d.visits.lastVisit)} · {d.visits.bills} bill{d.visits.bills === 1 ? '' : 's'}
                  {d.visits.online > 0 && ` (${d.visits.inStore} in store, ${d.visits.online} online)`}
                  {c.loyaltyPoints > 0 && ` · ${c.loyaltyPoints.toLocaleString('en-IN')} points`}
                  {c.storeCreditPaise > 0 && ` · ${rupees(c.storeCreditPaise / 100)} credit`}
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...box, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
            <div><div style={label}><Shirt size={14} /> Size</div><div style={{ fontWeight: 600 }}>{d.dna.sizes.length ? d.dna.sizes.map(s => `${s.size} (${s.kind.toLowerCase()})`).join(', ') : 'Not known yet'}</div></div>
            <div><div style={label}><Palette size={14} /> Colours</div><div style={{ fontWeight: 600 }}>{d.dna.colours.join(', ') || 'Not known yet'}</div></div>
            <div><div style={label}><Tags size={14} /> Buys</div><div style={{ fontWeight: 600 }}>{d.dna.kinds.join(', ') || 'Not known yet'}</div></div>
            <div><div style={label}><IndianRupee size={14} /> Usually spends</div><div style={{ fontWeight: 600 }}>{d.dna.spend ? (d.dna.spend.from === d.dna.spend.to ? `About ${rupees(d.dna.spend.from)}` : `${rupees(d.dna.spend.from)} – ${rupees(d.dna.spend.to)}`) : 'Not known yet'}</div></div>
          </div>

          <div style={box}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>In {currentLocation?.name ?? 'this store'} today, in their size</div>
            {d.picks.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                {d.visits.bills ? 'Nothing here in their size that they do not already have. Ask what they need today.' : 'No bills yet, so no sizes to match. Ask what they are looking for.'}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {d.picks.map(p => (
                  <Link key={p.variantId} to={`/products/${p.productId}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{p.title}</span>
                      <span style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {[p.colour, p.size].filter(Boolean).join(', ')}{p.price ? ` · ${rupees(p.price)}` : ''} · {p.inStock} here
                        {p.yourColour && <span style={{ color: 'var(--accent-success, #16a34a)', fontWeight: 600 }}> · their colour</span>}
                      </span>
                    </span>
                    {p.shelf && <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><MapPin size={13} /> {p.shelf}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div style={box}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><StickyNote size={16} /> Notes</div>
            {c.notes.length === 0
              ? <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: '14px' }}>No notes yet. Write what helps next time, like "buys for her daughter".</p>
              : <ul style={{ margin: '0 0 10px', paddingLeft: '18px', fontSize: '14px', color: 'var(--text-primary)' }}>{c.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
            {can('customer:update') && (
              <form noValidate onSubmit={e => { e.preventDefault(); if (!note.trim()) { toast.error('Write the note first.'); return; } addNote.mutate({ id: c.id, text: note }); }} style={{ display: 'flex', gap: '8px' }}>
                <input className="input-field" aria-label="New note" maxLength={300} placeholder="Prefers cotton in summer" value={note} onChange={e => setNote(e.target.value)} style={{ flex: 1 }} />
                <button type="submit" className="btn-secondary" disabled={addNote.isPending}>{addNote.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Add note'}</button>
              </form>
            )}
          </div>

          <Link to={`/customers/${c.id}`} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none' }}>
            <ExternalLink size={16} /> Open their full page
          </Link>
        </div>
      )}

      <CustomerModal isOpen={adding} onClose={() => setAdding(false)} initialPhone={typed}
        onSaved={() => { setAdding(false); card.refetch(); }} />
    </div>
  );
}
