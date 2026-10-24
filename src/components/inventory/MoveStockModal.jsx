import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowRight, Search, Trash2, X, Plus, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { invalidateDerivedViews } from '../../lib/invalidate';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import Select from '../common/Select';
import TakeFromShelf, { fromSpotsFor } from '../shelves/TakeFromShelf';

/**
 * MOVE STOCK BETWEEN LOCATIONS, from the Inventory page (24 Oct; it was its own Transfers page).
 *
 * From and To, then the items: scanned or typed, searched at the From store, each showing how many are
 * there, with "take from shelf" for shops that use shelves. The same transfer the old page made
 * (POST /inventory-transfers), so the ledger, alerts and shelves behave exactly as before.
 *
 * "To" ends with "+ Add a new location" for anyone who may manage locations: a small form inside the box
 * (name, type, code), saved to Settings → Locations and chosen as To straight away -- opening a second
 * store should not mean leaving a half-filled move.
 *
 * Opened from an item's row, it starts with that item.
 */

const NEW_LOCATION = '__new__';
const codeFrom = (name) => name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
const TYPES = [{ v: 'STORE', l: 'Store' }, { v: 'WAREHOUSE', l: 'Godown / warehouse' }, { v: 'ONLINE', l: 'Online / virtual' }];

export default function MoveStockModal({ onClose, startWith = null }) {
  const queryClient = useQueryClient();
  const { locations, currentLocation, refreshLocations } = useLocationContext();
  const { can } = usePermission();
  const mayAddLocation = can('admin:locations');

  const [from, setFrom] = useState(currentLocation?.id ?? '');
  const [to, setTo] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]); // { variantId, sku, title, available, quantity, fromSpot }
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const [newLoc, setNewLoc] = useState(null); // { name, type, code, codeTouched, error, saving }
  const box = useRef(null);

  // Escape closes; nothing is lost that was not saved anyway.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  /** The From store's stock matching the words typed (code, barcode or name), only what is there. */
  const search = async (text, limit = 8) => {
    if (!from || !text.trim()) return [];
    const res = await api.get('/inventory/variants', { params: { locationId: from, search: text.trim(), limit } });
    return (res?.data?.items ?? res?.items ?? []).filter(v => v.quantity > 0);
  };

  // Typing searches after a short pause; a scanner's whole code arrives at once.
  useEffect(() => {
    if (!q.trim()) { setFound([]); return undefined; }
    let gone = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try { const rows = await search(q); if (!gone) setFound(rows); }
      catch { if (!gone) setFound([]); }
      finally { if (!gone) setSearching(false); }
    }, 250);
    return () => { gone = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, from]);

  const add = (v) => {
    setProblem('');
    setItems(list => list.some(i => i.variantId === v.variantId)
      ? list
      : [...list, { variantId: v.variantId, sku: v.sku, title: v.productTitle, available: v.quantity, quantity: 1, fromSpot: null }]);
    setQ(''); setFound([]);
  };

  // Opened from a row: that item, as it stands at the From store.
  useEffect(() => {
    if (!startWith?.sku || !from) return;
    let gone = false;
    search(startWith.sku, 5).then(rows => {
      if (gone) return;
      const hit = rows.find(r => r.variantId === startWith.variantId);
      if (hit) add(hit);
      else setProblem(`${startWith.sku} has no stock at ${locations.find(l => l.id === from)?.name ?? 'this store'} to move.`);
    }).catch(() => {});
    return () => { gone = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  const changeFrom = (id) => {
    setFrom(id);
    if (to === id) setTo('');
    // What was picked was counted at the old From; it may not be at the new one.
    setItems([]); setProblem('');
  };

  const changeTo = (id) => {
    if (id === NEW_LOCATION) { setNewLoc({ name: '', type: 'STORE', code: '', codeTouched: false, error: '', saving: false }); return; }
    setTo(id); setProblem('');
  };

  const saveLocation = async () => {
    const name = newLoc.name.trim();
    const code = (newLoc.code || codeFrom(name)).trim().toUpperCase();
    if (!name) return setNewLoc(n => ({ ...n, error: 'Give the location a name.' }));
    if (!code) return setNewLoc(n => ({ ...n, error: 'Give it a short code, for example GODOWN-1.' }));
    setNewLoc(n => ({ ...n, saving: true, error: '' }));
    try {
      const made = await api.post('/locations', { name, code, type: newLoc.type, active: true });
      const id = made?.id ?? made?.data?.id;
      await refreshLocations();
      setTo(id ?? '');
      setNewLoc(null);
      toast.success(`${name} added. It is in Settings → Locations too.`);
    } catch (e) {
      setNewLoc(n => ({ ...n, saving: false, error: e?.error || e?.message || 'The location could not be added. Try again.' }));
    }
  };

  const setQty = (variantId, value) => setItems(list => list.map(i => (i.variantId === variantId ? { ...i, quantity: value } : i)));
  const pieces = items.reduce((t, i) => t + (parseInt(i.quantity, 10) || 0), 0);

  const move = async () => {
    if (!from || !to) return setProblem('Choose where the stock comes from and where it goes.');
    if (from === to) return setProblem('From and To are the same location.');
    if (!items.length) return setProblem('Add at least one item to move.');
    for (const i of items) {
      const n = parseInt(i.quantity, 10) || 0;
      if (n < 1) return setProblem(`Say how many of ${i.sku} to move.`);
      if (n > i.available) return setProblem(`Only ${i.available} of ${i.sku} are at ${locations.find(l => l.id === from)?.name}.`);
    }
    setSaving(true); setProblem('');
    try {
      await api.post('/inventory-transfers', {
        originLocationId: from, destinationLocationId: to, notes,
        items: items.map(i => ({ variantId: i.variantId, quantity: parseInt(i.quantity, 10), fromSpots: fromSpotsFor(i.fromSpot, parseInt(i.quantity, 10)) }))
      });
      invalidateDerivedViews(queryClient);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(can('shelf:putaway')
        ? `${pieces} ${pieces === 1 ? 'piece' : 'pieces'} moved. At ${locations.find(l => l.id === to)?.name} they wait in Shelves → Put away.`
        : `${pieces} ${pieces === 1 ? 'piece' : 'pieces'} moved.`);
      onClose();
    } catch (e) {
      setProblem(e?.message || 'The stock could not be moved. Try again.');
      setSaving(false);
    }
  };

  const label = { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 };
  const fromName = locations.find(l => l.id === from)?.name ?? 'the From store';

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="move-stock-title" className="card"
        style={{ width: 660, maxWidth: '100%', padding: 22, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 id="move-stock-title" style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>Move stock between locations</h2>
          <button type="button" className="btn-secondary" onClick={onClose} aria-label="Close" style={{ padding: 6 }} disabled={saving}><X size={16} /></button>
        </div>

        <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={label} htmlFor="ms-from">From</label>
            <Select id="ms-from" className="input-field" value={from} onChange={(e) => changeFrom(e.target.value)} style={{ width: '100%' }}>
              <option value="">Choose a location</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </div>
          <div className="ms-arrow" style={{ paddingBottom: 10, color: 'var(--text-secondary)' }}><ArrowRight size={20} /></div>
          <div>
            <label style={label} htmlFor="ms-to">To</label>
            <Select id="ms-to" className="input-field" value={to} onChange={(e) => changeTo(e.target.value)} style={{ width: '100%' }}>
              <option value="">Choose a location</option>
              {locations.filter(l => l.id !== from).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              {mayAddLocation && <option value={NEW_LOCATION}>+ Add a new location</option>}
            </Select>
          </div>
        </div>

        {newLoc && (
          <div aria-label="New location" style={{ border: '2px dashed var(--border-light)', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
            <strong style={{ fontSize: 14 }}>New location</strong>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <div>
                <label style={label} htmlFor="nl-name">Name</label>
                <input id="nl-name" className="input-field" value={newLoc.name} maxLength={80} placeholder="Godown, Ramnagar" style={{ width: '100%' }}
                  onChange={(e) => { const name = e.target.value; setNewLoc(n => ({ ...n, name, error: '', code: n.codeTouched ? n.code : codeFrom(name) })); }} />
              </div>
              <div>
                <label style={label} htmlFor="nl-type">Type</label>
                <Select id="nl-type" className="input-field" value={newLoc.type} onChange={(e) => setNewLoc(n => ({ ...n, type: e.target.value }))} style={{ width: '100%' }}>
                  {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </Select>
              </div>
              <div>
                <label style={label} htmlFor="nl-code">Code</label>
                <input id="nl-code" className="input-field" value={newLoc.code} maxLength={20} placeholder="GODOWN-1" style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  onChange={(e) => setNewLoc(n => ({ ...n, code: e.target.value.toUpperCase(), codeTouched: true, error: '' }))} />
              </div>
            </div>
            {newLoc.error && <div role="alert" style={{ fontSize: 13, color: 'var(--accent-danger)' }}>{newLoc.error}</div>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={saveLocation} disabled={newLoc.saving}>{newLoc.saving ? 'Adding…' : 'Add location'}</button>
              <button type="button" className="btn-secondary" onClick={() => setNewLoc(null)} disabled={newLoc.saving}>Cancel</button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saved to Settings → Locations and chosen as To. Address and phone can be added there later.</span>
            </div>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <label style={label} htmlFor="ms-item">Items</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input id="ms-item" className="input-field" value={q} disabled={!from} autoComplete="off" style={{ width: '100%', paddingLeft: 36 }}
              placeholder={from ? `Scan or type an item at ${fromName}` : 'Choose From first'}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && found[0]) { e.preventDefault(); add(found[0]); } }} />
          </div>
          {q.trim() && (
            <div role="listbox" aria-label="Matching items" style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 10, boxShadow: 'var(--shadow-dropdown)', maxHeight: 260, overflowY: 'auto' }}>
              {searching ? <div style={{ padding: 10, fontSize: 13, color: 'var(--text-muted)' }}><Loader2 size={14} className="animate-spin" /> Looking…</div>
                : found.length === 0 ? <div style={{ padding: 10, fontSize: 13, color: 'var(--text-muted)' }}>Nothing with stock at {fromName} matches "{q.trim()}".</div>
                : found.map(v => (
                  <button key={v.variantId} type="button" role="option" aria-selected="false" onClick={() => add(v)}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 10, width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13 }}>
                    <span style={{ minWidth: 0 }}><b>{v.productTitle}</b> <span style={{ color: 'var(--text-secondary)' }}>· {v.sku}</span></span>
                    <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{v.quantity} here</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ display: 'grid', gap: 2 }}>
            {items.map(i => (
              <div key={i.variantId} data-move-row style={{ display: 'grid', gap: 6, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{i.sku} · {i.available} at {fromName}</div>
                  </div>
                  <input aria-label={`How many of ${i.sku} to move`} className="input-field" type="number" min="1" max={i.available} value={i.quantity}
                    onChange={(e) => { setQty(i.variantId, e.target.value); setProblem(''); }} style={{ width: 84, textAlign: 'center' }} />
                  <button type="button" className="btn-icon" aria-label={`Remove ${i.sku}`} style={{ color: 'var(--accent-danger)' }}
                    onClick={() => setItems(list => list.filter(x => x.variantId !== i.variantId))}><Trash2 size={16} /></button>
                </div>
                <TakeFromShelf compact variantId={i.variantId} locationId={from} quantity={i.quantity}
                  value={i.fromSpot ?? null} onChange={(spotId) => { if ((i.fromSpot ?? null) !== spotId) setItems(list => list.map(x => (x.variantId === i.variantId ? { ...x, fromSpot: spotId } : x))); }} />
              </div>
            ))}
          </div>
        )}

        <div>
          <label style={label} htmlFor="ms-notes">Notes (optional)</label>
          <input id="ms-notes" className="input-field" value={notes} maxLength={200} onChange={(e) => setNotes(e.target.value)} placeholder="For the festival display at Brodipet" style={{ width: '100%' }} />
        </div>

        {problem && <div role="alert" style={{ fontSize: 13, color: 'var(--accent-danger)' }}>{problem}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{pieces} {pieces === 1 ? 'piece' : 'pieces'} · {items.length} {items.length === 1 ? 'item' : 'items'}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="button" className="btn-primary" onClick={move} disabled={saving || !items.length}>
              {saving ? 'Moving…' : `Move ${pieces} ${pieces === 1 ? 'piece' : 'pieces'}`}
            </button>
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
