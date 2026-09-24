import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Upload, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useShopBanners, useAddBanner, useEditBanner, useReorderBanners, useRemoveBanner
} from '../../hooks/useOnlineShop';
import ConfirmModal from '../ConfirmModal';
import Select from '../common/Select';

/**
 * Settings -> Online shop -> Banners: the pictures across the top of the shop, the way every shop
 * the owner buys from has them.
 *
 * Three things a banner can do when it is tapped, and no more: nothing, a search, or one product.
 * "Silk sarees" pointing at a search for silk needs no collections feature and cannot go stale --
 * if the shop stops selling silk the banner lands on an empty search that says so, rather than on
 * a broken page. A product code is checked by the server before it is saved, so the owner hears
 * about a wrong code here and not from a customer.
 *
 * Order is changed with up and down rather than by dragging: the owner may well be doing this on
 * a phone behind the counter, where dragging a row inside a scrolling page is a fight.
 */

const MAX_BANNERS = 6;
const MAX_BYTES = 15 * 1024 * 1024;

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('That file could not be read.'));
  r.readAsDataURL(file);
});

const card = { padding: '20px 22px', marginBottom: '16px' };
const h3 = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' };
const hint = { fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px' };
const label = { display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' };
const tiny = { padding: '5px 9px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' };

/** Where a banner goes, shared by the row being edited and the one being added. */
function LinkFields({ kind, value, onKind, onValue, idPrefix }) {
  return (
    <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'minmax(150px, 200px) 1fr' }}>
      <div>
        <label style={label} htmlFor={`${idPrefix}-kind`}>When tapped</label>
        <Select id={`${idPrefix}-kind`} className="input-field" value={kind} onChange={(e) => onKind(e.target.value)} style={{ width: '100%' }}>
          <option value="NONE">Nothing happens</option>
          <option value="SEARCH">Search for something</option>
          <option value="PRODUCT">Open one product</option>
        </Select>
      </div>
      {kind === 'NONE' ? <div /> : (
        <div>
          <label style={label} htmlFor={`${idPrefix}-value`}>
            {kind === 'SEARCH' ? 'Search for' : 'Product code'}
          </label>
          <input id={`${idPrefix}-value`} className="input-field" value={value} maxLength={120}
            onChange={(e) => onValue(e.target.value)} style={{ width: '100%' }}
            placeholder={kind === 'SEARCH' ? 'silk' : 'SAR-0012'} />
        </div>
      )}
    </div>
  );
}

/** One banner, with its own unsaved changes. */
function Row({ banner, index, count, onMove, busy }) {
  const edit = useEditBanner();
  const remove = useRemoveBanner();
  const [asking, setAsking] = useState(false);

  const [form, setForm] = useState({
    heading: banner.heading ?? '', subtext: banner.subtext ?? '',
    linkKind: banner.linkKind ?? 'NONE', linkValue: banner.linkValue ?? ''
  });

  // Reset when the server sends a different truth back -- after a reorder, say, every row is
  // handed a new object and a half-typed heading in another row must not be carried over to it.
  useEffect(() => {
    setForm({
      heading: banner.heading ?? '', subtext: banner.subtext ?? '',
      linkKind: banner.linkKind ?? 'NONE', linkValue: banner.linkValue ?? ''
    });
  }, [banner.id, banner.heading, banner.subtext, banner.linkKind, banner.linkValue]);

  const changed =
    form.heading !== (banner.heading ?? '') ||
    form.subtext !== (banner.subtext ?? '') ||
    form.linkKind !== (banner.linkKind ?? 'NONE') ||
    form.linkValue !== (banner.linkValue ?? '');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const working = busy || edit.isPending || remove.isPending;

  /* Removing is for good: the picture is deleted from storage, not just unhooked. So it is asked
     properly, naming what goes, rather than with a grey browser box. Hiding is the undoable one. */
  const drop = () => remove.mutateAsync(banner.id).then(() => setAsking(false));

  return (
    <li style={{
      border: '1px solid var(--border-light)', borderRadius: '10px', padding: '12px',
      marginBottom: '10px', opacity: banner.active ? 1 : 0.62
    }}>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        {/* The same 16:9 the shop page gives it, so what is seen here is what customers get. */}
        <div style={{ flex: '0 0 auto', width: '168px' }}>
          <img src={banner.imageUrl} alt=""
            style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '7px', border: '1px solid var(--border-light)', display: 'block' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {banner.width} × {banner.height}{banner.active ? '' : ' · hidden'}
          </div>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 0, display: 'grid', gap: '10px' }}>
          <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <div>
              <label style={label} htmlFor={`b-${banner.id}-h`}>Big words (optional)</label>
              <input id={`b-${banner.id}-h`} className="input-field" value={form.heading} maxLength={60}
                onChange={(e) => set('heading', e.target.value)} placeholder="Festival collection" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={label} htmlFor={`b-${banner.id}-s`}>Small words (optional)</label>
              <input id={`b-${banner.id}-s`} className="input-field" value={form.subtext} maxLength={120}
                onChange={(e) => set('subtext', e.target.value)} placeholder="New silks just in" style={{ width: '100%' }} />
            </div>
          </div>

          <LinkFields idPrefix={`b-${banner.id}`} kind={form.linkKind} value={form.linkValue}
            onKind={(k) => setForm(f => ({ ...f, linkKind: k, linkValue: k === 'NONE' ? '' : f.linkValue }))}
            onValue={(v) => set('linkValue', v)} />

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn-primary" style={tiny} disabled={!changed || working}
              onClick={() => edit.mutate({ id: banner.id, ...form })}>
              {edit.isPending ? <Loader2 size={12} className="animate-spin" /> : null} Save
            </button>
            <button type="button" className="btn-secondary" style={tiny} disabled={working}
              onClick={() => edit.mutate({ id: banner.id, active: !banner.active })}>
              {banner.active ? <><EyeOff size={13} /> Hide it</> : <><Eye size={13} /> Show it</>}
            </button>
            <button type="button" className="btn-secondary" style={tiny} disabled={working || index === 0}
              onClick={() => onMove(index, -1)} aria-label="Move this banner earlier"><ArrowUp size={13} /></button>
            <button type="button" className="btn-secondary" style={tiny} disabled={working || index === count - 1}
              onClick={() => onMove(index, 1)} aria-label="Move this banner later"><ArrowDown size={13} /></button>
            <button type="button" className="btn-secondary" style={{ ...tiny, marginLeft: 'auto', color: 'var(--danger, #dc2626)' }}
              disabled={working} onClick={() => setAsking(true)}><Trash2 size={13} /> Remove</button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={asking}
        onClose={() => setAsking(false)}
        onConfirm={drop}
        title="Remove this banner?"
        message={
          (banner.heading ? `"${banner.heading}" ` : 'This banner ') +
          'comes off your shop straight away and the picture is deleted for good. If you only want ' +
          'it off the shop for now, use Hide it instead.'
        }
        confirmText="Remove it"
        confirmStyle="danger"
      />
    </li>
  );
}

export default function ShopBanners() {
  const { data: banners, isLoading } = useShopBanners();
  const add = useAddBanner();
  const reorder = useReorderBanners();
  const fileRef = useRef(null);

  const [picked, setPicked] = useState(null); // { dataUrl, name }
  const [draft, setDraft] = useState({ heading: '', subtext: '', linkKind: 'NONE', linkValue: '' });

  const list = banners ?? [];
  const full = list.length >= MAX_BANNERS;

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Said here, before a long upload; the server checks again.
    if (file.size > MAX_BYTES) return toast.error('That picture is larger than 15 MB. Choose a smaller one.');
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      return toast.error('This is an iPhone HEIC photo. Share it as a JPEG (or set the camera to "Most Compatible") and choose it again.');
    }
    try { setPicked({ dataUrl: await readAsDataUrl(file), name: file.name }); }
    catch (err) { toast.error(err?.message || 'That picture could not be read.'); }
  };

  const put = () => {
    add.mutate({ base64: picked.dataUrl, ...draft }, {
      onSuccess: () => { setPicked(null); setDraft({ heading: '', subtext: '', linkKind: 'NONE', linkValue: '' }); }
    });
  };

  /** Swap with the neighbour, and send the whole order -- the server takes the list, not a move. */
  const move = (index, by) => {
    const ids = list.map(b => b.id);
    const to = index + by;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    reorder.mutate(ids);
  };

  if (isLoading) {
    return <div className="card" style={{ ...card, color: 'var(--text-muted)' }}><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }

  return (
    <div className="card" style={card}>
      <h3 style={h3}><ImageIcon size={16} /> Banners</h3>
      <p style={hint}>
        The pictures across the top of your shop. Customers swipe through them. Use a wide
        photograph — the shape is like a television, not a portrait — and put the words you want on
        top of it here rather than writing them into the picture, so they stay readable on a phone.
      </p>

      {list.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0 }}>
          {list.map((b, i) => (
            <Row key={b.id} banner={b} index={i} count={list.length} onMove={move} busy={reorder.isPending} />
          ))}
        </ul>
      )}

      {/* ── Adding one ───────────────────────────────────────────────────────────────── */}
      {picked ? (
        <div style={{ border: '1px dashed var(--border-light)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 auto', width: '168px' }}>
              <img src={picked.dataUrl} alt="The banner you chose"
                style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '7px', border: '1px solid var(--border-light)', display: 'block' }} />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', overflowWrap: 'anywhere' }}>{picked.name}</div>
            </div>
            <div style={{ flex: '1 1 280px', minWidth: 0, display: 'grid', gap: '10px' }}>
              <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                <div>
                  <label style={label} htmlFor="nb-h">Big words (optional)</label>
                  <input id="nb-h" className="input-field" value={draft.heading} maxLength={60}
                    onChange={(e) => setDraft(d => ({ ...d, heading: e.target.value }))} placeholder="Festival collection" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={label} htmlFor="nb-s">Small words (optional)</label>
                  <input id="nb-s" className="input-field" value={draft.subtext} maxLength={120}
                    onChange={(e) => setDraft(d => ({ ...d, subtext: e.target.value }))} placeholder="New silks just in" style={{ width: '100%' }} />
                </div>
              </div>
              <LinkFields idPrefix="nb" kind={draft.linkKind} value={draft.linkValue}
                onKind={(k) => setDraft(d => ({ ...d, linkKind: k, linkValue: k === 'NONE' ? '' : d.linkValue }))}
                onValue={(v) => setDraft(d => ({ ...d, linkValue: v }))} />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className="btn-primary" disabled={add.isPending} onClick={put}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {add.isPending ? <><Loader2 size={14} className="animate-spin" /> Adding…</> : 'Add this banner'}
                </button>
                <button type="button" className="btn-secondary" disabled={add.isPending} onClick={() => setPicked(null)}>
                  Choose a different picture
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <button type="button" className="btn-secondary" disabled={full} onClick={() => fileRef.current?.click()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            <Upload size={15} /> {list.length ? 'Add another banner' : 'Add a banner'}
          </button>
          <p style={{ ...hint, margin: '8px 0 0' }}>
            {full
              ? `You have the most banners a shop can have (${MAX_BANNERS}). Remove one to add another.`
              : `${list.length} of ${MAX_BANNERS} used. A shop with no banners simply starts at its products.`}
          </p>
        </>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={choose} style={{ display: 'none' }} aria-label="Choose a banner picture" />
    </div>
  );
}
