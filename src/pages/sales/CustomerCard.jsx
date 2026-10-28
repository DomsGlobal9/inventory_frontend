import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Loader2, ArrowLeft, Shirt, Palette, Tags, IndianRupee, MapPin, StickyNote, UserPlus, ExternalLink, DoorOpen, QrCode, Users, Heart, Sparkles, Star, Wallet, User } from 'lucide-react';
import { api } from '../../lib/api';
import { normalisePhone, typedPhone } from '../../utils/phone';
import { usePermission } from '../../hooks/usePermission';
import { useLocationContext } from '../../contexts/LocationContext';
import CustomerModal from '../../components/sales/CustomerModal';
import LoadFailed from '../../components/LoadFailed';
import { useGoBack } from '../../hooks/useGoBack';
import { useCrm } from '../../hooks/useCrm';

/**
 * Customer card: the salesperson types the number at the door and sees who this is, the sizes and
 * colours they buy, what they usually spend, what in THIS store fits them, and what they tried on and
 * liked -- before the customer reaches the first rack. Built for a phone held in one hand; two columns
 * on a wide screen. (Redesigned 29 Oct: a green header, colour swatches, photos on every piece.)
 */

const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const ago = (at) => {
  if (!at) return 'No bills yet';
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000);
  const when = new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return days <= 0 ? 'Last visit today' : days === 1 ? 'Last visit yesterday' : `Last visit ${when} (${days} days ago)`;
};
const minutesAgo = (at) => { const m = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000)); return m === 0 ? 'just now' : m === 1 ? '1 min ago' : `${m} min ago`; };
const box = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '16px' };
const sectionTitle = { fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' };
const muted = { fontSize: '12.5px', color: 'var(--text-secondary)' };

/* A dot of the colour a customer buys. Common shop colour names; anything else shows as text only. */
const SWATCH = {
  red: '#c62828', maroon: '#7a1f2b', crimson: '#b0213a', rani: '#d6336c', pink: '#e98aa8', peach: '#f4b393', orange: '#e67e22',
  yellow: '#f2c230', mustard: '#d4a017', gold: '#c9a227', golden: '#c9a227', cream: '#efe4c8', beige: '#d9c7a3', ivory: '#f3ecd8', white: '#f7f7f5',
  green: '#2e7d4f', 'bottle green': '#0f5132', mint: '#98d7b5', olive: '#6b7a2a', teal: '#127c7c', blue: '#2d5fa8', navy: '#1c2f5c',
  'sky blue': '#7fb6e6', 'royal blue': '#2443a8', purple: '#6b3fa0', lavender: '#b9a5dc', violet: '#7d4fc4', magenta: '#c0307a',
  brown: '#7b5232', grey: '#8a8f96', gray: '#8a8f96', silver: '#c0c4c8', black: '#1a1a1a', wine: '#5c1a2b', copper: '#b06b3c', multi: 'conic-gradient(#c62828,#f2c230,#2e7d4f,#2d5fa8,#c62828)'
};
const swatchOf = (name) => SWATCH[String(name ?? '').trim().toLowerCase()] ?? null;

function Picture({ url, size = 'tile' }) {
  const style = size === 'tile'
    ? { width: '100%', aspectRatio: '3 / 4', borderRadius: '12px' }
    : { width: '44px', height: '58px', borderRadius: '8px', flexShrink: 0 };
  return url
    ? <img src={url} alt="" loading="lazy" style={{ ...style, objectFit: 'cover', background: 'var(--bg-input)', display: 'block' }} />
    : <div aria-hidden="true" style={{ ...style, background: 'var(--bg-input)', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}><Shirt size={size === 'tile' ? 22 : 16} /></div>;
}

export default function CustomerCard() {
  const goBack = useGoBack('/customers');
  const { can } = usePermission();
  const crm = useCrm();
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
  const store = currentLocation?.name ?? 'this store';
  const waiting = arrivals.data ?? [];

  /*
   * The counter stays HERE for every shop, CRM or not (28 Oct): salespeople already have their
   * Inventory sign-in and permissions, and a second app at the door slowed them down. What happens
   * here -- check-ins and takes, notes, look-ups -- reaches CRM through the change feed.
   */
  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', paddingTop: '20px', paddingBottom: '64px', width: '100%', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <button type="button" onClick={goBack} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
        <ArrowLeft size={16} /> Customers
      </button>
      <h1 style={{ fontSize: '28px', margin: '0 0 4px', color: 'var(--text-primary)' }}>Customer card</h1>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px' }}>Type the number when they walk in. See their sizes, colours and what fits them in {store} today.</p>

      {/* Look-up: the one thing the screen is for, first and biggest. */}
      <div style={{ ...box, padding: '12px', marginBottom: '12px' }}>
        <form onSubmit={lookUp} noValidate style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', position: 'relative' }}>
            <Search size={18} aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input className="input-field" name="phone" aria-label="Customer's phone number" inputMode="tel" autoComplete="off" placeholder="98480 22338"
              value={typed} onChange={e => { setTyped(typedPhone(e.target.value)); setProblem(null); }} style={{ width: '100%', fontSize: '18px', paddingLeft: '40px', height: '48px' }} autoFocus />
          </div>
          <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '48px', padding: '0 20px' }}>
            {card.isFetching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Look up
          </button>
          <Link to="/customers/door-qr" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', height: '48px', padding: '0 14px' }}><QrCode size={16} /> Door QR</Link>
        </form>
        {problem && <p role="alert" style={{ color: 'var(--accent-danger)', fontSize: '13px', margin: '8px 0 0' }}>{problem}</p>}

        {/* Who is at the door: small chips, the newest first, one tap to take them. */}
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><DoorOpen size={15} /><span>In the store now</span></span>
          {waiting.length === 0 ? (
            <span style={muted}>When a customer scans the QR at the door, they show here.</span>
          ) : waiting.map(a => (
            <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 6px 5px 12px', borderRadius: '999px', background: 'var(--bg-input)', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.customer ? a.customer.name : `New · ${a.maskedPhone}`}</span>
              {a.customer?.groups.map(g => <span key={g} style={{ fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '999px', background: 'var(--accent-gold)', color: '#1a1a1a' }}>{g}</span>)}
              <span style={{ color: 'var(--text-secondary)' }}>{minutesAgo(a.at)}{a.takenBy && ` · ${a.takenBy} is with them`}</span>
              {a.takenBy
                ? <button type="button" className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '999px' }} onClick={() => open(a.phone)}>Open card</button>
                : <button type="button" className="btn-primary" style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '999px' }} disabled={take.isPending} onClick={() => take.mutate(a.id)}>I'll take them</button>}
            </span>
          ))}
        </div>
      </div>

      {card.isError && <LoadFailed what="the customer card" error={card.error} onRetry={card.refetch} />}

      {d && !c && (
        <div style={{ ...box, marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div aria-hidden="true" style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg-input)', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}><User size={20} /></div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 700, fontSize: '17px' }}>New customer</p>
              <p style={{ margin: 0, ...muted }}>Nobody has this number yet. Ask what they are shopping for, and add them so the next visit has a card.</p>
            </div>
          </div>
          {/* A first visit may already have tried things on (TryOn2Buy, the online shop): shown before they are added. */}
          {(d.lookedOnline ?? []).length > 0 && <div style={{ margin: '4px 0 12px' }}><LookedOnline items={d.lookedOnline} plain /></div>}
          {can('customer:create') && (
            <button type="button" className="btn-primary" onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={16} /> Add customer
            </button>
          )}
        </div>
      )}

      {c && (
        <div style={{ display: 'grid', gap: '12px', marginTop: '4px' }}>
          {/* Who this is: the deep-green header. */}
          <div style={{ background: 'var(--brand-deep)', color: '#fff', borderRadius: '18px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div aria-hidden="true" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--brand)', color: 'var(--brand-deep)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '19px', flexShrink: 0 }}>
              {c.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ fontSize: '22px', fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {c.name}
                {c.groups.map(g => <span key={g} style={{ fontSize: '12px', fontWeight: 700, padding: '2px 9px', borderRadius: '999px', background: 'var(--brand)', color: 'var(--brand-deep)' }}>{g}</span>)}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>
                {ago(d.visits.lastVisit)} · {d.visits.bills} bill{d.visits.bills === 1 ? '' : 's'}
                {d.visits.online > 0 && ` (${d.visits.inStore} in store, ${d.visits.online} online)`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '8px 12px', textAlign: 'center', minWidth: '78px' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><Star size={14} />{c.loyaltyPoints.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>points</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '8px 12px', textAlign: 'center', minWidth: '78px' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><Wallet size={14} />{rupees(c.storeCreditPaise / 100)}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>credit</div>
              </div>
            </div>
          </div>

          {/* Their style, at a glance. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            <StyleTile icon={Shirt} label="Size">{d.dna.sizes.length ? d.dna.sizes.map(s => `${s.size} (${s.kind.toLowerCase()})`).join(', ') : 'Not known yet'}</StyleTile>
            <StyleTile icon={Palette} label="Colours">
              {d.dna.colours.length ? (
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  {d.dna.colours.map(col => (
                    <span key={col} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      {swatchOf(col) && <span aria-hidden="true" style={{ width: '14px', height: '14px', borderRadius: '50%', background: swatchOf(col), border: '1px solid rgba(0,0,0,0.12)' }} />}
                      {col}
                    </span>
                  ))}
                </span>
              ) : 'Not known yet'}
            </StyleTile>
            <StyleTile icon={Tags} label="Buys">{d.dna.kinds.join(', ') || 'Not known yet'}</StyleTile>
            <StyleTile icon={IndianRupee} label="Usually spends">{d.dna.spend ? (d.dna.spend.from === d.dna.spend.to ? `About ${rupees(d.dna.spend.from)}` : `${rupees(d.dna.spend.from)} – ${rupees(d.dna.spend.to)}`) : 'Not known yet'}</StyleTile>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', alignItems: 'start' }}>
            {/* Show them first: photos, so the salesperson knows what to fetch. */}
            <div style={box}>
              <div style={sectionTitle}><Sparkles size={16} /> In {store} today, in their size</div>
              {d.picks.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {d.visits.bills ? 'Nothing here in their size that they do not already have. Ask what they need today.' : 'No bills yet, so no sizes to match. Ask what they are looking for.'}
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                  {d.picks.map(p => (
                    <Link key={p.variantId} to={`/products/${p.productId}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', minWidth: 0 }}>
                      <div style={{ position: 'relative' }}>
                        <Picture url={p.imageUrl} />
                        {p.yourColour && <span style={{ position: 'absolute', top: 6, left: 6, fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: 'var(--brand)', color: 'var(--brand-deep)' }}>their colour</span>}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', marginTop: '6px', lineHeight: 1.25 }}>{p.title}</div>
                      <div style={muted}>{[p.colour, p.size].filter(Boolean).join(', ')}{p.price ? ` · ${rupees(p.price)}` : ''} · {p.inStock} here</div>
                      {p.shelf && <div style={{ ...muted, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><MapPin size={12} /> {p.shelf}</div>}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <LookedOnline items={d.lookedOnline} />
              {(d.othersAlsoBought ?? []).length > 0 && (
                <div style={box}>
                  <div style={sectionTitle}><Users size={16} /> Others who bought what they bought, also bought</div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {d.othersAlsoBought.map(p => (
                      <PieceRow key={p.variantId} to={`/products/${p.productId}`} imageUrl={p.imageUrl} title={p.title} shelf={p.shelf}
                        line={`${[p.colour, p.size].filter(Boolean).join(', ')}${p.price ? ` · ${rupees(p.price)}` : ''} · ${p.buyers} customers · ${p.inStock} here`} />
                    ))}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Only what at least 2 other customers bought together with theirs. In this store, in their size.</p>
                </div>
              )}
            </div>
          </div>

          <div style={box}>
            <div style={sectionTitle}><StickyNote size={16} /> Notes</div>
            {c.notes.length === 0
              ? <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: '14px' }}>No notes yet. Write what helps next time, like "buys for her daughter".</p>
              : <ul style={{ margin: '0 0 10px', paddingLeft: '18px', fontSize: '14px', color: 'var(--text-primary)', display: 'grid', gap: '4px' }}>{c.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
            {can('customer:update') && (
              <form noValidate onSubmit={e => { e.preventDefault(); if (!note.trim()) { toast.error('Write the note first.'); return; } addNote.mutate({ id: c.id, text: note }); }} style={{ display: 'flex', gap: '8px' }}>
                <input className="input-field" aria-label="New note" maxLength={300} placeholder="Prefers cotton in summer" value={note} onChange={e => setNote(e.target.value)} style={{ flex: 1 }} />
                <button type="submit" className="btn-secondary" disabled={addNote.isPending}>{addNote.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Add note'}</button>
              </form>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link to={`/customers/${c.id}`} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none' }}>
              <User size={16} /> Open their full page
            </Link>
            {/* For a shop on CRM, the whole story (follow-ups, timeline) is one tap away -- optional. */}
            {crm.on && (
              <a href={crm.customerUrl(c.id)} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none' }}>
                <ExternalLink size={16} /> Full profile in CRM
              </a>
            )}
          </div>
        </div>
      )}

      <CustomerModal isOpen={adding} onClose={() => setAdding(false)} initialPhone={typed}
        onSaved={() => { setAdding(false); card.refetch(); }} />
    </div>
  );
}

function StyleTile({ icon: Icon, label, children }) {
  return (
    <div style={{ ...box, padding: '12px 14px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Icon size={14} /> {label}</div>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14.5px' }}>{children}</div>
    </div>
  );
}

function PieceRow({ to, imageUrl, title, line, shelf, liked }) {
  return (
    <Link to={to} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '12px', background: 'var(--bg-input)', textDecoration: 'none', color: 'var(--text-primary)' }}>
      <Picture url={imageUrl} size="row" />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{liked && <Heart aria-label="Liked" size={13} style={{ color: '#d6334a', fill: '#d6334a', marginRight: 4, verticalAlign: '-1px' }} />}{title}</span>
        <span style={{ display: 'block', ...muted }}>{line}</span>
      </span>
      {shelf && <span style={{ ...muted, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><MapPin size={13} /> {shelf}</span>}
    </Link>
  );
}

/**
 * What this number looked at and tried on lately -- the online shop and TryOn2Buy, only after they
 * proved the number there -- hearted pieces first (28 Oct). Shown for a customer, and for a number
 * that is not a customer yet, so staff see a first visit's try-ons before adding them.
 */
function LookedOnline({ items, plain = false }) {
  if (!(items ?? []).length) return null;
  return (
    <div style={plain ? {} : box}>
      <div style={sectionTitle}><Heart size={16} /> Looked at and tried on lately</div>
      <div style={{ display: 'grid', gap: '8px' }}>
        {items.map(l => (
          <PieceRow key={l.productId} to={`/products/${l.productId}`} imageUrl={l.imageUrl} title={l.title} shelf={l.shelf} liked={l.liked}
            line={`${[l.colour, l.liked && 'liked', l.views > 0 && `viewed ${l.views === 1 ? 'once' : `${l.views} times`}`, l.tryOns > 0 && `tried on${l.tryOns > 1 ? ` ${l.tryOns} times` : ''}`].filter(Boolean).join(' · ')} · ${l.inStock > 0 ? `${l.inStock} here` : 'not in this store'}`} />
        ))}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>From the online shop and try-on, after they confirmed this number there. Last 30 days; anything bought since is left out.</p>
    </div>
  );
}
