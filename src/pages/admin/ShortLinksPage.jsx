import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Search, Loader2, ShieldOff, ShieldCheck, Building2, AlertTriangle } from 'lucide-react';
import { useAdminShortLink, useSetShortLinkBlocked } from '../../hooks/admin/useAdminConsole';
import PageGuide from '../../components/admin/PageGuide';

/**
 * Look up one short link by its code and, if it is being used for something it should not be,
 * switch it off for everybody.
 *
 * Deliberately a lookup and not a list. Every short link belongs to a shop's campaign and points
 * at that shop's own page; listing them all would put every client's marketing on one screen for
 * an admin who was only asked about one complaint. So: a code in, one link out, and the switch.
 *
 * The switch is the platform's, not the shop's. A shop turning its own campaign's links off is a
 * different state (DISABLED_BY_SHOP) and this screen will not undo it -- an admin who "helpfully"
 * re-enabled a link the owner had pulled would be overriding the owner on the owner's own offer.
 */

const STATE = {
  ACTIVE:               { label: 'Working',                  color: 'var(--accent-success, #22c55e)', bg: 'rgba(34, 197, 94, 0.12)' },
  DISABLED_BY_PLATFORM: { label: 'Switched off by ScaleEzy', color: 'var(--accent-danger)',           bg: 'rgba(239, 68, 68, 0.12)' },
  DISABLED_BY_SHOP:     { label: 'Switched off by the shop', color: 'var(--accent-gold)',             bg: 'rgba(226, 193, 113, 0.12)' },
  EXPIRED:              { label: 'Ended',                    color: 'var(--text-muted)',              bg: 'var(--bg-hover)' }
};

const TARGET = { WHATSAPP: 'Chat with the shop', EXTERNAL: 'A web page', PRODUCT: 'A product page', SHOP: 'The shop page', CAMPAIGN: 'A campaign page' };

const when = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

/** Accepts a bare code, a full go.scaleezy.com address, or either with stray spaces around it. */
function codeFrom(typed) {
  const last = typed.trim().replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() || '';
  return /^[A-Za-z0-9]{7}$/.test(last) ? last : '';
}

/**
 * Label beside value on a wide screen, label above value on a phone. A fixed 170px label column
 * on a 390px screen leaves a strip too narrow for a web address, which then breaks mid-word down
 * the page; stacking gives the value the full width.
 */
const FIELD_CSS = `
.sl-field { display: flex; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border-light); }
.sl-field > .k { width: 170px; flex-shrink: 0; color: var(--text-secondary); font-size: 13px; }
.sl-field > .v { color: var(--text-primary); font-size: 13px; word-break: break-word; overflow-wrap: anywhere; min-width: 0; }
@media (max-width: 640px) {
  .sl-field { flex-direction: column; gap: 4px; }
  .sl-field > .k { width: auto; }
}`;

function Field({ label, children, mono }) {
  return (
    <div className="sl-field">
      <div className="k">{label}</div>
      <div className="v" style={{ fontFamily: mono ? 'var(--font-mono)' : undefined }}>{children}</div>
    </div>
  );
}

export default function ShortLinksPage() {
  const [typed, setTyped] = useState('');
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  const { data: link, isFetching, isError, error } = useAdminShortLink(code);
  const change = useSetShortLinkBlocked();

  const look = () => {
    const c = codeFrom(typed);
    setConfirming(false);
    setNote('');
    setCode(c);
  };

  const state = link ? STATE[link.state] ?? STATE.ACTIVE : null;
  const blockedByUs = link?.state === 'DISABLED_BY_PLATFORM';
  const badCode = typed.trim() !== '' && !codeFrom(typed);

  return (
    <div>
      <style>{FIELD_CSS}</style>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Link2 size={22} color="var(--accent-gold)" /> Short links
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Look up a <code style={{ fontFamily: 'var(--font-mono)' }}>go.scaleezy.com</code> link that has been reported, and switch it off if it points somewhere it should not.
      </p>

      <div role="search" style={{ display: 'flex', gap: '10px', marginBottom: '20px', maxWidth: '620px' }}>
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); look(); } }}
          placeholder="go.scaleezy.com/x7Kq9Pm  —  or just x7Kq9Pm"
          aria-label="Short link code"
          style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}
        />
        <button
          type="button"
          onClick={look}
          disabled={!codeFrom(typed)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--accent-gold)', color: '#1a1a1a', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: codeFrom(typed) ? 'pointer' : 'not-allowed', opacity: codeFrom(typed) ? 1 : 0.5 }}
        >
          <Search size={15} /> Look up
        </button>
      </div>
      {badCode && (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '-12px', marginBottom: '20px' }}>
          A code is 7 letters and numbers, at the end of the address.
        </p>
      )}

      {isFetching && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '14px', padding: '20px 0' }}>
          <Loader2 size={18} className="animate-spin" color="var(--accent-gold)" /> Looking it up…
        </div>
      )}

      {isError && !isFetching && (
        <div style={{ padding: '16px 18px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--accent-danger)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', maxWidth: '620px' }}>
          {error?.message || 'No link has that code.'}
        </div>
      )}

      {link && !isFetching && (
        <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', background: 'var(--bg-card)', padding: '20px 22px', maxWidth: '780px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', paddingBottom: '14px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', overflowWrap: 'anywhere', minWidth: 0 }}>
              {link.shortUrl || `go.scaleezy.com/${link.code}`}
            </div>
            <span style={{ padding: '4px 12px', background: state.bg, color: state.color, borderRadius: '7px', fontSize: '12px', fontWeight: 600 }}>{state.label}</span>
          </div>

          <Field label="Shop">
            <button
              onClick={() => navigate(`/platformconsole/clients/${link.clientId}`)}
              title={`Open ${link.clientId}`}
              // 8px of padding, not 3: this is the one control on the screen a reader taps to go
              // somewhere, and the console is opened on a tablet as often as a desktop.
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border-light)', cursor: 'pointer' }}
            >
              <Building2 size={13} color="var(--accent-gold)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{link.clientId}</span>
            </button>
          </Field>
          <Field label="Where it goes" mono>{link.target}</Field>
          <Field label="Kind">{TARGET[link.targetType] ?? link.targetType}</Field>
          <Field label="Made by">{link.ownerModule === 'campaigns' ? 'A WhatsApp campaign' : link.ownerModule}{link.isTest ? ' (a test send)' : ''}</Field>
          <Field label="Made">{when(link.createdAt)}</Field>
          <Field label="Works until">{when(link.expiresAt)}</Field>
          <Field label="Taps">
            {link.tapCount} by people{link.botOpenCount ? `, ${link.botOpenCount} by link-preview robots` : ''}
            {link.firstTapAt ? ` · first ${when(link.firstTapAt)}, last ${when(link.lastTapAt)}` : ''}
          </Field>
          {link.disabledAt && <Field label="Switched off">{when(link.disabledAt)}{link.disabledNote ? ` — ${link.disabledNote}` : ''}</Field>}

          <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '10px', paddingTop: '18px' }}>
            {link.state === 'DISABLED_BY_SHOP' ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                The shop switched this one off itself. Leave it to them — switching it back on here would undo the owner's own decision.
              </p>
            ) : blockedByUs ? (
              <button
                onClick={() => change.mutate({ code: link.code, block: false })}
                disabled={change.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                <ShieldCheck size={15} /> Switch it back on
              </button>
            ) : !confirming ? (
              <button
                onClick={() => setConfirming(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                <ShieldOff size={15} /> Switch this link off
              </button>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <AlertTriangle size={16} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>
                    Everyone who taps it will see <em>This link is not available</em> — the same blank answer as a code that never existed, so nobody learns it was blocked. Messages already sent still arrive; the shop is not told. Say why — it goes in the audit log against your name.
                  </span>
                </div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="Why, for example: reported by a customer — the page asks for card details"
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', marginBottom: '12px' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => change.mutate({ code: link.code, block: true, note }, { onSuccess: () => { setConfirming(false); setNote(''); } })}
                    disabled={!note.trim() || change.isPending}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: note.trim() ? 'pointer' : 'not-allowed', opacity: note.trim() ? 1 : 0.5 }}
                  >
                    {change.isPending ? <Loader2 size={15} className="animate-spin" /> : <ShieldOff size={15} />} Switch it off
                  </button>
                  <button
                    onClick={() => { setConfirming(false); setNote(''); }}
                    style={{ padding: '10px 18px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <PageGuide title="About Short links">
        <p>Every WhatsApp campaign gives each customer their own short link, so the shop can see who tapped. This screen is for when one of them is reported.</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
          <li><strong>Switched off by ScaleEzy:</strong> the platform's own block. Only this screen sets it, and only this screen lifts it.</li>
          <li><strong>Switched off by the shop:</strong> the owner pressed "Switch links off" on their campaign. Not ours to undo.</li>
          <li><strong>Ended:</strong> past the day it was made to work until (90 days by default). Nothing to do.</li>
          <li><strong>No customer is named here.</strong> A link carries an unguessable tag for the shop's own counting, never a phone number or a name, and no addresses or locations are kept.</li>
        </ul>
      </PageGuide>
    </div>
  );
}
