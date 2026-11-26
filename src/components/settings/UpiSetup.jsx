import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { useUpiSettings, useSaveUpi } from '../../hooks/useOnlineShop';

/**
 * Settings → Payments → "UPI in your online shop" (26 Nov 2026, PLAN-upi-mockups.html, approved).
 *
 * HOW the shop takes UPI. WHETHER shoppers see it is the "Pay by UPI" tick under How customers may pay, in Settings →
 * Online shop, beside Cash on delivery and Pay now -- the same split as Razorpay (connected here, switched on there).
 *   Straight to my UPI ID   no fee; the shopper types the payment's reference and the owner confirms it on the order.
 *   Through Razorpay        confirms itself; Razorpay's fee. Only when Razorpay is connected with working keys.
 */
const hint = { fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0', lineHeight: 1.45 };
const label = { display: 'block', fontSize: '12px', color: 'var(--text-secondary)', margin: '12px 0 4px' };
const tag = { display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '99px', marginLeft: '6px', background: 'var(--bg-hover)', color: 'var(--accent-primary, #164B1E)' };

function Choice({ on, disabled, onPick, title, badge, children }) {
  return (
    <div role="radio" aria-checked={on} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onPick()} onKeyDown={(e) => { if (!disabled && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); onPick(); } }}
      style={{
        display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', marginTop: '8px', borderRadius: '10px',
        border: `1px solid ${on ? 'var(--accent-primary, #164B1E)' : 'var(--border-light)'}`,
        background: on ? 'var(--bg-hover)' : 'transparent', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1
      }}>
      <span aria-hidden="true" style={{ width: '16px', height: '16px', borderRadius: '50%', flex: 'none', marginTop: '2px', border: '1.5px solid var(--accent-primary, #164B1E)', background: on ? 'var(--accent-primary, #164B1E)' : 'transparent', boxShadow: on ? 'inset 0 0 0 3px var(--bg-card, #fff)' : 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{title}{badge ? <span style={tag}>{badge}</span> : null}</div>
        {children}
      </div>
    </div>
  );
}

export default function UpiSetup({ isOwner }) {
  const { data: upi, isLoading } = useUpiSettings();
  const save = useSaveUpi();
  const [way, setWay] = useState('DIRECT');
  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('');
  const [problem, setProblem] = useState(null);

  // The saved values, once loaded (and again after a save).
  useEffect(() => {
    if (!upi) return;
    setWay(upi.way || 'DIRECT');
    setUpiId(upi.upiId || '');
    setUpiName(upi.upiName || '');
  }, [upi]);

  if (isLoading || !upi) return <div style={{ ...hint, display: 'flex', gap: '6px', alignItems: 'center' }}><Loader2 size={14} className="animate-spin" /> Loading UPI…</div>;
  if (!upi.hasShop) {
    return <p style={hint}>Set up your online shop first, in <Link to="/settings?section=ONLINE_SHOP">Settings → Online shop</Link>. Then choose how it takes UPI here.</p>;
  }

  const looksRight = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(upiId.trim());
  const changed = way !== upi.way || (way === 'DIRECT' && (upiId.trim() !== (upi.upiId || '') || upiName.trim() !== (upi.upiName || '')));
  const canSave = isOwner && changed && !save.isPending && (way === 'RAZORPAY' ? upi.razorpayReady : looksRight && upiName.trim().length >= 2);

  const submit = () => {
    setProblem(null);
    save.mutate({ way, upiId: upiId.trim(), upiName: upiName.trim() }, {
      onSuccess: (r) => toast.success(way === 'RAZORPAY' ? 'UPI now goes through your Razorpay.' : r?.holder ? `Saved. UPI says this ID belongs to ${r.holder}.` : 'Saved. Scan the ₹1 test QR to check the name.'),
      onError: (e) => setProblem(e?.response?.data?.message || e?.message || 'That could not be saved. Please try again.')
    });
  };

  return (
    <div>
      <div style={{ fontSize: '14px', fontWeight: 600 }}>UPI in your online shop</div>
      <p style={hint}>Shoppers pay by scanning a QR or tapping their UPI app. Choose how.</p>

      <div role="radiogroup" aria-label="How your online shop takes UPI">
        <Choice on={way === 'DIRECT'} disabled={!isOwner} onPick={() => setWay('DIRECT')} title="Straight to my UPI ID" badge="No fee">
          <p style={hint}>Money goes to your bank at once. The shopper types the payment's 12-digit reference, and you press <b>Payment received</b> on the order after checking your bank app. Orders are not sent until you do.</p>
          {way === 'DIRECT' && (
            <div onClick={(e) => e.stopPropagation()}>
              <label style={label} htmlFor="upi-id">Your UPI ID</label>
              <input id="upi-id" className="input-field" value={upiId} disabled={!isOwner} onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okhdfc" autoComplete="off" style={{ width: '100%' }} />
              {upiId.trim() && !looksRight && <p style={{ ...hint, color: 'var(--accent-danger, #b42318)' }}>A UPI ID is written like name@okhdfc or 98480xxxxx@ybl.</p>}
              <label style={label} htmlFor="upi-name">Name shoppers see in their UPI app</label>
              <input id="upi-name" className="input-field" value={upiName} disabled={!isOwner} onChange={(e) => setUpiName(e.target.value)}
                placeholder="Your shop's name" maxLength={50} style={{ width: '100%' }} />
              {upi.testLink && !changed && upi.way === 'DIRECT' && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px', padding: '10px', borderRadius: '10px', background: 'var(--bg-hover)' }}>
                  <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', lineHeight: 0 }}><QRCodeSVG value={upi.testLink} size={72} /></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Try it on your own phone</div>
                    <p style={hint}>Scan this ₹1 test QR: your UPI app shows the name this UPI ID belongs to. Nothing is charged until you pay.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Choice>
        <Choice on={way === 'RAZORPAY'} disabled={!isOwner || !upi.razorpayReady} onPick={() => setWay('RAZORPAY')} title="UPI through Razorpay" badge="Confirms itself">
          <p style={hint}>
            {upi.razorpayReady
              ? 'Razorpay\'s window opens showing UPI only. The order turns paid by itself when the money arrives. Razorpay charges its fee on each payment.'
              : 'Connect your Razorpay account above first. Then UPI can go through it and confirm itself.'}
          </p>
        </Choice>
      </div>

      {problem && <p role="alert" style={{ ...hint, color: 'var(--accent-danger, #b42318)', marginTop: '8px' }}>{problem}</p>}
      {isOwner ? (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" disabled={!canSave} onClick={submit} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {save.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Save
          </button>
          <span style={hint}>
            {upi.on && upi.ready
              ? 'Pay by UPI is on at your checkout.'
              : upi.ready
                ? <>Ready. Tick <b>Pay by UPI</b> under How customers may pay, in <Link to="/settings?section=ONLINE_SHOP">Settings → Online shop</Link>, to offer it.</>
                : 'Shoppers see Pay by UPI once this is saved and ticked in Settings → Online shop.'}
          </span>
        </div>
      ) : (
        <p style={{ ...hint, marginTop: '10px' }}>Only the account owner can change how the shop takes UPI.</p>
      )}
    </div>
  );
}
