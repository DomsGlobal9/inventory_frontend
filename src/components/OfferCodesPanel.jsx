import React, { useState, useEffect } from 'react';
import { Loader2, Copy, Download, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useOfferCodes, useMakeOfferCodes, fetchAllOfferCodes } from '../hooks/useOffers';

/**
 * An offer's single-use codes: make a batch, see which were spent and on what, take them away.
 *
 * "Take them away" is copy or a file, because codes end up on printed cards, in a mail merge or in a
 * WhatsApp broadcast -- all of which start from a list somebody pastes. Only UNUSED codes are
 * copied by default: pasting spent codes into a campaign is how a customer gets a card that does
 * not work.
 */

const PAGE = 20;

function csvOf(codes) {
  const rows = [['Code', 'Used', 'Order']];
  for (const c of codes) rows.push([c.code, c.usedAt ? new Date(c.usedAt).toISOString() : '', c.orderNumber ?? '']);
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

export default function OfferCodesPanel({ offer, canEdit }) {
  const [status, setStatus] = useState('UNUSED');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [skip, setSkip] = useState(0);
  // The first word of the offer's name that says something: "Copy of Welcome gift" suggests WELCOME.
  const [prefix, setPrefix] = useState(() => {
    const words = String(offer.name || '').replace(/^copy of\s+/i, '').toUpperCase().split(/[^A-Z0-9]+/).filter(w => w.length >= 2);
    return (words[0] || 'CODE').slice(0, 12);
  });
  const [count, setCount] = useState('100');
  const [busy, setBusy] = useState(null);

  useEffect(() => { const t = setTimeout(() => { setQ(text.trim()); setSkip(0); }, 250); return () => clearTimeout(t); }, [text]);

  const { data, isLoading, isFetching } = useOfferCodes(offer.id, { status, q, skip, take: PAGE });
  const make = useMakeOfferCodes();

  const takeAway = async (how) => {
    setBusy(how);
    try {
      const all = await fetchAllOfferCodes(offer.id, how === 'copy' ? 'UNUSED' : undefined);
      if (how === 'copy') {
        await navigator.clipboard.writeText(all.codes.map(c => c.code).join('\n'));
        toast.success(`${all.codes.length} unused code${all.codes.length === 1 ? '' : 's'} copied.`);
      } else {
        const url = URL.createObjectURL(new Blob([csvOf(all.codes)], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${offer.offerCode}-codes.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      toast.error(e?.message || 'Could not get the codes.');
    } finally {
      setBusy(null);
    }
  };

  const tabs = [['UNUSED', `Unused${data ? ` (${data.unused})` : ''}`], ['USED', `Used${data ? ` (${data.used})` : ''}`]];
  const matching = data?.matching ?? 0;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Single-use codes</h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {data ? `${data.total} made · ${data.used} used · ${data.unused} left` : ' '}
          </div>
        </div>
        {data?.total > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" disabled={!!busy || !data.unused} onClick={() => takeAway('copy')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {busy === 'copy' ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />} Copy unused
            </button>
            <button className="btn-secondary" disabled={!!busy} onClick={() => takeAway('file')} aria-label="Download all codes as a spreadsheet"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {busy === 'file' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} CSV
            </button>
          </div>
        )}
      </div>

      {canEdit && offer.status !== 'ARCHIVED' && (
        <form onSubmit={(e) => { e.preventDefault(); make.mutate({ id: offer.id, prefix, count: Number(count) }); }}
          style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)', flex: '1 1 140px' }}>
            Starts with
            <input className="input-field" value={prefix} maxLength={12} onChange={e => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              style={{ fontFamily: 'var(--font-mono)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)', flex: '0 1 110px' }}>
            How many
            <input className="input-field" type="number" min="1" max="5000" step="1" inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} />
          </label>
          <button className="btn-primary" type="submit" disabled={make.isPending || prefix.length < 2 || !(Number(count) >= 1 && Number(count) <= 5000)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {make.isPending && <Loader2 size={15} className="animate-spin" />} Make codes
          </button>
          <div style={{ flexBasis: '100%', fontSize: '12px', color: 'var(--text-muted)' }}>
            Like {prefix || 'CODE'}-7KQ2M9XR. No 0, O, 1, I or L, so nobody misreads one off a card.
          </div>
        </form>
      )}

      {data?.total > 0 && (
        <>
          <div style={{ padding: '12px 20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div role="tablist" style={{ display: 'flex', gap: '6px' }}>
              {tabs.map(([key, label]) => (
                <button key={key} role="tab" aria-selected={status === key} onClick={() => { setStatus(key); setSkip(0); }}
                  className={status === key ? 'btn-primary' : 'btn-secondary'} style={{ padding: '5px 12px', fontSize: '13px' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative', flex: '1 1 160px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input-field" value={text} onChange={e => setText(e.target.value)} placeholder="Find a code" aria-label="Find a code"
                style={{ width: '100%', paddingLeft: '30px', fontFamily: 'var(--font-mono)' }} />
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}><Loader2 size={18} className="animate-spin" /></div>
          ) : data.codes.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
              {q ? `No code matches “${q}”.` : status === 'USED' ? 'None used yet.' : 'Every code has been used.'}
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, opacity: isFetching ? 0.6 : 1 }}>
              {data.codes.map(c => (
                <li key={c.code} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 20px', borderTop: '1px solid var(--border-light)', fontSize: '14px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>{c.code}</span>
                  {c.usedAt && (
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                      {c.orderId ? <Link to={`/orders/${c.orderId}`} style={{ color: 'var(--text-primary)' }}>{c.orderNumber ?? 'Order'}</Link> : 'Used'}
                      {' · '}{new Date(c.usedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {matching > PAGE && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>{skip + 1}–{Math.min(skip + PAGE, matching)} of {matching}</span>
              <span style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-secondary" style={{ padding: '4px 10px' }} disabled={skip === 0} onClick={() => setSkip(s => Math.max(0, s - PAGE))}>Previous</button>
                <button className="btn-secondary" style={{ padding: '4px 10px' }} disabled={skip + PAGE >= matching} onClick={() => setSkip(s => s + PAGE)}>Next</button>
              </span>
            </div>
          )}
        </>
      )}

      {data && data.total === 0 && (
        <div style={{ padding: '18px 20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          No codes yet. {canEdit ? 'Make a batch above, then start the offer.' : 'Someone who can change offers has to make them.'}
        </div>
      )}
    </div>
  );
}
