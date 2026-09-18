import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { useDebounced, useSellableSearch } from '../../../hooks/useCounterSale';
import { formatINRExact } from '../../../utils/formatUtils';

const detail = (it) => [it.colorName, it.size].filter(Boolean).join(' · ');

/**
 * One box for a scanner and for typing.
 *
 * A barcode scanner types the code and presses Enter, faster than anyone types. So Enter asks the
 * server straight away rather than waiting for the list to settle, and an exact barcode, SKU or code
 * goes into the basket at once. Anything else shows matches to pick from, with this store's price
 * and how many are free here. Nothing about cost is ever sent to this screen.
 */
export default function ItemSearch({ locationId, onAdd, inBasket }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const lastScan = useRef({ text: '', at: 0 });
  const q = useDebounced(text.trim(), 250);
  const { data, isFetching, isPlaceholderData } = useSellableSearch(q, locationId);
  // Only the answer to what is in the box counts. Anything else is last search's list, still drawn.
  const answered = !!data && !isPlaceholderData && data.forQuery === q;
  const items = q && answered ? (data.items ?? []) : [];

  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const canSell = (it) => it.sellableHere && it.available > (inBasket[it.variantId] ?? 0);
  const why = (it) => !it.sellableHere ? 'Not sold here'
    : it.available === 0 ? 'None here'
    : (inBasket[it.variantId] ?? 0) >= it.available ? 'All in basket' : null;

  /** Puts the item on the bill. Emptying the box is the caller's business -- see Enter below. */
  const add = (it) => {
    if (!canSell(it)) {
      toast.error(`${it.title}: ${why(it)}.`);
      return;
    }
    onAdd(it);
    inputRef.current?.focus();
  };

  /** Chosen with the mouse: nothing else is being typed, so the box is cleared here. */
  const pick = (it) => { add(it); setText(''); setOpen(false); };

  const onKeyDown = async (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, Math.max(items.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const typed = text.trim();
      if (!typed) return;
      // A second scan must never be dropped because the first is still being looked up: the piece
      // is in the customer's bag and not on the bill. Each lookup stands on its own (adding a line
      // is a functional update, so two answers cannot overwrite each other). What is refused is the
      // SAME code twice in the same breath -- a scanner sending Enter twice, or a double press.
      const now = Date.now();
      if (lastScan.current.text === typed && now - lastScan.current.at < 400) return;
      lastScan.current = { text: typed, at: now };
      // The box is emptied the instant the code is taken, not when the answer comes back a second
      // later. A scanner starts the next tag immediately, and clearing late either swallowed its
      // first digits or left both codes in the box as one long number.
      setText('');
      setOpen(false);
      // The list may still be answering what was typed a moment ago, so it is trusted only when it
      // is this text's own answer. Otherwise -- and for every scan -- the server is asked directly.
      if (open && answered && q === typed && items[active]) { add(items[active]); return; }
      setAdding(true);
      try {
        const result = (await api.get('/counter-sales/items', { params: { q: typed, locationId } })).data;
        if (result?.exact && result.items[0]) add(result.items[0]);
        else if (result?.items?.length === 1) add(result.items[0]);
        else if (!result?.items?.length) toast.error(`Nothing here matches "${typed}".`);
        else {
          // Several things match, so this was somebody typing, not a scan: put their words back so
          // they can pick from the list -- unless another tag has been scanned into the box since.
          setText(prev => (prev === '' ? typed : prev));
          setOpen(true);
        }
      } catch (err) {
        toast.error(err?.message || 'Could not search the items.');
      } finally {
        setAdding(false);
      }
    }
  };

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <ScanLine size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          className="input-field"
          autoFocus
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onFocus={() => text && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Scan a barcode, or type a name, SKU or colour"
          aria-label="Find an item"
          style={{ paddingLeft: 42, paddingRight: 40, width: '100%' }}
        />
        {(isFetching || adding) && (
          <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: 14, top: '50%', marginTop: -8, color: 'var(--text-muted)' }} />
        )}
      </div>

      {open && q && (
        <div role="listbox" style={{
          position: 'absolute', zIndex: 30, left: 0, right: 0, top: 'calc(100% + 6px)', maxHeight: 360, overflowY: 'auto',
          background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,.35)'
        }}>
          {items.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Search size={15} /> {isFetching ? 'Searching…' : `Nothing here matches "${q}".`}
            </div>
          ) : items.map((it, i) => {
            const blocked = why(it);
            return (
              <button
                key={it.variantId}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(it)}
                style={{
                  display: 'flex', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 14px',
                  background: i === active ? 'var(--bg-hover)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border-light)',
                  color: 'var(--text-primary)', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.55 : 1
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-input)', flexShrink: 0, overflow: 'hidden' }}>
                  {it.imageUrl && <img src={it.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {[detail(it), it.sku].filter(Boolean).join(' · ')}
                  </div>
                  {it.shelves?.length > 0 && (
                    // Where to fetch it from, shop floor first.
                    <div style={{ fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {it.shelves.map(s => (
                        <span key={s.address} style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontWeight: 700, marginRight: 8, color: s.isShopFloor ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                          {s.address}·{s.quantity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 600 }}>{it.price === null ? '—' : formatINRExact(it.price)}</div>
                  <div style={{ fontSize: 12, color: blocked ? 'var(--accent-danger)' : it.available <= 2 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                    {blocked || `${it.available} here`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
