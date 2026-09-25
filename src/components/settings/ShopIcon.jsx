import React, { useRef, useState } from 'react';
import { Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSetShopIcon, useClearShopIcon } from '../../hooks/useOnlineShop';
import ConfirmModal from '../ConfirmModal';

/**
 * The little square the browser puts in its tab.
 *
 * Its own picture, separate from the logo, because the two want different things. A logo is
 * usually a WORDMARK -- the shop's name set in type, wide and short -- which is exactly right at
 * the top of the page and unreadable at sixteen pixels, where the letters turn to a smear. An icon
 * wants one mark: a monogram, a motif, a single strong shape.
 *
 * The preview shows it at the size it will really be used. A 240px picture of a logo always looks
 * fine; the whole point of this screen is to let somebody see, before their customers do, that
 * their beautiful wordmark has become a grey smudge in the tab.
 */

const MAX_BYTES = 15 * 1024 * 1024;

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('That file could not be read.'));
  r.readAsDataURL(file);
});

const label = { display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' };

/** The icon as a browser will show it, beside a strip of tab to give the size some meaning. */
function TabPreview({ src, name }) {
  // Fills its 210px column so the bar underneath is exactly as wide as the tab sitting on it;
  // inline-flex made the chip shrink to its text and the bar stick out past it.
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      padding: '6px 12px 6px 9px', borderRadius: '8px 8px 0 0',
      background: 'var(--bg-dark)', border: '1px solid var(--border-light)', borderBottom: 'none',
      width: '210px', boxSizing: 'border-box'
    }}>
      {src
        ? <img src={src} alt="" width={16} height={16} style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }} />
        : <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: 'var(--border-light)', flexShrink: 0 }} />}
      <span style={{
        fontSize: '12px', color: 'var(--text-secondary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }}>
        {name || 'Your shop'}
      </span>
    </div>
  );
}

export default function ShopIcon({ shop }) {
  const set = useSetShopIcon();
  const clear = useClearShopIcon();
  const fileRef = useRef(null);
  const [asking, setAsking] = useState(false);

  const working = set.isPending || clear.isPending;
  // What the tab shows today: the shop's own icon if it set one, otherwise its logo -- the same
  // order the shop page itself uses, so this preview cannot disagree with the real thing.
  const showing = shop?.iconUrl || shop?.logoUrl || null;
  const isOwnIcon = Boolean(shop?.iconUrl);

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Said here, before a long upload; the server checks again.
    if (file.size > MAX_BYTES) return toast.error('That picture is larger than 15 MB. Choose a smaller one.');
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      return toast.error('This is an iPhone HEIC photo. Share it as a JPEG (or set the camera to "Most Compatible") and choose it again.');
    }
    try { set.mutate(await readAsDataUrl(file)); }
    catch (err) { toast.error(err?.message || 'That picture could not be read.'); }
  };

  return (
    <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
      <span style={label}>Your shop&rsquo;s icon</span>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
        The small square a browser shows in its tab, in a bookmark, and on a phone&rsquo;s home
        screen. Use one mark rather than your name in words &mdash; a wide logo shrinks to a smudge
        at this size. Square looks best. Leave it empty and your logo is used.
      </p>

      {/*
       * Two rows on purpose: the two previews together, the buttons underneath.
       *
       * All three were on one line, which fitted -- until an icon was set and a Remove button
       * appeared beside Change. Measured: the column this sits in is 544px and the three come to
       * 578px with two buttons, so the buttons wrapped and the one the owner had just used jumped
       * a line down and 300px left under their cursor. Narrower screens would have wrapped it
       * whatever I did, so the honest fix is to stop pretending it is one row.
       *
       * The previews are centred on each other rather than aligned to their bottoms: the tab chip
       * has a caption under it and the square does not, so flex-end lined the square up with the
       * words instead of with the chip, which is what looked crooked.
       */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto' }}>
          <TabPreview src={showing} name={shop?.displayName} />
          <div style={{ height: '2px', background: 'var(--border-light)', width: '210px' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {isOwnIcon ? 'Your icon' : showing ? 'Your logo, for now' : 'Nothing yet'}
          </div>
        </div>

        {/*
         * The same picture large, so a shop can see what it actually chose. Always drawn, dashed
         * when empty: rendered only when an icon existed, it appeared out of nowhere and shoved
         * everything beside it sideways the moment one was chosen.
         */}
        <div style={{
          width: '64px', height: '64px', flex: '0 0 auto', borderRadius: '10px',
          border: `1px ${showing ? 'solid' : 'dashed'} var(--border-light)`,
          background: 'var(--bg-dark)', padding: '6px', boxSizing: 'border-box',
          display: 'grid', placeItems: 'center'
        }}>
          {showing
            ? <img src={showing} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
            : <ImageIcon size={20} color="var(--text-muted)" />}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
          onChange={choose} style={{ display: 'none' }} />
        <button type="button" className="btn-secondary" disabled={working}
          onClick={() => fileRef.current?.click()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
          {set.isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {isOwnIcon ? 'Change the icon' : 'Choose an icon'}
        </button>
        {isOwnIcon && (
          <button type="button" className="btn-secondary" disabled={working}
            onClick={() => setAsking(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: 'var(--danger, #dc2626)' }}>
            <Trash2 size={15} /> Remove
          </button>
        )}
      </div>

      {!showing && (
        <p style={{
          fontSize: '12px', color: 'var(--text-muted)', margin: '12px 0 0',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <ImageIcon size={14} /> Without one, customers see the browser&rsquo;s blank mark in the tab.
        </p>
      )}

      <ConfirmModal
        isOpen={asking}
        onClose={() => setAsking(false)}
        onConfirm={() => clear.mutateAsync()}
        title="Remove the icon?"
        message="Your logo is used in the tab instead, which is still better than nothing. You can choose a new icon at any time."
        confirmText="Remove it"
        confirmStyle="danger"
      />
    </div>
  );
}
