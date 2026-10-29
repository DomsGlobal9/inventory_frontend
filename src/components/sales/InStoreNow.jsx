import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DoorOpen, X, ArrowRightLeft, Check, UserRound } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { holdsEverything } from '../../lib/authority';

/**
 * "In the store now" on the Customer card (29 Oct): who has arrived by the door QR, how long they
 * have waited, who each salesperson is with, who a customer asked for, passing a customer on, and
 * Done. The server decides every rule (services/door-checkin); this only shows and asks.
 *
 *   - Waiting longest first. Past WAIT_MIN with nobody taking them the row turns red; the owner's
 *     bell says so and the customer gets one "sorry for the wait" (the server's job, once).
 *   - "Asked for you": they asked for this person, at the door or last time this person helped them.
 *     Anybody else taking them is asked first: take them anyway, or leave them for that person.
 *   - Pass to: the person with them, or the owner. Done: frees the salesperson; a bill does it too.
 */
const WAIT_MIN = 5;
const minutes = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
const ago = (iso) => { const m = minutes(iso); return m < 1 ? 'just now' : `${m} min`; };
const pill = (tone) => ({
  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap',
  ...(tone === 'free' ? { background: 'rgba(22,75,30,.12)', color: 'var(--brand-deep)' }
    : tone === 'busy' ? { background: 'rgba(180,83,9,.12)', color: '#b45309' }
    : tone === 'late' ? { background: 'rgba(180,35,24,.12)', color: 'var(--accent-danger, #b42318)' }
    : tone === 'you' ? { background: 'var(--brand)', color: 'var(--brand-deep)' }
    : { background: 'var(--bg-input)', color: 'var(--text-secondary)' })
});
const small = { fontSize: '12px', padding: '5px 11px', borderRadius: '999px' };

export default function InStoreNow({ data, onOpen, onChanged }) {
  // useAuth() is the context: the person is `.user`; roles and permissions sit on the context too.
  const auth = useAuth();
  const me = auth.user;
  const owner = holdsEverything(auth);
  const [picking, setPicking] = useState(null);   // { kind: 'ask' | 'pass', arrival }
  const [asking, setAsking] = useState(null);     // the 409 when someone else was asked for: { arrival, name }

  const act = useMutation({
    mutationFn: async ({ id, what, body }) => (await api.post(`/customers/checkins/${id}/${what}`, body ?? {})).data,
    onSuccess: (r, v) => {
      if (v.what === 'take' && r?.phone) onOpen(r.phone);
      if (v.what === 'pass') toast.success(`Passed to ${r?.takenBy ?? 'them'}`);
      if (v.what === 'done') toast.success('Done');
      setPicking(null); setAsking(null); onChanged();
    },
    onError: (e, v) => {
      // Somebody else was asked for: say who, and let this person decide.
      // The api client rejects with the server's body: { message, askedFor } on this refusal.
      if (v.what === 'take' && e?.askedFor) { setAsking({ arrival: v.arrival, name: e.askedFor }); return; }
      toast.error(e?.message || 'That did not work. Try again.'); onChanged();
    }
  });

  const arrivals = data?.arrivals ?? [];
  const staff = data?.staff ?? [];
  const busyWith = (id) => staff.find(s => s.id === id)?.with ?? 0;

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><DoorOpen size={15} /><span>In the store now</span></span>
        {arrivals.length === 0 && <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>When a customer scans the QR at the door, they show here.</span>}
        {/* Who is free and who is with someone, so nobody walks across the floor to ask. */}
        {arrivals.length > 0 && staff.map(s => (
          <span key={s.id} style={pill(s.with ? 'busy' : 'free')} title={s.with ? `With ${s.with}` : 'Free'}>
            {s.id === me?.id ? 'You' : s.name} · {s.with ? `with ${s.with === 1 ? '1' : s.with}` : 'free'}
          </span>
        ))}
      </div>

      {arrivals.length > 0 && (
        <div role="list" aria-label="In the store now" style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
          {arrivals.map(a => {
            const mine = a.takenById && a.takenById === me?.id;
            const waited = !a.takenById ? minutes(a.waitingSince) : 0;
            const late = !a.takenById && waited >= WAIT_MIN;
            const forMe = a.askedFor?.id && a.askedFor.id === me?.id;
            const name = a.customer ? a.customer.name : `New · ${a.maskedPhone}`;
            return (
              <div role="listitem" key={a.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap',
                padding: '9px 12px', borderRadius: '12px', background: 'var(--bg-input)',
                border: late ? '1px solid var(--accent-danger, #b42318)' : forMe ? '1px solid var(--brand-deep)' : '1px solid transparent'
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{name}</span>
                    {a.customer?.groups?.map(g => <span key={g} style={{ fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '999px', background: 'var(--accent-gold)', color: '#1a1a1a' }}>{g}</span>)}
                    {forMe && !a.takenById && <span style={pill('you')}>Asked for you</span>}
                    {a.askedFor && !forMe && !a.takenById && <span style={pill()}>Asked for {a.askedFor.name}</span>}
                    {late && <span style={pill('late')}>Waiting {waited} min</span>}
                    {a.passedBy && mine && <span style={pill('you')}>Passed to you by {a.passedBy}</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {a.takenById
                      ? (mine ? `With you · ${ago(a.takenAt)}` : `With ${a.takenBy} · ${ago(a.takenAt)}`)
                      : late ? 'Nobody has taken them yet' : `Waiting ${ago(a.waitingSince)}`}
                    {a.lastHelpedBy && !a.takenById ? ` · last time: ${a.lastHelpedBy.id === me?.id ? 'you' : a.lastHelpedBy.name}` : ''}
                    {late && staff.length > 0 && staff.every(s => s.with > 0) ? ' · everyone is with someone' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {!a.takenById && (
                    <button type="button" className="btn-primary" style={small} disabled={act.isPending}
                      onClick={() => act.mutate({ id: a.id, what: 'take', arrival: a })}>I'll take them</button>
                  )}
                  {!a.takenById && (
                    <button type="button" className="btn-secondary" style={small} onClick={() => setPicking({ kind: 'ask', arrival: a })}>They asked for…</button>
                  )}
                  {a.takenById && <button type="button" className="btn-secondary" style={small} onClick={() => onOpen(a.phone)}>Open card</button>}
                  {a.takenById && (mine || owner) && (
                    <button type="button" className="btn-secondary" style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: '5px' }} onClick={() => setPicking({ kind: 'pass', arrival: a })}>
                      <ArrowRightLeft size={13} /> Pass to…
                    </button>
                  )}
                  {a.takenById && (mine || owner) && (
                    <button type="button" className="btn-secondary" style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: '5px' }} disabled={act.isPending}
                      onClick={() => act.mutate({ id: a.id, what: 'done' })}><Check size={13} /> Done</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Picking a person: who they asked for, or who to pass them to. Free people first. */}
      {picking && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="isn-title" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPicking(null); }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', boxSizing: 'border-box', padding: '20px', borderRadius: '16px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 id="isn-title" style={{ margin: 0, fontSize: '17px' }}>
                {picking.kind === 'ask' ? 'Who did they ask for?' : `Pass ${picking.arrival.customer?.name ?? 'them'} to`}
              </h3>
              <button type="button" aria-label="Close" onClick={() => setPicking(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {picking.kind === 'ask'
                ? 'They are shown to that person first, marked "Asked for you".'
                : 'They see "Passed to you", and the customer\'s card keeps who helped them.'}
            </p>
            <div role="list" style={{ display: 'grid', gap: '6px' }}>
              {[...staff].filter(s => picking.kind === 'ask' || s.id !== picking.arrival.takenById)
                .sort((x, y) => (x.with ? 1 : 0) - (y.with ? 1 : 0) || x.name.localeCompare(y.name))
                .map(s => (
                  <button key={s.id} type="button" role="listitem" className="btn-secondary" disabled={act.isPending}
                    onClick={() => act.mutate({ id: picking.arrival.id, what: picking.kind, body: { userId: s.id } })}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', width: '100%' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><UserRound size={15} /> {s.name}{s.id === me?.id ? ' (you)' : ''}</span>
                    <span style={pill(busyWith(s.id) ? 'busy' : 'free')}>{busyWith(s.id) ? `with ${busyWith(s.id)}` : 'free'}</span>
                  </button>
                ))}
              {picking.kind === 'ask' && picking.arrival.askedFor && (
                <button type="button" className="btn-secondary" disabled={act.isPending} style={{ padding: '10px 12px', borderRadius: '10px' }}
                  onClick={() => act.mutate({ id: picking.arrival.id, what: 'ask', body: { userId: null } })}>Nobody in particular</button>
              )}
            </div>
          </div>
        </div>, document.body
      )}

      {/* They asked for somebody else: take them anyway, or leave them for that person. */}
      {asking && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="isn-ask" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', boxSizing: 'border-box', padding: '20px', borderRadius: '16px', background: 'var(--bg-card)' }}>
            <h3 id="isn-ask" style={{ margin: '0 0 6px', fontSize: '17px' }}>{asking.arrival.customer?.name ?? 'They'} asked for {asking.name}</h3>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {busyWith(asking.arrival.askedFor?.id) ? `${asking.name} is with someone just now.` : `${asking.name} is free.`} Take them anyway, or leave them for {asking.name}?
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="btn-secondary" onClick={() => setAsking(null)}>Leave for {asking.name}</button>
              <button type="button" className="btn-primary" disabled={act.isPending}
                onClick={() => act.mutate({ id: asking.arrival.id, what: 'take', body: { anyway: true }, arrival: asking.arrival })}>Take them anyway</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
