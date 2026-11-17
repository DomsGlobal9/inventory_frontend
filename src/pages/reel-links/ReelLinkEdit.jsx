import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, X } from 'lucide-react';
import {
  useReelLink, useReelOverview, useNextReelTitle, usePieceSearch,
  useCreateReelLink, useUpdateReelLink, useSwitchReelLink, useDeleteReelLink
} from '../../hooks/useReelLinks';
import { usePermission } from '../../hooks/usePermission';
import PageLoader from '../../components/PageLoader';
import ConfirmModal from '../../components/ConfirmModal';
import Select from '../../components/common/Select';
import { RL_CSS, Thumb, ReelSwitch, QrDialog, ReelVideoDialog, instagramPlayer, copy, priceText, stockText } from './shared';

const MAX = 12;
const FILTERS = [{ key: null, label: 'All' }, { key: 'new', label: 'New this week' }, { key: 'instock', label: 'In stock' }];

/** The shopper's page: logo, title, the pieces in order with sold-out ones last and greyed. */
function PhonePreview({ shop, title, pieces }) {
  const shown = [...pieces.filter(p => p.inStock > 0), ...pieces.filter(p => !(p.inStock > 0))].filter(p => !p.hidden);
  return (
    <div>
      <p className="rl-colh" style={{ textAlign: 'center' }}>What the shopper sees</p>
      <div className="rl-phone" style={{ '--rl-accent': shop?.accent || undefined }}>
        <div className="rl-phone-head">
          {shop?.logoUrl ? <img className="rl-phone-logo" src={shop.logoUrl} alt="" /> : <span className="rl-phone-logo">{(shop?.shopName || 'S').slice(0, 2).toUpperCase()}</span>}
          <span>{shop?.shopName || 'Your shop'}</span>
        </div>
        <div className="rl-phone-body">
          <p className="rl-phone-title">{title || 'Title'}</p>
          <p className="rl-phone-sub">{shown.length} {shown.length === 1 ? 'piece' : 'pieces'} from our reel</p>
          {shown.length === 0 ? <p className="rl-phone-sub">Pick pieces to see them here.</p> : (
            <div className="rl-phone-grid">
              {shown.slice(0, 6).map(p => (
                <div key={p.productId} className={p.inStock > 0 ? '' : 'gone'}>
                  <Thumb src={p.photo} size="lg" />
                  <div className="rl-name">{p.title}{p.colour ? `, ${p.colour.toLowerCase()}` : ''}</div>
                  <div className="rl-price">{p.inStock > 0 ? priceText(p) : 'Sold out'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** After saving: the link, its QR, the caption line, on / off, and the opens. */
function SharePanel({ link, manage, onSwitch, onDelete, busy, onQr }) {
  const url = link.shortUrl || link.pageUrl;
  // Only a title that says "Reel 12" has a number to put in the caption; digits elsewhere in a title are not one.
  const number = (/\breel\s+(\d+)\b/i.exec(link.title) || [])[1];
  const caption = number ? `Shop this look: link in bio, reel ${number}.` : 'Shop this look: link in bio.';
  return (
    <div className="rl-card rl-share">
      {url ? (
        <div className="rl-share-top">
          <button type="button" className="rl-qr" onClick={onQr} aria-label="Show the QR code bigger"><QRCodeCanvas value={url} size={92} level="M" marginSize={1} /></button>
          <div style={{ minWidth: 0 }}>
            <div className="rl-sub">Link for this reel</div>
            <div className="rl-url" style={{ margin: '4px 0 8px' }}>{url.replace(/^https?:\/\//, '')}</div>
            <div className="rl-row-actions">
              <button type="button" className="btn-secondary" onClick={() => copy(url)}>Copy link</button>
              <a className="btn-secondary" href={link.pageUrl || url} target="_blank" rel="noreferrer">Open</a>
            </div>
          </div>
        </div>
      ) : <span className="rl-warn">The link is not ready yet. Choose your online shop address in Settings, Online shop.</span>}
      <div>
        <div className="rl-sub">Caption line</div>
        <div className="rl-row-actions" style={{ justifyContent: 'space-between', marginTop: 4, flexWrap: 'nowrap' }}><span style={{ fontSize: 13.5 }}>{caption}</span><button type="button" className="btn-secondary" onClick={() => copy(caption, 'Caption')}>Copy</button></div>
      </div>
      <p className="rl-note">Where it works: a story's link sticker, your bio link, and WhatsApp or direct messages. Instagram does not let people tap a link in a caption.</p>
      {!link.active && <p className="rl-warn" style={{ margin: 0 }}>Switched off. Shoppers see "This look is no longer available" and your new arrivals.</p>}
      <div className="rl-row-actions" style={{ justifyContent: 'space-between' }}>
        <span className="rl-row-actions">
          {manage && <ReelSwitch on={link.active} disabled={busy} onChange={onSwitch} label={link.active ? 'Switch this reel link off' : 'Switch this reel link on'} />}
          <span className="rl-sub">{link.active ? 'Live' : 'Off'}</span>
        </span>
        <span className="rl-sub">Opened by {link.opened.toLocaleString('en-IN')} {link.opened === 1 ? 'person' : 'people'}</span>
      </div>
      {manage && <button type="button" className="btn-secondary" disabled={busy} onClick={onDelete} style={{ color: 'var(--accent-danger)', justifySelf: 'start' }}>Delete reel link</button>}
    </div>
  );
}

/**
 * One editor per reel link: going from one straight to another (Back, Forward, or "new" becoming the saved one) starts
 * a fresh editor, so the last one's pieces and "changed" mark never carry over.
 */
export default function ReelLinkEditPage() {
  const { id } = useParams();
  return <ReelLinkEdit key={id || 'new'} />;
}

function ReelLinkEdit() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { can } = usePermission();
  const manage = can('reel_link:manage');

  const overview = useReelOverview();
  const existing = useReelLink(isNew ? null : id);
  const next = useNextReelTitle({ enabled: isNew && manage });
  const create = useCreateReelLink();
  const update = useUpdateReelLink(id);
  const switcher = useSwitchReelLink(id);
  const remove = useDeleteReelLink();

  const [title, setTitle] = useState('');
  const [reelUrl, setReelUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [pieces, setPieces] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  // Read in the same tick it is set: a double-click delivers both clicks before React re-renders a disabled button.
  const inFlight = useRef(false);

  // Unsaved changes: the browser asks before the tab is closed or reloaded, and the page's own ways out ask too.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  // The page's own ways out ask in the app's own box (it was the browser's confirm(), 17 Nov 2026: no native boxes).
  const [leaveTo, setLeaveTo] = useState(null);
  const leave = (to) => { if (dirty) setLeaveTo(to); else navigate(to); };
  // Every other way out inside the app asks too: the sidebar, the top bar, a link in the page. Caught before React
  // sees the click (capture, on the document), so the link does not navigate; a new tab or another site is left alone.
  useEffect(() => {
    if (!dirty) return undefined;
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty]);

  // The saved reel link fills the form once; after that the form is the person's until they save.
  const fillFrom = (d) => { setTitle(d.title); setReelUrl(d.reelUrl || ''); setPieces(d.pieces); };
  useEffect(() => {
    if (!isNew && existing.data && !loaded) { fillFrom(existing.data); setLoaded(true); }
  }, [isNew, existing.data, loaded]);
  useEffect(() => { if (isNew && next.data?.title && !title) setTitle(next.data.title); }, [isNew, next.data, title]);

  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const search = usePieceSearch(debounced, { enabled: manage, filter });

  const position = useMemo(() => new Map(pieces.map((p, i) => [p.productId, i + 1])), [pieces]);
  const change = (fn) => { setPieces(fn); setDirty(true); };
  const toggle = (p) => change(list => list.some(x => x.productId === p.productId)
    ? list.filter(x => x.productId !== p.productId)
    : list.length >= MAX ? list : [...list, { ...p, colour: p.colours?.[0] ?? null }]);
  const moveTo = (from, to) => change(list => { if (to < 0 || to >= list.length || from === to) return list; const out = [...list]; const [x] = out.splice(from, 1); out.splice(to, 0, x); return out; });
  const drop = (i) => change(list => list.filter((_, k) => k !== i));
  const setColour = (i, colour) => change(list => list.map((p, k) => (k === i ? { ...p, colour } : p)));

  if (overview.isLoading || (!isNew && existing.isLoading)) return <PageLoader />;
  if (!isNew && existing.isError) {
    return (
      <div className="rl-page"><style>{RL_CSS}</style>
        <div className="rl-card"><h2 style={{ marginTop: 0 }}>This reel link is not here</h2><p className="rl-note">{existing.error?.message || 'It may have been deleted.'}</p>
          <Link className="btn-secondary" style={{ marginTop: 12, display: 'inline-flex' }} to="/reel-links">Back to reel links</Link></div>
      </div>
    );
  }
  if (isNew && !manage) return <div className="rl-page"><div className="rl-card">You cannot make reel links. Ask the shop owner.</div></div>;

  const saving = create.isPending || update.isPending;
  const save = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const body = { title, reelUrl, pieces: pieces.map(p => ({ productId: p.productId, colour: p.colour })) };
    try {
      if (isNew) {
        const made = await create.mutateAsync(body);
        setDirty(false);
        toast.success('Reel link saved. Copy the link on the right.');
        navigate(`/reel-links/${made.id}`, { replace: true });
      } else {
        const saved = await update.mutateAsync(body);
        setPieces(saved.pieces); setDirty(false);
        toast.success('Changes saved. The link stays the same.');
      }
    } catch (e) { toast.error(e?.message || 'The reel link could not be saved.'); }
    finally { inFlight.current = false; }
  };
  const discard = () => { if (existing.data) fillFrom(existing.data); else { setPieces([]); setReelUrl(''); setTitle(next.data?.title ?? ''); } setDirty(false); };
  const switchTo = async (on) => {
    try { await switcher.mutateAsync(on); toast.success(on ? 'Reel link switched on' : 'Reel link switched off'); }
    catch (e) { toast.error(e?.message || 'That did not work. Try again.'); }
  };

  const link = !isNew ? existing.data : null;
  const found = search.data ?? [];
  const full = pieces.length >= MAX;

  return (
    <div className="rl-page">
      <style>{RL_CSS}</style>
      <header className="rl-head">
        <div>
          <Link to="/reel-links" onClick={(e) => { e.preventDefault(); leave('/reel-links'); }} className="rl-crumb"><ArrowLeft size={14} /> Reel links</Link>
          <h1>{isNew ? 'New reel link' : link.title}</h1>
        </div>
        {manage && (
          <div className="rl-row-actions">
            {dirty && <span className="rl-unsaved">Changes not saved</span>}
            {!isNew && dirty && <button type="button" className="btn-secondary" onClick={discard}>Discard</button>}
            {isNew && <button type="button" className="btn-secondary" onClick={() => leave('/reel-links')}>Cancel</button>}
            <button type="button" className="btn-primary" disabled={saving || (!isNew && !dirty)} onClick={save}>{saving ? 'Saving…' : isNew ? 'Save and get link' : 'Save changes'}</button>
          </div>
        )}
      </header>

      <div className={`rl-studio${manage ? '' : ' view'}`}>
        {manage ? (
          <section className="rl-card rl-a-pick" aria-label="Pick the pieces in the reel">
            <p className="rl-colh">1. Pick the pieces in the reel</p>
            <input className="input-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, product code or SKU, or scan a barcode" aria-label="Search pieces" />
            <div className="rl-chips" role="group" aria-label="Show">
              {FILTERS.map(f => <button key={f.label} type="button" className={`rl-chip${filter === f.key ? ' on' : ''}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>)}
            </div>
            {full && <p className="rl-warn" style={{ margin: '10px 0 0' }}>A reel link holds up to {MAX} pieces. Tap a chosen piece to take it out.</p>}
            {search.isLoading ? <p className="rl-note" style={{ marginTop: 14 }}>Finding pieces…</p>
              : found.length === 0 && !pieces.length ? <p className="rl-note" style={{ marginTop: 14 }}>{debounced ? `No published pieces match "${debounced}".` : filter ? 'No published pieces here yet.' : 'No published pieces yet. Publish a product to put it in a reel.'}</p>
              : (
                <div className="rl-pick" aria-live="polite">
                  {/* The chosen pieces stay in view even when the search moves on, so they can be taken out here too. */}
                  {[...pieces.filter(p => !found.some(f => f.productId === p.productId)), ...found].map(p => {
                    const n = position.get(p.productId);
                    const blocked = !n && full;
                    return (
                      <button type="button" key={p.productId} className={`rl-tile${n ? ' in' : ''}${blocked ? ' full' : ''}`} disabled={blocked}
                        aria-pressed={!!n} aria-label={`${p.title}${n ? `, number ${n} in the reel` : ''}`} onClick={() => toggle(p)}>
                        <span className="ph" style={{ display: 'block' }}>
                          <Thumb src={p.photo} size="lg" />
                          {n && <span className="n">{n}</span>}
                          {!(p.inStock > 0) && <span className="so">Out of stock</span>}
                        </span>
                        <span className="cap" style={{ display: 'block' }}>{p.title}<small>{priceText(p)}</small></span>
                      </button>
                    );
                  })}
                </div>
              )}
          </section>
        ) : null}

        <section className="rl-card rl-a-order" aria-label="The reel's pieces in order">
          <p className="rl-colh">{manage ? '2. ' : ''}Order them as they appear ({pieces.length} of {MAX})</p>
          {pieces.length === 0 ? <p className="rl-note" style={{ marginBottom: 14 }}>No pieces yet. Tap the pieces the reel shows{manage ? ' on the left' : ''}.</p> : (
            <div style={{ marginBottom: 8 }}>
              {pieces.map((p, i) => (
                <div key={p.productId} className={`rl-line${dragFrom === i ? ' drag' : ''}${dragOver === i && dragFrom !== i ? ' over' : ''}`}
                  draggable={manage} onDragStart={() => setDragFrom(i)} onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                  onDragOver={(e) => { if (dragFrom === null) return; e.preventDefault(); setDragOver(i); }}
                  onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) moveTo(dragFrom, i); setDragFrom(null); setDragOver(null); }}>
                  <span className="rl-grip" aria-hidden="true">{manage && <GripVertical size={16} />}</span>
                  <span className="rl-line-ph"><Thumb src={p.photo} size="sm" /><span className="rl-num" aria-hidden="true">{i + 1}</span></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="rl-line-name" title={p.title}>{p.title}</div>
                    <div className="rl-line-sub">
                      {priceText(p)} · {stockText(p)}
                      {/* One colour (or one chosen elsewhere): said on the same line. More than one: picked below. */}
                      {!(p.colours?.length > 1 && manage) && (p.colour || p.colours?.[0]) ? ` · ${p.colour || p.colours[0]}` : ''}
                    </div>
                    {p.hidden ? <div className="rl-warn rl-line-sub">Not shown to shoppers: {p.hidden.toLowerCase()}.</div>
                      : !(p.inStock > 0) ? <div className="rl-warn rl-line-sub">Sold out. Shoppers see it last, greyed.</div> : null}
                    {p.colours?.length > 1 && manage && (
                      <div className="rl-colour">
                        <Select aria-label={`Colour of ${p.title}`} value={p.colour ?? ''} onChange={(e) => setColour(i, e.target.value || null)}>
                          {p.colours.map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>
                      </div>
                    )}
                  </div>
                  {manage && (
                    <div className="rl-order">
                      <button type="button" className="rl-icon-btn" aria-label={`Move ${p.title} up`} disabled={i === 0} onClick={() => moveTo(i, i - 1)}><ArrowUp size={15} /></button>
                      <button type="button" className="rl-icon-btn" aria-label={`Move ${p.title} down`} disabled={i === pieces.length - 1} onClick={() => moveTo(i, i + 1)}><ArrowDown size={15} /></button>
                      <button type="button" className="rl-icon-btn" aria-label={`Remove ${p.title}`} onClick={() => drop(i)}><X size={15} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <label className="rl-field" style={{ marginTop: 14 }}><span>Title the shopper sees</span>
            <input className="input-field" value={title} maxLength={80} disabled={!manage} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} placeholder="Reel 12: Diwali silk edit" />
          </label>
          <label className="rl-field" style={{ marginBottom: 0 }}><span>Instagram reel address (optional)</span>
            <div className="rl-urlrow">
              <input className="input-field" value={reelUrl} disabled={!manage} onChange={(e) => { setReelUrl(e.target.value); setDirty(true); }} placeholder="https://www.instagram.com/reel/..." />
              {instagramPlayer(reelUrl) && <button type="button" className="btn-secondary" onClick={(e) => { e.preventDefault(); setPlaying(true); }}>Play reel</button>}
            </div>
          </label>
          {/* What the address does, in words (17 Nov: shoppers get a "Watch reel" link to Instagram). */}
          <p className="rl-note" style={{ margin: '6px 0 0' }}>
            {reelUrl && !instagramPlayer(reelUrl) ? 'Paste the reel\'s Instagram address (instagram.com/reel/...) to play it here and give shoppers a "Watch reel" link.'
              : 'Plays here with "Play reel". Shoppers on the link\'s page get a "Watch reel" button that opens it on Instagram.'}
          </p>
          {playing && <ReelVideoDialog reelUrl={reelUrl} title={title} onClose={() => setPlaying(false)} />}
        </section>

        <aside className="rl-sticky rl-a-side">
          <PhonePreview shop={overview.data} title={title} pieces={pieces} />
          {link ? <SharePanel link={link} manage={manage} busy={switcher.isPending || remove.isPending} onSwitch={switchTo} onDelete={() => setConfirmDelete(true)} onQr={() => setQrOpen(true)} />
            : <div className="rl-card"><b>Link and QR code</b><p className="rl-note" style={{ marginTop: 4 }}>Save to get this reel's link, its QR code and a caption line to copy.</p></div>}
        </aside>
      </div>

      <QrDialog url={qrOpen && link ? (link.shortUrl || link.pageUrl) : null} name={link?.code} title={link?.title} onClose={() => setQrOpen(false)} />
      <ConfirmModal
        isOpen={!!leaveTo}
        onClose={() => setLeaveTo(null)}
        title="Leave without saving?"
        message="Your changes to this reel link will be lost."
        confirmText="Leave"
        confirmStyle="danger"
        onConfirm={() => navigate(leaveTo)}
      />
      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this reel link?"
        message="It goes from your list and your bio page. Anyone who opens the link sees that the look is no longer available, with your new arrivals."
        confirmText="Delete"
        confirmStyle="danger"
        onConfirm={async () => {
          try { await remove.mutateAsync(id); toast.success('Reel link deleted'); navigate('/reel-links', { replace: true }); }
          catch (e) { toast.error(e?.message || 'It could not be deleted.'); throw e; }
        }}
      />
    </div>
  );
}
