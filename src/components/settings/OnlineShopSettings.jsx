import React, { useEffect, useState } from 'react';
import { Globe, Check, Loader2, AlertTriangle, ExternalLink, Copy, Share2, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useOnlineShop, useChooseShopAddress, useSaveOnlineShop, useSetShopOpen } from '../../hooks/useOnlineShop';
import ShopBanners from './ShopBanners';
import { useLocationContext } from '../../contexts/LocationContext';

/**
 * Settings -> Online shop: the owner claims an address, says which stores sell online, and opens
 * the shop.
 *
 * The address is the part to be careful with, and the screen says so. Once the shop has been open
 * on an address it is kept for good -- customers may have scanned it off a poster or saved it from
 * a WhatsApp message that cannot be edited -- so the box stops being editable after the first
 * opening rather than failing later with a refusal the owner cannot act on.
 */

const card = { padding: '20px 22px', marginBottom: '16px' };
const h3 = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' };
const hint = { fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px' };
const label = { display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' };

export default function OnlineShopSettings() {
  const { data: shop, isLoading } = useOnlineShop();
  const { locations } = useLocationContext();
  const chooseAddress = useChooseShopAddress();
  const save = useSaveOnlineShop();
  const setOpen = useSetShopOpen();

  const [slug, setSlug] = useState('');
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!shop) return;
    setSlug(s => s || shop.slug || '');
    setForm(f => f ?? {
      displayName: shop.displayName ?? '',
      locationIds: shop.locationIds ?? [],
      hideOutOfStock: !!shop.hideOutOfStock,
      returnPolicy: shop.returnPolicy ?? '',
      grievanceName: shop.grievanceName ?? '',
      grievancePhone: shop.grievancePhone ?? '',
      grievanceEmail: shop.grievanceEmail ?? ''
    });
  }, [shop]);

  if (isLoading || !shop || !form) {
    return <div className="card" style={{ ...card, color: 'var(--text-muted)' }}><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const sellable = locations.filter(l => l.active);
  const toggleLocation = (id) =>
    set('locationIds', form.locationIds.includes(id) ? form.locationIds.filter(x => x !== id) : [...form.locationIds, id]);

  /**
   * The part of the address before the shop's own name.
   *
   * Taken from the address the server gave rather than written in here: on a test setup shops live
   * somewhere else entirely, and a box that says shop.scaleezy.com while the link underneath says
   * something different is a screen telling the owner something untrue.
   */
  const addressPrefix = shop.url
    ? shop.url.replace(/^https?:\/\//, '').replace(new RegExp(`${shop.slug}$`), '')
    : 'shop.scaleezy.com/';

  /**
   * A message an owner would actually send: their shop's name and the link, nothing salesy. They
   * can edit it in WhatsApp before sending, which is why it is short.
   */
  const shareHref = shop.url
    ? `https://wa.me/?text=${encodeURIComponent(`${shop.displayName || 'Our shop'} is online. Have a look: ${shop.url}`)}`
    : null;

  /**
   * Printing just the code, not the whole settings page. A new window rather than a print
   * stylesheet on this screen: the owner wants a card to stick by the till, and everything else
   * on this page -- their grievance email, their return policy -- has no business on it.
   */
  const printQr = () => {
    const svg = document.getElementById('shop-qr')?.innerHTML;
    if (!svg) return;
    const w = window.open('', '_blank', 'width=480,height=620');
    if (!w) { toast.error('Your browser stopped the print window. Allow pop-ups for this page.'); return; }
    w.document.write(
      `<title>${shop.displayName || 'Our shop'}</title>` +
      '<style>body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center;padding:36px 24px}' +
      'h1{font-size:20px;margin:0 0 4px}p{color:#555;margin:0 0 20px;font-size:13px}' +
      '.u{font-family:ui-monospace,monospace;font-size:13px;margin-top:16px;word-break:break-all}</style>' +
      `<h1>${shop.displayName || 'Our shop'}</h1><p>Point your phone here to see what we have</p>` +
      `${svg}<div class="u">${shop.url}</div>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(shop.url); toast.success('Address copied.'); }
    catch { toast.error('Could not copy it. Select the address and copy it by hand.'); }
  };

  return (
    <div>
      {/* ── The address ─────────────────────────────────────────────────────────────── */}
      <div className="card" style={card}>
        <h3 style={h3}><Globe size={16} /> Your shop's web address</h3>
        <p style={hint}>
          {shop.isLive
            ? 'Your shop is open at this address. It cannot be changed while the shop is open, because customers may have saved it or scanned it from a poster.'
            : 'Customers will open this to see your shop. Choose it carefully: once your shop has been open on an address, it is yours for good and cannot be swapped.'}
        </p>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: '1 1 320px', minWidth: 0 }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{addressPrefix}</span>
            <input className="input-field" value={slug} disabled={shop.isLive}
              onChange={(e) => setSlug(e.target.value)} placeholder="lakshmi-silks" aria-label="Your shop's web address"
              style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)' }} />
          </div>
          {!shop.isLive && (
            /* The server tidies "Lakshmi Silks" into "lakshmi-silks"; echo back what was
               actually saved, or the box keeps showing what is not the shop's address. */
            <button className="btn-secondary" disabled={!slug.trim() || chooseAddress.isPending}
              onClick={() => chooseAddress.mutate(slug, { onSuccess: (r) => setSlug(r.slug) })}>
              {shop.slug ? 'Change it' : 'Claim it'}
            </button>
          )}
        </div>

        {shop.url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
            <a href={shop.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              {shop.url} <ExternalLink size={13} />
            </a>
            <button className="btn-secondary" onClick={copy} style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Copy size={12} /> Copy
            </button>
          </div>
        ) : shop.slug ? (
          <p style={{ ...hint, marginTop: '12px', marginBottom: 0 }}>
            Shops are not switched on for ScaleEzy yet, so there is no address to open. Your name is saved.
          </p>
        ) : null}
      </div>

      {/* ── What the shop shows ─────────────────────────────────────────────────────── */}
      <div className="card" style={card}>
        <h3 style={h3}>What customers see</h3>
        <p style={hint}>Leave the name empty to use your shop's name from General Info.</p>

        <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div>
            <label style={label} htmlFor="os-name">Shop name</label>
            <input id="os-name" className="input-field" value={form.displayName} maxLength={60}
              onChange={(e) => set('displayName', e.target.value)} placeholder="Lakshmi Silks" style={{ width: '100%' }} />
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <span style={label}>Which stores sell online</span>
          <p style={{ ...hint, marginBottom: '8px' }}>
            Only the stock in these is offered. Nothing is sold online until you tick at least one.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {sellable.map(l => (
              <label key={l.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 12px', cursor: 'pointer',
                border: '1px solid var(--border-light)', borderRadius: '8px',
                background: form.locationIds.includes(l.id) ? 'var(--bg-hover)' : 'transparent'
              }}>
                <input type="checkbox" checked={form.locationIds.includes(l.id)} onChange={() => toggleLocation(l.id)} />
                <span style={{ fontSize: '13px' }}>{l.name} <span style={{ color: 'var(--text-muted)' }}>({l.code})</span></span>
              </label>
            ))}
            {sellable.length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Add a store in Stock Locations first.</span>}
          </div>
        </div>

        <label style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', marginTop: '16px', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.hideOutOfStock} onChange={(e) => set('hideOutOfStock', e.target.checked)}
            style={{ width: '16px', height: '16px', marginTop: '2px' }} />
          <span style={{ fontSize: '13px' }}>
            Hide pieces that are sold out
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Off: they still show, greyed, so customers see the range and can ask.
            </span>
          </span>
        </label>
      </div>

      {/* ── Banners ─────────────────────────────────────────────────────────────────
          Only once there is an address. Before that there is no shop for a banner to sit on,
          and a picture uploaded to nothing is work the owner would have to do again. */}
      {shop.slug ? <ShopBanners /> : null}

      {/* ── The shop is the seller ──────────────────────────────────────────────────── */}
      <div className="card" style={card}>
        <h3 style={h3}>Your details on the shop</h3>
        <p style={hint}>
          You are the seller, so the law asks for your details and someone to contact on every page
          (Consumer Protection (E-Commerce) Rules 2020). Your name, address and GSTIN come from
          General Info.
        </p>
        <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={label} htmlFor="os-gname">Who a customer contacts</label>
            <input id="os-gname" className="input-field" value={form.grievanceName} maxLength={80}
              onChange={(e) => set('grievanceName', e.target.value)} placeholder="Priya Reddy" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={label} htmlFor="os-gphone">Their phone</label>
            <input id="os-gphone" className="input-field" type="tel" value={form.grievancePhone} maxLength={20}
              onChange={(e) => set('grievancePhone', e.target.value)} placeholder="98480 22338" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={label} htmlFor="os-gemail">Their email</label>
            <input id="os-gemail" className="input-field" type="email" value={form.grievanceEmail} maxLength={120}
              onChange={(e) => set('grievanceEmail', e.target.value)} placeholder="shop@example.com" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <label style={label} htmlFor="os-returns">Your return policy, in your own words</label>
          <textarea id="os-returns" className="input-field" rows={3} value={form.returnPolicy} maxLength={4000}
            onChange={(e) => set('returnPolicy', e.target.value)}
            placeholder="Unworn pieces with the tag on can be returned within 7 days, with the bill."
            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button className="btn-primary" disabled={!shop.slug || save.isPending} onClick={() => save.mutate(form, { onSuccess: () => toast.success('Saved.') })}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* ── Sharing it ──────────────────────────────────────────────────────────────── */}
      {shop.isLive && shop.url && (
        <div className="card no-print" style={card}>
          <h3 style={h3}><Share2 size={16} /> Share your shop</h3>
          <p style={hint}>
            Send the link on WhatsApp, or print the code and put it by the till. A customer points
            their phone at it and your shop opens.
          </p>
          <div style={{ display: 'flex', gap: '22px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div id="shop-qr" style={{ padding: '12px', background: '#fff', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <QRCodeSVG value={shop.url} size={132} level="M" marginSize={0} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
              <a className="btn-primary" href={shareHref} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', textDecoration: 'none' }}>
                <Share2 size={15} /> Share on WhatsApp
              </a>
              <button className="btn-secondary" onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <Copy size={15} /> Copy the link
              </button>
              <button className="btn-secondary" onClick={printQr} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <Printer size={15} /> Print the code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Opening it ──────────────────────────────────────────────────────────────── */}
      <div className="card" style={card}>
        <h3 style={h3}>
          {shop.isLive ? <><Check size={16} color="var(--accent-success, #22c55e)" /> Your shop is open</> : 'Open your shop'}
        </h3>
        {shop.isLive ? (
          <>
            <p style={hint}>Customers can see it and order from you. Closing it tells anyone who opens the link that it is shut; it does not delete anything.</p>
            <button className="btn-secondary" disabled={setOpen.isPending} onClick={() => setOpen.mutate(false)}>Close the shop</button>
          </>
        ) : shop.missingBeforeLive?.length ? (
          <p style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            <AlertTriangle size={15} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>Before it can open, it needs {shop.missingBeforeLive.join(', and ')}.</span>
          </p>
        ) : (
          <>
            <p style={hint}>Nothing is shown to anybody until you press this.</p>
            <button className="btn-primary" disabled={setOpen.isPending} onClick={() => setOpen.mutate(true)}>Open my shop</button>
          </>
        )}
      </div>
    </div>
  );
}
