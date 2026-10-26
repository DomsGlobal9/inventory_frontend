import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Loader2, ArrowLeft, Shirt, Palette, Tags, IndianRupee, MapPin, StickyNote, UserPlus, ExternalLink, DoorOpen, QrCode, Eye, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { normalisePhone, typedPhone } from '../../utils/phone';
import { usePermission } from '../../hooks/usePermission';
import { useLocationContext } from '../../contexts/LocationContext';
import CustomerModal from '../../components/sales/CustomerModal';
import LoadFailed from '../../components/LoadFailed';
import { useGoBack } from '../../hooks/useGoBack';

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
const minutesAgo = (at) => { const m = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000)); return m === 0 ? 'just now' : m === 1 ? '1 min ago' : `${m} min ago`; };
const box = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '16px' };
const label = { fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' };

export default function CustomerCard() {
  const navigate = useNavigate();
  const goBack = useGoBack('/customers');
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
  // Who scanned the door QR in the last two hours. Polled: a phone at the door has no other way to hear.
  const arrivals = useQuery({
    queryKey: ['checkins', currentLocation?.id],
    queryFn: async () => (await api.get('/customers/checkins', { params: { locationId: currentLocation?.id } })).data,
    enabled: !!currentLocation?.id, refetchInterval: 15000
  });
  const open = (e164) => { setTyped(e164.replace(/^\+91/, '')); setProblem(null); setPhone(e164); };
  const take = useMutation({
    mutationFn: async (id) => (await api.post(`/customers/checkins/${id}/take`)).data,
    onSuccess: (r) => { open(r.phone); arrivals.refetch(); },
    onError: (e) => { toast.error(e?.message || 'That did not work. Try again.'); arrivals.refetch(); }
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
      <button type="button" onClick={goBack} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
        <ArrowLeft size={16} /> Customers
      </button>
      <h1 style={{ fontSize: '28px', margin: '0 0 6px', color: 'var(--text-primary)' }}>Customer card</h1>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Type the number when they walk in. See their sizes, colours and what fits them in {currentLocation?.name ?? 'this store'} today.
      </p>

      <div style={{ ...box, marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><DoorOpen size={16} /> In the store now</span>
          <Link to="/customers/door-qr" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontSize: '13px' }}><QrCode size={14} /> Door QR</Link>
        </div>
        {(arrivals.data ?? []).length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13.5px' }}>When a customer scans the QR at the door, they show here.</p>
        ) : (
          <div style={{ display: 'grid', gap: '6px' }}>
            {arrivals.data.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: 'var(--bg-input)' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.customer ? a.customer.name : 'New customer'}</span>
                  {a.customer?.groups.map(g => <span key={g} style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '999px', background: 'var(--accent-gold)', color: '#1a1a1a' }}>{g}</span>)}
                  <span style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {!a.customer && `${a.maskedPhone} · `}{minutesAgo(a.at)}{a.takenBy && ` · ${a.takenBy} is with them`}
                  </span>
                </span>
                {a.takenBy
                  ? <button type="button" className="btn-secondary" style={{ fontSize: '13px', whiteSpace: 'nowrap' }} onClick={() => open(a.phone)}>Open card</button>
                  : <button type="button" className="btn-primary" style={{ fontSize: '13px', whiteSpace: 'nowrap' }} disabled={take.isPending} onClick={() => take.mutate(a.id)}>I'll take them</button>}
              </div>
            ))}
          </div>
        )}
      </div>

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

          {/* Only shown when there is something: a server not yet sending these simply leaves them out. */}
          {(d.lookedOnline ?? []).length > 0 && (
            <div style={box}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Eye size={16} /> Looked at online lately</div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {d.lookedOnline.map(l => (
                  <Link key={l.productId} to={`/products/${l.productId}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{l.title}</span>
                      <span style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {[l.colour, l.views > 0 && `viewed ${l.views === 1 ? 'once' : `${l.views} times`}`, l.tryOns > 0 && `tried on${l.tryOns > 1 ? ` ${l.tryOns} times` : ''}`].filter(Boolean).join(' · ')}
                        {' · '}{l.inStock > 0 ? `${l.inStock} here` : 'not in this store'}
                      </span>
                    </span>
                    {l.shelf && <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><MapPin size={13} /> {l.shelf}</span>}
                  </Link>
                ))}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>From the online shop, after they confirmed this number there. Last 30 days; anything bought since is left out.</p>
            </div>
          )}

          {(d.othersAlsoBought ?? []).length > 0 && (
            <div style={box}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16} /> Others who bought what they bought, also bought</div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {d.othersAlsoBought.map(p => (
                  <Link key={p.variantId} to={`/products/${p.productId}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{p.title}</span>
                      <span style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {[p.colour, p.size].filter(Boolean).join(', ')}{p.price ? ` · ${rupees(p.price)}` : ''} · {p.buyers} customers · {p.inStock} here
                      </span>
                    </span>
                    {p.shelf && <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><MapPin size={13} /> {p.shelf}</span>}
                  </Link>
                ))}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Only what at least 2 other customers bought together with theirs. In this store, in their size.</p>
            </div>
          )}

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
