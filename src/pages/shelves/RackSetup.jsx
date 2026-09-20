import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Settings2, ChevronRight, ChevronDown, Plus, Wand2, Printer, ChevronUp, Trash2, Power, History, Loader2, FolderTree, Save, Upload
} from 'lucide-react';
import ImportAddresses from '../../components/shelves/ImportAddresses';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import {
  useSpotTree, useCreateSpot, useUpdateSpot, useRemoveSpot, useSpotHistory, useSpot, SPOT_KINDS, kindLabel
} from '../../hooks/useShelves';
import { ShelvesLayout, SpotChip, EmptyState, ItemThumb, itemDetail, pieces } from '../../components/shelves/ShelfBits';
import QuickCreate from '../../components/shelves/QuickCreate';
import DescribeShop from '../../components/shelves/DescribeShop';
import Select from '../../components/common/Select';
import ConfirmModal from '../../components/ConfirmModal';

const COLOURS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#78716c', '#111827'];

const flatten = (nodes, parent = null, out = new Map()) => {
  for (const n of nodes ?? []) { out.set(n.id, { ...n, parent }); flatten(n.children, n, out); }
  return out;
};

/**
 * Racks & shelves: the tree for one location. Every shop's layout is different -- cupboards with
 * shelves, rails with size sections, godown racks with cartons -- so the tree takes any shape up to
 * four levels, and quick create builds a whole wall of it at once.
 */
export default function RackSetup() {
  const { currentLocation } = useLocationContext();
  const { can } = usePermission();
  const locationId = currentLocation?.id;
  const tree = useSpotTree(locationId);
  const [selectedId, setSelectedId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [quick, setQuick] = useState(null); // null | { parent }
  const [describe, setDescribe] = useState(false);
  const [importing, setImporting] = useState(false);
  const byId = useMemo(() => flatten(tree.data?.spots), [tree.data]);
  const selected = selectedId ? byId.get(selectedId) : null;

  useEffect(() => { setSelectedId(null); setQuick(null); setDescribe(false); }, [locationId]);
  useEffect(() => {
    // First visit: open the areas so the shape of the shop is visible.
    if (tree.data && expanded.size === 0) setExpanded(new Set((tree.data.spots ?? []).map(s => s.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.data]);

  if (!can('shelf:manage')) {
    return <ShelvesLayout title="Racks & shelves" icon={Settings2}><div className="sh-card"><EmptyState icon={Settings2} title="You cannot change the racks and shelves" text="Ask whoever manages your team for the permission to set up racks and shelves." /></div></ShelvesLayout>;
  }

  const toggle = (id) => setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const expandTo = (id) => setExpanded(prev => { const next = new Set(prev); let n = byId.get(id); while (n) { next.add(n.id); n = n.parent; } return next; });
  const totals = tree.data?.pieces;

  return (
    <ShelvesLayout
      title="Racks & shelves"
      icon={Settings2}
      subtitle="Lay out this location the way it really is. Addresses print on labels; names are just for you."
      actions={tree.data?.count > 0 && (
        <Link to={`/shelves/labels?locationId=${locationId}`} target="_blank" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Printer size={16} /> Print all labels
        </Link>
      )}
    >
      {tree.isLoading ? (
        <div className="sh-card sh-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : !tree.data ? (
        <div className="sh-card">
          <EmptyState icon={FolderTree} title="Could not load the racks and shelves" text={tree.error?.message || 'Check your connection and try again.'}
            action={<button type="button" className="btn-secondary" onClick={() => tree.refetch()}>Try again</button>} />
        </div>
      ) : importing ? (
        <ImportAddresses locationId={locationId} onClose={() => setImporting(false)} />
      ) : describe ? (
        <DescribeShop locationId={locationId} locationName={currentLocation?.name}
          onClose={() => setDescribe(false)} onCreated={() => setDescribe(false)} />
      ) : tree.data.count === 0 && !quick ? (
        <div className="sh-card">
          <EmptyState icon={FolderTree} title={`No racks or shelves at ${currentLocation?.name} yet`}
            text="Answer three questions — where you keep stock, what holds it, and how many shelves — and ScaleEzy draws it for you. You can change everything later."
            action={
              <div className="sh-row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" className="btn-primary" onClick={() => setDescribe(true)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Wand2 size={16} /> Describe this place</button>
                <button type="button" className="btn-secondary" onClick={() => setQuick({ parent: null })} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Set it up myself</button>
                <button type="button" className="btn-secondary" onClick={() => setImporting(true)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Upload size={16} /> Import from a spreadsheet</button>
              </div>
            } />
        </div>
      ) : (
        <div className="sh-split">
          <section className="sh-card" style={{ display: 'grid', gap: 10, alignContent: 'start' }} aria-label="Rack tree">
            <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span className="sh-muted">{tree.data.count} spots · {pieces(totals?.onShelves ?? 0)} on shelves · {totals?.notShelved ?? 0} not shelved</span>
            </div>
            <div className="sh-row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={() => { setDescribe(true); setQuick(null); setSelectedId(null); }} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px' }}><Wand2 size={14} /> Describe</button>
              <button type="button" className="btn-secondary" onClick={() => { setQuick({ parent: null }); setSelectedId(null); }} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px' }}>Quick create</button>
              <AddArea locationId={locationId} onAdded={(s) => { setSelectedId(s.id); setQuick(null); }} />
              <button type="button" className="btn-secondary" onClick={() => { setImporting(true); setQuick(null); }} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px' }}><Upload size={14} /> CSV</button>
            </div>
            <div role="tree" aria-label="Areas, racks and shelves" style={{ display: 'grid', gap: 2, maxHeight: 'min(68vh, 760px)', overflowY: 'auto', marginRight: -6, paddingRight: 6 }}>
              {(tree.data.spots ?? []).map(n => (
                <TreeNode key={n.id} node={n} depth={0} expanded={expanded} toggle={toggle} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setQuick(null); }} />
              ))}
            </div>
          </section>

          <section aria-label="Details">
            {quick ? (
              <QuickCreate locationId={locationId} parent={quick.parent} onClose={() => setQuick(null)}
                onCreated={() => { if (quick.parent) expandTo(quick.parent.id); setQuick(null); }} />
            ) : selected ? (
              <SpotEditor key={selected.id} spot={selected} locationId={locationId}
                siblings={selected.parent ? selected.parent.children : tree.data.spots}
                onQuick={() => setQuick({ parent: selected })}
                onAdded={(child) => { expandTo(selected.id); setSelectedId(child.id); }}
                onRemoved={() => setSelectedId(selected.parent?.id ?? null)} />
            ) : (
              <div className="sh-card">
                <EmptyState icon={FolderTree} title="Choose a spot" text="Pick an area, rack or shelf on the left to rename it, reorder it, add shelves inside it or print its labels." />
              </div>
            )}
          </section>
        </div>
      )}
    </ShelvesLayout>
  );
}

function TreeNode({ node, depth, expanded, toggle, selectedId, onSelect }) {
  const open = expanded.has(node.id);
  const hasChildren = node.children?.length > 0;
  return (
    <div role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={selectedId === node.id}>
      <div className={`sh-list-btn${selectedId === node.id ? ' selected' : ''}`} style={{ padding: '6px 8px', paddingLeft: 8 + depth * 18, opacity: node.active ? 1 : 0.5, gap: 6 }}>
        <button type="button" className="sh-iconbtn" style={{ width: 26, height: 26, visibility: hasChildren ? 'visible' : 'hidden' }}
          aria-label={open ? 'Collapse' : 'Expand'} onClick={() => toggle(node.id)}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <button type="button" onClick={() => onSelect(node.id)} style={{ all: 'unset', cursor: 'pointer', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {node.colour && <span className="sh-dot" style={{ background: node.colour }} />}
          <span className="sh-addr" style={{ fontSize: 13 }}>{node.code}</span>
          <span className="sh-muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name || kindLabel(node.kind)}</span>
        </button>
        {depth === 0 && <span className={`sh-tag ${node.isShopFloor ? 'floor' : 'back'}`}>{node.isShopFloor ? 'Floor' : 'Back'}</span>}
        <span className="sh-muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }} title="Pieces in this branch">{node.branchPieces || ''}</span>
      </div>
      {hasChildren && open && node.children.map(c => (
        <TreeNode key={c.id} node={c} depth={depth + 1} expanded={expanded} toggle={toggle} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function AddArea({ locationId, onAdded }) {
  const create = useCreateSpot();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [floor, setFloor] = useState(true);
  if (!open) return <button type="button" className="btn-secondary" onClick={() => setOpen(true)} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px' }}><Plus size={14} /> Area</button>;
  return (
    <form className="sh-row" style={{ gap: 6, flexWrap: 'wrap', width: '100%' }}
      onSubmit={(e) => { e.preventDefault(); create.mutate({ locationId, kind: 'AREA', code, isShopFloor: floor }, { onSuccess: (s) => { setOpen(false); setCode(''); onAdded(s); } }); }}>
      <input className="input-field" autoFocus value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="FLOOR, STORE, 1ST" maxLength={12} aria-label="Area code" style={{ width: 130 }} />
      <Select className="input-field" value={floor ? 'floor' : 'back'} onChange={(e) => setFloor(e.target.value === 'floor')} aria-label="Shop floor or back room">
        <option value="floor">Shop floor</option>
        <option value="back">Back room</option>
      </Select>
      <button type="submit" className="btn-primary" disabled={!code || create.isPending} style={{ padding: '6px 12px' }}>Add</button>
      <button type="button" className="btn-secondary" onClick={() => setOpen(false)} style={{ padding: '6px 12px' }}>Cancel</button>
    </form>
  );
}

function SpotEditor({ spot, locationId, siblings, onQuick, onAdded, onRemoved }) {
  const update = useUpdateSpot();
  const remove = useRemoveSpot();
  const create = useCreateSpot();
  const contents = useSpot(spot.children?.length ? null : spot.id);
  const [showHistory, setShowHistory] = useState(false);
  const history = useSpotHistory(spot.id, showHistory);
  const [form, setForm] = useState({ code: spot.code, name: spot.name ?? '', kind: spot.kind, colour: spot.colour ?? '', capacity: spot.capacity ?? '', isTemporary: spot.isTemporary });
  const [child, setChild] = useState({ kind: nextKind(spot.kind), code: '', name: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const holdsStock = !spot.children?.length;
  const parentAddress = spot.parent?.address;
  const newAddress = `${parentAddress ? `${parentAddress}-` : ''}${form.code || '…'}`;
  const dirty = form.code !== spot.code || form.name !== (spot.name ?? '') || form.kind !== spot.kind || form.colour !== (spot.colour ?? '') || String(form.capacity) !== String(spot.capacity ?? '') || form.isTemporary !== spot.isTemporary;

  const save = () => {
    const body = {};
    if (form.code !== spot.code) body.code = form.code;
    if (form.name !== (spot.name ?? '')) body.name = form.name || null;
    if (form.kind !== spot.kind) body.kind = form.kind;
    if (form.colour !== (spot.colour ?? '')) body.colour = form.colour || null;
    if (String(form.capacity) !== String(spot.capacity ?? '')) body.capacity = form.capacity === '' ? null : Number(form.capacity);
    if (form.isTemporary !== spot.isTemporary) body.isTemporary = form.isTemporary;
    update.mutate({ spotId: spot.id, ...body });
  };

  const sorted = [...(siblings ?? [])].sort((a, b) => a.walkOrder - b.walkOrder || (a.address < b.address ? -1 : 1));
  const index = sorted.findIndex(s => s.id === spot.id);
  const shift = async (dir) => {
    const other = sorted[index + dir];
    if (!other) return;
    // Swap walking positions; equal numbers get spread so the order is unambiguous afterwards.
    const mine = spot.walkOrder === other.walkOrder ? other.walkOrder + dir * 5 : other.walkOrder;
    try {
      await update.mutateAsync({ spotId: spot.id, walkOrder: Math.max(0, mine) });
      await update.mutateAsync({ spotId: other.id, walkOrder: Math.max(0, spot.walkOrder) });
    } catch { /* toasted */ }
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="sh-card" style={{ display: 'grid', gap: 14 }}>
        <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <span className="sh-muted">{kindLabel(spot.kind)}{spot.depth ? ` · level ${spot.depth} of 4` : ''}{!spot.active ? ' · switched off' : ''}{spot.isTemporary ? ' · temporary' : ''}</span>
            <SpotChip address={spot.address} name={spot.name} colour={spot.colour} isShopFloor={spot.isShopFloor} size="lg" />
            <span className="sh-muted">{pieces(spot.branchPieces ?? 0)} {holdsStock ? 'here' : 'inside'}{spot.capacity ? ` · holds about ${spot.capacity}` : ''}</span>
          </div>
          <div className="sh-row" style={{ gap: 6 }}>
            <button type="button" className="btn-secondary" title="Earlier in the walk" aria-label="Earlier in the walk" disabled={index <= 0 || update.isPending} onClick={() => shift(-1)} style={{ padding: 8 }}><ChevronUp size={16} /></button>
            <button type="button" className="btn-secondary" title="Later in the walk" aria-label="Later in the walk" disabled={index < 0 || index >= sorted.length - 1 || update.isPending} onClick={() => shift(1)} style={{ padding: 8 }}><ChevronDown size={16} /></button>
            <Link to={`/shelves/labels?locationId=${locationId}&branch=${spot.id}`} target="_blank" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', gap: 6, alignItems: 'center', padding: '8px 12px' }}><Printer size={15} /> Labels</Link>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label style={{ display: 'grid', gap: 4 }}><span className="sh-muted">Code</span>
            <input className="input-field" value={form.code} maxLength={12} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}><span className="sh-muted">Name (optional)</span>
            <input className="input-field" value={form.name} maxLength={80} placeholder="Silk sarees — blue box" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}><span className="sh-muted">Kind</span>
            <Select className="input-field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {SPOT_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </Select>
          </label>
          {holdsStock && (
            <label style={{ display: 'grid', gap: 4 }}><span className="sh-muted">Holds about (pieces)</span>
              <input className="input-field" type="number" min={1} value={form.capacity} placeholder="No limit" onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </label>
          )}
        </div>
        {form.code !== spot.code && (
          <p style={{ margin: 0, color: 'var(--accent-warning)', fontSize: 13 }}>
            New address <span className="sh-addr">{newAddress}</span>{spot.children?.length ? ' — and everything inside it changes too' : ''}. Printed labels keep working; reprint them when you can so the text matches.
          </p>
        )}
        <div style={{ display: 'grid', gap: 6 }}>
          <span className="sh-muted">Colour tag</span>
          <div className="sh-row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setForm({ ...form, colour: '' })} className={!form.colour ? 'btn-primary' : 'btn-secondary'} style={{ padding: '4px 10px' }}>None</button>
            {COLOURS.map(c => (
              <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setForm({ ...form, colour: c })}
                style={{ width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer', border: form.colour === c ? '3px solid var(--text-primary)' : '1px solid var(--border-focus)' }} />
            ))}
          </div>
        </div>
        <label className="sh-row sh-muted" style={{ gap: 8, cursor: 'pointer', width: 'fit-content' }}>
          <input type="checkbox" checked={form.isTemporary} onChange={(e) => setForm({ ...form, isTemporary: e.target.checked })} /> Temporary (a table or stand for a sale)
        </label>

        <div className="sh-row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
          <div className="sh-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {spot.depth === 1 && (
              <button type="button" className="btn-secondary" disabled={update.isPending}
                onClick={() => update.mutate({ spotId: spot.id, isShopFloor: !spot.isShopFloor })}>
                Mark as {spot.isShopFloor ? 'back room' : 'shop floor'}
              </button>
            )}
            <button type="button" className="btn-secondary" disabled={update.isPending} onClick={() => update.mutate({ spotId: spot.id, active: !spot.active })} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Power size={14} /> {spot.active ? 'Switch off' : 'Switch on'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(true)} style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--accent-danger)' }}>
              <Trash2 size={14} /> Remove
            </button>
          </div>
          <button type="button" className="btn-primary" disabled={!dirty || update.isPending || !form.code} onClick={save} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {update.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </div>

      {spot.depth < 4 && (
        <div className="sh-card" style={{ display: 'grid', gap: 10 }}>
          <h3 className="sh-section-title" style={{ margin: 0 }}>Add inside {spot.address}</h3>
          {holdsStock && (spot.branchPieces ?? 0) > 0 ? (
            <p className="sh-muted" style={{ margin: 0 }}>This holds {pieces(spot.branchPieces)}. Move {spot.branchPieces === 1 ? 'it' : 'them'} to another shelf first, then you can add shelves or boxes inside it.</p>
          ) : (
            <>
              <form className="sh-row" style={{ gap: 6, flexWrap: 'wrap' }}
                onSubmit={(e) => { e.preventDefault(); create.mutate({ locationId, parentId: spot.id, kind: child.kind, code: child.code, name: child.name || undefined }, { onSuccess: (s) => { setChild({ ...child, code: '', name: '' }); onAdded(s); } }); }}>
                <Select className="input-field" value={child.kind} onChange={(e) => setChild({ ...child, kind: e.target.value })} aria-label="Kind">
                  {SPOT_KINDS.filter(k => k.value !== 'AREA').map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </Select>
                <input className="input-field" value={child.code} maxLength={12} placeholder="Code: 1, A, R04" aria-label="Code" style={{ width: 120 }} onChange={(e) => setChild({ ...child, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} />
                <input className="input-field" value={child.name} maxLength={80} placeholder="Name (optional)" aria-label="Name" style={{ flex: 1, minWidth: 140 }} onChange={(e) => setChild({ ...child, name: e.target.value })} />
                <button type="submit" className="btn-secondary" disabled={!child.code || create.isPending} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Plus size={14} /> Add</button>
              </form>
              <button type="button" className="btn-secondary" onClick={onQuick} style={{ justifySelf: 'start', display: 'flex', gap: 6, alignItems: 'center' }}><Wand2 size={14} /> Quick create several inside</button>
            </>
          )}
        </div>
      )}

      {holdsStock && contents.data && (
        <div className="sh-card" style={{ display: 'grid', gap: 8 }}>
          <h3 className="sh-section-title" style={{ margin: 0 }}>On this shelf</h3>
          {contents.data.items.length === 0 ? <span className="sh-muted">Empty.</span> : contents.data.items.map(it => (
            <div key={it.variantId} className="sh-row">
              <ItemThumb url={it.imageUrl} size={36} />
              <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block' }}>{it.title}</strong><span className="sh-muted">{itemDetail(it)}</span></span>
              <span className="sh-big-qty" style={{ fontSize: 16 }}>{it.quantity}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sh-card" style={{ display: 'grid', gap: 8 }}>
        <button type="button" className="sh-row" onClick={() => setShowHistory(v => !v)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
          <History size={16} /> History {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showHistory && (history.isLoading ? <span className="sh-muted">Loading…</span> : (
          <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            {(history.data?.addresses ?? []).map(a => (
              <div key={a.id} className="sh-muted">{new Date(a.changedAt).toLocaleString()} · address <span className="sh-addr">{a.oldAddress}</span> → <span className="sh-addr">{a.newAddress}</span></div>
            ))}
            {(history.data?.movements ?? []).map((m, i) => (
              <div key={i} className="sh-row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <span className="sh-muted" style={{ minWidth: 0 }}>{new Date(m.at).toLocaleString()} · {m.title ?? m.sku}{[m.colour, m.size && m.size !== 'Free' ? m.size : null].filter(Boolean).length ? ` (${[m.colour, m.size && m.size !== 'Free' ? m.size : null].filter(Boolean).join(", ")})` : ''} · {labelFor(m)}</span>
                <strong style={{ color: m.quantity > 0 ? 'var(--accent-success)' : 'var(--text-primary)' }}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</strong>
              </div>
            ))}
            {!history.data?.addresses?.length && !history.data?.movements?.length && <span className="sh-muted">Nothing yet.</span>}
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => { try { await remove.mutateAsync({ spotId: spot.id }); setConfirmDelete(false); onRemoved(); } catch { setConfirmDelete(false); } }}
        title={`Remove ${spot.address}?`}
        message={spot.children?.length ? `It and everything inside it will be removed. This only works while all of it is empty.` : 'This only works while it is empty. Printed labels for it will stop working.'}
        confirmText="Remove"
        confirmStyle="danger"
      />
    </div>
  );
}

const nextKind = (kind) => ({ AREA: 'RACK', RACK: 'SHELF', CUPBOARD: 'SHELF', SHELF: 'BOX', RAIL: 'RAIL_SECTION', COUNTER: 'DRAWER' }[kind] ?? 'SHELF');

const labelFor = (m) => {
  if (m.reason === 'SHELF_MOVE') return m.notes || 'moved';
  const words = { SALE: 'sold', TRANSFER: 'transferred', DAMAGE: 'damaged', AUDIT_CORRECTION: 'stock count', AUDIT: 'stock count', MANUAL_CORRECTION: 'corrected', RETURN_TO_VENDOR: 'returned to supplier', SAMPLE: 'sample' };
  return `${words[m.reason] ?? m.reason.toLowerCase().replace(/_/g, ' ')}${m.source === 'AUTO' ? ' (automatic)' : ''}`;
};
