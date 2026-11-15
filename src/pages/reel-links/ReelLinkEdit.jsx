import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import { ArrowDown, ArrowLeft, ArrowUp, X } from 'lucide-react';
import {
  useReelLink, useReelOverview, useNextReelTitle, usePieceSearch,
  useCreateReelLink, useUpdateReelLink, useSwitchReelLink, useDeleteReelLink
} from '../../hooks/useReelLinks';
import { usePermission } from '../../hooks/usePermission';
import PageLoader from '../../components/PageLoader';
import ConfirmModal from '../../components/ConfirmModal';
import Select from '../../components/common/Select';
import { RL_CSS, Thumb, copy, priceText, stockText } from './shared';

const MAX = 12;

/** The shopper's page beside the editor: logo, title, the pieces in order with sold-out ones last and greyed. */
function PhonePreview({ shop, title, pieces }) {
  const shown = [...pieces.filter(p => p.inStock > 0), ...pieces.filter(p => !(p.inStock > 0))].filter(p => !p.hidden);
  return (
    <div>
      <div className="rl-sub" style={{ marginBottom: 8 }}>What the shopper sees</div>
      <div className="rl-phone" style={{ '--rl-accent': shop?.accent || undefined }}>
        <div className="rl-phone-head">
          {shop?.logoUrl ? <img className="rl-phone-logo" src={shop.logoUrl} alt="" /> : <span className="rl-phone-logo">{(shop?.shopName || 'S').slice(0, 2).toUpperCase()}</span>}
          <span>{shop?.shopName || 'Your shop'}</span>
        </div>
        <div className="rl-phone-body">
          <p className="rl-phone-title">{title || 'Title'}</p>
          <p className="rl-phone-sub">{shown.length} {shown.length === 1 ? 'piece' : 'pieces'} from our reel</p>
          {shown.length === 0
            ? <p className="rl-phone-sub">Add pieces to see them here.</p>
            : (
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

/** After saving: the link, where it works on Instagram, a caption line and a QR code. */
function SharePanel({ link, manage, onSwitch, onDelete, busy }) {
  const qrWrap = useRef(null);
  const url = link.shortUrl || link.pageUrl;
  // Only a title that says "Reel 12" has a number to put in the caption; digits elsewhere in a title are not one.
  const number = (/\breel\s+(\d+)\b/i.exec(link.title) || [])[1];
  const caption = number ? `Shop this look: link in bio, reel ${number}.` : 'Shop this look: link in bio.';
  const downloadQr = () => {
    const canvas = qrWrap.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `reel-link-${link.code}-qr.png`;
    a.click();
  };
  return (
    <div className="rl-card">
      <div className="rl-share">
        <div>
          <div className="rl-field"><span>Link for this reel</span>
            {url ? (
              <div className="rl-row-actions"><span className="rl-url">{url.replace(/^https?:\/\//, '')}</span>
                <button className="btn-primary" onClick={() => copy(url)}>Copy link</button>
                <a className="btn-secondary" href={link.pageUrl || url} target="_blank" rel="noreferrer">Open page</a>
              </div>
            ) : <span className="rl-warn">The link is not ready yet. Choose your online shop address in Settings, Online shop.</span>}
          </div>
          {!link.active && <p className="rl-warn" style={{ margin: '0 0 12px' }}>This link is switched off. Shoppers see "This look is no longer available" and your new arrivals.</p>}
          <div className="rl-field"><span>Where it works</span></div>
          <div className="rl-where">
            <div><b>Story</b><p>Add a link sticker to a story that shares the reel. People tap the sticker.</p></div>
            <div><b>Instagram bio</b><p>Your bio link already lists this reel. Instagram does not let people tap a link written in a caption.</p></div>
            <div><b>WhatsApp and direct messages</b><p>Paste the link. The preview shows the first piece's photo and the title.</p></div>
          </div>
          <div className="rl-field" style={{ marginTop: 14 }}><span>Caption line</span>
            <div className="rl-strip" style={{ padding: '10px 12px' }}><span>{caption}</span><button className="btn-secondary" onClick={() => copy(caption, 'Caption')}>Copy</button></div>
          </div>
          {manage && (
            <div className="rl-row-actions" style={{ marginTop: 6 }}>
              <button className="btn-secondary" disabled={busy} onClick={() => onSwitch(!link.active)}>{link.active ? 'Switch off' : 'Switch on'}</button>
              <button className="btn-secondary" disabled={busy} onClick={onDelete} style={{ color: 'var(--accent-danger)' }}>Delete</button>
            </div>
          )}
        </div>
        {url && (
          <div>
            <div className="rl-field"><span>QR code</span></div>
            <div className="rl-qr" ref={qrWrap}><QRCodeCanvas value={url} size={148} level="M" marginSize={1} /></div>
            <div style={{ marginTop: 10 }}><button className="btn-secondary" onClick={downloadQr}>Download QR</button></div>
            <p className="rl-note" style={{ marginTop: 8 }}>Opened by {link.opened.toLocaleString('en-IN')} {link.opened === 1 ? 'person' : 'people'}</p>
          </div>
        )}
      </div>
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
  const [pieces, setPieces] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Read in the same tick it is set: a double-click delivers both clicks before React re-renders a disabled button.
  const inFlight = useRef(false);

  // Unsaved changes: the browser asks before the tab is closed or reloaded, and the page's own ways out ask too.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const leave = (to) => {
    if (dirty && !window.confirm('Leave without saving? Your changes to this reel link will be lost.')) return;
    navigate(to);
  };

  // The saved reel link fills the form once; after that the form is the person's until they save.
  useEffect(() => {
    if (!isNew && existing.data && !loaded) {
      setTitle(existing.data.title); setReelUrl(existing.data.reelUrl || ''); setPieces(existing.data.pieces); setLoaded(true);
    }
  }, [isNew, existing.data, loaded]);
  useEffect(() => { if (isNew && next.data?.title && !title) setTitle(next.data.title); }, [isNew, next.data, title]);

  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const search = usePieceSearch(debounced, { enabled: manage });

  const chosen = useMemo(() => new Set(pieces.map(p => p.productId)), [pieces]);
  const change = (fn) => { setPieces(fn); setDirty(true); };
  const add = (p) => change(list => (list.length >= MAX || list.some(x => x.productId === p.productId) ? list : [...list, { ...p, colour: p.colours?.[0] ?? null }]));
  const move = (i, by) => change(list => { const out = [...list]; const [x] = out.splice(i, 1); out.splice(i + by, 0, x); return out; });
  const drop = (i) => change(list => list.filter((_, k) => k !== i));
  const setColour = (i, colour) => change(list => list.map((p, k) => (k === i ? { ...p, colour } : p)));

  if (overview.isLoading || (!isNew && existing.isLoading)) return <PageLoader />;
  if (!isNew && existing.isError) {
    return (
      <div className="rl-page"><style>{RL_CSS}</style>
        <div className="rl-card rl-empty"><h2>This reel link is not here</h2><p>{existing.error?.message || 'It may have been deleted.'}</p>
          <Link className="btn-secondary" to="/reel-links">Back to reel links</Link></div>
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
        toast.success('Reel link saved. Copy the link below.');
        navigate(`/reel-links/${made.id}`, { replace: true });
      } else {
        const saved = await update.mutateAsync(body);
        setPieces(saved.pieces); setDirty(false);
        toast.success('Changes saved. The link stays the same.');
      }
    } catch (e) { toast.error(e?.message || 'The reel link could not be saved.'); }
    finally { inFlight.current = false; }
  };
  const switchTo = async (on) => {
    try { await switcher.mutateAsync(on); toast.success(on ? 'Reel link switched on' : 'Reel link switched off'); }
    catch (e) { toast.error(e?.message || 'That did not work. Try again.'); }
  };

  const link = !isNew ? existing.data : null;
  const results = (search.data ?? []).filter(p => !chosen.has(p.productId));

  return (
    <div className="rl-page">
      <style>{RL_CSS}</style>
      <header className="rl-head">
        <div>
          <Link to="/reel-links" onClick={(e) => { e.preventDefault(); leave('/reel-links'); }} className="rl-sub" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ArrowLeft size={14} /> Reel links</Link>
          <h1>{isNew ? 'New reel link' : link.title}</h1>
        </div>
      </header>

      {link && <SharePanel link={link} manage={manage} busy={switcher.isPending || remove.isPending} onSwitch={switchTo} onDelete={() => setConfirmDelete(true)} />}

      <div className="rl-card rl-two">
        <div>
          <label className="rl-field"><span>Title (the shopper sees it)</span>
            <input className="input-field" value={title} maxLength={80} disabled={!manage} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} placeholder="Reel 12: Diwali silk edit" />
          </label>
          <label className="rl-field"><span>Instagram reel address (optional, only for you)</span>
            <input className="input-field" value={reelUrl} disabled={!manage} onChange={(e) => { setReelUrl(e.target.value); setDirty(true); }} placeholder="https://www.instagram.com/reel/..." />
          </label>

          <div className="rl-field"><span>Pieces in the reel ({pieces.length} of {MAX})</span></div>
          {pieces.length === 0 ? <p className="rl-note" style={{ marginBottom: 14 }}>No pieces yet. Search below and add the pieces the reel shows.</p> : (
            <div className="rl-picked" style={{ marginBottom: 16 }}>
              {pieces.map((p, i) => (
                <div className="rl-piece" key={p.productId}>
                  <Thumb src={p.photo} />
                  <div style={{ minWidth: 0 }}>
                    <div className="rl-title">{p.title}</div>
                    <div className="rl-sub">{p.productCode} · {priceText(p)} · {stockText(p)}</div>
                    {p.hidden ? <div className="rl-warn">Not shown to shoppers: {p.hidden.toLowerCase()}.</div>
                      : !(p.inStock > 0) ? <div className="rl-warn">Out of stock. Shoppers will see it as sold out.</div> : null}
                  </div>
                  <div className="rl-piece-colour">
                    {p.colours?.length > 1 && manage ? (
                      <Select aria-label={`Colour of ${p.title}`} value={p.colour ?? ''} onChange={(e) => setColour(i, e.target.value || null)}>
                        {p.colours.map(c => <option key={c} value={c}>{c}</option>)}
                      </Select>
                    ) : <span className="rl-sub">{p.colour || p.colours?.[0] || 'One colour'}</span>}
                  </div>
                  {manage && (
                    <div className="rl-order">
                      <button type="button" className="rl-icon-btn" aria-label={`Move ${p.title} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
                      <button type="button" className="rl-icon-btn" aria-label={`Move ${p.title} down`} disabled={i === pieces.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
                      <button type="button" className="rl-icon-btn" aria-label={`Remove ${p.title}`} onClick={() => drop(i)}><X size={16} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {manage && (
            <>
              <label className="rl-field" style={{ marginBottom: 0 }}><span>Add pieces</span>
                <input className="input-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, product code or SKU, or scan a barcode" disabled={pieces.length >= MAX} />
              </label>
              {pieces.length >= MAX ? <p className="rl-warn">A reel link can hold up to {MAX} pieces.</p> : (
                <div className="rl-results" aria-live="polite">
                  {search.isLoading ? <p className="rl-note" style={{ padding: 12 }}>Searching…</p>
                    : results.length === 0 ? <p className="rl-note" style={{ padding: 12 }}>{debounced ? `No published pieces match "${debounced}".` : 'No published pieces yet.'}</p>
                    : results.map(p => (
                      <div className="rl-result" key={p.productId}>
                        <Thumb src={p.photo} size="sm" />
                        <div style={{ minWidth: 0 }}><div className="rl-title" style={{ fontSize: 14 }}>{p.title}</div><div className="rl-sub">{p.productCode} · {priceText(p)} · {stockText(p)}</div></div>
                        <button type="button" className="btn-secondary" onClick={() => add(p)}>Add</button>
                      </div>
                    ))}
                </div>
              )}
              <div className="rl-row-actions" style={{ marginTop: 16 }}>
                <button className="btn-primary" disabled={saving || (!isNew && !dirty)} onClick={save}>{saving ? 'Saving…' : isNew ? 'Save and get link' : 'Save changes'}</button>
                <button className="btn-secondary" onClick={() => leave('/reel-links')}>{isNew ? 'Cancel' : 'Back'}</button>
              </div>
            </>
          )}
        </div>
        <PhonePreview shop={overview.data} title={title} pieces={pieces} />
      </div>

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
