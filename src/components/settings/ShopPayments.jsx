import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Check, AlertTriangle, Copy, ExternalLink, Loader2, KeyRound, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useShopPayments, useSavePaymentKeys, useCheckPayments, useNewWebhookSecret, useDisconnectPayments,
  useOnlinePaymentActivity, useRefundOnline, useOnlineShop
} from '../../hooks/useOnlineShop';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../context/AuthContext';
import { holdsEverything } from '../../lib/authority';

/**
 * Settings -> Online shop -> Payments: the shop connects its OWN Razorpay account
 * (PLAN-online-shop-payments.md, "The keys screen is the product").
 *
 * A shopkeeper finding API keys in somebody else's dashboard is where online payments usually die,
 * so this screen does three things and nothing else: says exactly where each value is, checks the
 * keys the moment they are pasted, and says in one sentence what is working or what to fix.
 *
 * The key secret is typed here once and never shown again -- the server never sends it back. The
 * webhook secret is the other way round: WE make it, and it can only be handed over once, in the
 * answer to the save that created it. So it is held in this component's state only, never in the
 * query cache, and it is gone the moment the owner says they have copied it.
 */

const card = { padding: '20px 22px', marginBottom: '16px' };
const h3 = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' };
const hint = { fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px' };
const label = { display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' };
const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '12px', wordBreak: 'break-all' };
const steps = { margin: '6px 0 14px', paddingLeft: '18px', fontSize: '13px', lineHeight: 1.7 };
const row = { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' };

function copy(text, what) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success(`${what} copied.`),
    () => toast.error(`Could not copy -- select the ${what.toLowerCase()} and copy it by hand.`)
  );
}

function CopyLine({ value, what }) {
  return (
    <div style={{ ...row, flexWrap: 'nowrap', padding: '8px 10px', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'var(--bg-input)' }}>
      <span style={{ ...mono, flex: 1 }}>{value}</span>
      <button type="button" className="btn-secondary" onClick={() => copy(value, what)}
        style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <Copy size={13} /> Copy
      </button>
    </div>
  );
}

/** Green, amber or red, and the server's own sentence. */
function StatusLine({ account }) {
  const failed = account.status === 'FAILED';
  const test = !failed && account.mode === 'TEST';
  const unchecked = account.status === 'UNCHECKED';
  const colour = failed ? 'var(--accent-danger)' : test || unchecked ? 'var(--accent-warning)' : 'var(--accent-success, #16a34a)';
  const Icon = failed || test || unchecked ? AlertTriangle : Check;
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${colour}` }}>
      <Icon size={18} style={{ color: colour, flexShrink: 0, marginTop: '1px' }} />
      <div style={{ fontSize: '13px' }}>
        <div style={{ fontWeight: 600 }}>
          {failed ? 'Not working' : unchecked ? 'Not checked yet' : test ? 'Connected with TEST keys' : 'Connected'}
          <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}> · {account.keyIdMasked} · {account.mode === 'LIVE' ? 'Live' : 'Test'}</span>
        </div>
        {account.checkMessage && <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{account.checkMessage}</div>}
        {account.checkedAt && (
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
            Checked {new Date(account.checkedAt).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

function KeysForm({ onSaved, onCancel, saving, save }) {
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const submit = (e) => {
    e.preventDefault();
    save.mutate({ keyId: keyId.trim(), keySecret: keySecret.trim() }, {
      onSuccess: (result) => { setKeySecret(''); onSaved(result); }
    });
  };
  return (
    <form onSubmit={submit} autoComplete="off">
      <ol style={steps}>
        <li>Open your <strong>Razorpay Dashboard</strong> in <strong>Live mode</strong>.</li>
        <li>Go to <strong>Account &amp; Settings → API Keys → Generate Key</strong>.</li>
        <li>Copy the <strong>Key ID</strong> and the <strong>Key Secret</strong> into the boxes below. Razorpay shows the secret only once.</li>
      </ol>
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div>
          <label style={label} htmlFor="pay-key-id">Key ID</label>
          <input id="pay-key-id" className="input-field" value={keyId} onChange={(e) => setKeyId(e.target.value)}
            placeholder="rzp_live_…" spellCheck={false} autoComplete="off" style={{ width: '100%', ...mono, fontSize: '13px' }} />
        </div>
        <div>
          <label style={label} htmlFor="pay-key-secret">Key Secret</label>
          <input id="pay-key-secret" className="input-field" type="password" value={keySecret} onChange={(e) => setKeySecret(e.target.value)}
            placeholder="Shown once in Razorpay" spellCheck={false} autoComplete="new-password" style={{ width: '100%', ...mono, fontSize: '13px' }} />
        </div>
      </div>
      <p style={{ ...hint, margin: '8px 0 12px' }}>
        The secret is kept encrypted and is never shown again, here or anywhere else.
      </p>
      <div style={row}>
        <button type="submit" className="btn-primary" disabled={saving || !keyId.trim() || !keySecret.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Save and check
        </button>
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

/** The last step, shown right after the secret is made: the only time it can be copied. */
function WebhookHandover({ account, secret, onDone }) {
  return (
    <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--accent-warning)', background: 'var(--bg-hover)' }}>
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Last step: tell Razorpay where to confirm payments</div>
      <p style={{ ...hint, marginBottom: '8px' }}>
        A payment only counts once Razorpay confirms it to us directly — never because a customer's
        browser said so. That needs one webhook in your Razorpay dashboard.
      </p>
      <ol style={steps}>
        <li>In Razorpay: <strong>Account &amp; Settings → Webhooks → Add New Webhook</strong>.</li>
        <li>Paste this as the <strong>Webhook URL</strong>:</li>
      </ol>
      <CopyLine value={account.webhookUrl} what="Webhook URL" />
      <ol start={3} style={steps}>
        <li>Paste this as the <strong>Secret</strong>. <strong>It is shown only now</strong> — copy it before you leave this page:</li>
      </ol>
      <CopyLine value={secret} what="Webhook secret" />
      <ol start={4} style={steps}>
        <li>Tick these events, then save: <span style={mono}>{account.webhookEvents.join(', ')}</span></li>
      </ol>
      <button type="button" className="btn-primary" onClick={onDone} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <Check size={14} /> I have added it in Razorpay
      </button>
    </div>
  );
}

export default function ShopPayments() {
  const { user } = useAuth();
  const isOwner = holdsEverything(user);
  const { data: account, isLoading, isError } = useShopPayments();
  // The saved setting, not the tick above that may not be saved yet.
  const { data: shop } = useOnlineShop();
  const save = useSavePaymentKeys();
  const checkIt = useCheckPayments();
  const rotate = useNewWebhookSecret();
  const disconnect = useDisconnectPayments();

  const [replacing, setReplacing] = useState(false);
  const [secret, setSecret] = useState(null);         // the webhook secret, only until copied
  const [confirming, setConfirming] = useState(null); // 'disconnect' | 'rotate'

  const saved = (result) => {
    setReplacing(false);
    if (result?.webhookSecret) setSecret(result.webhookSecret);
    const a = result?.account;
    if (a?.status === 'CONNECTED' && a.mode === 'LIVE') toast.success('Razorpay accepted your keys.');
    else if (a?.status === 'FAILED') toast.error(a.checkMessage || 'Razorpay did not accept these keys.');
  };

  return (
    <div className="card" style={card}>
      <h3 style={h3}><CreditCard size={16} /> Payments</h3>
      <p style={hint}>
        Take money online through <strong>your own Razorpay account</strong>. Customers pay you
        directly; ScaleEzy never holds the money. Razorpay's fees are between you and Razorpay —{' '}
        <a href={account?.help?.pricing || 'https://razorpay.com/pricing/'} target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          see their pricing <ExternalLink size={11} />
        </a>.
      </p>

      {isLoading && <div style={{ ...row, color: 'var(--text-secondary)', fontSize: '13px' }}><Loader2 size={14} className="animate-spin" /> Loading…</div>}
      {isError && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>Your payment settings could not be loaded. Refresh to try again.</div>}

      {account && !account.connected && (
        isOwner
          ? <KeysForm save={save} saving={save.isPending} onSaved={saved} />
          : <p style={{ fontSize: '13px', margin: 0 }}>Not connected. Only the account owner can connect the shop's Razorpay account.</p>
      )}

      {account && account.connected && (
        <>
          <StatusLine account={account} />

          {secret && <WebhookHandover account={account} secret={secret} onDone={() => setSecret(null)} />}

          {!secret && (
            <div style={{ marginTop: '14px' }}>
              <span style={label}>Webhook URL (in Razorpay → Account &amp; Settings → Webhooks)</span>
              <CopyLine value={account.webhookUrl} what="Webhook URL" />
            </div>
          )}

          {replacing && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
              <p style={{ ...hint, marginBottom: '4px' }}>
                New keys replace the old ones straight away. The webhook address and secret stay the
                same, so there is nothing to change in Razorpay's webhook settings.
              </p>
              <KeysForm save={save} saving={save.isPending} onSaved={saved} onCancel={() => setReplacing(false)} />
            </div>
          )}

          {!replacing && (
            <div style={{ ...row, marginTop: '16px' }}>
              <button type="button" className="btn-secondary" disabled={checkIt.isPending}
                onClick={() => checkIt.mutate(undefined, {
                  onSuccess: (a) => (a.status === 'CONNECTED' ? toast.success(a.mode === 'LIVE' ? 'Razorpay accepted your keys.' : 'Razorpay accepted your TEST keys.') : toast.error(a.checkMessage || 'Not working.'))
                })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {checkIt.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check it works
              </button>

              {isOwner && (
                <>
                  <button type="button" className="btn-secondary" onClick={() => { setConfirming(null); setReplacing(true); }}>Replace keys</button>

                  {confirming === 'rotate' ? (
                    <span style={{ ...row, fontSize: '12px' }}>
                      The old secret stops working at once — you must paste the new one into Razorpay.
                      <button type="button" className="btn-secondary" disabled={rotate.isPending}
                        onClick={() => rotate.mutate(undefined, { onSuccess: (r) => { setConfirming(null); setSecret(r.webhookSecret); } })}>
                        Make a new one
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setConfirming(null)} aria-label="Cancel"><X size={14} /></button>
                    </span>
                  ) : (
                    <button type="button" className="btn-secondary" onClick={() => setConfirming('rotate')}>New webhook secret</button>
                  )}

                  {confirming === 'disconnect' ? (
                    <span style={{ ...row, fontSize: '12px' }}>
                      Customers can no longer pay online. Your keys are deleted.
                      <button type="button" className="btn-danger" disabled={disconnect.isPending}
                        onClick={() => disconnect.mutate(undefined, { onSuccess: () => { setConfirming(null); setSecret(null); } })}>
                        Yes, disconnect
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setConfirming(null)} aria-label="Cancel"><X size={14} /></button>
                    </span>
                  ) : (
                    <button type="button" className="btn-secondary" style={{ color: 'var(--accent-danger)' }} onClick={() => setConfirming('disconnect')}>Disconnect</button>
                  )}
                </>
              )}
            </div>
          )}

          <p style={{ ...hint, margin: '14px 0 0' }}>
            {account.readyForCustomers && shop?.payOnline
              ? 'Customers can pay online at your checkout.'
              : account.readyForCustomers
              ? <>Your account is ready. Switch on "Online" under How customers may pay, in <Link to="/settings?section=ONLINE_SHOP">Settings → Online shop</Link>, to offer it at the checkout.</>
              : account.mode === 'TEST'
                ? 'Test keys never take a real customer\'s money. Replace them with your Live keys before customers pay online.'
                : 'Customers pay when the order arrives until this shows Connected.'}
          </p>

          <PaymentActivity />
        </>
      )}
    </div>
  );
}

const WORD = { PAID: 'Paid', RETURNED: 'Returned', ATTENTION: 'Needs looking at' };
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/**
 * What has been paid online, and money back.
 *
 * A refund can only ever go back to the card or UPI it came from -- Razorpay does that, not us -- so
 * the only choices here are how much and why. Refunds need the same permission the till uses to pay
 * money back; the server checks it, and this screen simply does not offer the button otherwise.
 */
function PaymentActivity() {
  const { can } = usePermission();
  const { data: rows, isLoading } = useOnlinePaymentActivity();
  const refund = useRefundOnline();
  const [open, setOpen] = useState(null); // { id, amount, reason, key }

  if (isLoading) return null;
  if (!rows?.length) {
    return <p style={{ ...hint, margin: '16px 0 0' }}>No online payments yet. They appear here as customers pay.</p>;
  }

  return (
    <div id="pay-activity" style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-light)', scrollMarginTop: 12 }}>
      <span style={{ ...label, fontWeight: 600, color: 'var(--text-primary)' }}>Recent online payments</span>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '500px' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '6px 8px' }}>When</th>
              <th style={{ padding: '6px 8px' }}>Order</th>
              <th style={{ padding: '6px 8px' }}>Customer</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Paid</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Returned</th>
              <th style={{ padding: '6px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <React.Fragment key={r.id}>
                <tr style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '8px' }}>{new Date(r.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td style={{ padding: '8px' }}>
                    {r.salesOrderId && r.orderNumber ? <Link to={`/orders/${r.salesOrderId}`}>{r.orderNumber}</Link> : (r.orderNumber ?? '—')}
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {WORD[r.state]}{r.method ? ` · ${r.method.toUpperCase()}` : ''}{r.orderStatus === 'CANCELLED' ? ' · cancelled' : ''}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>{r.customerName ?? '—'}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{rupee(r.amount)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {r.refunded > 0 ? rupee(r.refunded) : '—'}
                    {r.refundPending > 0 && <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '11px' }}>{rupee(r.refundPending)} on its way</span>}
                    {r.givenBackElsewhere > 0 && <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '11px' }}>+ {rupee(r.givenBackElsewhere)} at the counter</span>}
                  </td>
                  <td style={{ padding: '8px 0 8px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {r.refundable > 0 && can('return:counter') && open?.id !== r.id && (
                      <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => setOpen({ id: r.id, salesOrderId: r.salesOrderId, orderNumber: r.orderNumber, customerName: r.customerName, amount: String(r.refundable), reason: '', key: crypto.randomUUID(), max: r.refundable })}>
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
                {r.note && (
                  <tr><td colSpan={6} style={{ padding: '0 8px 8px', color: r.state === 'ATTENTION' ? 'var(--accent-danger)' : 'var(--text-secondary)', fontSize: '11.5px' }}>{r.note}</td></tr>
                )}
                {r.refunds?.some(x => x.status === 'FAILED') && (
                  <tr><td colSpan={6} style={{ padding: '0 8px 8px', color: 'var(--accent-danger)', fontSize: '11.5px' }}>
                    A refund did not go through: {r.refunds.find(x => x.status === 'FAILED')?.failReason} The customer has NOT been refunded.
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/*
        Below the table, not inside it: on a phone the table scrolls sideways, and a form in one of
        its rows opened scrolled out of sight -- the owner pressed Refund and saw nothing happen.
      */}
      {open && <RefundForm open={open} setOpen={setOpen} refund={refund} />}
    </div>
  );
}

function RefundForm({ open, setOpen, refund }) {
  const text = String(open.amount ?? '').trim();
  const n = /^\d{1,9}(\.\d{1,2})?$/.test(text) ? Number(text) : NaN;
  // The server refuses anything else anyway; saying so here saves a round trip and a red toast.
  const problem = !(n > 0) ? 'Write the amount in rupees, for example 500 or 499.50.'
    : n > open.max + 0.001 ? `Only ${rupee(open.max)} is left to refund on this order.`
    : null;
  return (
    <div style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', background: 'var(--bg-hover)' }}>
      <span style={{ ...label, fontWeight: 600, color: 'var(--text-primary)' }}>
        Refund {open.orderNumber ?? 'this payment'}{open.customerName ? ` · ${open.customerName}` : ''}
      </span>
      <div style={{ ...row, alignItems: 'flex-end' }}>
        <label style={{ display: 'block' }}>
          <span style={label}>Amount (up to {rupee(open.max)})</span>
          <input className="input-field" inputMode="decimal" value={open.amount} style={{ width: '120px' }}
            aria-invalid={!!problem} onChange={(e) => setOpen(o => ({ ...o, amount: e.target.value }))} />
        </label>
        <label style={{ display: 'block', flex: 1, minWidth: '160px' }}>
          <span style={label}>Why (the customer does not see this)</span>
          <input className="input-field" value={open.reason} maxLength={200} style={{ width: '100%' }}
            placeholder="Delivery was very late" onChange={(e) => setOpen(o => ({ ...o, reason: e.target.value }))} />
        </label>
        <button type="button" className="btn-primary" disabled={refund.isPending || !!problem}
          onClick={() => refund.mutate(
            { salesOrderId: open.salesOrderId, amount: open.amount, reason: open.reason, requestKey: open.key },
            { onSuccess: () => setOpen(null) }
          )}>
          {refund.isPending ? 'Refunding…' : `Refund ${problem ? '' : rupee(n)}`.trim()}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(null)}>Cancel</button>
      </div>
      {problem && text !== '' && <p role="alert" style={{ ...hint, margin: '6px 0 0', color: 'var(--accent-danger)' }}>{problem}</p>}
      <p style={{ ...hint, margin: '6px 0 0' }}>It goes back to the card or UPI the customer paid with. It cannot be undone. Taking pieces back? Use Returns instead — it puts them back in stock and refunds through Razorpay in one go.</p>
    </div>
  );
}
